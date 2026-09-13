import { app, BrowserWindow } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { createMainWindow } from './window';
import { applyNavigationPolicy } from './security';
import { registerAuthHandlers } from './ipc/auth';
import { restoreSession } from './github/auth';

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
  // safeStorage only works after the app is ready, so the token read can't
  // happen any earlier than this.
  await restoreSession();
  // IPC handlers are registered exactly once, independent of window
  // lifecycle — `activate` can recreate a window without re-running this.
  registerAuthHandlers();
  start();
}

void app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) start();
});
