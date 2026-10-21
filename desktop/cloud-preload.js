// cloud-preload.js — เชื่อมระหว่างหน้าตั้งค่ากับ Electron main process
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('cloud', {
  current: () => ipcRenderer.invoke('cloud:current'),
  test: (payload) => ipcRenderer.invoke('cloud:test', payload),
  setupSchema: (payload) => ipcRenderer.invoke('cloud:setup-schema', payload),
  save: (payload) => ipcRenderer.invoke('cloud:save', payload),
  cancel: () => ipcRenderer.invoke('cloud:cancel'),
});
