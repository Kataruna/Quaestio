import { z } from 'zod';
import type { Issue, Repo, SyncStatus, User } from './types';

/** Channel names live in one place so main and preload cannot drift. */
export const CHANNELS = {
  authSignInWithToken: 'auth:sign-in-with-token',
  authStartDeviceFlow: 'auth:start-device-flow',
  authSignOut: 'auth:sign-out',
  authGetUser: 'auth:get-user',
  reposList: 'repos:list',
  reposSetTracked: 'repos:set-tracked',
  issuesList: 'issues:list',
  issuesGet: 'issues:get',
  syncNow: 'sync:now',
  syncGetStatus: 'sync:get-status',
  /** Main -> renderer push after a sync changes data. */
  syncUpdated: 'sync:updated',
} as const;

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];

/* ---- payload schemas: main validates every inbound payload with these ---- */

export const signInWithTokenInput = z.object({
  token: z.string().min(1, 'A token is required'),
});
export type SignInWithTokenInput = z.infer<typeof signInWithTokenInput>;

export const setTrackedInput = z.object({
  repoIds: z.array(z.number().int().positive()),
});
export type SetTrackedInput = z.infer<typeof setTrackedInput>;

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
  };
  repos: {
    list(): Promise<Repo[]>;
    setTracked(input: SetTrackedInput): Promise<Repo[]>;
  };
  issues: {
    list(input: ListIssuesInput): Promise<Issue[]>;
    get(input: GetIssueInput): Promise<Issue | null>;
  };
  sync: {
    now(): Promise<void>;
    getStatus(): Promise<SyncStatus>;
    /** Returns an unsubscribe function. */
    onUpdated(listener: (repoFullName: string) => void): () => void;
  };
}
