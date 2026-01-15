/**
 * Storage Context
 * Provides storage service to all components via React Context
 * Avoids prop-drilling masterPassword through the component tree
 */

import { createContext, useContext, ReactNode } from 'react';
import { StorageService, createStorageService } from '../services/storage';
import { DocumentService, createDocumentService } from '../services/document-service';

interface StorageContextType {
  storage: StorageService;
  documentService: DocumentService;
  masterPassword: string;
}

const StorageContext = createContext<StorageContextType | null>(null);

interface StorageProviderProps {
  masterPassword: string;
  children: ReactNode;
}

export function StorageProvider({ masterPassword, children }: StorageProviderProps) {
  const storage = createStorageService(masterPassword);
  const documentService = createDocumentService(masterPassword);

  return (
    <StorageContext.Provider value={{ storage, documentService, masterPassword }}>
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
