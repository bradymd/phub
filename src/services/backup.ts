/**
 * Backup Service
 * ZIP-based backup that copies already-encrypted files without decryption.
 * The wrapped master key is included so the backup is self-contained.
 * User's password is the only thing needed to open a backup.
 */

// Detect runtime environment
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

export interface BackupManifest {
  version: string;
  timestamp: string;
  dataFiles: Array<{ path: string; size: number }>;
  documentFiles: Array<{ path: string; size: number }>;
  hasMasterKey: boolean;
}

export interface ReconciliationEntry {
  path: string;
  sizeInBackup: number;
  sizeOnDisk: number | null; // null = not on disk
  modifiedOnDisk: string | null;
  status: 'new' | 'same' | 'conflict' | 'orphan';
}

export interface ReconciliationReport {
  manifest: BackupManifest;
  entries: ReconciliationEntry[];
  newFiles: ReconciliationEntry[];
  sameFiles: ReconciliationEntry[];
  conflicts: ReconciliationEntry[];
  orphansOnDisk: ReconciliationEntry[];
}

export type BackupProgressCallback = (phase: string, current: number, total: number) => void;

/**
 * Create a ZIP backup of all encrypted files
 * No decryption happens - just copies files into ZIP
 */
export async function createBackup(
  outputPath: string,
  onProgress?: BackupProgressCallback
): Promise<BackupManifest> {
  if (!isElectron || !window.electronAPI?.backup) {
    throw new Error('Backup requires Electron desktop environment');
  }

  const result = await window.electronAPI.backup.create(outputPath);

  if (!result.success) {
    throw new Error(result.error || 'Backup creation failed');
  }

  return result.manifest;
}

/**
 * Read a backup ZIP and compare against current disk state
 * Returns reconciliation report showing what would change on restore
 */
export async function getReconciliationReport(
  backupPath: string
): Promise<ReconciliationReport> {
  if (!isElectron || !window.electronAPI?.backup) {
    throw new Error('Backup requires Electron desktop environment');
  }

  const result = await window.electronAPI.backup.reconcile(backupPath);

  if (!result.success) {
    throw new Error(result.error || 'Failed to read backup');
  }

  return result.report;
}

/**
 * Restore files from backup ZIP
 * Only restores specified files (from reconciliation selection)
 * If filesToRestore is null, restores everything
 */
export async function restoreBackup(
  backupPath: string,
  filesToRestore: string[] | null
): Promise<{ restoredCount: number; errors: string[] }> {
  if (!isElectron || !window.electronAPI?.backup) {
    throw new Error('Backup requires Electron desktop environment');
  }

  const result = await window.electronAPI.backup.restore(backupPath, filesToRestore);

  if (!result.success) {
    throw new Error(result.error || 'Restore failed');
  }

  return { restoredCount: result.restoredCount, errors: result.errors || [] };
}

/**
 * Legacy: Import old-format encrypted JSON backup
 * For backward compatibility with .encrypted.json backups
 */
export async function importLegacyBackup(
  filePath: string,
  masterKey: string
): Promise<{ records: number; keys: string[] }> {
  if (!isElectron || !window.electronAPI?.backup) {
    throw new Error('Backup requires Electron desktop environment');
  }

  const result = await window.electronAPI.backup.importLegacy(filePath, masterKey);

  if (!result.success) {
    throw new Error(result.error || 'Legacy import failed');
  }

  return { records: result.records, keys: result.keys };
}
