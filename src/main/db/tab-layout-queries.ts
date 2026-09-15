import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { tabLayout } from './schema';
import type { TabSlot } from '@shared/types';

const LAYOUT_ROW_ID = 1;

/** `null` means no row exists yet — the caller (`tab-layout:get`'s IPC
 * handler) uses that to choose between `buildInitialTabLayout` and
 * `reconcileTabLayout`. */
export function getStoredTabLayout(db: BetterSQLite3Database): TabSlot[] | null {
  const row = db.select().from(tabLayout).where(eq(tabLayout.id, LAYOUT_ROW_ID)).get();
  if (!row) return null;
  return JSON.parse(row.layout) as TabSlot[];
}

export function setStoredTabLayout(db: BetterSQLite3Database, slots: TabSlot[]): void {
  const layout = JSON.stringify(slots);
  db.insert(tabLayout)
    .values({ id: LAYOUT_ROW_ID, layout })
    .onConflictDoUpdate({ target: tabLayout.id, set: { layout } })
    .run();
}
