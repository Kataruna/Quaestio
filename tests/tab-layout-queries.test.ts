import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { TabSlot } from '@shared/types';
import { getStoredTabLayout, setStoredTabLayout } from '../src/main/db/tab-layout-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

describe('tab-layout-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('returns null when no layout has ever been saved', () => {
    expect(getStoredTabLayout(db)).toBeNull();
  });

  it('round-trips a layout of standalone and grouped slots', () => {
    const slots: TabSlot[] = [
      { kind: 'repo', fullName: 'acme/web' },
      { kind: 'group', id: 'g1', repoFullNames: ['acme/api', 'acme/docs'] },
    ];
    setStoredTabLayout(db, slots);
    expect(getStoredTabLayout(db)).toEqual(slots);
  });

  it('overwrites the previous layout on a second save', () => {
    setStoredTabLayout(db, [{ kind: 'repo', fullName: 'acme/web' }]);
    setStoredTabLayout(db, [{ kind: 'repo', fullName: 'acme/api' }]);
    expect(getStoredTabLayout(db)).toEqual([{ kind: 'repo', fullName: 'acme/api' }]);
  });
});
