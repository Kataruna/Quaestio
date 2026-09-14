import { describe, expect, it, vi, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { performIssueUpdate, toGitHubPatch, isGone } from '../src/main/sync/issue-update';
import { upsertIssues, getIssue } from '../src/main/db/issues-queries';
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

function makeClient(opts: {
  get: (() => Promise<{ data: unknown }>) | Error;
  update?: () => Promise<{ data: unknown }>;
}): GitHubClient {
  const get = opts.get instanceof Error ? vi.fn().mockRejectedValue(opts.get) : vi.fn(opts.get);
  const update = vi.fn(opts.update ?? (() => Promise.reject(new Error('update should not be called'))));
  return { rest: { issues: { get, update } } } as unknown as GitHubClient;
}

describe('performIssueUpdate', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
    upsertIssues(db, [
      {
        id: 1,
        number: 1,
        repoFullName: 'acme/web',
        title: 'Old title',
        body: 'Old body',
        state: 'open',
        type: 'bug',
        priority: 'p3',
        labels: [],
        assignee: null,
        milestone: null,
        dueDate: null,
        subtasks: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        htmlUrl: 'https://github.com/acme/web/issues/1',
      },
    ]);
  });

  it('writes the patch and upserts the result when there is no conflict', async () => {
    const client = makeClient({
      get: () => Promise.resolve({ data: rawIssue({ updated_at: '2026-01-01T00:00:00Z' }) }),
      update: () =>
        Promise.resolve({ data: rawIssue({ title: 'New title', updated_at: '2026-01-03T00:00:00Z' }) }),
    });

    const result = await performIssueUpdate(
      client,
      db,
      'acme',
      'web',
      'acme/web',
      1,
      '2026-01-01T00:00:00Z',
      { title: 'New title' },
    );

    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.issue.title).toBe('New title');
    expect(getIssue(db, 'acme/web', 1)?.title).toBe('New title');
  });

  it('returns a conflict and upserts the live issue without writing when updated_at mismatches', async () => {
    const client = makeClient({
      get: () => Promise.resolve({ data: rawIssue({ title: 'Changed elsewhere', updated_at: '2026-01-05T00:00:00Z' }) }),
    });

    const result = await performIssueUpdate(
      client,
      db,
      'acme',
      'web',
      'acme/web',
      1,
      '2026-01-01T00:00:00Z',
      { title: 'My edit' },
    );

    expect(result.kind).toBe('conflict');
    if (result.kind === 'conflict') {
      expect(result.latest.title).toBe('Changed elsewhere');
    }
    // The write was never attempted — cache reflects GitHub's version, not the blocked edit.
    expect(getIssue(db, 'acme/web', 1)?.title).toBe('Changed elsewhere');
  });

  it('returns deleted and removes the cached issue on a 404', async () => {
    const client = makeClient({ get: Object.assign(new Error('Not Found'), { status: 404 }) });

    const result = await performIssueUpdate(client, db, 'acme', 'web', 'acme/web', 1, '2026-01-01T00:00:00Z', {
      title: 'Anything',
    });

    expect(result).toEqual({ kind: 'deleted' });
    expect(getIssue(db, 'acme/web', 1)).toBeNull();
  });

  it('rethrows a non-gone error from the live fetch', async () => {
    const client = makeClient({ get: Object.assign(new Error('Server error'), { status: 500 }) });

    await expect(
      performIssueUpdate(client, db, 'acme', 'web', 'acme/web', 1, '2026-01-01T00:00:00Z', { title: 'x' }),
    ).rejects.toThrow('Server error');
  });
});

describe('toGitHubPatch', () => {
  it('maps assigneeLogin to a one-element assignees array', () => {
    expect(toGitHubPatch({ assigneeLogin: 'sarah-kwan' })).toEqual({ assignees: ['sarah-kwan'] });
  });

  it('maps a null assigneeLogin to an empty assignees array (unassign)', () => {
    expect(toGitHubPatch({ assigneeLogin: null })).toEqual({ assignees: [] });
  });

  it('maps stateReason to state_reason', () => {
    expect(toGitHubPatch({ state: 'closed', stateReason: 'not_planned' })).toEqual({
      state: 'closed',
      state_reason: 'not_planned',
    });
  });

  it('omits fields that were not present in the patch at all', () => {
    expect(toGitHubPatch({ title: 'x' })).toEqual({ title: 'x' });
  });
});

describe('isGone', () => {
  it('is true for 404, 410, and 301', () => {
    expect(isGone({ status: 404 })).toBe(true);
    expect(isGone({ status: 410 })).toBe(true);
    expect(isGone({ status: 301 })).toBe(true);
  });

  it('is false for other statuses and non-HTTP errors', () => {
    expect(isGone({ status: 500 })).toBe(false);
    expect(isGone(new Error('boom'))).toBe(false);
    expect(isGone(null)).toBe(false);
  });
});
