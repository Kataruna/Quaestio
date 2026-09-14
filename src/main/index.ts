import { app, BrowserWindow, dialog } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { createMainWindow } from './window';
import { applyNavigationPolicy } from './security';
import { registerAuthHandlers } from './ipc/auth';
import { registerReposHandlers } from './ipc/repos';
import { registerIssuesHandlers } from './ipc/issues';
import { restoreSession } from './github/auth';
import { runMigrations } from './db/client';

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
