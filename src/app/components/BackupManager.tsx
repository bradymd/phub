import { useState, useEffect } from 'react';
import { X, Download, Upload, HardDrive, AlertCircle, CheckCircle, Clock, Database, Shield, FileWarning, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useStorage, useMasterKey } from '../../contexts/StorageContext';
import { createBackup, getReconciliationReport, restoreBackup, importLegacyBackup, BackupManifest, ReconciliationReport } from '../../services/backup';
import { runIntegrityCheck, IntegrityReport, FileInfo } from '../../services/integrity';
import { showSaveDialog, showOpenDialog } from '../../utils/file-system';
import { decrypt } from '../../utils/crypto';

interface BackupManagerProps {
  onClose: () => void;
}

export function BackupManager({ onClose }: BackupManagerProps) {
  const storage = useStorage();
  const masterKey = useMasterKey();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [backupManifest, setBackupManifest] = useState<BackupManifest | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [restoreFilePath, setRestoreFilePath] = useState<string>('');
  const [restoreSelections, setRestoreSelections] = useState<Set<string>>(new Set());
  const [orphanRetry, setOrphanRetry] = useState<{ category: string; file: FileInfo } | null>(null);
  const [orphanPassword, setOrphanPassword] = useState('');

  // Convert data URL to Blob URL for better iframe rendering (especially for large PDFs)
  const dataUrlToBlobUrl = (dataUrl: string): string => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.error('Invalid data URL format');
      return dataUrl;
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  // Run integrity check on open
  useEffect(() => {
    handleIntegrityCheck();
  }, []);

  const handleIntegrityCheck = async () => {
    try {
      setIsChecking(true);
      setError('');
      const report = await runIntegrityCheck(storage);
      setIntegrityReport(report);
    } catch (err) {
      console.error('Integrity check failed:', err);
      setError(`Integrity check failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setError('');
      setSuccess('');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `PersonalHub_Backup_${timestamp}.phub`;

      const filePath = await showSaveDialog({
        defaultPath: `~/Downloads/${filename}`,
        filters: [{ name: 'PersonalHub Backup', extensions: ['phub'] }]
      });

      if (!filePath) {
        setIsBackingUp(false);
        return;
      }

      const manifest = await createBackup(filePath);
      setBackupManifest(manifest);

      const totalFiles = manifest.dataFiles.length + manifest.documentFiles.length;
      setSuccess(`Backup created successfully! ${totalFiles} files backed up.`);
    } catch (err) {
      console.error('Backup failed:', err);
      setError(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleOpenRestore = async () => {
    try {
      setError('');
      setSuccess('');
      setReconciliation(null);

      const filePathResult = await showOpenDialog({
        defaultPath: '~/Downloads/',
        multiple: false,
        filters: [
          { name: 'PersonalHub Backup', extensions: ['phub'] },
          { name: 'Legacy Backup', extensions: ['json'] }
        ]
      });

      if (!filePathResult) return;

      const filePath = typeof filePathResult === 'string' ? filePathResult : filePathResult[0];

      // Check if legacy format
      if (filePath.endsWith('.json') || filePath.includes('.encrypted.json')) {
        await handleLegacyImport(filePath);
        return;
      }

      setIsRestoring(true);
      setRestoreFilePath(filePath);

      // Read backup manifest to show user what will be restored
      const report = await getReconciliationReport(filePath);
      setReconciliation(report);

      // Don't pre-select anything - we'll do full restore with confirmation
      setRestoreSelections(new Set());
    } catch (err) {
      console.error('Failed to read backup:', err);
      setError(`Failed to read backup: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!reconciliation || !restoreFilePath) return;

    const totalFiles = reconciliation.manifest.dataFiles.length + reconciliation.manifest.documentFiles.length;
    const backupDate = new Date(reconciliation.manifest.timestamp).toLocaleString();

    // Step 1: Confirm full restore
    const confirmed = window.confirm(
      `⚠️ FULL RESTORE WARNING ⚠️\n\n` +
      `This will REPLACE ALL your current data with the backup from:\n` +
      `${backupDate}\n\n` +
      `Files to restore: ${totalFiles}\n\n` +
      `Your current data will be DELETED.\n\n` +
      `Do you want to continue?`
    );

    if (!confirmed) {
      return;
    }

    // Step 2: Offer to create safety backup
    const createSafetyBackup = window.confirm(
      `Create a safety backup of your CURRENT data first?\n\n` +
      `Recommended: This will save your current state to:\n` +
      `~/Documents/PersonalHub-pre-restore-backup-[timestamp]/\n\n` +
      `Click OK to create safety backup, or Cancel to skip.`
    );

    try {
      setIsRestoring(true);
      setError('');

      // Step 3: Create safety backup if requested
      if (createSafetyBackup) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `PersonalHub_Safety_Backup_${timestamp}.phub`;

        // Ask user where to save the safety backup
        const safetyBackupPath = await showSaveDialog({
          defaultPath: `~/Downloads/${filename}`,
          filters: [{ name: 'PersonalHub Backup', extensions: ['phub'] }]
        });

        if (!safetyBackupPath) {
          const continueWithoutBackup = window.confirm(
            `You cancelled the safety backup.\n\n` +
            `Continue with restore anyway? (NOT RECOMMENDED - your current data will be lost)`
          );
          if (!continueWithoutBackup) {
            setIsRestoring(false);
            return;
          }
        } else {
          try {
            await createBackup(safetyBackupPath);
            setSuccess(`Safety backup created: ${safetyBackupPath}\n\nNow restoring...`);
          } catch (err) {
            const continueAnyway = window.confirm(
              `Failed to create safety backup:\n${err instanceof Error ? err.message : String(err)}\n\n` +
              `Continue with restore anyway? (NOT RECOMMENDED)`
            );
            if (!continueAnyway) {
              setIsRestoring(false);
              return;
            }
          }
        }
      }

      // Step 4: Perform FULL restore (null = restore everything)
      const result = await restoreBackup(restoreFilePath, null);

      if (result.errors.length > 0) {
        setError(`Restored ${result.restoredCount} files with ${result.errors.length} errors:\n${result.errors.join('\n')}\n\nPlease restart the app.`);
      } else {
        setSuccess(`✅ Full restore complete!\n\nRestored ${result.restoredCount} files from backup.\n\n⚠️ IMPORTANT: You MUST restart the app now to load the restored data.`);
      }

      setReconciliation(null);
      setRestoreFilePath('');

      // Re-run integrity check
      await handleIntegrityCheck();
    } catch (err) {
      console.error('Restore failed:', err);
      setError(`Restore failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleLegacyImport = async (filePath: string) => {
    try {
      setIsRestoring(true);
      setError('');

      const result = await importLegacyBackup(filePath, masterKey);
      setSuccess(`Legacy backup imported: ${result.records} records across ${result.keys.length} categories. Restart the app to see changes.`);
    } catch (err) {
      console.error('Legacy import failed:', err);
      setError(`Legacy import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleRestoreSelection = (path: string) => {
    setRestoreSelections(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleViewOrphan = async (category: string, file: FileInfo) => {
    try {
      setError('');
      const filePath = `PersonalHub/documents/${category}/${file.path}`;
      const result = await window.electronAPI?.docs.readTextFile(filePath);
      if (!result?.success || !result.content) {
        setError(`Failed to read file: ${result?.error || 'Unknown error'}`);
        return;
      }
      // Decrypt - content is an encrypted data URL
      const cleaned = result.content.replace(/\s/g, '');
      const dataUrl = await decrypt(cleaned, masterKey);
      // Open in new window
      const win = window.open('', '_blank');
      if (win) {
        if (dataUrl.startsWith('data:application/pdf')) {
          // Use blob URL for better rendering of large PDFs
          const blobUrl = dataUrlToBlobUrl(dataUrl);
          win.document.write(`<iframe src="${blobUrl}" style="width:100%;height:100%;border:none;position:fixed;top:0;left:0;"></iframe>`);
        } else if (dataUrl.startsWith('data:image/')) {
          win.document.write(`<img src="${dataUrl}" style="max-width:100%;"/>`);
        } else {
          win.document.write(`<p>File type: ${dataUrl.split(';')[0].replace('data:', '')}</p><p><a href="${dataUrl}" download="${file.path.replace('.encrypted', '')}">Download</a></p>`);
        }
      }
    } catch (err) {
      setOrphanRetry({ category, file });
      setOrphanPassword('');
      setError(`Cannot decrypt "${file.path}" with current key. Enter your previous password below to retry.`);
    }
  };

  const handleRetryOrphanDecrypt = async () => {
    if (!orphanRetry || !orphanPassword) return;
    try {
      setError('');
      const filePath = `PersonalHub/documents/${orphanRetry.category}/${orphanRetry.file.path}`;
      const result = await window.electronAPI?.docs.readTextFile(filePath);
      if (!result?.success || !result.content) return;
      const cleaned = result.content.replace(/\s/g, '');
      const dataUrl = await decrypt(cleaned, orphanPassword);
      setOrphanRetry(null);
      setOrphanPassword('');
      const win = window.open('', '_blank');
      if (win) {
        if (dataUrl.startsWith('data:application/pdf')) {
          // Use blob URL for better rendering of large PDFs
          const blobUrl = dataUrlToBlobUrl(dataUrl);
          win.document.write(`<iframe src="${blobUrl}" style="width:100%;height:100%;border:none;position:fixed;top:0;left:0;"></iframe>`);
        } else if (dataUrl.startsWith('data:image/')) {
          win.document.write(`<img src="${dataUrl}" style="max-width:100%;"/>`);
        } else {
          win.document.write(`<p>File type: ${dataUrl.split(';')[0].replace('data:', '')}</p><p><a href="${dataUrl}" download="${orphanRetry.file.path.replace('.encrypted', '')}">Download</a></p>`);
        }
      }
    } catch {
      setError(`Cannot decrypt "${orphanRetry.file.path}" with that password either. File is unrecoverable. Safe to delete.`);
      setOrphanRetry(null);
      setOrphanPassword('');
    }
  };

  const handleDeleteOrphan = async (category: string, file: FileInfo) => {
    if (!window.confirm(`Delete orphaned file?\n\n${category}/${file.path}\n(${formatSize(file.size)})\n\nThis cannot be undone.`)) {
      return;
    }
    try {
      setError('');
      const filePath = `PersonalHub/documents/${category}/${file.path}`;
      const result = await window.electronAPI?.docs.remove(filePath);
      if (!result?.success) {
        setError(`Failed to delete: ${result?.error || 'Unknown error'}`);
        return;
      }
      setSuccess(`Deleted ${category}/${file.path}`);
      // Re-run integrity check
      await handleIntegrityCheck();
    } catch (err) {
      setError(`Failed to delete: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Backup & Restore</h2>
                <p className="text-sm text-gray-500 mt-1">Full encrypted backup with document files</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Success</p>
                <p className="text-sm text-green-700 mt-1 whitespace-pre-line">{success}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Integrity Status */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Data Integrity</h3>
                </div>
                <button
                  onClick={handleIntegrityCheck}
                  disabled={isChecking}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? 'Checking...' : 'Re-check'}
                </button>
              </div>

              {integrityReport && (
                <div className="text-sm space-y-1">
                  <div className="flex justify-between text-gray-600">
                    <span>Data records</span>
                    <span className="font-medium">{integrityReport.totalDataRecords}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Data files on disk</span>
                    <span className="font-medium">{integrityReport.dataFiles.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Document files matched</span>
                    <span className="font-medium text-green-700">{integrityReport.matched.length}</span>
                  </div>
                  {integrityReport.missingFiles.length > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Missing document files</span>
                      <span className="font-medium">{integrityReport.missingFiles.length}</span>
                    </div>
                  )}
                  {integrityReport.orphanedFiles.length > 0 && (
                    <div className="text-amber-600">
                      <div className="flex justify-between">
                        <span>Orphaned files (no metadata)</span>
                        <span className="font-medium">{integrityReport.orphanedFiles.length}</span>
                      </div>
                      <div className="mt-1 text-xs text-amber-500 space-y-1">
                        {integrityReport.orphanedFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 pl-2">
                            <span className="truncate flex-1">{f.category}/{f.file.path}</span>
                            <span className="flex-shrink-0 text-gray-500">{formatSize(f.file.size)}</span>
                            <button
                              onClick={() => handleViewOrphan(f.category, f.file)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="View file"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrphan(f.category, f.file)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Delete file"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {integrityReport.missingFiles.length === 0 && integrityReport.orphanedFiles.length === 0 && (
                    <div className="mt-2 text-green-700 font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      All files verified
                    </div>
                  )}

                  {orphanRetry && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="password"
                        value={orphanPassword}
                        onChange={(e) => setOrphanPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRetryOrphanDecrypt()}
                        placeholder="Previous password..."
                        className="flex-1 text-xs px-2 py-1 border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                        autoFocus
                      />
                      <button
                        onClick={handleRetryOrphanDecrypt}
                        disabled={!orphanPassword}
                        className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:bg-gray-300"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => { setOrphanRetry(null); setOrphanPassword(''); setError(''); }}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Backup Section */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Download className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Backup</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Saves all encrypted data and document files into a single <strong>.phub</strong> backup file. No decryption occurs - files are copied as-is.
                  </p>
                  <button
                    onClick={handleCreateBackup}
                    disabled={isBackingUp}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isBackingUp ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Backup...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Create Backup Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Backup Stats */}
            {backupManifest && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Last Backup</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Data Files</p>
                    <p className="text-xl font-bold text-gray-900">{backupManifest.dataFiles.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Documents</p>
                    <p className="text-xl font-bold text-gray-900">{backupManifest.documentFiles.length}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Master Key</p>
                    <p className="text-xl font-bold text-green-700">{backupManifest.hasMasterKey ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Restore Section */}
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Restore Backup</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Opens a .phub backup and shows what would change before restoring. Also supports legacy .encrypted.json format.
                  </p>
                  <button
                    onClick={handleOpenRestore}
                    disabled={isRestoring}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRestoring ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Reading Backup...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Open Backup File
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Restore Confirmation */}
            {reconciliation && (
              <div className="p-6 bg-red-50 rounded-xl border-2 border-red-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Full Restore - Replace All Data</h3>
                    <p className="text-sm text-red-800 mt-1">This will DELETE your current data and restore the backup</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg mb-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Backup date:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(reconciliation.manifest.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data files:</span>
                      <span className="font-semibold text-gray-900">{reconciliation.manifest.dataFiles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Document files:</span>
                      <span className="font-semibold text-gray-900">{reconciliation.manifest.documentFiles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Master key included:</span>
                      <span className={`font-semibold ${reconciliation.manifest.hasMasterKey ? 'text-green-700' : 'text-red-700'}`}>
                        {reconciliation.manifest.hasMasterKey ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <p className="font-semibold mb-2">What will happen:</p>
                      <ol className="list-decimal list-inside space-y-1 text-amber-800">
                        <li>You'll be asked if you want to create a safety backup of current data</li>
                        <li>ALL current data and document files will be deleted</li>
                        <li>ALL files from the backup will be restored</li>
                        <li>You MUST restart the app to see the restored data</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                  >
                    {isRestoring ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Start Full Restore
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setReconciliation(null)}
                    disabled={isRestoring}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-medium mb-1">About Backups & Restore:</p>
                <ul className="space-y-1 text-blue-800">
                  <li><strong>Full backup system:</strong> Each backup is a complete snapshot of all your data</li>
                  <li><strong>Backup:</strong> No decryption happens - files are copied as-is with your encrypted master key</li>
                  <li><strong>Restore:</strong> REPLACES all current data with the backup (not a merge)</li>
                  <li><strong>Safety:</strong> You'll be offered a safety backup before restore begins</li>
                  <li><strong>Password:</strong> Needed to restore (unlocks the master key in the backup)</li>
                  <li>Legacy .encrypted.json backups are still supported</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
