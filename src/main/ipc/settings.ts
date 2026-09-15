import { ipcMain } from 'electron';
import { setTabGroupsEnabledInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { getDb } from '../db/client';
import { getSettings, setTabGroupsEnabled } from '../db/settings-queries';

export function registerSettingsHandlers(): void {
  ipcMain.handle(CHANNELS.settingsGet, () => getSettings(getDb()));

  ipcMain.handle(CHANNELS.settingsSetTabGroupsEnabled, (_event, rawInput: unknown) => {
    const { enabled } = setTabGroupsEnabledInput.parse(rawInput);
    setTabGroupsEnabled(getDb(), enabled);
  });
}
