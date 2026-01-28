/**
 * Storage Context
 * Provides storage service to all components via React Context
 * Implements Key Wrapping Pattern for secure password changes
 *
 * Architecture:
 * - Master Key: Random 256-bit key that encrypts all data (never changes)
 * - User Password: Wraps (encrypts) the Master Key
 * - Password change: Only re-wraps Master Key, doesn't re-encrypt all data
 */

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { StorageService, createStorageService } from '../services/storage';
import { DocumentService, createDocumentService } from '../services/document-service';
import { hashPassword } from '../utils/crypto';
import { generateMasterKey, wrapMasterKey, unwrapMasterKey, masterKeyToString } from '../services/master-key';
import { masterKeyExists, readWrappedMasterKey, writeWrappedMasterKey } from '../services/master-key-storage';

interface StorageContextType {
  storage: StorageService;
  documentService: DocumentService;
  masterPassword: string;
  masterKeyString: string;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const StorageContext = createContext<StorageContextType | null>(null);

interface StorageProviderProps {
  masterPassword: string;
  children: ReactNode;
}

export function StorageProvider({ masterPassword, children }: StorageProviderProps) {
  const [masterKeyString, setMasterKeyString] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageService | null>(null);
  const [documentService, setDocumentService] = useState<DocumentService | null>(null);
  const [currentPassword, setCurrentPassword] = useState(masterPassword);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize master key on mount
  useEffect(() => {
    async function initializeMasterKey() {
      try {
        const keyExists = await masterKeyExists();

        let masterKey: Uint8Array;

        if (keyExists) {
          // Existing user: Unwrap master key with password
          console.log('Master key exists, unwrapping...');
          const wrappedKey = await readWrappedMasterKey();
          masterKey = await unwrapMasterKey(wrappedKey, masterPassword);
        } else {
          // New user or migration: Generate master key and wrap it
          console.log('No master key found, generating new one...');
          masterKey = generateMasterKey();
          const wrappedKey = await wrapMasterKey(masterKey, masterPassword);
          await writeWrappedMasterKey(wrappedKey);
          console.log('Master key generated and saved');
        }

        // Convert to string for storage services
        const keyString = masterKeyToString(masterKey);
        setMasterKeyString(keyString);

        // Create storage services with master key
        setStorage(createStorageService(keyString));
        setDocumentService(createDocumentService(keyString));
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize master key:', err);
        throw new Error('Failed to initialize encryption. Please check your password.');
      }
    }

    initializeMasterKey();
  }, [masterPassword]);

  const changePassword = async (oldPassword: string, newPassword: string) => {
    // 1. Verify current password
    if (oldPassword !== currentPassword) {
      throw new Error('Current password is incorrect');
    }

    if (!masterKeyString) {
      throw new Error('Master key not initialized');
    }

    // 2. Read current wrapped master key
    const wrappedKey = await readWrappedMasterKey();

    // 3. Unwrap with old password to verify it's correct
    const masterKey = await unwrapMasterKey(wrappedKey, oldPassword);

    // 4. Re-wrap master key with new password
    const newWrappedKey = await wrapMasterKey(masterKey, newPassword);

    // 5. Save re-wrapped master key
    await writeWrappedMasterKey(newWrappedKey);

    // 6. Update the password hash in localStorage
    const newPasswordHash = await hashPassword(newPassword);
    localStorage.setItem('master_password_hash', newPasswordHash);

    // 7. Update current password in context
    setCurrentPassword(newPassword);

    console.log('Password changed successfully - only master key was re-wrapped, no data re-encryption needed');
  };

  // Don't render children until master key is initialized
  if (!isInitialized || !storage || !documentService) {
    return null; // Or a loading spinner
  }

  return (
    <StorageContext.Provider value={{ storage, documentService, masterPassword: currentPassword, masterKeyString: masterKeyString!, changePassword }}>
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

// Custom hook to get master key string (for legacy backup import)
export function useMasterKey(): string {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error('useMasterKey must be used within a StorageProvider');
  }

  return context.masterKeyString;
}

// Custom hook to access password change functionality
export function useChangePassword() {
  const context = useContext(StorageContext);

  if (!context) {
    throw new Error('useChangePassword must be used within a StorageProvider');
  }

  return context.changePassword;
}
