export const isMac = window.api.platform === 'darwin';

/** Cmd on macOS, Ctrl on Windows — CLAUDE.md requires both. */
export const modKey = isMac ? '⌘' : 'Ctrl';
