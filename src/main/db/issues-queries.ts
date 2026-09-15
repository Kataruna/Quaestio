import { and, eq, like, or, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { issues } from './schema';
import type { Issue } from '@shared/types';

function rowToIssue(row: typeof issues.$inferSelect): Issue {
  return {
    id: row.id,
    number: row.number,
    repoFullName: row.repoFullName,
    title: row.title,
    body: row.body,
    state: row.state,
    type: row.type,
    priority: row.priority,
    labels: JSON.parse(row.labels) as string[],
    assignee: row.assigneeLogin
      ? {
          login: row.assigneeLogin,
          name: row.assigneeName ?? row.assigneeLogin,
          avatarUrl: row.assigneeAvatarUrl,
        }
      : null,
    milestone: row.milestone,
    dueDate: row.dueDate,
    subtasks: JSON.parse(row.subtasks) as Issue['subtasks'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    htmlUrl: row.htmlUrl,
  };
}

/**
 * `search`, given, matches title or body via SQL `LIKE` — the SQLite-backed
 * filter Slice 6 owns (`ipc/issues.ts`'s `issues:list` handler used to
 * validate and discard it). The board's own search box stays client-side
 * (see BoardScreen) since its query key can't change without breaking the
 * optimistic-update cache IssueDetailDialog writes into; this is for
 * SearchScreen's cross-repo search, which has no such cache to protect.
 */
export function listIssues(db: BetterSQLite3Database, repoFullName: string, search?: string): Issue[] {
  const needle = search?.trim();
  return db
    .select()
    .from(issues)
    .where(
      and(
        eq(issues.repoFullName, repoFullName),
        needle ? or(like(issues.title, `%${needle}%`), like(issues.body, `%${needle}%`)) : undefined,
      ),
    )
    .all()
    .map(rowToIssue);
}

/** Deletes every row — called on sign-out so a different GitHub account
 * signing in afterward never sees a previous account's cached issues. */
export function clearAllIssues(db: BetterSQLite3Database): void {
  db.delete(issues).run();
}

/** A 404/410/301 fetching this issue by number means it's gone (deleted,
 * or transferred somewhere this app doesn't track) — CLAUDE.md's sync rules. */
export function deleteIssue(db: BetterSQLite3Database, id: number): void {
  db.delete(issues).where(eq(issues.id, id)).run();
}

/**
 * The newest `updatedAt` cached for a repo — used to seed the incremental
 * sync cursor right after a full sync, since `updatedAt` is a plain text
 * column (ISO 8601 sorts lexicographically the same as chronologically) and
 * `mapGitHubIssue` never invents this value locally.
 */
export function getMaxUpdatedAt(db: BetterSQLite3Database, repoFullName: string): string | null {
  const row = db
    .select({ max: sql<string | null>`max(${issues.updatedAt})` })
    .from(issues)
    .where(eq(issues.repoFullName, repoFullName))
    .get();
  return row?.max ?? null;
}

/**
 * `dueDate` is local-only (like `subtasks`) — GitHub has no issue due-date
 * field, so this never touches the network and is excluded from
 * `upsertIssues`'s `onConflictDoUpdate` set for the same reason `subtasks` is.
 */
export function setIssueDueDate(db: BetterSQLite3Database, id: number, dueDate: string | null): void {
  db.update(issues).set({ dueDate }).where(eq(issues.id, id)).run();
}

export function getIssue(
  db: BetterSQLite3Database,
  repoFullName: string,
  number: number,
): Issue | null {
  const row = db
    .select()
    .from(issues)
    .where(and(eq(issues.repoFullName, repoFullName), eq(issues.number, number)))
    .get();
  return row ? rowToIssue(row) : null;
}

/**
 * `subtasks`, `dueDate`, and `createdAt` are intentionally excluded from the `onConflictDoUpdate` set.
 *
 * `subtasks` is local-only and GitHub never supplies it, so a re-sync must never erase a
 * user's local checklist progress once that becomes editable in a later slice. Every
 * incoming `Issue` currently has `subtasks: []` anyway (see `map-github-issue.ts`), so
 * this has no visible effect yet — it's a guard against future drift, not a workaround
 * for a bug today.
 *
 * `dueDate` is the same story, except it's no longer hypothetical: it's genuinely
 * editable now (`setIssueDueDate`), and `mapGitHubIssue` always maps incoming issues to
 * `dueDate: null` — without this exclusion, the very next sync after a user picks a due
 * date would silently wipe it back out.
 *
 * `createdAt` is pinned to its original value because a future locally-constructed `Issue`
 * (e.g. new-issue creation or an optimistic update) could otherwise let a subsequent sync
 * overwrite the true original creation date.
 *
 * Runs as a single transaction, matching `repos-queries.ts`'s `upsertRepos` — a mid-batch
 * failure should roll back rather than leave issues half-synced.
 */
export function upsertIssues(db: BetterSQLite3Database, incoming: Issue[]): void {
  db.transaction((tx) => {
    for (const issue of incoming) {
      const row = {
        id: issue.id,
        number: issue.number,
        repoFullName: issue.repoFullName,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        type: issue.type,
        priority: issue.priority,
        labels: JSON.stringify(issue.labels),
        assigneeLogin: issue.assignee?.login ?? null,
        assigneeName: issue.assignee?.name ?? null,
        assigneeAvatarUrl: issue.assignee?.avatarUrl ?? null,
        milestone: issue.milestone,
        dueDate: issue.dueDate,
        subtasks: JSON.stringify(issue.subtasks),
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        htmlUrl: issue.htmlUrl,
      };
      tx.insert(issues)
        .values(row)
        .onConflictDoUpdate({
          target: issues.id,
          set: {
            number: row.number,
            repoFullName: row.repoFullName,
            title: row.title,
            body: row.body,
            state: row.state,
            type: row.type,
            priority: row.priority,
            labels: row.labels,
            assigneeLogin: row.assigneeLogin,
            assigneeName: row.assigneeName,
            assigneeAvatarUrl: row.assigneeAvatarUrl,
            milestone: row.milestone,
            updatedAt: row.updatedAt,
            htmlUrl: row.htmlUrl,
          },
        })
        .run();
    }
  });
}
