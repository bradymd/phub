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
        writeBinaryFile: (relativePath: string, base64Data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        remove: (relativePath: string) => Promise<{ success: boolean; error?: string }>;
        listDir: (relativePath: string) => Promise<{ success: boolean; files?: Array<{ path: string; size: number; modifiedAt: string }>; error?: string }>;
        listSubDirs: (relativePath: string) => Promise<{ success: boolean; dirs?: string[]; error?: string }>;
      };
      backup: {
        create: (outputPath: string) => Promise<{ success: boolean; manifest?: any; error?: string }>;
        reconcile: (backupPath: string) => Promise<{ success: boolean; report?: any; error?: string }>;
        restore: (backupPath: string, filesToRestore: string[] | null) => Promise<{ success: boolean; restoredCount?: number; errors?: string[]; error?: string }>;
        importLegacy: (filePath: string, masterKey: string) => Promise<{ success: boolean; records?: number; keys?: string[]; error?: string }>;
      };
      shell: {
        openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;
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
  thumbnailPath?: string;
  size: number;
}

export type DocumentCategory = 'medical' | 'education' | 'certificates' | 'pets' | 'dental' | 'holiday_plans';

export class DocumentService {
  private documentsBaseDir = 'PersonalHub/documents';

  constructor(private masterPassword: string) {
    this.ensureDocumentDirectories();
  }

