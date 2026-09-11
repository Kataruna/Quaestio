import { shell, type BrowserWindow } from 'electron';

/**
 * Every link leaves the app. Nothing navigates the renderer away from the
 * bundled UI, and only https: URLs are handed to the OS browser.
 */
export function applyNavigationPolicy(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfSafe(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const current = window.webContents.getURL();
    if (url !== current) {
      event.preventDefault();
      openExternalIfSafe(url);
    }
  });
}

function openExternalIfSafe(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return;
  }
  if (parsed.protocol !== 'https:') return;
  void shell.openExternal(parsed.toString());
}
