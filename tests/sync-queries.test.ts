import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { upsertRepos } from '../src/main/db/repos-queries';
import { getSyncCursor, setSyncCursor, getEtag, setEtag } from '../src/main/db/sync-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('sync-queries', () => {
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
        openIssueCount: 0,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('getSyncCursor is null for a repo that has never been synced', () => {
    expect(getSyncCursor(db, 'acme/web')).toBeNull();
  });

  it('setSyncCursor then getSyncCursor round-trips', () => {
    setSyncCursor(db, 'acme/web', '2026-03-01T00:00:00Z');
    expect(getSyncCursor(db, 'acme/web')).toBe('2026-03-01T00:00:00Z');
  });

  it('setSyncCursor overwrites a previous cursor', () => {
    setSyncCursor(db, 'acme/web', '2026-03-01T00:00:00Z');
    setSyncCursor(db, 'acme/web', '2026-04-01T00:00:00Z');
    expect(getSyncCursor(db, 'acme/web')).toBe('2026-04-01T00:00:00Z');
  });

  it('getEtag is null for a URL never stored', () => {
    expect(getEtag(db, 'GET /repos/acme/web/issues')).toBeNull();
  });

  it('setEtag then getEtag round-trips', () => {
    setEtag(db, 'GET /repos/acme/web/issues', '"abc123"');
    expect(getEtag(db, 'GET /repos/acme/web/issues')).toBe('"abc123"');
  });

  it('setEtag overwrites a previous etag for the same URL', () => {
    setEtag(db, 'GET /repos/acme/web/issues', '"abc123"');
    setEtag(db, 'GET /repos/acme/web/issues', '"def456"');
    expect(getEtag(db, 'GET /repos/acme/web/issues')).toBe('"def456"');
  });
});
