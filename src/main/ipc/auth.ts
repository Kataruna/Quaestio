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
    return signOut();
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
