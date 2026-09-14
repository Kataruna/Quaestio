import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { repos, syncEtags } from './schema';

/** `null` means this repo has never been synced (or only ever full-synced). */
export function getSyncCursor(db: BetterSQLite3Database, repoFullName: string): string | null {
  const row = db
    .select({ syncCursor: repos.syncCursor })
    .from(repos)
    .where(eq(repos.fullName, repoFullName))
    .get();
  return row?.syncCursor ?? null;
}

export function setSyncCursor(
  db: BetterSQLite3Database,
  repoFullName: string,
  cursor: string,
): void {
  db.update(repos).set({ syncCursor: cursor }).where(eq(repos.fullName, repoFullName)).run();
}

export function getEtag(db: BetterSQLite3Database, url: string): string | null {
  const row = db.select().from(syncEtags).where(eq(syncEtags.url, url)).get();
  return row?.etag ?? null;
}

export function setEtag(db: BetterSQLite3Database, url: string, etag: string): void {
  db.insert(syncEtags)
    .values({ url, etag })
    .onConflictDoUpdate({ target: syncEtags.url, set: { etag } })
    .run();
}
