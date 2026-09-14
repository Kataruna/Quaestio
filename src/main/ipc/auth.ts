import { BrowserWindow, ipcMain } from 'electron';
import { signInWithTokenInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import {
  getCurrentUser,
  onAuthUpdated,
  signInWithToken,
  signOut,
  startDeviceFlow,
} from '../github/auth';
import { getDb } from '../db/client';
import { clearAllRepos } from '../db/repos-queries';
import { clearAllIssues } from '../db/issues-queries';
import { clearAllComments } from '../db/comments-queries';

/**
 * Registers every auth:* IPC handler exactly once. Call this once at app
 * startup — not per-window — since `ipcMain.handle` throws if a channel is
 * registered twice, and macOS can recreate windows without restarting the
 * app (the `activate` handler in main/index.ts).
 */
export function registerAuthHandlers(): void {
  ipcMain.handle(CHANNELS.authSignInWithToken, async (_event, rawInput: unknown) => {
    const { token } = signInWithTokenInput.parse(rawInput);
    return signInWithToken(token);
  });

  ipcMain.handle(CHANNELS.authStartDeviceFlow, async () => {
    return startDeviceFlow();
  });

  ipcMain.handle(CHANNELS.authSignOut, async () => {
    // `signOut()` can throw: `clearToken()`/`clearLastKnownUser()` in
    // secure-store.ts rethrow on any filesystem error other than ENOENT
    // (permissions, disk I/O). Deliberately NOT wrapped in try/finally — the
    // cache should only be wiped once sign-out has actually completed. If
    // signOut() itself fails, the in-memory token was already nulled out but
    // the on-disk token file may still exist, so this isn't yet a confirmed
    // "safe to switch accounts" state; surfacing the rejection to the
    // renderer (so it can show an error and let the user retry) is more
    // correct than silently clearing the cache underneath a session that
    // might still be considered signed in in some other reload of the app.
    await signOut();
    // Comments and issues cleared before repos: neither has a declared
    // foreign key to `repos` today (checked in schema.ts), so this order has
    // no functional effect right now, but clearing the child-shaped tables
    // first is the defensive ordering if one is ever added later.
    const db = getDb();
    clearAllComments(db);
    clearAllIssues(db);
    clearAllRepos(db);
  });

  ipcMain.handle(CHANNELS.authGetUser, async () => {
    return getCurrentUser();
  });

  onAuthUpdated(() => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(CHANNELS.authUpdated);
    }
  });
}
