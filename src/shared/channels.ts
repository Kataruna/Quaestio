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
