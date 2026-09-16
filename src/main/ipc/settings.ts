import { ipcMain, nativeTheme } from 'electron';
import { setTabGroupsEnabledInput, setThemeInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { getDb } from '../db/client';
import { getSettings, setTabGroupsEnabled, setTheme } from '../db/settings-queries';

export function registerSettingsHandlers(): void {
  ipcMain.handle(CHANNELS.settingsGet, () => getSettings(getDb()));

  ipcMain.handle(CHANNELS.settingsSetTabGroupsEnabled, (_event, rawInput: unknown) => {
    const { enabled } = setTabGroupsEnabledInput.parse(rawInput);
    setTabGroupsEnabled(getDb(), enabled);
  });

  ipcMain.handle(CHANNELS.settingsSetTheme, (_event, rawInput: unknown) => {
    const { theme } = setThemeInput.parse(rawInput);
    setTheme(getDb(), theme);
    nativeTheme.themeSource = theme;
  });
}
