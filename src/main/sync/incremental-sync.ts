import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { GitHubClient } from '../github/client';
import { isPullRequest, mapGitHubIssue } from '@shared/map-github-issue';
import { upsertIssues, getMaxUpdatedAt } from '../db/issues-queries';
import { getSyncCursor, setSyncCursor, getEtag, setEtag } from '../db/sync-queries';
import { isNotModified } from './errors';
import { syncRepoIssues } from './initial-sync';

const PER_PAGE = 100;

/**
 * A stable key for this exact conditional-GET query — CLAUDE.md: "store the
 * ETag for each request URL." Deliberately excludes `page`/`per_page`: only
 * page 1 of a `since`-bounded, ascending-by-`updated_at` query is ever sent
 * with `If-None-Match` (see the pagination comment below), so one key per
 * `(repo, cursor)` pair is all this ever needs to address.
 */
function etagKey(owner: string, repo: string, since: string): string {
  return `GET /repos/${owner}/${repo}/issues?state=all&since=${since}&sort=updated&direction=asc`;
}

function maxUpdatedAt(values: readonly string[], fallback: string): string {
  return values.reduce((max, value) => (value > max ? value : max), fallback);
}

/**
 * Polls one repo for issues updated since its stored cursor and upserts
 * whatever changed. Returns whether any cached issue data actually changed,
 * so the caller only broadcasts `sync:updated` (CLAUDE.md: "after a sync
 * changes data") when there's something for the renderer to refresh.
 *
 * No stored cursor means this repo has never been synced — falls back to
 * `syncRepoIssues`'s full sync (rather than asking GitHub for `since=null`)
 * and seeds the cursor from whatever that full sync cached.
 */
export async function syncRepoIssuesIncremental(
  client: GitHubClient,
  db: BetterSQLite3Database,
  repoFullName: string,
): Promise<{ changed: boolean }> {
  const [owner, repo] = repoFullName.split('/');
  if (!owner || !repo) {
    throw new Error(`Not a valid "owner/repo" full name: ${repoFullName}`);
  }

  const cursor = getSyncCursor(db, repoFullName);
  if (!cursor) {
    await syncRepoIssues(client, db, repoFullName);
    const seeded = getMaxUpdatedAt(db, repoFullName);
    if (seeded) setSyncCursor(db, repoFullName, seeded);
    return { changed: true };
  }

  const key = etagKey(owner, repo, cursor);
  const etag = getEtag(db, key);
  const params = {
    owner,
    repo,
    state: 'all' as const,
    since: cursor,
    sort: 'updated' as const,
    direction: 'asc' as const,
    per_page: PER_PAGE,
  };

  let raw;
  try {
    const response = await client.rest.issues.listForRepo({
      ...params,
      headers: etag ? { 'if-none-match': etag } : undefined,
    });
    if (response.headers.etag) setEtag(db, key, response.headers.etag);
    raw = response.data;
  } catch (error) {
    if (isNotModified(error)) return { changed: false };
    throw error;
  }

  // `since` + `sort=updated` + `direction=asc` means a full first page can't
  // be assumed to be everything there is — paginate the rest.
  // ponytail: re-fetches page 1 (without the conditional header) rather than
  // resuming from page 2, the simplest correct thing since this only
  // matters for a repo with over 100 issues updated inside one poll window.
  if (raw.length === PER_PAGE) {
    raw = await client.paginate(client.rest.issues.listForRepo, params);
  }

  if (raw.length === 0) return { changed: false };

  const issues = raw
    .filter((item) => !isPullRequest(item))
    .map((item) => mapGitHubIssue(item, repoFullName));

  // The cursor must move past every item GitHub returned, even ones that
  // turned out to be pull requests — otherwise a page of nothing-but-PRs
  // would leave `since` unchanged and the next poll would re-fetch the same
  // page forever.
  const rawUpdatedAt = raw.map((item) => item.updated_at);
  setSyncCursor(db, repoFullName, maxUpdatedAt(rawUpdatedAt, cursor));

  if (issues.length === 0) return { changed: false };
  upsertIssues(db, issues);
  return { changed: true };
}
