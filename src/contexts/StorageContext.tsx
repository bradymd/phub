/**
 * Storage Context
 * Provides storage service to all components via React Context
 * Avoids prop-drilling masterPassword through the component tree
 */

import { createContext, useContext, ReactNode } from 'react';
import { StorageService, createStorageService } from '../services/storage';

interface StorageContextType {
  storage: StorageService;
}

const StorageContext = createContext<StorageContextType | null>(null);

interface StorageProviderProps {
  masterPassword: string;
  children: ReactNode;
}

export function StorageProvider({ masterPassword, children }: StorageProviderProps) {
  const storage = createStorageService(masterPassword);

  return (
    <StorageContext.Provider value={{ storage }}>
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
