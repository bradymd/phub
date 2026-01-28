/**
 * Integrity Validation Service
 * Cross-references metadata entries against document files on disk.
 * Dynamically discovers categories and storage keys - no hardcoding.
 * Reports: matched files, missing files, orphaned files.
 */

import { StorageService } from './storage';
import { DocumentReference } from './document-service';

// Detect runtime environment
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;

export interface FileInfo {
  path: string;
  size: number;
  modifiedAt: string;
}

export interface IntegrityReport {
  timestamp: string;
  matched: Array<{ ref: DocumentReference; category: string; file: FileInfo }>;
  missingFiles: Array<{ ref: DocumentReference; category: string }>;
  orphanedFiles: Array<{ file: FileInfo; category: string }>;
  dataFiles: FileInfo[];
  totalDataRecords: number;
}

/**
 * List files in a directory via IPC
 */
async function listDirectory(relativePath: string): Promise<FileInfo[]> {
  if (isElectron && window.electronAPI?.docs?.listDir) {
    const result = await window.electronAPI.docs.listDir(relativePath);
    if (!result.success) {
      return [];
    }
    return result.files || [];
  }
  return [];
}

/**
 * List subdirectories via IPC
 */
async function listSubDirs(relativePath: string): Promise<string[]> {
  if (isElectron && window.electronAPI?.docs?.listSubDirs) {
    const result = await window.electronAPI.docs.listSubDirs(relativePath);
    if (!result.success) {
      return [];
    }
    return result.dirs || [];
  }
  return [];
}

/**
 * Discover all storage keys by listing .encrypted.json files in data dir
 */
async function discoverDataKeys(): Promise<string[]> {
  const files = await listDirectory('PersonalHub/data');
  return files
    .map(f => f.path)
    .filter(name => name.endsWith('.encrypted.json'))
    .map(name => name.replace('.encrypted.json', ''));
}

/**
 * Check if a value looks like a DocumentReference
 */
function isDocumentReference(obj: any): obj is DocumentReference {
  return obj && typeof obj === 'object' && typeof obj.encryptedPath === 'string' && typeof obj.id === 'string';
}

/**
 * Extract all DocumentReferences from a record, regardless of field name
 */
function extractDocRefs(record: any): DocumentReference[] {
  const refs: DocumentReference[] = [];
  if (!record || typeof record !== 'object') return refs;

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isDocumentReference(item)) {
          refs.push(item);
        }
      }
    }
  }
  return refs;
}

/**
 * Determine which category directory a DocumentReference belongs to
 * by checking which disk category contains the file
 */
function findCategoryForRef(ref: DocumentReference, diskFiles: Map<string, { file: FileInfo; category: string }>): string | null {
  for (const [key, { category }] of diskFiles) {
    if (key.endsWith('/' + ref.encryptedPath)) {
      return category;
    }
  }
  return null;
}

/**
 * Run integrity validation
 * Dynamically discovers document categories and storage keys
 */
export async function runIntegrityCheck(storage: StorageService): Promise<IntegrityReport> {
  const report: IntegrityReport = {
    timestamp: new Date().toISOString(),
    matched: [],
    missingFiles: [],
    orphanedFiles: [],
    dataFiles: [],
    totalDataRecords: 0,
  };

  // 1. Discover document categories by listing subdirectories
  const categories = await listSubDirs('PersonalHub/documents');

  // 2. List actual files on disk for each discovered category
  const diskFiles: Map<string, { file: FileInfo; category: string }> = new Map();

  for (const category of categories) {
    const files = await listDirectory(`PersonalHub/documents/${category}`);
    for (const file of files) {
      const filename = file.path.split('/').pop() || file.path;
      diskFiles.set(`${category}/${filename}`, { file, category });
    }
  }

  // 3. Discover all storage keys and scan for DocumentReferences
  const dataKeys = await discoverDataKeys();
  const allRefs: Array<{ ref: DocumentReference; category: string }> = [];

  for (const key of dataKeys) {
    try {
      const records = await storage.get<any>(key);
      report.totalDataRecords += records.length;

      for (const record of records) {
        const refs = extractDocRefs(record);
        for (const ref of refs) {
          // Determine category from the encryptedPath by checking disk
          const category = findCategoryForRef(ref, diskFiles) || 'unknown';
          allRefs.push({ ref, category });
        }
      }
    } catch {
      // Skip keys that fail to decrypt/read
    }
  }

  // 4. Cross-reference: check each metadata ref against disk
  const matchedDiskKeys = new Set<string>();

  for (const { ref, category } of allRefs) {
    const diskKey = `${category}/${ref.encryptedPath}`;
    const diskEntry = diskFiles.get(diskKey);

    if (diskEntry) {
      report.matched.push({ ref, category, file: diskEntry.file });
      matchedDiskKeys.add(diskKey);
    } else {
      // Try all categories if the initial match failed
      let found = false;
      for (const cat of categories) {
        const altKey = `${cat}/${ref.encryptedPath}`;
        const altEntry = diskFiles.get(altKey);
        if (altEntry) {
          report.matched.push({ ref, category: cat, file: altEntry.file });
          matchedDiskKeys.add(altKey);
          found = true;
          break;
        }
      }
      if (!found) {
        report.missingFiles.push({ ref, category });
      }
    }

    // Also mark associated thumbnail as matched
    if (ref.thumbnailPath) {
      const thumbKey = `${category}/${ref.thumbnailPath}`;
      if (diskFiles.has(thumbKey)) {
        matchedDiskKeys.add(thumbKey);
      } else {
        // Try all categories
        for (const cat of categories) {
          const altThumbKey = `${cat}/${ref.thumbnailPath}`;
          if (diskFiles.has(altThumbKey)) {
            matchedDiskKeys.add(altThumbKey);
            break;
          }
        }
      }
    }
  }

  // 5. Find orphaned files (on disk but not in metadata)
  for (const [key, { file, category }] of diskFiles) {
    if (!matchedDiskKeys.has(key)) {
      report.orphanedFiles.push({ file, category });
    }
  }

  // 6. List data files
  const dataFiles = await listDirectory('PersonalHub/data');
  report.dataFiles = dataFiles;

  return report;
}
