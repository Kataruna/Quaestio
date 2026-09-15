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
  fullName: text('fullName').notNull(),
  isPrivate: integer('isPrivate', { mode: 'boolean' }).notNull(),
  openIssueCount: integer('openIssueCount').notNull(),
  updatedAt: text('updatedAt').notNull(),
  tracked: integer('tracked', { mode: 'boolean' }).notNull().default(false),
  /**
   * The `since` cursor for this repo's incremental issue sync — the maximum
   * `updated_at` seen from GitHub across every issue fetched so far, never
   * the local clock (CLAUDE.md's sync rules). `null` means this repo has
   * never been synced (or only ever full-synced): the next poll should fall
   * back to a full sync instead of asking GitHub for `since=null`.
   */
  syncCursor: text('syncCursor'),
});

/**
 * Single-row table (`id` is always 1) holding app-wide, local-only settings.
 * The first real piece of persisted app settings in this app — the other
 * toggles on `SettingsScreen` stay fixture-only `useState`, unwired, as they
 * were before this feature.
 */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  tabGroupsEnabled: integer('tabGroupsEnabled', { mode: 'boolean' }).notNull().default(false),
});

/**
 * Single-row table (`id` is always 1) holding the repo-tab-strip layout as
 * JSON — a `TabSlot[]` (see `shared/types.ts`). Local-only view state,
 * unrelated to GitHub. Kept even while `settings.tabGroupsEnabled` is off,
 * so turning the feature back on restores exactly what the user had.
 */
export const tabLayout = sqliteTable('tab_layout', {
  id: integer('id').primaryKey(),
  layout: text('layout').notNull().default('[]'),
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
  type: text('type').notNull().$type<'bug' | 'feature' | 'task'>(),
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

/**
 * One row per polled request URL (CLAUDE.md: "store the ETag for each
 * request URL"). A 304 response means nothing changed and doesn't count
 * against the rate limit, so the incremental sync sends `If-None-Match`
 * with whatever's stored here before falling back to a real fetch.
 */
export const syncEtags = sqliteTable('sync_etags', {
  url: text('url').primaryKey(),
  etag: text('etag').notNull(),
});

/**
 * `issueId` is GitHub's numeric issue id (matches `issues.id`). Comments are
 * fetched only when an issue is opened, never background-synced (CLAUDE.md)
 * — `comments-queries.ts`'s `replaceComments` deletes and re-inserts a
 * repo's full comment set on every fetch rather than diffing, since there's
 * no incremental cursor for them the way there is for issues.
 */
export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey(),
  issueId: integer('issueId').notNull(),
  authorLogin: text('authorLogin'),
  authorName: text('authorName'),
  authorAvatarUrl: text('authorAvatarUrl'),
  body: text('body').notNull(),
  createdAt: text('createdAt').notNull(),
  updatedAt: text('updatedAt').notNull(),
});
