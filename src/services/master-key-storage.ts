/**
 * Cross-platform Master Key Storage
 * Stores wrapped master key in ~/Documents/PersonalHub/.master.key
 * Works with both Electron and Tauri
 */

// Detect runtime environment
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI?: {
      masterKey: {
        exists: () => Promise<{ exists: boolean }>;
        read: () => Promise<{ success: boolean; content?: string; error?: string }>;
        write: (content: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

/**
 * Check if wrapped master key file exists
 */
export async function masterKeyExists(): Promise<boolean> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.masterKey.exists();
    return result.exists;
  }

  // Tauri implementation
  const { exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
  return await exists('PersonalHub/.master.key', { baseDir: BaseDirectory.Document });
}

/**
 * Read wrapped master key from file
 */
export async function readWrappedMasterKey(): Promise<string> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.masterKey.read();
    if (!result.success || !result.content) {
      throw new Error(result.error || 'Failed to read master key');
    }
    return result.content;
  }

  // Tauri implementation
  const { readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
  return await readTextFile('PersonalHub/.master.key', { baseDir: BaseDirectory.Document });
}

/**
 * Write wrapped master key to file
 */
export async function writeWrappedMasterKey(wrappedKey: string): Promise<void> {
  if (isElectron && window.electronAPI) {
    const result = await window.electronAPI.masterKey.write(wrappedKey);
    if (!result.success) {
      throw new Error(result.error || 'Failed to write master key');
    }
    return;
  }

  // Tauri implementation
  const { writeTextFile, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');

  // Ensure directory exists
  try {
    await mkdir('PersonalHub', { baseDir: BaseDirectory.Document, recursive: true });
  } catch {
    // Directory might already exist
  }

  await writeTextFile('PersonalHub/.master.key', wrappedKey, { baseDir: BaseDirectory.Document });
}
