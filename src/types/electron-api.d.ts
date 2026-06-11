/**
 * Single source of truth for the renderer-side type of window.electronAPI.
 * Must mirror what electron/preload.cjs exposes via contextBridge.
 * (Previously four files each declared a conflicting partial type.)
 */

interface ElectronAPI {
  app: {
    getLocale: () => Promise<{ locale: string }>;
  };
  fs: {
    ensureDataDir: () => Promise<{ success: boolean; error?: string }>;
    exists: (filePath: string) => Promise<{ exists: boolean }>;
    readTextFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    writeTextFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    remove: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    readTextFileAbsolute: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    writeTextFileAbsolute: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  };
  docs: {
    exists: (relativePath: string) => Promise<{ exists: boolean }>;
    mkdir: (relativePath: string) => Promise<{ success: boolean; error?: string }>;
    readTextFile: (relativePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    writeTextFile: (relativePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    writeBinaryFile: (relativePath: string, base64Data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    remove: (relativePath: string) => Promise<{ success: boolean; error?: string }>;
    listDir: (relativePath: string) => Promise<{ success: boolean; files?: Array<{ path: string; size: number; modifiedAt: string }>; error?: string }>;
    listSubDirs: (relativePath: string) => Promise<{ success: boolean; dirs?: string[]; error?: string }>;
  };
  dialog: {
    save: (options: {
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled?: boolean; filePath?: string; error?: string }>;
    open: (options: {
      defaultPath?: string;
      multiple?: boolean;
      filters?: Array<{ name: string; extensions: string[] }>;
    }) => Promise<{ canceled?: boolean; filePath?: string; filePaths?: string[]; error?: string }>;
  };
  masterKey: {
    exists: () => Promise<{ exists: boolean }>;
    read: () => Promise<{ success: boolean; content?: string; error?: string }>;
    write: (content: string) => Promise<{ success: boolean; error?: string }>;
  };
  backup: {
    create: (outputPath: string) => Promise<{ success: boolean; manifest?: unknown; error?: string }>;
    reconcile: (backupPath: string) => Promise<{ success: boolean; report?: unknown; error?: string }>;
    restore: (backupPath: string, filesToRestore: string[] | null) => Promise<{ success: boolean; restoredCount?: number; errors?: string[]; error?: string }>;
    importLegacy: (filePath: string, masterKey: string) => Promise<{ success: boolean; records?: number; keys?: string[]; error?: string }>;
    createAutoBackup: () => Promise<{ success: boolean; manifest?: unknown; path?: string; error?: string }>;
    pruneAutoBackups: (keep: number) => Promise<{ success: boolean; deleted?: number; error?: string }>;
    listAutoBackups: () => Promise<{ success: boolean; backups?: Array<{ filename: string; path: string; size: number; createdAt: string }>; error?: string }>;
  };
  shell: {
    openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  };
  updater: {
    check: () => Promise<unknown>;
    download: () => Promise<unknown>;
    install: () => Promise<unknown>;
    getVersion: () => Promise<{ version: string }>;
    getCapabilities: () => Promise<unknown>;
    onChecking: (callback: () => void) => void;
    onAvailable: (callback: (info: unknown) => void) => void;
    onNotAvailable: (callback: (info: unknown) => void) => void;
    onProgress: (callback: (progress: unknown) => void) => void;
    onDownloaded: (callback: (info: unknown) => void) => void;
    onError: (callback: (err: unknown) => void) => void;
    removeAllListeners: () => void;
  };
  menu: {
    onLifePlanningGuide: (callback: () => void) => void;
    removeAllListeners: () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
