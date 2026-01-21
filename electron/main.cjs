/**
 * Electron Main Process
 * Handles window management and file system IPC
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Data directory: ~/Documents/PersonalHub/data
const dataDir = path.join(os.homedir(), 'Documents', 'PersonalHub', 'data');

// Create main window
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// File system IPC handlers

// Ensure data directory exists
ipcMain.handle('fs:ensureDataDir', async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    return { success: true };
  } catch (err) {
    console.error('Failed to create data directory:', err);
    return { success: false, error: err.message };
  }
});

// Check if file exists
ipcMain.handle('fs:exists', async (event, filePath) => {
  try {
    const fullPath = path.join(dataDir, filePath);
    await fs.access(fullPath);
    return { exists: true };
  } catch {
    return { exists: false };
  }
});

// Read text file
ipcMain.handle('fs:readTextFile', async (event, filePath) => {
  try {
    const fullPath = path.join(dataDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    console.error('Failed to read file:', err);
    return { success: false, error: err.message };
  }
});

// Write text file
ipcMain.handle('fs:writeTextFile', async (event, filePath, content) => {
  try {
    const fullPath = path.join(dataDir, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to write file:', err);
    return { success: false, error: err.message };
  }
});

// Delete file
ipcMain.handle('fs:remove', async (event, filePath) => {
  try {
    const fullPath = path.join(dataDir, filePath);
    await fs.unlink(fullPath);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete file:', err);
    return { success: false, error: err.message };
  }
});

// File dialogs

// Show save dialog
ipcMain.handle('dialog:save', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: options.defaultPath ? options.defaultPath.replace('~', os.homedir()) : undefined,
      filters: options.filters || []
    });

    if (result.canceled) {
      return { canceled: true };
    }

    return { filePath: result.filePath };
  } catch (err) {
    console.error('Save dialog failed:', err);
    return { error: err.message };
  }
});

// Show open dialog
ipcMain.handle('dialog:open', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog({
      defaultPath: options.defaultPath ? options.defaultPath.replace('~', os.homedir()) : undefined,
      filters: options.filters || [],
      properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile']
    });

    if (result.canceled) {
      return { canceled: true };
    }

    // Return single file path or array based on multiple flag
    if (options.multiple) {
      return { filePaths: result.filePaths };
    } else {
      return { filePath: result.filePaths[0] };
    }
  } catch (err) {
    console.error('Open dialog failed:', err);
    return { error: err.message };
  }
});

// Read text file (absolute path, not relative to data dir)
ipcMain.handle('fs:readTextFileAbsolute', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    console.error('Failed to read file:', err);
    return { success: false, error: err.message };
  }
});

// Write text file (absolute path, not relative to data dir)
ipcMain.handle('fs:writeTextFileAbsolute', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to write file:', err);
    return { success: false, error: err.message };
  }
});
