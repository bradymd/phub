/**
 * Electron File System Storage Service
 * Uses Electron's IPC to store encrypted data in ~/Documents/PersonalHub/
 * Mirrors TauriStorageService functionality with Electron-specific implementation
 */

import { encrypt, decrypt } from '../utils/crypto';
import type { StorageService, ProgressCallback } from './storage';

// Electron API type definition
declare global {
  interface Window {
    electronAPI?: {
      fs: {
        ensureDataDir: () => Promise<{ success: boolean; error?: string }>;
        exists: (filePath: string) => Promise<{ exists: boolean }>;
        readTextFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        writeTextFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
        remove: (filePath: string) => Promise<{ success: boolean; error?: string }>;
        readTextFileAbsolute: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        writeTextFileAbsolute: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
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
    };
  }
}

export class ElectronStorageService implements StorageService {
  constructor(private masterPassword: string) {
    this.ensureDataDir();
  }

  // Ensure the data directory exists
  private async ensureDataDir(): Promise<void> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const result = await window.electronAPI.fs.ensureDataDir();
      if (!result.success) {
        console.error('Failed to create data directory:', result.error);
      } else {
        console.log('Data directory ready: ~/Documents/PersonalHub/data');
      }
    } catch (err) {
      console.error('Failed to ensure data directory:', err);
    }
  }

  // Get the file path for a storage key
  private getFilePath(key: string): string {
    return `${key}.encrypted.json`;
  }

  async get<T>(key: string): Promise<T[]> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const filePath = this.getFilePath(key);
      const existsResult = await window.electronAPI.fs.exists(filePath);

      if (!existsResult.exists) {
        console.log(`File not found: ${filePath}, returning empty array`);
        return [];
      }

      const readResult = await window.electronAPI.fs.readTextFile(filePath);

      if (!readResult.success || !readResult.content) {
        throw new Error(readResult.error || 'Failed to read file');
      }

      const encryptedData = JSON.parse(readResult.content);

      // Support both blob and individual item formats (same as Tauri version)
      if (typeof encryptedData === 'string') {
        // Single encrypted blob format
        try {
          const decryptedJson = await decrypt(encryptedData, this.masterPassword);
          const parsed = JSON.parse(decryptedJson);

          if (Array.isArray(parsed)) {
            return parsed;
          } else {
            console.error(`Blob for ${key} is not an array:`, typeof parsed);
            return [];
          }
        } catch (err) {
          console.error(`Failed to decrypt blob for ${key}:`, err);
          return [];
        }
      }

      // Individual encrypted items format
      const decryptedItems: T[] = [];
      for (const encrypted of encryptedData) {
        try {
          const decryptedJson = await decrypt(encrypted.data, this.masterPassword);
          decryptedItems.push(JSON.parse(decryptedJson));
        } catch (err) {
          console.error(`Failed to decrypt item in ${key}:`, err);
        }
      }

      return decryptedItems;
    } catch (err) {
      console.error(`Failed to load ${key}:`, err);
      throw new Error(`Failed to load ${key}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async save<T extends { id: string }>(
    key: string,
    items: T[],
    onProgress?: ProgressCallback
  ): Promise<void> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      await this.ensureDataDir();

      if (onProgress) onProgress(50, 100);

      // Encrypt entire array as single blob (same as Tauri version)
      const allJson = JSON.stringify(items);
      const encryptedBlob = await encrypt(allJson, this.masterPassword);

      if (onProgress) onProgress(75, 100);

      // Write to file
      const filePath = this.getFilePath(key);
      const writeResult = await window.electronAPI.fs.writeTextFile(filePath, JSON.stringify(encryptedBlob));

      if (!writeResult.success) {
        throw new Error(writeResult.error || 'Failed to write file');
      }

      if (onProgress) onProgress(100, 100);
    } catch (err) {
      console.error(`Failed to save ${key}:`, err);
      throw new Error(`Failed to save ${key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async add<T extends { id: string }>(key: string, item: T): Promise<void> {
    try {
      const items = await this.get<T>(key);
      await this.save(key, [...items, item]);
    } catch (err) {
      console.error(`Failed to add item to ${key}:`, err);
      throw new Error(`Failed to add item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async update<T extends { id: string }>(key: string, id: string, updatedItem: T): Promise<void> {
    try {
      const items = await this.get<T>(key);
      const index = items.findIndex(item => item.id === id);

      if (index === -1) {
        throw new Error(`Item with id ${id} not found in ${key}`);
      }

      items[index] = updatedItem;
      await this.save(key, items);
    } catch (err) {
      console.error(`Failed to update item in ${key}:`, err);
      throw new Error(`Failed to update item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async delete(key: string, id: string): Promise<void> {
    try {
      const items = await this.get<any>(key);
      const filtered = items.filter(item => item.id !== id);

      if (filtered.length === items.length) {
        throw new Error(`Item with id ${id} not found in ${key}`);
      }

      await this.save(key, filtered);
    } catch (err) {
      console.error(`Failed to delete item from ${key}:`, err);
      throw new Error(`Failed to delete item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async clear(key: string): Promise<void> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }

      const filePath = this.getFilePath(key);
      const existsResult = await window.electronAPI.fs.exists(filePath);

      if (existsResult.exists) {
        const removeResult = await window.electronAPI.fs.remove(filePath);
        if (!removeResult.success) {
          throw new Error(removeResult.error || 'Failed to delete file');
        }
      }
    } catch (err) {
      console.error(`Failed to clear ${key}:`, err);
      throw new Error(`Failed to clear ${key}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async clearAll(): Promise<void> {
    try {
      const keys = [
        'virtual_street',
        'finance_items',
        'pensions',
        'budget_items',
        'documents_certificates',
        'documents_education',
        'documents_health',
        'employment_records',
        'education_records',
        'medical_history',
        'photos',
        'contacts'
      ];

      for (const key of keys) {
        await this.clear(key);
      }
    } catch (err) {
      console.error('Failed to clear all data:', err);
      throw new Error(`Failed to clear all data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}
