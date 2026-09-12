import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TOKEN_FILE_NAME = 'github-token.enc';

function tokenFilePath(): string {
  return path.join(app.getPath('userData'), TOKEN_FILE_NAME);
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
