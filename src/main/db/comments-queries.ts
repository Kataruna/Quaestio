import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { comments } from './schema';
import type { Comment } from '@shared/types';

function rowToComment(row: typeof comments.$inferSelect): Comment {
  return {
    id: row.id,
    author: row.authorLogin
      ? {
          login: row.authorLogin,
          name: row.authorName ?? row.authorLogin,
          avatarUrl: row.authorAvatarUrl,
        }
      : null,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listComments(db: BetterSQLite3Database, issueId: number): Comment[] {
  return db
    .select()
    .from(comments)
    .where(eq(comments.issueId, issueId))
    .all()
    .map(rowToComment);
}

/**
 * Replaces every cached comment for one issue with a freshly-fetched set.
 * Comments have no incremental cursor the way issues do (CLAUDE.md: fetch
 * and cache on open, never background-sync), so delete-then-reinsert on
 * every fetch is simpler than diffing and is only ever called for one issue
 * at a time — never at background-sync volume.
 */
export function replaceComments(
  db: BetterSQLite3Database,
  issueId: number,
  incoming: Comment[],
): void {
  db.transaction((tx) => {
    tx.delete(comments).where(eq(comments.issueId, issueId)).run();
    for (const comment of incoming) {
      tx.insert(comments)
        .values({
          id: comment.id,
          issueId,
          authorLogin: comment.author?.login ?? null,
          authorName: comment.author?.name ?? null,
          authorAvatarUrl: comment.author?.avatarUrl ?? null,
          body: comment.body,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        })
        .run();
    }
  });
}

/** Adds one newly-created comment without touching the rest of the cache. */
export function insertComment(db: BetterSQLite3Database, issueId: number, comment: Comment): void {
  db.insert(comments)
    .values({
      id: comment.id,
      issueId,
      authorLogin: comment.author?.login ?? null,
      authorName: comment.author?.name ?? null,
      authorAvatarUrl: comment.author?.avatarUrl ?? null,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    })
    .run();
}

export function deleteCommentsForIssue(db: BetterSQLite3Database, issueId: number): void {
  db.delete(comments).where(eq(comments.issueId, issueId)).run();
}

/** Deletes every row — called on sign-out, matching `clearAllIssues`/`clearAllRepos`. */
export function clearAllComments(db: BetterSQLite3Database): void {
  db.delete(comments).run();
}
