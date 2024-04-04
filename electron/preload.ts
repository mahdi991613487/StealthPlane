import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(channel: string, listener: (...args: any[]) => void) {
    ipcRenderer.on(channel, (_, ...args) => listener(...args));
  },
  off(channel: string, listener?: (...args: any[]) => void) {
    if (listener) {
      ipcRenderer.off(channel, listener);
    } else {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  send(channel: string, ...args: any[]) {
    ipcRenderer.send(channel, ...args);
  },
  invoke(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
  removeAllListeners(channel: string) {
    ipcRenderer.removeAllListeners(channel);
  }
});
