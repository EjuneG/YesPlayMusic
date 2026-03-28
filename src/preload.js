import { contextBridge, ipcRenderer } from 'electron';
import os from 'os';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: os.platform(),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, callback) => {
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, listener);
    return listener;
  },
  once: (channel, callback) => {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args));
  },
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  removeListener: (channel, listener) =>
    ipcRenderer.removeListener(channel, listener),
});
