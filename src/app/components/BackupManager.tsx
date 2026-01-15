import { useState } from 'react';
import { X, Download, Upload, HardDrive, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';
import { useStorage, useMasterPassword } from '../../contexts/StorageContext';
import { BackupService, BackupData } from '../../services/backup';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

interface BackupManagerProps {
  onClose: () => void;
}

export function BackupManager({ onClose }: BackupManagerProps) {
  const storage = useStorage();
  const masterPassword = useMasterPassword();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastBackupStats, setLastBackupStats] = useState<{
    totalRecords: number;
    categories: { [key: string]: number };
  } | null>(null);

  const backupService = new BackupService(storage, masterPassword);

  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setError('');
      setSuccess('');

      // Create backup
      console.log('Creating backup...');
      const backup = await backupService.createBackup();
      const stats = backupService.getBackupStats(backup);
      setLastBackupStats(stats);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `PersonalHub_Backup_${timestamp}.encrypted.json`;

      // Show save dialog
      const filePath = await save({
        defaultPath: `~/Downloads/${filename}`,
        filters: [{
          name: 'Encrypted Backup',
          extensions: ['json']
        }]
      });

      if (!filePath) {
        setIsBackingUp(false);
        return; // User cancelled
      }

      // Write encrypted backup to file
      console.log('Encrypting and writing backup to:', filePath);
      const encryptedJson = await backupService.exportBackupToJson(backup);
      await writeTextFile(filePath, encryptedJson);

      setSuccess(`✅ Encrypted backup created! ${stats.totalRecords} records backed up to ${filePath}`);
    } catch (err) {
      console.error('Backup failed:', err);
      setError(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!window.confirm('⚠️ Warning: This will replace ALL your current data with the backup. Are you sure?')) {
      return;
    }

    try {
      setIsRestoring(true);
      setError('');
      setSuccess('');

      // Show open dialog
      const filePath = await open({
        defaultPath: '~/Downloads/',
        multiple: false,
        filters: [{
          name: 'Encrypted Backup',
          extensions: ['json']
        }]
      });

      if (!filePath) {
        setIsRestoring(false);
        return; // User cancelled
      }

      // Read and decrypt backup file
      console.log('Reading and decrypting backup from:', filePath);
      const encryptedJson = await readTextFile(filePath as string);
      const backup = await backupService.importBackupFromJson(encryptedJson);

      // Show preview
      const stats = backupService.getBackupStats(backup);
      const backupDate = new Date(backup.timestamp).toLocaleString();

      if (!window.confirm(
        `Restore backup from ${backupDate}?\n\n` +
        `This backup contains ${stats.totalRecords} records.\n\n` +
        `Click OK to restore (this will overwrite your current data).`
      )) {
        setIsRestoring(false);
        return;
      }

      // Restore backup
      console.log('Restoring backup...');
      await backupService.restoreBackup(backup);
      setLastBackupStats(stats);

      setSuccess(`Backup restored successfully! ${stats.totalRecords} records restored. Please restart the app to see changes.`);
    } catch (err) {
      console.error('Restore failed:', err);
      setError(`Restore failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
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
                <p className="text-sm text-gray-500 mt-1">Protect your encrypted data</p>
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
            {/* Backup Section */}
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Download className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Backup</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Export all your data to an <strong>encrypted</strong> backup file. The backup is protected with your master password.
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

            {/* Restore Section */}
            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Restore Backup</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    ⚠️ <strong>Warning:</strong> This will replace ALL current data with the backup file.
                  </p>
                  <button
                    onClick={handleRestoreBackup}
                    disabled={isRestoring}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRestoring ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Restore from Backup
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            {lastBackupStats && (
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Last Operation Statistics</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Total Records</p>
                    <p className="text-2xl font-bold text-gray-900">{lastBackupStats.totalRecords}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(lastBackupStats.categories).filter(k => lastBackupStats.categories[k] > 0).length}
                    </p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  {Object.entries(lastBackupStats.categories)
                    .filter(([_, count]) => count > 0)
                    .map(([key, count]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{count} records</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-medium mb-1">Backup Best Practices:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• Create backups regularly (weekly recommended)</li>
                  <li>• Store backups in a safe location (external drive, cloud storage)</li>
                  <li>• Keep multiple backup versions</li>
                  <li>• Test your backups periodically</li>
                  <li>• <strong>Backups are encrypted with AES-256-GCM</strong> using your master password</li>
                  <li>• Without your master password, backups cannot be decrypted!</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
