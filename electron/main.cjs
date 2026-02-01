/**
 * Electron Main Process
 * Handles window management, file system IPC, and auto-updates
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const archiver = require('archiver');
const yauzl = require('yauzl');

// Auto-updater configuration
autoUpdater.autoDownload = false; // Don't auto-download, let user decide
autoUpdater.autoInstallOnAppQuit = true;

// Store reference to main window for sending update notifications
let mainWindow = null;

// Use system's locale for proper date formatting (must be before app.ready)
// Get the system locale from environment or OS settings
const systemLocale = process.env.LANG?.split('.')[0]?.replace('_', '-') ||
                     process.env.LC_ALL?.split('.')[0]?.replace('_', '-') ||
                     process.env.LC_TIME?.split('.')[0]?.replace('_', '-') ||
                     app.getLocale();

console.log('System locale detected:', systemLocale);
app.commandLine.appendSwitch('lang', systemLocale);

// Data directories
const hubDir = path.join(os.homedir(), 'Documents', 'PersonalHub');
const dataDir = path.join(hubDir, 'data');
const docsDir = path.join(hubDir, 'documents');
// Document base dir should match Tauri's BaseDirectory.Document (~/Documents/)
const documentsDir = path.join(os.homedir(), 'Documents');
// Master key file location
const masterKeyFile = path.join(hubDir, '.master.key');

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
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

  // Check for updates after window is ready (production only)
  // Delay to ensure React components have mounted and set up listeners
  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
          console.log('Auto-update check failed:', err.message);
        });
      }, 3000); // 3 second delay for React to mount
    });
  }
}

// Get system locale - prioritize LC_TIME for date formatting
function getSystemLocale() {
  // Check environment for LC_TIME (for date/time formatting specifically)
  const lcTime = process.env.LC_TIME;
  if (lcTime) {
    // Convert en_GB.UTF-8 to en-GB
    const locale = lcTime.replace(/_/g, '-').replace('.UTF-8', '').replace('.utf8', '');
    console.log('System locale detected from LC_TIME:', locale);
    return locale;
  }

  // Fall back to app.getLocale()
  const locale = app.getLocale() || 'en-GB';
  console.log('System locale detected from app.getLocale():', locale);
  return locale;
}

// Expose locale to renderer via IPC
ipcMain.handle('app:getLocale', async () => {
  const locale = getSystemLocale();
  console.log('Returning locale to renderer:', locale);
  return { locale };
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Create custom menu with Help items
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Personal Hub',
          click: async () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Personal Hub',
              message: 'Personal Hub',
              detail: `Version: ${app.getVersion()}\n\nA secure, private desktop app for organizing your life.\n\nAll data is encrypted with AES-256-GCM and stored locally.`
            });
          }
        },
        {
          label: 'Release Notes',
          click: async () => {
            shell.openExternal('https://github.com/bradymd/phub/blob/main/CHANGELOG.md');
          }
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: async () => {
            autoUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'Report an Issue',
          click: async () => {
            shell.openExternal('https://github.com/bradymd/phub/issues');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

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

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
  if (mainWindow) {
    mainWindow.webContents.send('updater:checking');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('No update available. Current version:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('updater:not-available', {
      version: info.version
    });
  }
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`Download progress: ${progress.percent.toFixed(1)}%`);
  if (mainWindow) {
    mainWindow.webContents.send('updater:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  if (mainWindow) {
    mainWindow.webContents.send('updater:downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-updater error:', err.message);
  if (mainWindow) {
    mainWindow.webContents.send('updater:error', {
      message: err.message
    });
  }
});

// Auto-updater IPC handlers
ipcMain.handle('updater:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('updater:getVersion', () => {
  return { version: app.getVersion() };
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

// Document directory operations (relative to ~/Documents/PersonalHub/)

// Check if document file/directory exists
ipcMain.handle('docs:exists', async (event, relativePath) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    await fs.access(fullPath);
    return { exists: true };
  } catch {
    return { exists: false };
  }
});

// Create directory for documents
ipcMain.handle('docs:mkdir', async (event, relativePath) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  } catch (err) {
    console.error('Failed to create directory:', err);
    return { success: false, error: err.message };
  }
});

// Read document file
ipcMain.handle('docs:readTextFile', async (event, relativePath) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    console.error('Failed to read document:', err);
    return { success: false, error: err.message };
  }
});

// Write document file
ipcMain.handle('docs:writeTextFile', async (event, relativePath, content) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    await fs.writeFile(fullPath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to write document:', err);
    return { success: false, error: err.message };
  }
});

// Write binary file from base64 data
ipcMain.handle('docs:writeBinaryFile', async (event, relativePath, base64Data) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(fullPath, buffer);
    return { success: true, path: fullPath };
  } catch (err) {
    console.error('Failed to write binary file:', err);
    return { success: false, error: err.message };
  }
});

// Delete document file
ipcMain.handle('docs:remove', async (event, relativePath) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    await fs.unlink(fullPath);
    return { success: true };
  } catch (err) {
    console.error('Failed to delete document:', err);
    return { success: false, error: err.message };
  }
});

// Open file or URL with system default application
ipcMain.handle('shell:openPath', async (event, filePath) => {
  try {
    const result = await shell.openPath(filePath);
    if (result) {
      // If result is non-empty string, it's an error message
      return { success: false, error: result };
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to open path:', err);
    return { success: false, error: err.message };
  }
});

// Master Key operations

// Check if master key file exists
ipcMain.handle('masterKey:exists', async () => {
  try {
    await fs.access(masterKeyFile);
    return { exists: true };
  } catch {
    return { exists: false };
  }
});

// Read wrapped master key
ipcMain.handle('masterKey:read', async () => {
  try {
    const content = await fs.readFile(masterKeyFile, 'utf-8');
    return { success: true, content };
  } catch (err) {
    console.error('Failed to read master key:', err);
    return { success: false, error: err.message };
  }
});

// Write wrapped master key
ipcMain.handle('masterKey:write', async (event, content) => {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(masterKeyFile);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(masterKeyFile, content, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('Failed to write master key:', err);
    return { success: false, error: err.message };
  }
});

// List files in a directory (relative to ~/Documents/)
ipcMain.handle('docs:listDir', async (event, relativePath) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(fullPath, entry.name);
        const stat = await fs.stat(filePath);
        files.push({
          path: entry.name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString()
        });
      }
    }

    return { success: true, files };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { success: true, files: [] };
    }
    console.error('Failed to list directory:', err);
    return { success: false, error: err.message };
  }
});

// List subdirectories in a directory (relative to ~/Documents/)
ipcMain.handle('docs:listSubDirs', async (event, relativePath) => {
  try {
    const fullPath = path.join(documentsDir, relativePath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    return { success: true, dirs };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { success: true, dirs: [] };
    }
    console.error('Failed to list subdirectories:', err);
    return { success: false, error: err.message };
  }
});

// Backup operations

/**
 * Recursively collect all files from a directory
 * Returns array of { absolutePath, relativePath, size }
 */
