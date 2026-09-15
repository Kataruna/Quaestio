import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { getSettings, setTabGroupsEnabled } from '../src/main/db/settings-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('settings-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('defaults tabGroupsEnabled to false when no row exists yet', () => {
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false });
  });

  it('setTabGroupsEnabled persists true', () => {
    setTabGroupsEnabled(db, true);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: true });
  });

  it('setTabGroupsEnabled can flip back to false', () => {
    setTabGroupsEnabled(db, true);
    setTabGroupsEnabled(db, false);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false });
  });

  it('getSettings creates the row on first read, and a later read sees the same defaults', () => {
    getSettings(db);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false });
  });
});
