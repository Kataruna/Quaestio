import { app, BrowserWindow, dialog } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { CHANNELS } from '@shared/channels';
import { createMainWindow } from './window';
import { applyNavigationPolicy } from './security';
import { registerAuthHandlers } from './ipc/auth';
import { registerReposHandlers } from './ipc/repos';
import { registerIssuesHandlers } from './ipc/issues';
import { registerImagesHandlers } from './ipc/images';
import { registerSyncHandlers } from './ipc/sync';
import { restoreSession, getAuthenticatedClient } from './github/auth';
import { runMigrations, getDb } from './db/client';
import { listRepos } from './db/repos-queries';
import { startScheduler } from './sync/scheduler';

// In dev mode the app runs inside the generic Electron.app shell, so without
// this the macOS menu bar (and dock/Cmd+Tab) shows "Electron" instead of the
// app's actual name — must be set before `ready` to take effect. Packaged
// builds don't need this (Forge names the bundle from `productName`), but
// setting it unconditionally is harmless there too.
app.setName('Quaestio');

// Squirrel installer hooks on Windows; quits during install/uninstall.
// Imported rather than `require`d so the typed-checked ESLint config stays clean.
if (squirrelStartup) {
  app.quit();
}

function start(): void {
  const window = createMainWindow();
  applyNavigationPolicy(window);
}

async function bootstrap(): Promise<void> {
  // Migrations run before anything else touches the database — every
  // handler registered below can be invoked the instant the renderer loads,
  // so the schema must already be current.
  runMigrations();
  // safeStorage only works after the app is ready, so the token read can't
  // happen any earlier than this.
  await restoreSession();
  // IPC handlers are registered exactly once, independent of window
  // lifecycle — `activate` can recreate a window without re-running this.
  registerAuthHandlers();
  registerReposHandlers();
  registerIssuesHandlers();
  registerImagesHandlers();
  registerSyncHandlers();
  // One scheduler for the whole app, independent of window lifecycle — same
  // reasoning as the handlers above (macOS `activate` can recreate a window
  // without restarting the app).
  startScheduler({
    getClient: getAuthenticatedClient,
    getDb,
    getTrackedRepoFullNames: () =>
      listRepos(getDb())
        .filter((repo) => repo.tracked)
        .map((repo) => repo.fullName),
    onStatusChanged: (status) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(CHANNELS.syncStatusChanged, status);
      }
    },
    onDataChanged: (repoFullName) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(CHANNELS.syncUpdated, repoFullName);
      }
    },
  });
  start();
}

void app.whenReady().then(async () => {
  try {
    await bootstrap();
  } catch (error) {
    dialog.showErrorBox(
      'Quaestio failed to start',
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) start();
});