async function collectFiles(baseDir, subDir = '') {
  const results = [];
  const dirPath = subDir ? path.join(baseDir, subDir) : baseDir;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = subDir ? path.join(subDir, entry.name) : entry.name;
      const absPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        const stat = await fs.stat(absPath);
        results.push({
          absolutePath: absPath,
          relativePath: relPath,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString()
        });
      } else if (entry.isDirectory()) {
        const subFiles = await collectFiles(baseDir, relPath);
        results.push(...subFiles);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Failed to read directory ${dirPath}:`, err.message);
    }
  }

  return results;
}

// Create ZIP backup
ipcMain.handle('backup:create', async (event, outputPath) => {
  try {
    // Collect all files to backup
    const dataFiles = await collectFiles(dataDir);
    const documentFiles = await collectFiles(docsDir);

    // Check master key exists
    let hasMasterKey = false;
    try {
      await fs.access(masterKeyFile);
      hasMasterKey = true;
    } catch {}

    // Build manifest
    const manifest = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      dataFiles: dataFiles.map(f => ({ path: f.relativePath, size: f.size })),
      documentFiles: documentFiles.map(f => ({ path: f.relativePath, size: f.size })),
      hasMasterKey
    };

    // Create ZIP archive
    const output = fsSync.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 1 } }); // Low compression - data is already encrypted (random bytes)

    const archivePromise = new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      output.on('error', reject);
    });

    archive.pipe(output);

    // Add manifest
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Add master key
    if (hasMasterKey) {
      archive.file(masterKeyFile, { name: '.master.key' });
    }

    // Add data files
    for (const file of dataFiles) {
      archive.file(file.absolutePath, { name: `data/${file.relativePath}` });
    }

    // Add document files
    for (const file of documentFiles) {
      archive.file(file.absolutePath, { name: `documents/${file.relativePath}` });
    }

    await archive.finalize();
    await archivePromise;

    return { success: true, manifest };
  } catch (err) {
    console.error('Backup creation failed:', err);
    return { success: false, error: err.message };
  }
});

// Read backup ZIP and compare with disk state
ipcMain.handle('backup:reconcile', async (event, backupPath) => {
  try {
    const zipEntries = await readZipEntries(backupPath);

    // Parse manifest from ZIP
    const manifestEntry = zipEntries.find(e => e.fileName === 'manifest.json');
    if (!manifestEntry) {
      return { success: false, error: 'Backup file is missing manifest.json' };
    }

    const manifestContent = await extractZipEntry(backupPath, 'manifest.json');
    const manifest = JSON.parse(manifestContent.toString('utf-8'));

    // Build reconciliation report
    const entries = [];

    // Check data files
    for (const backupFile of manifest.dataFiles) {
      const diskPath = path.join(dataDir, backupFile.path);
      const entry = await compareWithDisk(backupFile, diskPath, `data/${backupFile.path}`);
      entries.push(entry);
    }

    // Check document files
    for (const backupFile of manifest.documentFiles) {
      const diskPath = path.join(docsDir, backupFile.path);
      const entry = await compareWithDisk(backupFile, diskPath, `documents/${backupFile.path}`);
      entries.push(entry);
    }

    // Check for orphans on disk not in backup
    const backupDataPaths = new Set(manifest.dataFiles.map(f => f.path));
    const backupDocPaths = new Set(manifest.documentFiles.map(f => f.path));

    const diskDataFiles = await collectFiles(dataDir);
    const diskDocFiles = await collectFiles(docsDir);

    for (const diskFile of diskDataFiles) {
      if (!backupDataPaths.has(diskFile.relativePath)) {
        entries.push({
          path: `data/${diskFile.relativePath}`,
          sizeInBackup: 0,
          sizeOnDisk: diskFile.size,
          modifiedOnDisk: diskFile.modifiedAt,
          status: 'orphan'
        });
      }
    }

    for (const diskFile of diskDocFiles) {
      if (!backupDocPaths.has(diskFile.relativePath)) {
        entries.push({
          path: `documents/${diskFile.relativePath}`,
          sizeInBackup: 0,
          sizeOnDisk: diskFile.size,
          modifiedOnDisk: diskFile.modifiedAt,
          status: 'orphan'
        });
      }
    }

    const report = {
      manifest,
      entries,
      newFiles: entries.filter(e => e.status === 'new'),
      sameFiles: entries.filter(e => e.status === 'same'),
      conflicts: entries.filter(e => e.status === 'conflict'),
      orphansOnDisk: entries.filter(e => e.status === 'orphan')
    };

    return { success: true, report };
  } catch (err) {
    console.error('Reconciliation failed:', err);
    return { success: false, error: err.message };
  }
});

// Restore files from backup ZIP
ipcMain.handle('backup:restore', async (event, backupPath, filesToRestore) => {
  try {
    const zipEntries = await readZipEntries(backupPath);
    let restoredCount = 0;
    const errors = [];

    // Determine which files to restore
    let entriesToRestore;
    if (filesToRestore === null) {
      // Restore everything except manifest
      entriesToRestore = zipEntries.filter(e =>
        e.fileName !== 'manifest.json' && !e.fileName.endsWith('/')
      );
    } else {
      entriesToRestore = zipEntries.filter(e => filesToRestore.includes(e.fileName));
    }

    for (const entry of entriesToRestore) {
      try {
        const content = await extractZipEntry(backupPath, entry.fileName);

        let targetPath;
        if (entry.fileName === '.master.key') {
          targetPath = masterKeyFile;
        } else if (entry.fileName.startsWith('data/')) {
          const relPath = entry.fileName.slice(5); // Remove 'data/' prefix
          targetPath = path.join(dataDir, relPath);
        } else if (entry.fileName.startsWith('documents/')) {
          const relPath = entry.fileName.slice(10); // Remove 'documents/' prefix
          targetPath = path.join(docsDir, relPath);
        } else {
          continue; // Skip unknown entries
        }

        // Ensure parent directory exists
        await fs.mkdir(path.dirname(targetPath), { recursive: true });

        // Write file
        await fs.writeFile(targetPath, content);
        restoredCount++;
      } catch (err) {
        errors.push(`Failed to restore ${entry.fileName}: ${err.message}`);
      }
    }

    return { success: true, restoredCount, errors };
  } catch (err) {
    console.error('Restore failed:', err);
    return { success: false, error: err.message };
  }
});

// Import legacy .encrypted.json backup format
ipcMain.handle('backup:importLegacy', async (event, backupFilePath, masterKey) => {
  try {
    const crypto = require('crypto');
    const { subtle } = crypto.webcrypto;
    const content = await fs.readFile(backupFilePath, 'utf-8');

    // Decode master key from base64
    const keyBytes = Buffer.from(masterKey, 'base64');

    // Parse the encrypted content: [salt(16) | iv(12) | ciphertext] in base64
    const rawData = Buffer.from(content, 'base64');
    const salt = rawData.slice(0, 16);
    const iv = rawData.slice(16, 28);
    const encrypted = rawData.slice(28);

    // Derive decryption key using PBKDF2 (matching crypto.ts: 10000 iterations)
    const keyMaterial = await subtle.importKey('raw', keyBytes, 'PBKDF2', false, ['deriveKey']);
    const aesKey = await subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 10000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encrypted);
    const json = Buffer.from(decrypted).toString('utf-8');
    const backupData = JSON.parse(json);

    if (!backupData.data) {
      return { success: false, error: 'Invalid legacy backup format' };
    }

    // Write each key's data as encrypted JSON to data dir
    // Format must match ElectronStorageService: base64([salt(16) | iv(12) | ciphertext])
    let totalRecords = 0;
    const keys = Object.keys(backupData.data);

    await fs.mkdir(dataDir, { recursive: true });

    for (const [key, items] of Object.entries(backupData.data)) {
      if (Array.isArray(items) && items.length > 0) {
        const jsonStr = JSON.stringify(items);

        // Generate fresh salt and IV for each file
        const newSalt = crypto.randomBytes(16);
        const newIv = crypto.randomBytes(12);

        // Derive encryption key from master key + new salt
        const encKeyMaterial = await subtle.importKey('raw', keyBytes, 'PBKDF2', false, ['deriveKey']);
        const encKey = await subtle.deriveKey(
          { name: 'PBKDF2', salt: newSalt, iterations: 10000, hash: 'SHA-256' },
          encKeyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt']
        );

        // Encrypt the data
        const encryptedData = await subtle.encrypt(
          { name: 'AES-GCM', iv: newIv },
          encKey,
          Buffer.from(jsonStr, 'utf-8')
        );

        // Combine: salt + iv + ciphertext -> base64
        const combined = Buffer.concat([newSalt, newIv, Buffer.from(encryptedData)]);
        const outputPath = path.join(dataDir, `${key}.encrypted.json`);
        await fs.writeFile(outputPath, combined.toString('base64'), 'utf-8');

        totalRecords += items.length;
      }
    }

    return { success: true, records: totalRecords, keys };
  } catch (err) {
    console.error('Legacy import failed:', err);
    return { success: false, error: err.message };
  }
});

// Helper: Compare a backup file entry with its disk counterpart
// Note: This is now only used for display purposes, not for determining what to restore
// Restore always replaces ALL files (full backup/restore model)
async function compareWithDisk(backupFile, diskPath, zipPath) {
  try {
    const stat = await fs.stat(diskPath);
    const sizeOnDisk = stat.size;
    const modifiedOnDisk = stat.mtime.toISOString();

    if (sizeOnDisk === backupFile.size) {
      return {
        path: zipPath,
        sizeInBackup: backupFile.size,
        sizeOnDisk,
        modifiedOnDisk,
        status: 'same'
      };
    } else {
      return {
        path: zipPath,
        sizeInBackup: backupFile.size,
        sizeOnDisk,
        modifiedOnDisk,
        status: 'conflict'
      };
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        path: zipPath,
        sizeInBackup: backupFile.size,
        sizeOnDisk: null,
        modifiedOnDisk: null,
        status: 'new'
      };
    }
    throw err;
  }
}

// Helper: Read all entries from a ZIP file
function readZipEntries(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      const entries = [];
      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        entries.push({
          fileName: entry.fileName,
          uncompressedSize: entry.uncompressedSize
        });
        zipfile.readEntry();
      });

      zipfile.on('end', () => resolve(entries));
      zipfile.on('error', reject);
    });
  });
}

// Helper: Extract a single entry from a ZIP file
function extractZipEntry(zipPath, entryName) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        if (entry.fileName === entryName) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err);

            const chunks = [];
            readStream.on('data', (chunk) => chunks.push(chunk));
            readStream.on('end', () => {
              zipfile.close();
              resolve(Buffer.concat(chunks));
            });
            readStream.on('error', reject);
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('end', () => reject(new Error(`Entry not found: ${entryName}`)));
      zipfile.on('error', reject);
    });
  });
}
