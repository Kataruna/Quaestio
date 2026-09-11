import { contextBridge } from 'electron';

// Named functions only. `ipcRenderer` itself is never exposed.
contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
});
