import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { GitHubClient } from '../github/client';
import { fetchAllIssues } from '../github/issues';
import { isPullRequest, mapGitHubIssue } from '@shared/map-github-issue';
import { upsertIssues } from '../db/issues-queries';

/**
 * Fetches every issue for one repo (all pages, all states), filters out
 * pull requests, maps each to this app's `Issue` type, and upserts the
 * result into SQLite. This is a full sync, not incremental — Slice 4 adds
 * `since`/ETag-based incremental sync on top of this for repeat syncs.
 */
export async function syncRepoIssues(
  client: GitHubClient,
  db: BetterSQLite3Database,
  repoFullName: string,
): Promise<void> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Not a valid "owner/repo" full name: ${repoFullName}`);
  }
  const raw = await fetchAllIssues(client, owner, repo);
  const issues = raw.filter((item) => !isPullRequest(item)).map((item) => mapGitHubIssue(item, repoFullName));
  upsertIssues(db, issues);
}