  // Ensure all document directories exist
  private async ensureDocumentDirectories(): Promise<void> {
    try {
      const categories: DocumentCategory[] = ['medical', 'education', 'certificates', 'pets', 'dental', 'holiday_plans'];

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
        // Remove ALL whitespace (spaces, newlines, tabs, etc.) to handle any formatting differences
        encryptedContent = readResult.content.replace(/\s/g, '');
        console.log(`[Electron] Read document from: ${filePath}, original length: ${readResult.content.length}, cleaned: ${encryptedContent.length}`);
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
   * Generate a thumbnail data URL from an image data URL
   * Returns undefined for non-image types
   */
  private generateThumbnail(dataUrl: string, mimeType: string): Promise<string | undefined> {
    return new Promise((resolve) => {
      if (!mimeType.startsWith('image/')) {
        resolve(undefined);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(undefined);
      img.src = dataUrl;
    });
  }

  /**
   * Save a new document
   * Takes a data URL and returns a document reference
   * Automatically generates and saves a thumbnail for image files
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
        const writeResult = await window.electronAPI.docs.writeTextFile(filePath, encryptedContent);
        if (!writeResult.success) {
          throw new Error(writeResult.error || 'Failed to write file');
        }
      } else {
        const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(filePath, encryptedContent, {
          baseDir: BaseDirectory.Document
        });
      }

      // Generate and save thumbnail for images
      let thumbnailPath: string | undefined;
      const thumbnailDataUrl = await this.generateThumbnail(dataUrl, mimeType);
      if (thumbnailDataUrl) {
        const thumbFilename = `${docId}.${extension}.thumb.encrypted`;
        const thumbFilePath = `${this.documentsBaseDir}/${category}/${thumbFilename}`;
        const encryptedThumb = await encrypt(thumbnailDataUrl, this.masterPassword);

        if (isElectron && window.electronAPI) {
          const thumbResult = await window.electronAPI.docs.writeTextFile(thumbFilePath, encryptedThumb);
          if (thumbResult.success) {
            thumbnailPath = thumbFilename;
          }
        } else {
          const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(thumbFilePath, encryptedThumb, { baseDir: BaseDirectory.Document });
          thumbnailPath = thumbFilename;
        }
      }

      // Calculate size (decode base64 to get actual byte size)
      const size = Math.ceil((base64Data.length * 3) / 4);

      // Return reference
      const docRef: DocumentReference = {
        id: docId,
        filename,
        mimeType,
        uploadDate,
        encryptedPath: encryptedFilename,
        thumbnailPath,
        size
      };

      console.log(`Saved document: ${filename} (${(size / 1024).toFixed(1)} KB) -> ${encryptedFilename}${thumbnailPath ? ' + thumbnail' : ''}`);

      return docRef;
    } catch (err) {
      console.error(`Failed to save document ${filename}:`, err);
      throw new Error(`Failed to save document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a thumbnail by its path
   * Returns the decrypted thumbnail data URL, or undefined if not found
   */
  async loadThumbnail(category: DocumentCategory, thumbnailPath: string): Promise<string | undefined> {
    try {
      const filePath = `${this.documentsBaseDir}/${category}/${thumbnailPath}`;

      if (isElectron && window.electronAPI) {
        const existsResult = await window.electronAPI.docs.exists(filePath);
        if (!existsResult.exists) return undefined;

        const readResult = await window.electronAPI.docs.readTextFile(filePath);
        if (!readResult.success || !readResult.content) return undefined;

        const cleaned = readResult.content.replace(/\s/g, '');
        return await decrypt(cleaned, this.masterPassword);
      } else {
        const { exists, readTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const fileExists = await exists(filePath, { baseDir: BaseDirectory.Document });
        if (!fileExists) return undefined;

        const content = await readTextFile(filePath, { baseDir: BaseDirectory.Document });
        return await decrypt(content, this.masterPassword);
      }
    } catch (err) {
      console.warn(`Failed to load thumbnail ${thumbnailPath}:`, err);
      return undefined;
    }
  }

  /**
   * Regenerate thumbnail for an existing document
   * Loads the document, generates a thumbnail, saves it, returns updated reference
   */
  async regenerateThumbnail(category: DocumentCategory, docRef: DocumentReference): Promise<DocumentReference> {
    // Load the original document
    const dataUrl = await this.loadDocument(category, docRef);
    const { mimeType } = this.parseDataUrl(dataUrl);

    if (!mimeType.startsWith('image/')) {
      throw new Error('Thumbnails can only be generated for image files');
    }

    // Delete old thumbnail if it exists
    if (docRef.thumbnailPath) {
      const oldThumbPath = `${this.documentsBaseDir}/${category}/${docRef.thumbnailPath}`;
      if (isElectron && window.electronAPI) {
        const exists = await window.electronAPI.docs.exists(oldThumbPath);
        if (exists.exists) {
          await window.electronAPI.docs.remove(oldThumbPath);
        }
      } else {
        const { exists, remove, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        if (await exists(oldThumbPath, { baseDir: BaseDirectory.Document })) {
          await remove(oldThumbPath, { baseDir: BaseDirectory.Document });
        }
      }
    }

    // Generate new thumbnail
    const thumbnailDataUrl = await this.generateThumbnail(dataUrl, mimeType);
    if (!thumbnailDataUrl) {
      throw new Error('Failed to generate thumbnail');
    }

    // Derive thumb filename from the document's encrypted path
    const thumbFilename = docRef.encryptedPath.replace('.encrypted', '.thumb.encrypted');
    const thumbFilePath = `${this.documentsBaseDir}/${category}/${thumbFilename}`;
    const encryptedThumb = await encrypt(thumbnailDataUrl, this.masterPassword);

    if (isElectron && window.electronAPI) {
      const result = await window.electronAPI.docs.writeTextFile(thumbFilePath, encryptedThumb);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write thumbnail');
      }
    } else {
      const { writeTextFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(thumbFilePath, encryptedThumb, { baseDir: BaseDirectory.Document });
    }

    console.log(`Regenerated thumbnail for ${docRef.filename} -> ${thumbFilename}`);
    return { ...docRef, thumbnailPath: thumbFilename };
  }

  /**
   * Delete a document file and its thumbnail
   */
  async deleteDocument(category: DocumentCategory, docRef: DocumentReference): Promise<void> {
    try {
      const filePath = `${this.documentsBaseDir}/${category}/${docRef.encryptedPath}`;

      if (isElectron && window.electronAPI) {
        const existsResult = await window.electronAPI.docs.exists(filePath);
        if (existsResult.exists) {
          const removeResult = await window.electronAPI.docs.remove(filePath);
          if (!removeResult.success) {
            throw new Error(removeResult.error || 'Failed to delete file');
          }
        }
        // Also delete thumbnail if it exists
        if (docRef.thumbnailPath) {
          const thumbPath = `${this.documentsBaseDir}/${category}/${docRef.thumbnailPath}`;
          const thumbExists = await window.electronAPI.docs.exists(thumbPath);
          if (thumbExists.exists) {
            await window.electronAPI.docs.remove(thumbPath);
          }
        }
      } else {
        const { exists, remove, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        const fileExists = await exists(filePath, { baseDir: BaseDirectory.Document });
        if (fileExists) {
          await remove(filePath, { baseDir: BaseDirectory.Document });
        }
        if (docRef.thumbnailPath) {
          const thumbPath = `${this.documentsBaseDir}/${category}/${docRef.thumbnailPath}`;
          const thumbExists = await exists(thumbPath, { baseDir: BaseDirectory.Document });
          if (thumbExists) {
            await remove(thumbPath, { baseDir: BaseDirectory.Document });
          }
        }
      }
      console.log(`Deleted document: ${docRef.filename}`);
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

  /**
   * Open a document in the system's default external viewer
   * Decrypts the document to a temporary file and returns the FULL SYSTEM PATH
   * Works cross-platform (Windows, macOS, Linux)
   */
  async openDocumentExternal(category: DocumentCategory, docRef: DocumentReference): Promise<string> {
    try {
      // Load and decrypt the document
      const dataUrl = await this.loadDocument(category, docRef);

      // Parse the data URL to get the binary data
      const { mimeType, base64Data } = this.parseDataUrl(dataUrl);

      // Create a temporary file path with original filename
      const tempFilename = docRef.filename;
      const tempPath = `PersonalHub/temp/${tempFilename}`;

      if (isElectron && window.electronAPI) {
        // Ensure temp directory exists
        const tempDir = 'PersonalHub/temp';
        const existsResult = await window.electronAPI.docs.exists(tempDir);
        if (!existsResult.exists) {
          await window.electronAPI.docs.mkdir(tempDir);
        }

        // Write as binary file
        const writeResult = await window.electronAPI.docs.writeBinaryFile(tempPath, base64Data);
        if (!writeResult.success || !writeResult.path) {
          throw new Error(writeResult.error || 'Failed to write temp file');
        }

        // Open the file with the system's default application
        const openResult = await window.electronAPI.shell.openPath(writeResult.path);
        if (!openResult.success) {
          throw new Error(openResult.error || 'Failed to open file with system application');
        }

        // Return the full system path
        return writeResult.path;
      } else {
        throw new Error('External viewer only supported in Electron');
      }
    } catch (err) {
      console.error(`Failed to open document externally ${docRef.filename}:`, err);
      throw new Error(`Failed to open externally: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}

// Factory function for creating document service
export function createDocumentService(masterPassword: string): DocumentService {
  return new DocumentService(masterPassword);
}
