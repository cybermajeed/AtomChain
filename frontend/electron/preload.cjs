const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Add IPC methods here if needed, but for now we communicate with FastAPI directly via HTTP
});
