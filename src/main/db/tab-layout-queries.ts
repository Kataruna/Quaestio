import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { z } from 'zod';
import { tabLayout } from './schema';
import type { TabSlot } from '@shared/types';
import { tabSlotSchema } from '@shared/ipc-contract';

const LAYOUT_ROW_ID = 1;
const storedTabLayoutSchema = z.array(tabSlotSchema);

/** `null` means no row exists yet — the caller (`tab-layout:get`'s IPC
 * handler) uses that to choose between `buildInitialTabLayout` and
 * `reconcileTabLayout`. Also returns `null` (rather than throwing) if the
 * stored row is corrupt — unparseable JSON, or JSON that doesn't match
 * `TabSlot[]`'s shape (e.g. a future incompatible format). The caller
 * treats `null` as "never synced," which both recovers gracefully and
 * self-heals the row by re-persisting a freshly built layout. */
export function getStoredTabLayout(db: BetterSQLite3Database): TabSlot[] | null {
  const row = db.select().from(tabLayout).where(eq(tabLayout.id, LAYOUT_ROW_ID)).get();
  if (!row) return null;
  try {
    const parsed: unknown = JSON.parse(row.layout);
    const result = storedTabLayoutSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function setStoredTabLayout(db: BetterSQLite3Database, slots: TabSlot[]): void {
  const layout = JSON.stringify(slots);
  db.insert(tabLayout)
    .values({ id: LAYOUT_ROW_ID, layout })
    .onConflictDoUpdate({ target: tabLayout.id, set: { layout } })
    .run();
}
