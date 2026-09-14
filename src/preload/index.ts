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
    onUpdated: (listener) => {
      const handler = () => listener();
      ipcRenderer.on(CHANNELS.authUpdated, handler);
      return () => ipcRenderer.removeListener(CHANNELS.authUpdated, handler);
    },
  },
  repos: {
    list: () => ipcRenderer.invoke(CHANNELS.reposList),
    setTracked: (input) => ipcRenderer.invoke(CHANNELS.reposSetTracked, input),
  },
  issues: {
    list: (input) => ipcRenderer.invoke(CHANNELS.issuesList, input),
    get: (input) => ipcRenderer.invoke(CHANNELS.issuesGet, input),
    create: (input) => ipcRenderer.invoke(CHANNELS.issuesCreate, input),
    update: (input) => ipcRenderer.invoke(CHANNELS.issuesUpdate, input),
    getComments: (input) => ipcRenderer.invoke(CHANNELS.issuesGetComments, input),
    addComment: (input) => ipcRenderer.invoke(CHANNELS.issuesAddComment, input),
  },
  sync: {
    now: () => ipcRenderer.invoke(CHANNELS.syncNow),
    getStatus: () => ipcRenderer.invoke(CHANNELS.syncGetStatus),
    setActiveRepo: (input) => ipcRenderer.invoke(CHANNELS.syncSetActiveRepo, input),
    setOnline: (input) => ipcRenderer.invoke(CHANNELS.syncSetOnline, input),
    onUpdated: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, repoFullName: string) =>
        listener(repoFullName);
      ipcRenderer.on(CHANNELS.syncUpdated, handler);
      return () => ipcRenderer.removeListener(CHANNELS.syncUpdated, handler);
    },
    onStatusChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, status: Parameters<typeof listener>[0]) =>
        listener(status);
      ipcRenderer.on(CHANNELS.syncStatusChanged, handler);
      return () => ipcRenderer.removeListener(CHANNELS.syncStatusChanged, handler);
    },
  },
  images: {
    fetch: (input) => ipcRenderer.invoke(CHANNELS.imagesFetch, input),
  },
};

contextBridge.exposeInMainWorld('api', api);
