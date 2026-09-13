import { shell } from 'electron';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { mapGitHubUser } from '@shared/map-github-user';
import type { User } from '@shared/types';
import type { DeviceFlowStarted } from '@shared/ipc-contract';
import { createGitHubClient } from './client';
import { saveToken, loadToken, clearToken } from '../secure-store';

// Device flow needs no client secret — GitHub's device authorization grant
// only ever requires the client ID. This value is not sensitive; it's a
// public identifier for the OAuth App, the same way the GitHub CLI ships
// its own device-flow client ID directly in its public source.
const GITHUB_OAUTH_CLIENT_ID = 'Ov23lit6UTTqvRJLjXpY';
const SCOPES = ['repo', 'read:user'];

let currentToken: string | null = null;
let updatedListeners: Array<() => void> = [];

/** Fires after sign-in, sign-out, or a device-flow login completing in the background. */
export function onAuthUpdated(listener: () => void): () => void {
  updatedListeners.push(listener);
  return () => {
    updatedListeners = updatedListeners.filter((existing) => existing !== listener);
  };
}

function notifyUpdated(): void {
  for (const listener of updatedListeners) listener();
}

/** Called once at app startup, before any window exists. */
export async function restoreSession(): Promise<void> {
  currentToken = await loadToken();
}

/**
 * Returns the signed-in user, or null if there's no token, the stored token
 * is actually invalid (401 — revoked or expired), or the check couldn't
 * complete (offline, GitHub down). Only the 401 case clears the stored
 * token: a network failure isn't evidence the token is bad, and clearing it
 * on every failed call would sign the user out on an offline launch, which
 * breaks this app's offline-first requirement.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!currentToken) return null;
  try {
    const client = createGitHubClient(currentToken);
    const { data } = await client.rest.users.getAuthenticated();
    return mapGitHubUser(data);
  } catch (error) {
    // Log `.message` only, never the full error object. This is a
    // defense-in-depth precaution, independent of whether the installed
    // @octokit/request-error currently redacts the Authorization header on
    // its attached request — CLAUDE.md requires never logging the token
    // regardless of what today's dependency version happens to do.
    const status =
      typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
    console.warn(
      'GitHub token check failed:',
      error instanceof Error ? error.message : error,
    );
    if (status === 401) {
      // The token itself is invalid (revoked, expired) — clear it so the
      // app doesn't keep retrying the same broken token.
      currentToken = null;
      await clearToken();
    }
    // Any other failure (offline, GitHub outage, rate limit) is not evidence
    // the token is bad — leave it stored so a later, connected check can
    // still succeed.
    return null;
  }
}

/** Validates the token against GitHub before accepting it — a token that
 * doesn't work is a sign-in failure, not a stored one. */
export async function signInWithToken(token: string): Promise<User> {
  const client = createGitHubClient(token);
  const { data } = await client.rest.users.getAuthenticated();
  const user = mapGitHubUser(data);
  currentToken = token;
  await saveToken(token);
  notifyUpdated();
  return user;
}

export async function signOut(): Promise<void> {
  currentToken = null;
  await clearToken();
  notifyUpdated();
}

/**
 * Starts the OAuth device flow. Resolves as soon as GitHub issues a user
 * code (fast — this is what the renderer shows immediately), while the
 * actual authorization continues polling in the background. When that
 * background poll succeeds, `onAuthUpdated` fires and the renderer finds
 * out by calling `getCurrentUser()` again.
 */
export async function startDeviceFlow(): Promise<DeviceFlowStarted> {
  return new Promise((resolve, reject) => {
    let verificationReceived = false;

    const auth = createOAuthDeviceAuth({
      clientType: 'oauth-app',
      clientId: GITHUB_OAUTH_CLIENT_ID,
      scopes: SCOPES,
      onVerification(verification) {
        verificationReceived = true;
        void shell.openExternal(verification.verification_uri);
        resolve({
          userCode: verification.user_code,
          verificationUri: verification.verification_uri,
          expiresInSeconds: verification.expires_in,
        });
      },
    });

    auth({ type: 'oauth' })
      .then(async (tokenAuth) => {
        currentToken = tokenAuth.token;
        await saveToken(tokenAuth.token);
        notifyUpdated();
      })
      .catch((error: unknown) => {
        if (!verificationReceived) {
          // Failed before GitHub ever gave us a code to show — this is a
          // real failure of startDeviceFlow itself (bad client ID, network
          // down), not something that happens after the user is already
          // looking at a code.
          reject(error instanceof Error ? error : new Error('Failed to start device flow'));
        } else {
          // Failed after the code was already shown — expired or denied.
          // The renderer never gets an auth:updated push and the device
          // code screen's own copy already sets the expectation that this
          // can time out; nothing more to signal here. Log `.message` only,
          // never the whole error object — CLAUDE.md forbids ever logging a
          // token. The installed @octokit/auth-oauth-device (see
          // dist-src/get-oauth-access-token.js) throws the raw RequestError
          // from the failed token-exchange request (shaped like GitHub's own
          // `{ error: 'expired_token' }` / `{ error: 'access_denied' }`
          // device-flow errors) — it never echoes a token back in the error,
          // since the exchange that would have produced one never succeeded.
          console.error(
            'Device flow polling failed after the code was shown:',
            error instanceof Error ? error.message : error,
          );
        }
      });
  });
}
