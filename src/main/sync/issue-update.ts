import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { GitHubClient } from '../github/client';
import type { IssuePatch, UpdateIssueResult } from '@shared/ipc-contract';
import { mapGitHubIssue, GITHUB_TYPE_NAME } from '@shared/map-github-issue';
import { hasSyncConflict } from '@shared/sync-conflict';
import { getIssue, upsertIssues, deleteIssue } from '../db/issues-queries';
import { fetchIssue } from '../github/issues';
import { updateIssue, type IssueWritePatch } from '../github/issue-writes';

/** A 404/410/301 fetching this issue by number means it's gone — CLAUDE.md's
 * sync rules (deleted, or transferred somewhere this app doesn't track). */
export function isGone(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  const { status } = error;
  return status === 404 || status === 410 || status === 301;
}

/** `undefined` fields are left out entirely (a patch key present-but-`undefined`
 * would otherwise tell GitHub to clear a field nobody asked to touch).
 * Unassigning goes through `assignees: []`, not `assignee: null` — GitHub's
 * write API is always an array even though this app's `Issue` type keeps a
 * single `assignee` for display (CLAUDE.md's Slice 5 decision). */
export function toGitHubPatch(patch: IssuePatch): IssueWritePatch {
  const out: IssueWritePatch = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.body !== undefined) out.body = patch.body;
  if (patch.state !== undefined) out.state = patch.state;
  if (patch.stateReason !== undefined) out.state_reason = patch.stateReason;
  if (patch.labels !== undefined) out.labels = patch.labels;
  if (patch.assigneeLogin !== undefined) {
    out.assignees = patch.assigneeLogin ? [patch.assigneeLogin] : [];
  }
  if (patch.type !== undefined) out.type = GITHUB_TYPE_NAME[patch.type];
  return out;
}

/**
 * CLAUDE.md's conflict check + write, as one orchestration step — pulled
 * out of the IPC handler so it's testable the same way `incremental-sync.ts`
 * is (mock `GitHubClient`, in-memory migrated DB), instead of only being
 * exercisable by actually driving the Electron IPC layer.
 *
 * Re-fetches the issue live before writing anything. A 404/410/301 there
 * means it's gone (removed from the cache). A mismatched `updated_at` means
 * someone else changed it since `expectedUpdatedAt` was captured — the
 * write is never attempted, and the cache is refreshed with what GitHub
 * actually has now so the renderer's "reload" option has something to read.
 */
export async function performIssueUpdate(
  client: GitHubClient,
  db: BetterSQLite3Database,
  owner: string,
  repo: string,
  repoFullName: string,
  number: number,
  expectedUpdatedAt: string,
  patch: IssuePatch,
): Promise<UpdateIssueResult> {
  let live;
  try {
    live = await fetchIssue(client, owner, repo, number);
  } catch (error) {
    if (isGone(error)) {
      const cached = getIssue(db, repoFullName, number);
      if (cached) deleteIssue(db, cached.id);
      return { kind: 'deleted' };
    }
    throw error;
  }

  if (hasSyncConflict(expectedUpdatedAt, live.updated_at)) {
    const latest = mapGitHubIssue(live, repoFullName);
    upsertIssues(db, [latest]);
    return { kind: 'conflict', latest };
  }

  const updated = await updateIssue(client, owner, repo, number, toGitHubPatch(patch));
  const issue = mapGitHubIssue(updated, repoFullName);
  upsertIssues(db, [issue]);
  return { kind: 'ok', issue };
}
