/**
 * Channel names live in one place so main and preload cannot drift.
 *
 * This module is deliberately dependency-free. The preload imports it directly
 * rather than reaching through `ipc-contract`, so zod (which only the main
 * process needs, to validate inbound payloads) never reaches the preload
 * bundle.
 */
export const CHANNELS = {
  authSignInWithToken: 'auth:sign-in-with-token',
  authStartDeviceFlow: 'auth:start-device-flow',
  authSignOut: 'auth:sign-out',
  authGetUser: 'auth:get-user',
  /** Main -> renderer push after sign-in, sign-out, or a device-flow login completes. */
  authUpdated: 'auth:updated',
  reposList: 'repos:list',
  reposSetTracked: 'repos:set-tracked',
  issuesList: 'issues:list',
  issuesGet: 'issues:get',
  issuesUpdate: 'issues:update',
  issuesGetComments: 'issues:get-comments',
  issuesAddComment: 'issues:add-comment',
  syncNow: 'sync:now',
  syncGetStatus: 'sync:get-status',
  syncSetActiveRepo: 'sync:set-active-repo',
  syncSetOnline: 'sync:set-online',
  /** Main -> renderer push after a sync changes data. */
  syncUpdated: 'sync:updated',
  /** Main -> renderer push whenever the sync-status indicator changes. */
  syncStatusChanged: 'sync:status-changed',
  imagesFetch: 'images:fetch',
} as const;

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];
