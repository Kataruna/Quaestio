import { z } from 'zod';
import type { Comment, Issue, Repo, SyncStatus, TabSlot, User } from './types';
import { PALETTE_TOKENS, type PaletteOverrides } from './palette-tokens';

// Re-exported so every existing `import { CHANNELS } from '.../ipc-contract'`
// keeps working. The definitions live in the zod-free `./channels` module, which
// the preload imports directly to keep zod out of its bundle.
export { CHANNELS, type Channel } from './channels';

/* ---- payload schemas: main validates every inbound payload with these ---- */

export const signInWithTokenInput = z.object({
  token: z.string().min(1, 'A token is required'),
});
export type SignInWithTokenInput = z.infer<typeof signInWithTokenInput>;

export const setTrackedInput = z.object({
  repoIds: z.array(z.number().int().positive()),
});
export type SetTrackedInput = z.infer<typeof setTrackedInput>;

export const repoFullNameInput = z.object({
  repoFullName: z.string().min(1),
});
export type RepoFullNameInput = z.infer<typeof repoFullNameInput>;

export const listIssuesInput = z.object({
  repoFullName: z.string().min(1),
  search: z.string().optional(),
});
export type ListIssuesInput = z.infer<typeof listIssuesInput>;

export const getIssueInput = z.object({
  repoFullName: z.string().min(1),
  number: z.number().int().positive(),
});
export type GetIssueInput = z.infer<typeof getIssueInput>;

export const createIssueInput = z.object({
  repoFullName: z.string().min(1),
  title: z.string().min(1, 'A title is required'),
  body: z.string().optional(),
});
export type CreateIssueInput = z.infer<typeof createIssueInput>;

/**
 * A field left `undefined` means "don't touch this field"; `labels`/
 * `assigneeLogin` present-but-empty/null means "clear it." `assigneeLogin`
 * stays singular to match `Issue.assignee` (CLAUDE.md's Slice 5 decision —
 * the roadmap says "assignees" but the app's data model never grew past one)
 * even though GitHub's write API underneath takes an array.
 */
export const issuePatchSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  state: z.enum(['open', 'closed']).optional(),
  stateReason: z.enum(['completed', 'not_planned', 'reopened']).nullable().optional(),
  labels: z.array(z.string()).optional(),
  assigneeLogin: z.string().nullable().optional(),
  type: z.enum(['bug', 'feature', 'task']).optional(),
});
export type IssuePatch = z.infer<typeof issuePatchSchema>;

export const updateIssueInput = z.object({
  repoFullName: z.string().min(1),
  number: z.number().int().positive(),
  /** Snapshot of `Issue.updatedAt` from when editing started — CLAUDE.md's
   * conflict check compares this against a live re-fetch before writing. */
  expectedUpdatedAt: z.string().min(1),
  patch: issuePatchSchema,
});
export type UpdateIssueInput = z.infer<typeof updateIssueInput>;

/**
 * `conflict`: the issue changed on GitHub since `expectedUpdatedAt` — the
 * write was NOT attempted; `latest` is what's actually on GitHub now, for
 * the renderer to offer "overwrite" (retry with `latest.updatedAt`) or
 * "reload" (discard local edits).
 * `deleted`: the issue is gone (404/410/301) — already removed from the cache.
 */
export type UpdateIssueResult =
  | { kind: 'ok'; issue: Issue }
  | { kind: 'conflict'; latest: Issue }
  | { kind: 'deleted' };

export const setDueDateInput = z.object({
  repoFullName: z.string().min(1),
  number: z.number().int().positive(),
  /** ISO 8601 date, or `null` to clear it. Local-only — never sent to GitHub. */
  dueDate: z.string().min(1).nullable(),
});
export type SetDueDateInput = z.infer<typeof setDueDateInput>;

export const getCommentsInput = z.object({
  repoFullName: z.string().min(1),
  number: z.number().int().positive(),
});
export type GetCommentsInput = z.infer<typeof getCommentsInput>;

export type GetCommentsResult = { kind: 'ok'; comments: Comment[] } | { kind: 'deleted' };

export const addCommentInput = z.object({
  repoFullName: z.string().min(1),
  number: z.number().int().positive(),
  body: z.string().min(1),
});
export type AddCommentInput = z.infer<typeof addCommentInput>;

export const fetchImageInput = z.object({
  url: z.string().url(),
});
export type FetchImageInput = z.infer<typeof fetchImageInput>;

export const setActiveRepoInput = z.object({
  repoFullName: z.string().min(1).nullable(),
});
export type SetActiveRepoInput = z.infer<typeof setActiveRepoInput>;

export const setTabGroupsEnabledInput = z.object({ enabled: z.boolean() });
export type SetTabGroupsEnabledInput = z.infer<typeof setTabGroupsEnabledInput>;

