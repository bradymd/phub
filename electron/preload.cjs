/**
 * Electron Preload Script
 * Exposes safe IPC API to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose file system and dialog APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  fs: {
    ensureDataDir: () => ipcRenderer.invoke('fs:ensureDataDir'),
    exists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),
    readTextFile: (filePath) => ipcRenderer.invoke('fs:readTextFile', filePath),
    writeTextFile: (filePath, content) => ipcRenderer.invoke('fs:writeTextFile', filePath, content),
    remove: (filePath) => ipcRenderer.invoke('fs:remove', filePath),
    readTextFileAbsolute: (filePath) => ipcRenderer.invoke('fs:readTextFileAbsolute', filePath),
    writeTextFileAbsolute: (filePath, content) => ipcRenderer.invoke('fs:writeTextFileAbsolute', filePath, content)
  },
  dialog: {
    save: (options) => ipcRenderer.invoke('dialog:save', options),
    open: (options) => ipcRenderer.invoke('dialog:open', options)
  }
});
