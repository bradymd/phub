/**
 * Storage Context
 * Provides storage service to all components via React Context
 * Avoids prop-drilling masterPassword through the component tree
 */

import { createContext, useContext, ReactNode, useState } from 'react';
import { StorageService, createStorageService } from '../services/storage';
import { DocumentService, createDocumentService } from '../services/document-service';
import { hashPassword } from '../utils/crypto';

interface StorageContextType {
  storage: StorageService;
  documentService: DocumentService;
  masterPassword: string;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const StorageContext = createContext<StorageContextType | null>(null);

interface StorageProviderProps {
  masterPassword: string;
  children: ReactNode;
}

export function StorageProvider({ masterPassword, children }: StorageProviderProps) {
  const [storage, setStorage] = useState<StorageService>(() => createStorageService(masterPassword));
  const [documentService, setDocumentService] = useState<DocumentService>(() => createDocumentService(masterPassword));
  const [currentPassword, setCurrentPassword] = useState(masterPassword);

  const changePassword = async (oldPassword: string, newPassword: string) => {
    // 1. Verify current password
    if (oldPassword !== currentPassword) {
      throw new Error('Current password is incorrect');
    }

    // 2. Get all encrypted keys from localStorage/storage
    const allKeys: string[] = [];

    // Check if running in browser (localStorage) or Tauri (file system)
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

    if (!isTauri) {
      // Browser: scan localStorage for encrypted keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith('_encrypted')) {
          allKeys.push(key.replace('_encrypted', ''));
        }
      }
    } else {
      // Tauri: use known keys (all data is in ~/Documents/PersonalHub/)
      allKeys.push(
        'virtual_street',
        'finance_items',
        'pensions',
        'budget_items',
        'custom_categories',
        'documents_certificates',
        'documents_education',
        'documents_health',
        'employment_records',
        'education_records',
        'medical_history',
        'photos',
        'contacts'
      );
    }

    // 3. Create new storage services with new password
    const newStorage = createStorageService(newPassword);
    const newDocumentService = createDocumentService(newPassword);

    // 4. Migrate each key: decrypt with old password, encrypt with new password
    const errors: string[] = [];

    for (const key of allKeys) {
      try {
        // Load data with old storage (old password)
        const data = await storage.get(key);

        // Skip empty datasets
        if (data.length === 0) continue;

        // Save data with new storage (new password)
        await newStorage.save(key, data);
      } catch (err) {
        // If key doesn't exist or is empty, that's fine - skip it
        if (err instanceof Error && !err.message.includes('not found')) {
          errors.push(`${key}: ${err.message}`);
        }
      }
    }

    // 5. If there were critical errors, abort
    if (errors.length > 0) {
      throw new Error(`Failed to migrate some data: ${errors.join(', ')}`);
    }

    // 6. Update the password hash in localStorage
    const newPasswordHash = await hashPassword(newPassword);
    localStorage.setItem('master_password_hash', newPasswordHash);

    // 7. Update context with new services
    setStorage(newStorage);
    setDocumentService(newDocumentService);
    setCurrentPassword(newPassword);
  };

  return (
    <StorageContext.Provider value={{ storage, documentService, masterPassword: currentPassword, changePassword }}>
      {children}
    </StorageContext.Provider>
  );
}

// Custom hook to use storage service in components
export function useStorage(): StorageService {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }

  return context.storage;
}

// Custom hook to get document service
export function useDocumentService(): DocumentService {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error('useDocumentService must be used within a StorageProvider');
  }

  return context.documentService;
}

// Custom hook to get master password (for backup encryption)
export function useMasterPassword(): string {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error('useMasterPassword must be used within a StorageProvider');
  }

  return context.masterPassword;
}

// Custom hook to access password change functionality
export function useChangePassword() {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error('useChangePassword must be used within a StorageProvider');
  }

  return context.changePassword;
}
