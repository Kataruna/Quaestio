import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Comment } from '@shared/types';
import {
  listComments,
  replaceComments,
  insertComment,
  deleteCommentsForIssue,
  clearAllComments,
} from '../src/main/db/comments-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

function comment(partial: Partial<Comment> & Pick<Comment, 'id'>): Comment {
  return {
    author: { login: 'sarah-kwan', name: 'Sarah Kwan', avatarUrl: 'https://x/1' },
    body: 'A comment',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('comments-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('listComments is empty for an issue with no cached comments', () => {
    expect(listComments(db, 1)).toEqual([]);
  });

  it('replaceComments then listComments round-trips every field', () => {
    const c = comment({ id: 1, body: 'Looks good' });
    replaceComments(db, 42, [c]);
    expect(listComments(db, 42)).toEqual([c]);
  });

  it('replaceComments only returns comments for the requested issue', () => {
    replaceComments(db, 42, [comment({ id: 1 })]);
    replaceComments(db, 99, [comment({ id: 2 })]);
    expect(listComments(db, 42).map((c) => c.id)).toEqual([1]);
  });

  it('replaceComments deletes and re-inserts, dropping comments no longer present', () => {
    replaceComments(db, 42, [comment({ id: 1 }), comment({ id: 2 })]);
    replaceComments(db, 42, [comment({ id: 2 })]);
    expect(listComments(db, 42).map((c) => c.id)).toEqual([2]);
  });

  it('a null author round-trips as null, not a partially-filled object', () => {
    replaceComments(db, 42, [comment({ id: 1, author: null })]);
    expect(listComments(db, 42)[0]?.author).toBeNull();
  });

  it('insertComment adds one comment without touching the rest of the cache', () => {
    replaceComments(db, 42, [comment({ id: 1 })]);
    insertComment(db, 42, comment({ id: 2, body: 'Second' }));
    expect(listComments(db, 42).map((c) => c.id).sort()).toEqual([1, 2]);
  });

  it("deleteCommentsForIssue removes only that issue's comments", () => {
    replaceComments(db, 42, [comment({ id: 1 })]);
    replaceComments(db, 99, [comment({ id: 2 })]);
    deleteCommentsForIssue(db, 42);
    expect(listComments(db, 42)).toEqual([]);
    expect(listComments(db, 99)).toHaveLength(1);
  });

  it('clearAllComments empties the table and is safe to call again on an empty one', () => {
    replaceComments(db, 42, [comment({ id: 1 })]);
    clearAllComments(db);
    expect(listComments(db, 42)).toEqual([]);
    expect(() => clearAllComments(db)).not.toThrow();
  });
});
