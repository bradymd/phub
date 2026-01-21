/**
 * Storage Service Layer
 * Provides abstraction over storage implementations (localStorage, IndexedDB)
 * Handles encryption/decryption and provides consistent CRUD API
 */

import { encrypt, decrypt } from '../utils/crypto';

// Progress callback type for bulk operations
export type ProgressCallback = (current: number, total: number) => void;

// Storage service interface - the contract all implementations must follow
export interface StorageService {
  get<T>(key: string): Promise<T[]>;
  save<T>(key: string, items: T[], onProgress?: ProgressCallback): Promise<void>;
  add<T>(key: string, item: T): Promise<void>;
  update<T>(key: string, id: string, item: T): Promise<void>;
  delete(key: string, id: string): Promise<void>;
  clear(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

// LocalStorage implementation
// Used as fallback when running in browser (development/testing)
// Production desktop app uses TauriStorageService
export class LocalStorageService implements StorageService {
  constructor(private masterPassword: string) {}

  async get<T>(key: string): Promise<T[]> {
    try {
      const stored = localStorage.getItem(`${key}_encrypted`);
      if (!stored) return [];

      const encryptedData = JSON.parse(stored);

      // Performance optimization: decrypt as single blob if format supports it
      if (typeof encryptedData === 'string') {
        // Single encrypted blob format
        try {
          const decryptedJson = await decrypt(encryptedData, this.masterPassword);
          const parsed = JSON.parse(decryptedJson);

          // Ensure we always return an array
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

      // New format: individual encrypted items (slower but more resilient)
      const decryptedItems: T[] = [];
      for (const encrypted of encryptedData) {
        try {
          const decryptedJson = await decrypt(encrypted.data, this.masterPassword);
          decryptedItems.push(JSON.parse(decryptedJson));
        } catch (err) {
          console.error(`Failed to decrypt item in ${key}:`, err);
          // Skip corrupted entries but continue processing others
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
      // Performance optimization: encrypt entire array as single blob
      // This is MUCH faster than individual encryption for large datasets
      if (onProgress) onProgress(50, 100);

      const allJson = JSON.stringify(items);
      const encryptedBlob = await encrypt(allJson, this.masterPassword);

      if (onProgress) onProgress(75, 100);

      // Store as string blob wrapped in JSON
      localStorage.setItem(`${key}_encrypted`, JSON.stringify(encryptedBlob));

      if (onProgress) onProgress(100, 100);
    } catch (err) {
      console.error(`Failed to save ${key}:`, err);
      throw new Error(`Failed to save ${key}: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      localStorage.removeItem(`${key}_encrypted`);
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

// Import Electron storage (only used when running as desktop app)
import { ElectronStorageService } from './electron-storage';

// Factory function - automatically detects environment and uses appropriate storage
export function createStorageService(masterPassword: string): StorageService {
  // Detect if running in Electron (desktop app)
  const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

  if (isElectron) {
    // Use Electron file system storage (desktop app)
    console.log('Using Electron file system storage: ~/Documents/PersonalHub/');
    return new ElectronStorageService(masterPassword);
  }

  // Use localStorage (browser/development)
  console.log('Using browser localStorage');
  return new LocalStorageService(masterPassword);
}
