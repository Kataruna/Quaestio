import { describe, expect, it, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { Issue } from '@shared/types';
import { listIssues, getIssue, upsertIssues, clearAllIssues } from '../src/main/db/issues-queries';

function freshDb(): BetterSQLite3Database {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: './drizzle' });
  return db;
}

function issue(partial: Partial<Issue> & Pick<Issue, 'id' | 'number' | 'repoFullName'>): Issue {
  return {
    title: 'Untitled',
    body: '',
    state: 'open',
    type: 'chore',
    priority: 'p3',
    labels: [],
    assignee: null,
    milestone: null,
    dueDate: null,
    subtasks: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    htmlUrl: `https://github.com/${partial.repoFullName}/issues/${partial.number}`,
    ...partial,
  };
}

describe('issues-queries', () => {
  let db: BetterSQLite3Database;

  beforeEach(() => {
    db = freshDb();
  });

  it('upsertIssues then listIssues round-trips every field', () => {
    const original = issue({
      id: 1,
      number: 1,
      repoFullName: 'acme/web',
      title: 'Fix the thing',
      body: 'Details here.',
      state: 'open',
      type: 'bug',
      priority: 'p1',
      labels: ['bug', 'p1'],
      assignee: { login: 'sarah-kwan', name: 'Sarah Kwan', avatarUrl: 'https://x/1' },
      milestone: '1.4',
    });
    upsertIssues(db, [original]);
    expect(listIssues(db, 'acme/web')).toEqual([original]);
  });

  it('listIssues only returns issues for the requested repo', () => {
    upsertIssues(db, [
      issue({ id: 1, number: 1, repoFullName: 'acme/web' }),
      issue({ id: 2, number: 1, repoFullName: 'acme/other' }),
    ]);
    expect(listIssues(db, 'acme/web').map((i) => i.id)).toEqual([1]);
  });

  it('getIssue finds by repoFullName and number', () => {
    upsertIssues(db, [issue({ id: 1, number: 42, repoFullName: 'acme/web', title: 'Found me' })]);
    expect(getIssue(db, 'acme/web', 42)?.title).toBe('Found me');
  });

  it('getIssue returns null when nothing matches', () => {
    expect(getIssue(db, 'acme/web', 999)).toBeNull();
  });

  it('upsertIssues is idempotent and updates changed fields on re-sync', () => {
    upsertIssues(db, [
      issue({ id: 1, number: 1, repoFullName: 'acme/web', title: 'Old title', state: 'open' }),
    ]);
    upsertIssues(db, [
      issue({ id: 1, number: 1, repoFullName: 'acme/web', title: 'New title', state: 'closed' }),
    ]);

    const results = listIssues(db, 'acme/web');
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('New title');
    expect(results[0]?.state).toBe('closed');
  });

  it('a null assignee round-trips as null, not a partially-filled object', () => {
    upsertIssues(db, [issue({ id: 1, number: 1, repoFullName: 'acme/web', assignee: null })]);
    expect(listIssues(db, 'acme/web')[0]?.assignee).toBeNull();
  });

  it('preserves existing subtasks across a re-sync, even when the incoming issue has none', () => {
    upsertIssues(db, [
      issue({
        id: 1,
        number: 1,
        repoFullName: 'acme/web',
        subtasks: [{ id: 's1', title: 'Do the thing', done: false }],
      }),
    ]);
    upsertIssues(db, [issue({ id: 1, number: 1, repoFullName: 'acme/web', subtasks: [] })]);

    expect(listIssues(db, 'acme/web')[0]?.subtasks).toEqual([{ id: 's1', title: 'Do the thing', done: false }]);
  });

  it('keeps createdAt pinned to its original value across a re-sync', () => {
    upsertIssues(db, [
      issue({ id: 1, number: 1, repoFullName: 'acme/web', createdAt: '2026-01-01T00:00:00Z' }),
    ]);
    upsertIssues(db, [
      issue({ id: 1, number: 1, repoFullName: 'acme/web', createdAt: '2026-06-01T00:00:00Z' }),
    ]);

    expect(listIssues(db, 'acme/web')[0]?.createdAt).toBe('2026-01-01T00:00:00Z');
  });

  it('clearAllIssues empties the table when rows exist, and is safe to call again on an empty one', () => {
    upsertIssues(db, [
      issue({ id: 1, number: 1, repoFullName: 'acme/web' }),
      issue({ id: 2, number: 2, repoFullName: 'acme/web' }),
    ]);
    expect(listIssues(db, 'acme/web')).toHaveLength(2);

    clearAllIssues(db);
    expect(listIssues(db, 'acme/web')).toEqual([]);

    // Calling it again on an already-empty table must not throw.
    expect(() => clearAllIssues(db)).not.toThrow();
    expect(listIssues(db, 'acme/web')).toEqual([]);
  });
});
