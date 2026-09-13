import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { User } from '@shared/types';

const TOKEN_FILE_NAME = 'github-token.enc';
const LAST_KNOWN_USER_FILE_NAME = 'last-known-user.json';

function tokenFilePath(): string {
  return path.join(app.getPath('userData'), TOKEN_FILE_NAME);
}

function lastKnownUserFilePath(): string {
  return path.join(app.getPath('userData'), LAST_KNOWN_USER_FILE_NAME);
}

/** Minimal runtime shape check for a parsed `last-known-user.json` — this
 * file is only ever written by `saveLastKnownUser`, but a partial write or
 * disk corruption could still leave it holding something that isn't a
 * `User`, and blindly trusting a cast would let that corruption propagate
 * into the renderer as a fake signed-in identity. */
function isUserShaped(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.login === 'string' &&
    typeof candidate.name === 'string' &&
    (typeof candidate.avatarUrl === 'string' || candidate.avatarUrl === null)
  );
}

/**
 * Encrypts and writes the token to disk. Throws if this machine's OS
 * keychain/credential store isn't available — safeStorage has no fallback,
 * and silently storing a token in plaintext would violate CLAUDE.md's
 * security rules.
 */
export async function saveToken(token: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'This machine cannot encrypt saved data (safeStorage is unavailable). Sign-in cannot persist.',
    );
  }
  const encrypted = safeStorage.encryptString(token);
  await fs.writeFile(tokenFilePath(), encrypted);
}

/**
 * Reads and decrypts the stored token, or returns null if there isn't one
 * (first launch, or after sign-out) or if this machine can't decrypt it.
 */
export async function loadToken(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    const encrypted = await fs.readFile(tokenFilePath());
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Deletes the stored token file. A no-op if it doesn't exist. */
export async function clearToken(): Promise<void> {
  try {
    await fs.unlink(tokenFilePath());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

/**
 * Writes the last confirmed signed-in user to a plain (unencrypted) JSON
 * file, alongside the token file in the same `app.getPath('userData')`
 * directory. `login`/`name`/`avatarUrl` are not secrets — they're already
 * visible in the sidebar UI — so this doesn't need `safeStorage`.
 */
export async function saveLastKnownUser(user: User): Promise<void> {
  await fs.writeFile(lastKnownUserFilePath(), JSON.stringify(user));
}

/**
 * Reads and parses the cached last-known user, or returns null if there
 * isn't one (first launch, or after sign-out), if the file is corrupted
 * (partial write, disk error), or if its parsed contents don't look like a
 * `User`. A corrupted cache file must never crash anything — fail safe back
 * to null, the same fail-safe philosophy `restoreSession()` uses in
 * `auth.ts`.
 */
export async function loadLastKnownUser(): Promise<User | null> {
  try {
    const raw = await fs.readFile(lastKnownUserFilePath(), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return isUserShaped(parsed) ? parsed : null;
  } catch (error) {
    // Unlike `loadToken` (whose rethrow is caught by `restoreSession()`),
    // this is called from `getCurrentUser()`'s own failure path in
    // `auth.ts`, which has nothing left to fall back on — a rejection here
    // would turn a degraded cache into a rejected IPC call and bounce the
    // user to sign-in, exactly what this cache exists to prevent. So ENOENT
    // (no cache yet) and everything else (corrupt JSON, unreadable file)
    // mean the same thing here: no usable cached identity.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(
        'Ignoring unreadable last-known-user cache:',
        error instanceof Error ? error.message : error,
      );
    }
    return null;
  }
}

/** Deletes the cached last-known-user file. A no-op if it doesn't exist. */
export async function clearLastKnownUser(): Promise<void> {
  try {
    await fs.unlink(lastKnownUserFilePath());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
