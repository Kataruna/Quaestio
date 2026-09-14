import { shell } from 'electron';
import { createOAuthDeviceAuth } from '@octokit/auth-oauth-device';
import { mapGitHubUser } from '@shared/map-github-user';
import type { User } from '@shared/types';
import type { DeviceFlowStarted } from '@shared/ipc-contract';
import { createGitHubClient, type GitHubClient } from './client';
import {
  saveToken,
  loadToken,
  clearToken,
  saveLastKnownUser,
  loadLastKnownUser,
  clearLastKnownUser,
} from '../secure-store';

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
  for (const listener of updatedListeners) {
    try {
      listener();
    } catch (error) {
      // One listener throwing (e.g. `webContents.send(...)` on a window
      // destroyed mid-flow) must not stop the remaining listeners from being
      // notified, and must not turn into a rejection of whatever caller
      // (signInWithToken, signOut, ...) triggered this notification after
      // its own work already succeeded.
      console.error(
        'Auth update listener threw:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}

/**
 * Called once at app startup, before any window exists. Fails safe: a
 * corrupted or undecryptable token file (OS keychain change, migration,
 * backup restore) must not block the app from starting. `loadToken()` only
 * swallows ENOENT itself — any other error is caught here, at the
 * startup-blocking call site, rather than in the low-level primitive.
 */
export async function restoreSession(): Promise<void> {
  try {
    currentToken = await loadToken();
  } catch (error) {
    console.error(
      'Failed to restore saved session, starting signed out:',
      error instanceof Error ? error.message : error,
    );
    currentToken = null;
  }
}

/**
 * Returns the signed-in user, or null if there's no token, the stored token
 * is actually invalid (401 — revoked or expired), or the check couldn't
 * complete (offline, GitHub down) with no cached identity to fall back on.
 * Only the 401 case clears the stored token: a network failure isn't
 * evidence the token is bad, and clearing it on every failed call would sign
 * the user out on an offline launch, which breaks this app's offline-first
 * requirement.
 *
 * This app is offline-first per CLAUDE.md ("the app keeps a local SQLite
 * cache so it opens instantly and can be read offline") — a network failure
 * here is not evidence the user is signed out, only that we couldn't
 * confirm it live. So on any non-401 failure, fall back to the last
 * confirmed user cached in `secure-store.ts` (kept fresh on every successful
 * check and on sign-in) rather than bouncing a still-valid session to the
 * sign-in screen. Only a genuinely dead token (401) or a real first-ever
 * offline launch with nothing cached yet should end up returning null.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!currentToken) return null;
  try {
    const client = createGitHubClient(currentToken);
    const { data } = await client.rest.users.getAuthenticated();
    const user = mapGitHubUser(data);
    try {
      await saveLastKnownUser(user);
    } catch (error) {
      // Caching is best-effort — a failed cache write (disk full,
      // permissions) must not make an otherwise-successful live check look
      // like a failure. Falling into this function's own catch block below
      // would report a confirmed-good check as a token failure and could
      // even bounce the user to sign-in, which is exactly the bug this
      // cache exists to prevent.
      console.warn(
        'Failed to cache the signed-in identity:',
        error instanceof Error ? error.message : error,
      );
    }
    return user;
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
      // The token itself is invalid (revoked, expired) — clear it, and clear
      // the cached identity with it, so the app doesn't keep retrying the
      // same broken token or fall back to a dead session's identity.
      currentToken = null;
      await clearToken();
      await clearLastKnownUser();
      return null;
    }
    // Any other failure (offline, GitHub outage, rate limit) is not evidence
    // the token is bad — leave it stored so a later, connected check can
    // still succeed. The session is presumed still valid; return the cached
    // identity if we have one instead of forcing the user through sign-in
    // again for a problem that isn't theirs.
    return loadLastKnownUser();
  }
}

/**
 * Returns a client for the current session, or `null` if signed out. Other
 * main-process modules (repo and issue sync) need a client but must never
 * see the raw token — this is the one sanctioned way to get one.
 */
export function getAuthenticatedClient(): GitHubClient | null {
  return currentToken ? createGitHubClient(currentToken) : null;
}

/** Validates the token against GitHub before accepting it — a token that
 * doesn't work is a sign-in failure, not a stored one. */
export async function signInWithToken(token: string): Promise<User> {
  const client = createGitHubClient(token);
  const { data } = await client.rest.users.getAuthenticated();
  const user = mapGitHubUser(data);
  await saveToken(token);
  currentToken = token;
  try {
    // Cache the identity immediately so a fresh sign-in has a fallback ready
    // for the very next `getCurrentUser()` call, not just after its next
    // successful live check. Best-effort, same as `getCurrentUser()`'s own
    // cache write: a failed cache write here must not surface as a failed
    // sign-in — the token was already saved and the session is genuinely
    // valid, so the next `getCurrentUser()` call will retry the cache write.
    await saveLastKnownUser(user);
  } catch (error) {
    console.warn(
      'Failed to cache the signed-in identity:',
      error instanceof Error ? error.message : error,
    );
  }
  notifyUpdated();
  return user;
}

export async function signOut(): Promise<void> {
  currentToken = null;
  await clearToken();
  await clearLastKnownUser();
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
        // shell.openExternal returns a Promise<void> that can reject
        // (invalid URL, no default browser registrable, sandbox denial).
        // The user still has the code on screen to enter manually if the
        // browser doesn't open, so this is recoverable — just log it
        // instead of leaving an unhandled rejection.
        shell.openExternal(verification.verification_uri).catch((error: unknown) => {
          console.error(
            'Failed to open the verification URL in the browser:',
            error instanceof Error ? error.message : error,
          );
        });
        resolve({
          userCode: verification.user_code,
          verificationUri: verification.verification_uri,
          expiresInSeconds: verification.expires_in,
        });
      },
    });

    auth({ type: 'oauth' })
      .then(async (tokenAuth) => {
        try {
          currentToken = tokenAuth.token;
          await saveToken(tokenAuth.token);
          notifyUpdated();
        } catch (error) {
          // The user DID successfully authorize on github.com — polling
          // itself succeeded. A failure here is this block's own logic
          // (e.g. saveToken throwing because safeStorage became unavailable
          // mid-session), not a device-flow/polling failure, so it must be
          // logged distinctly rather than falling into the outer .catch()
          // and being mislabeled as one. Still notify listeners if
          // currentToken was actually set, so the renderer can act on the
          // fact that the in-process session is live even though it failed
          // to persist to disk — otherwise the user is stuck on the
          // device-code screen indefinitely.
          console.error(
            'Device flow succeeded but failed to persist/notify:',
            error instanceof Error ? error.message : error,
          );
          if (currentToken) notifyUpdated();
        }
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
