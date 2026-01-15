/**
 * Backup Service
 * Handles backup and restore of all encrypted data
 */

import { StorageService } from './storage';
import { encrypt, decrypt } from '../utils/crypto';

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    [key: string]: any[];
  };
}

// All keys that should be backed up
const BACKUP_KEYS = [
  'virtual_street',
  'finance_items',
  'pensions',
  'budget_items',
  'certificates',
  'documents_certificates',
  'education_records',
  'medical_history',
  'employment_records',
  'contacts',
  'photos'
];

export class BackupService {
  constructor(
    private storage: StorageService,
    private masterPassword: string
  ) {}

  /**
   * Create a backup of all encrypted data
   */
  async createBackup(): Promise<BackupData> {
    const backup: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {}
    };

    // Load all data from storage
    for (const key of BACKUP_KEYS) {
      try {
        const data = await this.storage.get(key);
        backup.data[key] = data;
      } catch (err) {
        console.warn(`Failed to backup ${key}, skipping:`, err);
        backup.data[key] = [];
      }
    }

    return backup;
  }

  /**
   * Restore data from a backup
   */
  async restoreBackup(backup: BackupData): Promise<void> {
    // Validate backup format
    if (!backup.version || !backup.data) {
      throw new Error('Invalid backup format');
    }

    // Restore each key
    const errors: string[] = [];
    for (const key of BACKUP_KEYS) {
      if (!backup.data[key]) {
        console.warn(`Backup missing data for ${key}, skipping`);
        continue;
      }

      try {
        await this.storage.save(key, backup.data[key]);
      } catch (err) {
        const errorMsg = `Failed to restore ${key}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Backup restored with errors:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStats(backup: BackupData): {
    totalRecords: number;
    categories: { [key: string]: number };
  } {
    const categories: { [key: string]: number } = {};
    let totalRecords = 0;

    for (const [key, data] of Object.entries(backup.data)) {
      const count = Array.isArray(data) ? data.length : 0;
      categories[key] = count;
      totalRecords += count;
    }

    return { totalRecords, categories };
  }

  /**
   * Export backup to encrypted JSON string
   */
  async exportBackupToJson(backup: BackupData): Promise<string> {
    const json = JSON.stringify(backup);
    const encrypted = await encrypt(json, this.masterPassword);
    return encrypted;
  }

  /**
   * Import backup from encrypted JSON string
   */
  async importBackupFromJson(encryptedJson: string): Promise<BackupData> {
    try {
      // Decrypt the backup
      const decryptedJson = await decrypt(encryptedJson, this.masterPassword);
      const backup = JSON.parse(decryptedJson);

      // Validate structure
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup format');
      }

      return backup;
    } catch (err) {
      throw new Error(`Failed to decrypt/parse backup file: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