export const themeSchema = z.enum(['light', 'dark', 'system']);
export type Theme = z.infer<typeof themeSchema>;

export const setThemeInput = z.object({ theme: themeSchema });
export type SetThemeInput = z.infer<typeof setThemeInput>;

export const paletteTokenSchema = z.enum(PALETTE_TOKENS);

export const setPaletteOverrideInput = z.object({
  mode: z.enum(['light', 'dark']),
  token: paletteTokenSchema,
  value: z.string().nullable(),
});
export type SetPaletteOverrideInput = z.infer<typeof setPaletteOverrideInput>;

export const resetPaletteInput = z.object({ mode: z.enum(['light', 'dark']) });
export type ResetPaletteInput = z.infer<typeof resetPaletteInput>;

export const tabSlotSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('repo'), fullName: z.string().min(1) }),
  z.object({
    kind: z.literal('group'),
    id: z.string().min(1),
    repoFullNames: z.array(z.string().min(1)).min(2),
  }),
]);

export const setTabLayoutInput = z.object({ slots: z.array(tabSlotSchema) });
export type SetTabLayoutInput = z.infer<typeof setTabLayoutInput>;

export const setOnlineInput = z.object({
  online: z.boolean(),
});
export type SetOnlineInput = z.infer<typeof setOnlineInput>;

export const deviceFlowStarted = z.object({
  userCode: z.string(),
  verificationUri: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
});
export type DeviceFlowStarted = z.infer<typeof deviceFlowStarted>;

/**
 * The surface `window.api` exposes. The preload implements exactly this —
 * no more, and never `ipcRenderer` itself.
 */
export interface Api {
  platform: NodeJS.Platform;
  auth: {
    signInWithToken(input: SignInWithTokenInput): Promise<User>;
    startDeviceFlow(): Promise<DeviceFlowStarted>;
    signOut(): Promise<void>;
    getUser(): Promise<User | null>;
    /** Returns an unsubscribe function. */
    onUpdated(listener: () => void): () => void;
  };
  repos: {
    list(): Promise<Repo[]>;
    setTracked(input: SetTrackedInput): Promise<Repo[]>;
    /** The repo's existing label names, for the labels-dropdown typeahead. Best-effort: [] on any failure. */
    listLabels(input: { repoFullName: string }): Promise<string[]>;
    /** The repo's collaborator logins, for the assignee typeahead. Best-effort: [] on any failure. */
    listCollaborators(input: { repoFullName: string }): Promise<string[]>;
  };
  issues: {
    list(input: ListIssuesInput): Promise<Issue[]>;
    get(input: GetIssueInput): Promise<Issue | null>;
    create(input: CreateIssueInput): Promise<Issue>;
    update(input: UpdateIssueInput): Promise<UpdateIssueResult>;
    /** Local-only — GitHub has no issue due-date field, so this never calls GitHub. */
    setDueDate(input: SetDueDateInput): Promise<Issue | null>;
    getComments(input: GetCommentsInput): Promise<GetCommentsResult>;
    addComment(input: AddCommentInput): Promise<Comment>;
  };
  sync: {
    now(): Promise<void>;
    getStatus(): Promise<SyncStatus>;
    setActiveRepo(input: SetActiveRepoInput): Promise<void>;
    setOnline(input: SetOnlineInput): Promise<void>;
    /** Returns an unsubscribe function. */
    onUpdated(listener: (repoFullName: string) => void): () => void;
    /** Returns an unsubscribe function. */
    onStatusChanged(listener: (status: SyncStatus) => void): () => void;
  };
  images: {
    /**
     * GitHub gates issue-attachment images (github.com/user-attachments/...,
     * *.githubusercontent.com) behind its own session — the renderer's CORB
     * blocks an <img src> pointed at them directly. This fetches the bytes
     * through the authenticated main process and returns a `data:` URL, or
     * `null` if the host isn't a recognized GitHub asset domain, there's no
     * signed-in session, or the fetch failed.
     */
    fetch(input: FetchImageInput): Promise<string | null>;
  };
  settings: {
    get(): Promise<{ tabGroupsEnabled: boolean; theme: Theme }>;
    setTabGroupsEnabled(input: SetTabGroupsEnabledInput): Promise<void>;
    setTheme(input: SetThemeInput): Promise<void>;
  };
  theme: {
    getPaletteOverrides(): Promise<PaletteOverrides>;
    setPaletteOverride(input: SetPaletteOverrideInput): Promise<void>;
    resetPalette(input: ResetPaletteInput): Promise<void>;
    /** null means the user canceled the save dialog. */
    exportPalette(): Promise<{ path: string } | null>;
    /** null means the user canceled the open dialog; throws on an unreadable/invalid file. */
    importPalette(): Promise<PaletteOverrides | null>;
  };
  tabLayout: {
    get(): Promise<TabSlot[]>;
    set(input: SetTabLayoutInput): Promise<void>;
  };
}
