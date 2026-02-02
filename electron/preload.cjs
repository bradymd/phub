/**
 * Electron Preload Script
 * Exposes safe IPC API to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose file system and dialog APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  app: {
    getLocale: () => ipcRenderer.invoke('app:getLocale')
  },
  fs: {
    ensureDataDir: () => ipcRenderer.invoke('fs:ensureDataDir'),
    exists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),
    readTextFile: (filePath) => ipcRenderer.invoke('fs:readTextFile', filePath),
    writeTextFile: (filePath, content) => ipcRenderer.invoke('fs:writeTextFile', filePath, content),
    remove: (filePath) => ipcRenderer.invoke('fs:remove', filePath),
    readTextFileAbsolute: (filePath) => ipcRenderer.invoke('fs:readTextFileAbsolute', filePath),
    writeTextFileAbsolute: (filePath, content) => ipcRenderer.invoke('fs:writeTextFileAbsolute', filePath, content)
  },
  docs: {
    exists: (relativePath) => ipcRenderer.invoke('docs:exists', relativePath),
    mkdir: (relativePath) => ipcRenderer.invoke('docs:mkdir', relativePath),
    readTextFile: (relativePath) => ipcRenderer.invoke('docs:readTextFile', relativePath),
    writeTextFile: (relativePath, content) => ipcRenderer.invoke('docs:writeTextFile', relativePath, content),
    writeBinaryFile: (relativePath, base64Data) => ipcRenderer.invoke('docs:writeBinaryFile', relativePath, base64Data),
    remove: (relativePath) => ipcRenderer.invoke('docs:remove', relativePath),
    listDir: (relativePath) => ipcRenderer.invoke('docs:listDir', relativePath),
    listSubDirs: (relativePath) => ipcRenderer.invoke('docs:listSubDirs', relativePath)
  },
  dialog: {
    save: (options) => ipcRenderer.invoke('dialog:save', options),
    open: (options) => ipcRenderer.invoke('dialog:open', options)
  },
  masterKey: {
    exists: () => ipcRenderer.invoke('masterKey:exists'),
    read: () => ipcRenderer.invoke('masterKey:read'),
    write: (content) => ipcRenderer.invoke('masterKey:write', content)
  },
  backup: {
    create: (outputPath) => ipcRenderer.invoke('backup:create', outputPath),
    reconcile: (backupPath) => ipcRenderer.invoke('backup:reconcile', backupPath),
    restore: (backupPath, filesToRestore) => ipcRenderer.invoke('backup:restore', backupPath, filesToRestore),
    importLegacy: (filePath, masterKey) => ipcRenderer.invoke('backup:importLegacy', filePath, masterKey)
  },
  shell: {
    openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath)
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('updater:getVersion'),
    // Event listeners for update notifications
    onChecking: (callback) => ipcRenderer.on('updater:checking', callback),
    onAvailable: (callback) => ipcRenderer.on('updater:available', (event, info) => callback(info)),
    onNotAvailable: (callback) => ipcRenderer.on('updater:not-available', (event, info) => callback(info)),
    onProgress: (callback) => ipcRenderer.on('updater:progress', (event, progress) => callback(progress)),
    onDownloaded: (callback) => ipcRenderer.on('updater:downloaded', (event, info) => callback(info)),
    onError: (callback) => ipcRenderer.on('updater:error', (event, err) => callback(err)),
    // Remove listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('updater:checking');
      ipcRenderer.removeAllListeners('updater:available');
      ipcRenderer.removeAllListeners('updater:not-available');
      ipcRenderer.removeAllListeners('updater:progress');
      ipcRenderer.removeAllListeners('updater:downloaded');
      ipcRenderer.removeAllListeners('updater:error');
    }
  },
  menu: {
    onLifePlanningGuide: (callback) => ipcRenderer.on('menu:lifePlanningGuide', callback),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('menu:lifePlanningGuide');
    }
  }
});
