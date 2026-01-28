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
  }
});
