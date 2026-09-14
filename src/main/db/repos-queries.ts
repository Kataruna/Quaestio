import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { repos } from './schema';
import type { Repo } from '@shared/types';

export function listRepos(db: BetterSQLite3Database): Repo[] {
  return db.select().from(repos).all();
}

/**
 * Upserts the GitHub-derived fields for each repo, preserving whatever
 * `tracked` value already exists locally (or defaulting to `false` for a
 * repo seen for the first time) — GitHub has no concept of "tracked," so a
 * refresh must never clobber this app's own local state.
 */
export function upsertRepos(db: BetterSQLite3Database, incoming: Omit<Repo, 'tracked'>[]): void {
  const existingTracked = new Map(listRepos(db).map((repo) => [repo.id, repo.tracked]));
  for (const repo of incoming) {
    db.insert(repos)
      .values({ ...repo, tracked: existingTracked.get(repo.id) ?? false })
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
  for (const [id, wasTracked] of before) {
    const shouldTrack = wantTracked.has(id);
    if (shouldTrack !== wasTracked) {
      db.update(repos).set({ tracked: shouldTrack }).where(eq(repos.id, id)).run();
    }
  }
  return repoIds.filter((id) => !(before.get(id) ?? false));
}
