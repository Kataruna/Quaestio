import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from '../shared/channels';
// Type-only: fully erased at compile time, so `ipc-contract`'s zod schema layer
// never reaches the preload bundle.
import type { Api } from '../shared/ipc-contract';

const api: Api = {
  platform: process.platform,
  auth: {
    signInWithToken: (input) => ipcRenderer.invoke(CHANNELS.authSignInWithToken, input),
    startDeviceFlow: () => ipcRenderer.invoke(CHANNELS.authStartDeviceFlow),
    signOut: () => ipcRenderer.invoke(CHANNELS.authSignOut),
    getUser: () => ipcRenderer.invoke(CHANNELS.authGetUser),
  },
  repos: {
    list: () => ipcRenderer.invoke(CHANNELS.reposList),
    setTracked: (input) => ipcRenderer.invoke(CHANNELS.reposSetTracked, input),
  },
  issues: {
    list: (input) => ipcRenderer.invoke(CHANNELS.issuesList, input),
    get: (input) => ipcRenderer.invoke(CHANNELS.issuesGet, input),
  },
  sync: {
    now: () => ipcRenderer.invoke(CHANNELS.syncNow),
    getStatus: () => ipcRenderer.invoke(CHANNELS.syncGetStatus),
    onUpdated: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, repoFullName: string) =>
        listener(repoFullName);
      ipcRenderer.on(CHANNELS.syncUpdated, handler);
      return () => ipcRenderer.removeListener(CHANNELS.syncUpdated, handler);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);
