import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Theme } from '@shared/ipc-contract';
import { settings } from './schema';

const SETTINGS_ROW_ID = 1;

/** Single-row table — creates the row with defaults on first read if it doesn't exist yet. */
export function getSettings(db: BetterSQLite3Database): { tabGroupsEnabled: boolean; theme: Theme } {
  const row = db.select().from(settings).where(eq(settings.id, SETTINGS_ROW_ID)).get();
  if (row) return { tabGroupsEnabled: row.tabGroupsEnabled, theme: row.theme };
  db.insert(settings).values({ id: SETTINGS_ROW_ID, tabGroupsEnabled: false, theme: 'system' }).run();
  return { tabGroupsEnabled: false, theme: 'system' };
}

export function setTabGroupsEnabled(db: BetterSQLite3Database, enabled: boolean): void {
  db.insert(settings)
    .values({ id: SETTINGS_ROW_ID, tabGroupsEnabled: enabled })
    .onConflictDoUpdate({ target: settings.id, set: { tabGroupsEnabled: enabled } })
    .run();
}

export function setTheme(db: BetterSQLite3Database, theme: Theme): void {
  db.insert(settings)
    .values({ id: SETTINGS_ROW_ID, theme })
    .onConflictDoUpdate({ target: settings.id, set: { theme } })
    .run();
}
