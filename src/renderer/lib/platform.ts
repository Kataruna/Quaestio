// Optional chaining, not a plain access: if the preload ever fails to attach,
// this degrades to "not mac" instead of throwing at module-import time and
// taking down the whole render tree with an undiagnosable white screen.
export const isMac = window.api?.platform === 'darwin';

/** Cmd on macOS, Ctrl on Windows — CLAUDE.md requires both. */
export const modKey = isMac ? '⌘' : 'Ctrl';
