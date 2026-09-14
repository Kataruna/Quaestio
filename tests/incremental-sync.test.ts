import { describe, expect, it, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { syncRepoIssuesIncremental } from '../src/main/sync/incremental-sync';
import { upsertRepos, setTrackedRepos } from '../src/main/db/repos-queries';
import { listIssues } from '../src/main/db/issues-queries';
import { getSyncCursor, getEtag } from '../src/main/db/sync-queries';
import type { GitHubClient } from '../src/main/github/client';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

function rawIssue(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    number: 1,
    title: 'Something broke',
    body: 'Details',
    state: 'open',
    labels: [],
    assignee: null,
    milestone: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    html_url: 'https://github.com/acme/web/issues/1',
    ...overrides,
  };
}

/** `listForRepo` resolves normally; `paginate` backs both the fallback full
 * sync and this module's own >PER_PAGE pagination branch. */
function makeClient(opts: {
  listForRepo: (() => Promise<{ data: unknown[]; headers: Record<string, string> }>) | Error;
  paginateData?: unknown[];
}): GitHubClient {
  const listForRepo =
    opts.listForRepo instanceof Error
      ? vi.fn().mockRejectedValue(opts.listForRepo)
      : vi.fn(opts.listForRepo);
  const paginate = vi.fn().mockResolvedValue(opts.paginateData ?? []);
  return { rest: { issues: { listForRepo } }, paginate } as unknown as GitHubClient;
}

describe('syncRepoIssuesIncremental', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
    upsertRepos(db, [
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: false,
        openIssueCount: 1,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    setTrackedRepos(db, [1]);
  });

  it('falls back to a full sync and seeds the cursor when there is none yet', async () => {
    const client = makeClient({
      listForRepo: () => Promise.reject(new Error('should not be called for a null cursor')),
      paginateData: [rawIssue()],
    });

    const result = await syncRepoIssuesIncremental(client, db, 'acme/web');

    expect(result).toEqual({ changed: true });
    expect(listIssues(db, 'acme/web')).toHaveLength(1);
    expect(getSyncCursor(db, 'acme/web')).toBe('2026-01-02T00:00:00Z');
  });

  it('upserts new issues and advances the cursor to the newest updated_at', async () => {
    // First call has no cursor yet, so it full-syncs and seeds one — every
    // test after this needs a real cursor to exercise the incremental path.
    await syncRepoIssuesIncremental(
      makeClient({ listForRepo: () => Promise.reject(new Error('unused')), paginateData: [rawIssue()] }),
      db,
      'acme/web',
    );
    const cursorAfterFullSync = getSyncCursor(db, 'acme/web');
    expect(cursorAfterFullSync).toBe('2026-01-02T00:00:00Z');

    const client = makeClient({
      listForRepo: () =>
        Promise.resolve({
          data: [rawIssue({ id: 2, number: 2, title: 'Second issue', updated_at: '2026-01-05T00:00:00Z' })],
          headers: { etag: '"abc123"' },
        }),
    });

    const result = await syncRepoIssuesIncremental(client, db, 'acme/web');

    expect(result).toEqual({ changed: true });
    expect(listIssues(db, 'acme/web').map((issue) => issue.number).sort()).toEqual([1, 2]);
    expect(getSyncCursor(db, 'acme/web')).toBe('2026-01-05T00:00:00Z');
    expect(getEtag(db, 'GET /repos/acme/web/issues?state=all&since=2026-01-02T00:00:00Z&sort=updated&direction=asc')).toBe(
      '"abc123"',
    );
  });

  it('reports no change on a 304 and leaves the cursor untouched', async () => {
    await syncRepoIssuesIncremental(
      makeClient({ listForRepo: () => Promise.reject(new Error('unused')), paginateData: [rawIssue()] }),
      db,
      'acme/web',
    );
    const cursorBefore = getSyncCursor(db, 'acme/web');

    const notModified = Object.assign(new Error('Not Modified'), { status: 304 });
    const client = makeClient({ listForRepo: notModified });

    const result = await syncRepoIssuesIncremental(client, db, 'acme/web');

    expect(result).toEqual({ changed: false });
    expect(getSyncCursor(db, 'acme/web')).toBe(cursorBefore);
  });

  it('filters out pull requests but still advances the cursor past them', async () => {
    await syncRepoIssuesIncremental(
      makeClient({ listForRepo: () => Promise.reject(new Error('unused')), paginateData: [rawIssue()] }),
      db,
      'acme/web',
    );

    const client = makeClient({
      listForRepo: () =>
        Promise.resolve({
          data: [
            rawIssue({
              id: 99,
              number: 99,
              pull_request: { url: 'https://api.github.com/x' },
              updated_at: '2026-01-09T00:00:00Z',
            }),
          ],
          headers: {},
        }),
    });

    const result = await syncRepoIssuesIncremental(client, db, 'acme/web');

    expect(result).toEqual({ changed: false });
    expect(listIssues(db, 'acme/web')).toHaveLength(1);
    expect(getSyncCursor(db, 'acme/web')).toBe('2026-01-09T00:00:00Z');
  });

  it('paginates past a full first page instead of assuming it is everything', async () => {
    await syncRepoIssuesIncremental(
      makeClient({ listForRepo: () => Promise.reject(new Error('unused')), paginateData: [rawIssue()] }),
      db,
      'acme/web',
    );

    const fullPage = Array.from({ length: 100 }, (_, i) =>
      rawIssue({ id: 100 + i, number: 100 + i, updated_at: '2026-02-01T00:00:00Z' }),
    );
    const everything = [
      ...fullPage,
      rawIssue({ id: 999, number: 999, updated_at: '2026-02-02T00:00:00Z' }),
    ];
    const client = makeClient({
      listForRepo: () => Promise.resolve({ data: fullPage, headers: {} }),
      paginateData: everything,
    });

    const result = await syncRepoIssuesIncremental(client, db, 'acme/web');

    expect(result).toEqual({ changed: true });
    // 1 issue from the earlier full sync + 100 in the full page + 1 beyond it.
    expect(listIssues(db, 'acme/web')).toHaveLength(102);
    expect(getSyncCursor(db, 'acme/web')).toBe('2026-02-02T00:00:00Z');
  });
});
