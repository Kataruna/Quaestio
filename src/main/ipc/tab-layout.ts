import { ipcMain } from 'electron';
import { setTabLayoutInput } from '@shared/ipc-contract';
import { CHANNELS } from '@shared/channels';
import { buildInitialTabLayout, reconcileTabLayout } from '@shared/tab-layout';
import { getDb } from '../db/client';
import { listRepos } from '../db/repos-queries';
import { getStoredTabLayout, setStoredTabLayout } from '../db/tab-layout-queries';

export function registerTabLayoutHandlers(): void {
  ipcMain.handle(CHANNELS.tabLayoutGet, () => {
    const db = getDb();
    const tracked = listRepos(db).filter((repo) => repo.tracked);
    const stored = getStoredTabLayout(db);
    const slots = stored === null ? buildInitialTabLayout(tracked) : reconcileTabLayout(stored, tracked);
    if (stored === null || JSON.stringify(stored) !== JSON.stringify(slots)) {
      setStoredTabLayout(db, slots);
    }
    return slots;
  });

  ipcMain.handle(CHANNELS.tabLayoutSet, (_event, rawInput: unknown) => {
    const { slots } = setTabLayoutInput.parse(rawInput);
    setStoredTabLayout(getDb(), slots);
  });
}
