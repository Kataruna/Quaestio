import { ipcMain, dialog, BrowserWindow, type OpenDialogOptions } from 'electron';
import { promises as fs } from 'node:fs';
import { setPaletteOverrideInput, resetPaletteInput } from '@shared/ipc-contract';
import { validatePaletteImport } from '@shared/validate-palette-import';
import { CHANNELS } from '@shared/channels';
import { getDb } from '../db/client';
import {
  getPaletteOverrides,
  setPaletteOverride,
  resetPalette,
  replacePaletteOverrides,
} from '../db/custom-palette-queries';

export function registerThemeHandlers(): void {
  ipcMain.handle(CHANNELS.themeGetPaletteOverrides, () => getPaletteOverrides(getDb()));

  ipcMain.handle(CHANNELS.themeSetPaletteOverride, (_event, rawInput: unknown) => {
    const { mode, token, value } = setPaletteOverrideInput.parse(rawInput);
    setPaletteOverride(getDb(), mode, token, value);
  });

  ipcMain.handle(CHANNELS.themeResetPalette, (_event, rawInput: unknown) => {
    const { mode } = resetPaletteInput.parse(rawInput);
    resetPalette(getDb(), mode);
  });

  ipcMain.handle(CHANNELS.themeExportPalette, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const overrides = getPaletteOverrides(getDb());
    const dialogOptions = {
      defaultPath: 'quaestio-palette.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    };
    // dialog.showSaveDialog's two overloads — (options) vs (window, options)
    // — don't accept `BrowserWindow | undefined` for the window param, so
    // this branches rather than passing a possibly-undefined window through.
    const result = window
      ? await dialog.showSaveDialog(window, dialogOptions)
      : await dialog.showSaveDialog(dialogOptions);
    if (result.canceled || !result.filePath) return null;
    await fs.writeFile(result.filePath, JSON.stringify(overrides, null, 2), 'utf-8');
    return { path: result.filePath };
  });

  ipcMain.handle(CHANNELS.themeImportPalette, async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const openDialogOptions: OpenDialogOptions = {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    };
    const result = window
      ? await dialog.showOpenDialog(window, openDialogOptions)
      : await dialog.showOpenDialog(openDialogOptions);
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0]!;
    const raw = await fs.readFile(filePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('That file is not valid JSON.');
    }
    const overrides = validatePaletteImport(parsed);
    replacePaletteOverrides(getDb(), overrides);
    return overrides;
  });
}
