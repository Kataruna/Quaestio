import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { repos } from './schema';
import type { Repo } from '@shared/types';

export function listRepos(db: BetterSQLite3Database): Repo[] {
  return db.select().from(repos).all();
}

/** Deletes every row — called on sign-out so a different GitHub account
 * signing in afterward never sees a previous account's cached repos. */
export function clearAllRepos(db: BetterSQLite3Database): void {
  db.delete(repos).run();
}

/**
 * Upserts the GitHub-derived fields for each repo. `tracked` is never
 * clobbered on a refresh: it's omitted from `onConflictDoUpdate`'s `set`
 * clause entirely, so SQLite leaves the existing row's value untouched on
 * conflict, and its own `.default(false)` in the schema handles a repo seen
 * for the first time. GitHub has no concept of "tracked" — that guarantee is
 * the only thing that makes this safe to call on every sync.
 *
 * Runs as a single transaction so any mid-batch failure (a constraint
 * violation, an I/O error, or anything else that throws) rolls back instead
 * of leaving the repo list half-updated.
 */
export function upsertRepos(db: BetterSQLite3Database, incoming: Omit<Repo, 'tracked'>[]): void {
  db.transaction((tx) => {
    for (const repo of incoming) {
      tx.insert(repos)
        .values({ ...repo })
        .onConflictDoUpdate({
          target: repos.id,
          set: {
            owner: repo.owner,
            name: repo.name,
            fullName: repo.fullName,
            isPrivate: repo.isPrivate,
            openIssueCount: repo.openIssueCount,
            updatedAt: repo.updatedAt,
          },
        })
        .run();
    }
  });
}

/**
 * Sets `tracked = true` for exactly the given ids and `false` for every
 * other repo — matching `SetTrackedInput`'s contract that `repoIds` is the
 * complete desired tracked set, not a delta. Returns the ids that
 * transitioned from untracked to tracked, so the caller knows which repos
 * need their first issue sync.
 */
export function setTrackedRepos(db: BetterSQLite3Database, repoIds: number[]): number[] {
  const before = new Map(listRepos(db).map((repo) => [repo.id, repo.tracked]));
  const wantTracked = new Set(repoIds);
  db.transaction((tx) => {
    for (const [id, wasTracked] of before) {
      const shouldTrack = wantTracked.has(id);
      if (shouldTrack !== wasTracked) {
        tx.update(repos).set({ tracked: shouldTrack }).where(eq(repos.id, id)).run();
      }
    }
  });
  return repoIds.filter((id) => !(before.get(id) ?? false));
}
