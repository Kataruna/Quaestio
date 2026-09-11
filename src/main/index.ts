import { app, BrowserWindow } from 'electron';
import squirrelStartup from 'electron-squirrel-startup';
import { createMainWindow } from './window';
import { applyNavigationPolicy } from './security';

// Squirrel installer hooks on Windows; quits during install/uninstall.
// Imported rather than `require`d so the typed-checked ESLint config stays clean.
if (squirrelStartup) {
  app.quit();
}

function start(): void {
  const window = createMainWindow();
  applyNavigationPolicy(window);
}

void app.whenReady().then(start);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) start();
});
