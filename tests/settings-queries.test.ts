import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { getSettings, setTabGroupsEnabled, setTheme } from '../src/main/db/settings-queries';

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

  it('defaults tabGroupsEnabled to false and theme to system when no row exists yet', () => {
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false, theme: 'system' });
  });

  it('setTabGroupsEnabled persists true', () => {
    setTabGroupsEnabled(db, true);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: true, theme: 'system' });
  });

  it('setTabGroupsEnabled can flip back to false', () => {
    setTabGroupsEnabled(db, true);
    setTabGroupsEnabled(db, false);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false, theme: 'system' });
  });

  it('getSettings creates the row on first read, and a later read sees the same defaults', () => {
    getSettings(db);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false, theme: 'system' });
  });

  it('setTheme persists dark', () => {
    setTheme(db, 'dark');
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false, theme: 'dark' });
  });

  it('setTheme does not clobber tabGroupsEnabled, and vice versa', () => {
    setTabGroupsEnabled(db, true);
    setTheme(db, 'dark');
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: true, theme: 'dark' });

    setTabGroupsEnabled(db, false);
    expect(getSettings(db)).toEqual({ tabGroupsEnabled: false, theme: 'dark' });
  });
});
