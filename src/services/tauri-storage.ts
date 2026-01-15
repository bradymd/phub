/**
 * Tauri File System Storage Service
 * Uses Tauri's file system API to store encrypted data in ~/Documents/PersonalHub/
 * Preserves all existing data structures and encryption
 */

import { BaseDirectory, exists, readTextFile, writeTextFile, mkdir, remove } from '@tauri-apps/plugin-fs';
import { encrypt, decrypt } from '../utils/crypto';
import type { StorageService, ProgressCallback } from './storage';

export class TauriStorageService implements StorageService {
  private dataDir = 'PersonalHub/data';

  constructor(private masterPassword: string) {
    this.ensureDataDir();
  }

  // Ensure the data directory exists
  private async ensureDataDir(): Promise<void> {
    try {
      const dirExists = await exists(this.dataDir, { baseDir: BaseDirectory.Document });
      if (!dirExists) {
        await mkdir(this.dataDir, { baseDir: BaseDirectory.Document, recursive: true });
        console.log('Created data directory:', this.dataDir);
      }
    } catch (err) {
      console.error('Failed to create data directory:', err);
    }
  }

  // Get the file path for a storage key
  private getFilePath(key: string): string {
    return `${this.dataDir}/${key}.encrypted.json`;
  }

  async get<T>(key: string): Promise<T[]> {
    try {
      const filePath = this.getFilePath(key);
      const fileExists = await exists(filePath, { baseDir: BaseDirectory.Document });

      if (!fileExists) {
        console.log(`File not found: ${filePath}, returning empty array`);
        return [];
      }

      const stored = await readTextFile(filePath, { baseDir: BaseDirectory.Document });
      const encryptedData = JSON.parse(stored);

      // Support both blob and individual item formats (same as localStorage version)
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
      await this.ensureDataDir();

      if (onProgress) onProgress(50, 100);

      // Encrypt entire array as single blob (same as localStorage version)
      const allJson = JSON.stringify(items);
      const encryptedBlob = await encrypt(allJson, this.masterPassword);

      if (onProgress) onProgress(75, 100);

      // Write to file
      const filePath = this.getFilePath(key);
      await writeTextFile(filePath, JSON.stringify(encryptedBlob), {
        baseDir: BaseDirectory.Document
      });

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
      const filePath = this.getFilePath(key);
      const fileExists = await exists(filePath, { baseDir: BaseDirectory.Document });

      if (fileExists) {
        await remove(filePath, { baseDir: BaseDirectory.Document });
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
