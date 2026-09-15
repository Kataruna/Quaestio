export type IssueType = 'bug' | 'feature' | 'task';
export type Priority = 'p1' | 'p2' | 'p3';
export type IssueState = 'open' | 'closed';

export interface User {
  login: string;
  name: string;
  /** GitHub avatar URL. Slice 1 renders initials, so fixtures leave this null. */
  avatarUrl: string | null;
}

export interface Repo {
  id: number;
  owner: string;
  name: string;
  /** "acme/atlas-web" */
  fullName: string;
  isPrivate: boolean;
  openIssueCount: number;
  /** ISO 8601 */
  updatedAt: string;
  tracked: boolean;
}

/** Local-only checklist item. Never pushed to GitHub. */
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Issue {
  id: number;
  number: number;
  repoFullName: string;
  title: string;
  body: string;
  state: IssueState;
  /** GitHub's native Issue Type field, not a label — see map-github-issue.ts */
  type: IssueType;
  /** Derived from labels — see label-mapping.ts */
  priority: Priority;
  labels: string[];
  assignee: User | null;
  milestone: string | null;
  /**
   * Local-only, like `subtasks` — GitHub has no issue due-date field.
   * Deliberately not derived from the milestone's `due_on`: that's shared
   * across every issue in the milestone, so a per-issue picker writing to it
   * would silently move other issues' due dates too.
   */
  dueDate: string | null;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

/** A GitHub issue comment. Fetched (and cached) only when the issue is
 * opened — comments are never background-synced (CLAUDE.md). */
export interface Comment {
  id: number;
  author: User | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type SyncStatus =
  | { kind: 'synced'; at: string }
  | { kind: 'syncing' }
  | { kind: 'offline' }
  | { kind: 'rate-limited'; resetAt: string }
  | { kind: 'error'; message: string };
