export type IssueType = 'bug' | 'feature' | 'chore';
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
  /** Derived from labels — see label-mapping.ts */
  type: IssueType;
  /** Derived from labels — see label-mapping.ts */
  priority: Priority;
  labels: string[];
  assignee: User | null;
  milestone: string | null;
  /** GitHub has no issue due date; this comes from the milestone in later slices. */
  dueDate: string | null;
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export type SyncStatus =
  | { kind: 'synced'; at: string }
  | { kind: 'syncing' }
  | { kind: 'offline' }
  | { kind: 'rate-limited'; resetAt: string }
  | { kind: 'error'; message: string };
