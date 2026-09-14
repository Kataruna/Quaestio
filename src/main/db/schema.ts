import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

/**
 * `id` is GitHub's own numeric repo id — stable across renames, unlike
 * `fullName`. `tracked` is local-only state GitHub has no concept of;
 * `repos-queries.ts`'s `upsertRepos` is responsible for never clobbering it
 * on a refresh.
 */
export const repos = sqliteTable('repos', {
  id: integer('id').primaryKey(),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  fullName: text('fullName').notNull().unique(),
  isPrivate: integer('isPrivate', { mode: 'boolean' }).notNull(),
  openIssueCount: integer('openIssueCount').notNull(),
  updatedAt: text('updatedAt').notNull(),
  tracked: integer('tracked', { mode: 'boolean' }).notNull().default(false),
});

/**
 * `id` is GitHub's numeric issue id (globally unique across repos, unlike
 * `number` which only counts within one repo). `labels` and `subtasks` are
 * JSON-encoded arrays — SQLite has no native array type, and neither field
 * needs to be queried by individual element in this slice, so a JSON text
 * column is simpler than a join table. `assignee*` columns are flattened
 * (not a JSON blob) because `assigneeLogin` is genuinely useful to filter or
 * display without deserializing, and there are only three fields.
 */
export const issues = sqliteTable('issues', {
  id: integer('id').primaryKey(),
  number: integer('number').notNull(),
  repoFullName: text('repoFullName').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  state: text('state').notNull().$type<'open' | 'closed'>(),
  type: text('type').notNull().$type<'bug' | 'feature' | 'chore'>(),
  priority: text('priority').notNull().$type<'p1' | 'p2' | 'p3'>(),
  labels: text('labels').notNull(),
  assigneeLogin: text('assigneeLogin'),
  assigneeName: text('assigneeName'),
  assigneeAvatarUrl: text('assigneeAvatarUrl'),
  milestone: text('milestone'),
  dueDate: text('dueDate'),
  subtasks: text('subtasks').notNull().default('[]'),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
  htmlUrl: text('htmlUrl').notNull(),
});
