import { ipcMain } from 'electron';
import { setActiveRepoInput, setOnlineInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { getStatus, setActiveRepo, setOnline, syncNow } from '../sync/scheduler';

/**
 * Registers every sync:* IPC handler exactly once. `startScheduler` (called
 * separately, once, from `main/index.ts`'s bootstrap) is what actually
 * drives polling — these handlers just let the renderer trigger a manual
 * sync and report the state it can observe (which repo tab is active,
 * whether the browser thinks it's online) that the scheduler otherwise has
 * no way to know from the main process alone.
 */
export function registerSyncHandlers(): void {
  ipcMain.handle(CHANNELS.syncNow, async () => {
    await syncNow();
  });

  ipcMain.handle(CHANNELS.syncGetStatus, () => getStatus());

  ipcMain.handle(CHANNELS.syncSetActiveRepo, (_event, rawInput: unknown) => {
    const { repoFullName } = setActiveRepoInput.parse(rawInput);
    setActiveRepo(repoFullName);
  });

  ipcMain.handle(CHANNELS.syncSetOnline, (_event, rawInput: unknown) => {
    const { online } = setOnlineInput.parse(rawInput);
    setOnline(online);
  });
}
