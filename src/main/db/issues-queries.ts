import { and, eq } from 'drizzle-orm';
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

export function listIssues(db: BetterSQLite3Database, repoFullName: string): Issue[] {
  return db
    .select()
    .from(issues)
    .where(eq(issues.repoFullName, repoFullName))
    .all()
    .map(rowToIssue);
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
 * `subtasks` and `createdAt` are intentionally excluded from the `onConflictDoUpdate` set.
 *
 * `subtasks` is local-only and GitHub never supplies it, so a re-sync must never erase a
 * user's local checklist progress once that becomes editable in a later slice. Every
 * incoming `Issue` currently has `subtasks: []` anyway (see `map-github-issue.ts`), so
 * this has no visible effect yet — it's a guard against future drift, not a workaround
 * for a bug today.
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
            dueDate: row.dueDate,
            updatedAt: row.updatedAt,
            htmlUrl: row.htmlUrl,
          },
        })
        .run();
    }
  });
}
