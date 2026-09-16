import { BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { setWindowFocused } from './sync/scheduler';

const isMac = process.platform === 'darwin';

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    // The board is a 3-column grid; below this it stops being readable.
    minWidth: 960,
    minHeight: 640,
    // Matches --color-surface-app in tokens.css (light/dark) — visible for a
    // frame before the page paints, so it must already match the resolved
    // theme (nativeTheme.themeSource is set before this runs, see index.ts).
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0B0C0B' : '#F4F4F1',
    // macOS keeps its traffic lights; the design's drawn dots are mockup-only.
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  // CLAUDE.md: "Active repo: every 60s while the window is focused" and
  // "Sync immediately when window regains focus."
  window.on('focus', () => setWindowFocused(true));
  window.on('blur', () => setWindowFocused(false));

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  return window;
}
