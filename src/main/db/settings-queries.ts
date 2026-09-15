import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { settings } from './schema';

const SETTINGS_ROW_ID = 1;

/** Single-row table — creates the row with defaults on first read if it doesn't exist yet. */
export function getSettings(db: BetterSQLite3Database): { tabGroupsEnabled: boolean } {
  const row = db.select().from(settings).where(eq(settings.id, SETTINGS_ROW_ID)).get();
  if (row) return { tabGroupsEnabled: row.tabGroupsEnabled };
  db.insert(settings).values({ id: SETTINGS_ROW_ID, tabGroupsEnabled: false }).run();
  return { tabGroupsEnabled: false };
}

export function setTabGroupsEnabled(db: BetterSQLite3Database, enabled: boolean): void {
  db.insert(settings)
    .values({ id: SETTINGS_ROW_ID, tabGroupsEnabled: enabled })
    .onConflictDoUpdate({ target: settings.id, set: { tabGroupsEnabled: enabled } })
    .run();
}
