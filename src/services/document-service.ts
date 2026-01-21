/**
 * Document Service
 * Handles loading and saving documents as separate encrypted files
 * Documents are stored in ~/Documents/PersonalHub/documents/{category}/
 * Works with both Electron and Tauri
 */

import { encrypt, decrypt } from '../utils/crypto';

// Detect runtime environment
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI?: {
      docs: {
        exists: (relativePath: string) => Promise<{ exists: boolean }>;
        mkdir: (relativePath: string) => Promise<{ success: boolean; error?: string }>;
        readTextFile: (relativePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
        writeTextFile: (relativePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
        remove: (relativePath: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

export interface DocumentReference {
  id: string;
  filename: string;
  mimeType: string;
  uploadDate: string;
  encryptedPath: string;
  size: number;
}

export type DocumentCategory = 'medical' | 'education' | 'certificates';

export class DocumentService {
  private documentsBaseDir = 'PersonalHub/documents';

  constructor(private masterPassword: string) {
    this.ensureDocumentDirectories();
  }

  // Ensure all document directories exist
  private async ensureDocumentDirectories(): Promise<void> {
    try {
      const categories: DocumentCategory[] = ['medical', 'education', 'certificates'];

      for (const category of categories) {
        const dir = `${this.documentsBaseDir}/${category}`;

        if (isElectron && window.electronAPI) {
          // Electron path
          const existsResult = await window.electronAPI.docs.exists(dir);
          if (!existsResult.exists) {
            await window.electronAPI.docs.mkdir(dir);
            console.log(`Created document directory: ${dir}`);
          }
        } else {
          // Tauri path
          const { exists, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');
          const dirExists = await exists(dir, { baseDir: BaseDirectory.Document });
          if (!dirExists) {
            await mkdir(dir, { baseDir: BaseDirectory.Document, recursive: true });
            console.log(`Created document directory: ${dir}`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to create document directories:', err);
    }
  }

  // Generate unique document ID
  private generateDocId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get file extension from MIME type
  private getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'text/plain': 'txt',
      'image/tiff': 'tif'
    };
    return map[mimeType] || 'bin';
  }

  // Parse data URL to extract MIME type and base64 data
  private parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL format');
    }
    return {
      mimeType: match[1],
      base64Data: match[2]
    };
  }

  /**
   * Load a document by its reference
   * Returns the decrypted data URL for viewing
   */
  async loadDocument(category: DocumentCategory, docRef: DocumentReference): Promise<string> {
    try {
      const filePath = `${this.documentsBaseDir}/${category}/${docRef.encryptedPath}`;

      let encryptedContent: string;

      if (isElectron && window.electronAPI) {
        // Electron path
        const existsResult = await window.electronAPI.docs.exists(filePath);
        if (!existsResult.exists) {
          throw new Error(`Document file not found: ${docRef.filename}`);
        }

        const readResult = await window.electronAPI.docs.readTextFile(filePath);
        if (!readResult.success || !readResult.content) {
          throw new Error(readResult.error || 'Failed to read file');
        }
        encryptedContent = readResult.content;
      } else {
        // Tauri path
        const { exists, readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const fileExists = await exists(filePath, { baseDir: BaseDirectory.Document });
        if (!fileExists) {
          throw new Error(`Document file not found: ${docRef.filename}`);
        }
        encryptedContent = await readTextFile(filePath, { baseDir: BaseDirectory.Document });
      }

      // Decrypt to get data URL
      const dataUrl = await decrypt(encryptedContent, this.masterPassword);

      return dataUrl;
    } catch (err) {
      console.error(`Failed to load document ${docRef.filename}:`, err);
      throw new Error(`Failed to load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Save a new document
   * Takes a data URL and returns a document reference
   */
  async saveDocument(
    category: DocumentCategory,
    filename: string,
    dataUrl: string,
    uploadDate: string = new Date().toISOString()
  ): Promise<DocumentReference> {
    try {
      await this.ensureDocumentDirectories();

      // Parse data URL
      const { mimeType, base64Data } = this.parseDataUrl(dataUrl);
      const extension = this.getExtension(mimeType);

      // Generate unique ID and path
      const docId = this.generateDocId();
      const encryptedFilename = `${docId}.${extension}.encrypted`;
      const filePath = `${this.documentsBaseDir}/${category}/${encryptedFilename}`;

      // Encrypt and write to file
      const encryptedContent = await encrypt(dataUrl, this.masterPassword);

      if (isElectron && window.electronAPI) {
        // Electron path
        const writeResult = await window.electronAPI.docs.writeTextFile(filePath, encryptedContent);
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to write file');
        }
      } else {
        // Tauri path
        const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(filePath, encryptedContent, {
          baseDir: BaseDirectory.Document
        });
      }

      // Calculate size (decode base64 to get actual byte size)
      // Base64 encoding adds ~33% overhead: every 4 chars = 3 bytes
      const size = Math.ceil((base64Data.length * 3) / 4);

      // Return reference
      const docRef: DocumentReference = {
        id: docId,
        filename,
        mimeType,
        uploadDate,
        encryptedPath: encryptedFilename,
        size
      };

      console.log(`Saved document: ${filename} (${(size / 1024).toFixed(1)} KB) -> ${encryptedFilename}`);

      return docRef;
    } catch (err) {
      console.error(`Failed to save document ${filename}:`, err);
      throw new Error(`Failed to save document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a document file
   */
  async deleteDocument(category: DocumentCategory, docRef: DocumentReference): Promise<void> {
    try {
      const filePath = `${this.documentsBaseDir}/${category}/${docRef.encryptedPath}`;

      if (isElectron && window.electronAPI) {
        // Electron path
        const existsResult = await window.electronAPI.docs.exists(filePath);
        if (existsResult.exists) {
          const removeResult = await window.electronAPI.docs.remove(filePath);
          if (!removeResult.success) {
            throw new Error(removeResult.error || 'Failed to delete file');
          }
          console.log(`Deleted document: ${docRef.filename}`);
        }
      } else {
        // Tauri path
        const { exists, remove, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const fileExists = await exists(filePath, { baseDir: BaseDirectory.Document });
        if (fileExists) {
          await remove(filePath, { baseDir: BaseDirectory.Document });
          console.log(`Deleted document: ${docRef.filename}`);
        }
      }
    } catch (err) {
      console.error(`Failed to delete document ${docRef.filename}:`, err);
      throw new Error(`Failed to delete document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteDocuments(category: DocumentCategory, docRefs: DocumentReference[]): Promise<void> {
    for (const docRef of docRefs) {
      await this.deleteDocument(category, docRef);
    }
  }
}

// Factory function for creating document service
export function createDocumentService(masterPassword: string): DocumentService {
  return new DocumentService(masterPassword);
}
