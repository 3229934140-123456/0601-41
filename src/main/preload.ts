import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openWindow: (name: string, data?: any) => ipcRenderer.invoke('open-window', name, data),
  closeWindow: (name: string) => ipcRenderer.invoke('close-window', name),
  getData: (key: string) => ipcRenderer.invoke('get-data', key),
  setData: (key: string, value: any) => ipcRenderer.invoke('set-data', key, value),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
});
