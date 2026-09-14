import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { listRepos, upsertRepos, setTrackedRepos } from '../src/main/db/repos-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('repos-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('upsertRepos inserts a new repo as untracked by default', () => {
    upsertRepos(db, [
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 3,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    expect(listRepos(db)).toEqual([
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 3,
        updatedAt: '2026-01-01T00:00:00Z',
        tracked: false,
      },
    ]);
  });

  it('upsertRepos preserves an existing tracked flag and updates other fields', () => {
    upsertRepos(db, [
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 3,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    setTrackedRepos(db, [1]);

    upsertRepos(db, [
      {
        id: 1,
        owner: 'acme',
        name: 'web',
        fullName: 'acme/web',
        isPrivate: true,
        openIssueCount: 9,
        updatedAt: '2026-02-01T00:00:00Z',
      },
    ]);

    const [repo] = listRepos(db);
    expect(repo?.tracked).toBe(true);
    expect(repo?.openIssueCount).toBe(9);
  });

  it('setTrackedRepos sets exactly the given ids tracked and untracks everything else', () => {
    upsertRepos(db, [
      { id: 1, owner: 'a', name: 'one', fullName: 'a/one', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
      { id: 2, owner: 'a', name: 'two', fullName: 'a/two', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
    ]);

    setTrackedRepos(db, [1]);
    expect(listRepos(db).find((repo) => repo.id === 1)?.tracked).toBe(true);
    expect(listRepos(db).find((repo) => repo.id === 2)?.tracked).toBe(false);

    setTrackedRepos(db, [2]);
    expect(listRepos(db).find((repo) => repo.id === 1)?.tracked).toBe(false);
    expect(listRepos(db).find((repo) => repo.id === 2)?.tracked).toBe(true);
  });

  it('does not throw when two different repo ids share a fullName in the same sync (e.g. a rename colliding with a newly created repo of the old name)', () => {
    expect(() => {
      upsertRepos(db, [
        {
          id: 1,
          owner: 'acme',
          name: 'web-renamed',
          fullName: 'acme/web-renamed',
          isPrivate: false,
          openIssueCount: 0,
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 2,
          owner: 'acme',
          name: 'web',
          fullName: 'acme/web',
          isPrivate: false,
          openIssueCount: 0,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ]);
    }).not.toThrow();

    const stored = listRepos(db);
    expect(stored).toHaveLength(2);
    expect(stored.find((repo) => repo.id === 1)?.fullName).toBe('acme/web-renamed');
    expect(stored.find((repo) => repo.id === 2)?.fullName).toBe('acme/web');
  });

  it('setTrackedRepos returns only the ids that newly became tracked', () => {
    upsertRepos(db, [
      { id: 1, owner: 'a', name: 'one', fullName: 'a/one', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
      { id: 2, owner: 'a', name: 'two', fullName: 'a/two', isPrivate: false, openIssueCount: 0, updatedAt: '2026-01-01T00:00:00Z' },
    ]);

    setTrackedRepos(db, [1]);
    const newly = setTrackedRepos(db, [1, 2]);
    expect(newly).toEqual([2]);
  });
});
