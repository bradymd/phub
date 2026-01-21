/**
 * Cross-platform File System API
 * Provides unified API that works with both Tauri and Electron
 */

// Type definitions for dialog options
export interface SaveDialogOptions {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface OpenDialogOptions {
  defaultPath?: string;
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}

// Detect runtime environment
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * Show save file dialog
 */
export async function showSaveDialog(options: SaveDialogOptions): Promise<string | null> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.dialog.save(options);
    if (result.canceled || result.error) {
      return null;
    }
    return result.filePath || null;
  }

  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const filePath = await save(options);
    return filePath;
  }

  throw new Error('File dialogs not supported in browser environment');
}

/**
 * Show open file dialog
 */
export async function showOpenDialog(
  options: OpenDialogOptions
): Promise<string | string[] | null> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.dialog.open(options);
    if (result.canceled || result.error) {
      return null;
    }
    return options.multiple ? result.filePaths || null : result.filePath || null;
  }

  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const filePath = await open(options);
    return filePath;
  }

  throw new Error('File dialogs not supported in browser environment');
}

/**
 * Read text file (absolute path)
 */
export async function readTextFile(filePath: string): Promise<string> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.fs.readTextFileAbsolute(filePath);
    if (!result.success || !result.content) {
      throw new Error(result.error || 'Failed to read file');
    }
    return result.content;
  }

  if (isTauri) {
    const { readTextFile: tauriReadTextFile } = await import('@tauri-apps/plugin-fs');
    return await tauriReadTextFile(filePath);
  }

  throw new Error('File operations not supported in browser environment');
}

/**
 * Write text file (absolute path)
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.fs.writeTextFileAbsolute(filePath, content);
    if (!result.success) {
      throw new Error(result.error || 'Failed to write file');
    }
    return;
  }

  if (isTauri) {
    const { writeTextFile: tauriWriteTextFile } = await import('@tauri-apps/plugin-fs');
    await tauriWriteTextFile(filePath, content);
    return;
  }

  throw new Error('File operations not supported in browser environment');
}

/**
 * Check if file exists in data directory (relative path)
 */
export async function checkDataFileExists(relativePath: string): Promise<boolean> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.fs.exists(relativePath);
    return result.exists;
  }

  if (isTauri) {
    const { exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    return await exists(relativePath, { baseDir: BaseDirectory.Document });
  }

  // In browser, check localStorage
  return localStorage.getItem('master_password_hash') !== null;
}
