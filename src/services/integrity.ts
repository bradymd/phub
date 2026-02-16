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
  missingFiles: Array<{ ref: DocumentReference; category: string; sourceKey: string; recordId: string }>;
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

  if (isDocumentReference(record)) {
    refs.push(record);
    return refs;
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        refs.push(...extractDocRefs(item));
      }
    } else if (value && typeof value === 'object') {
      refs.push(...extractDocRefs(value));
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
  const allRefs: Array<{ ref: DocumentReference; category: string; sourceKey: string; recordId: string }> = [];

  for (const key of dataKeys) {
    try {
      const records = await storage.get<any>(key);
      report.totalDataRecords += records.length;

      for (const record of records) {
        const refs = extractDocRefs(record);
        for (const ref of refs) {
          // Determine category from the encryptedPath by checking disk
          const category = findCategoryForRef(ref, diskFiles) || 'unknown';
          allRefs.push({ ref, category, sourceKey: key, recordId: record.id });
        }
      }
    } catch {
      // Skip keys that fail to decrypt/read
    }
  }

  // 4. Cross-reference: check each metadata ref against disk
  const matchedDiskKeys = new Set<string>();
  // Track which disk category each sourceKey's files belong to
  const sourceKeyCategories = new Map<string, string>();

  for (const { ref, category, sourceKey, recordId } of allRefs) {
    const diskKey = `${category}/${ref.encryptedPath}`;
    const diskEntry = diskFiles.get(diskKey);

    if (diskEntry) {
      report.matched.push({ ref, category, file: diskEntry.file });
      matchedDiskKeys.add(diskKey);
      sourceKeyCategories.set(sourceKey, category);
    } else {
      // Try all categories if the initial match failed
      let found = false;
      for (const cat of categories) {
        const altKey = `${cat}/${ref.encryptedPath}`;
        const altEntry = diskFiles.get(altKey);
        if (altEntry) {
          report.matched.push({ ref, category: cat, file: altEntry.file });
          matchedDiskKeys.add(altKey);
          sourceKeyCategories.set(sourceKey, cat);
          found = true;
          break;
        }
      }
      if (!found) {
        // Resolve category from sibling matched files in the same sourceKey
        const resolvedCategory = sourceKeyCategories.get(sourceKey) || category;
        report.missingFiles.push({ ref, category: resolvedCategory, sourceKey, recordId });
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

/**
 * Recursively remove a DocumentReference by id from an object.
 * Returns true if something was removed.
 */
function removeDocRefById(obj: any, docId: string): boolean {
  if (!obj || typeof obj !== 'object') return false;

  let removed = false;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (Array.isArray(value)) {
      const before = value.length;
      obj[key] = value.filter((item: any) => !(isDocumentReference(item) && item.id === docId));
      if (obj[key].length < before) removed = true;
      // Also recurse into remaining array items (nested objects)
      for (const item of obj[key]) {
        if (removeDocRefById(item, docId)) removed = true;
      }
    } else if (isDocumentReference(value) && value.id === docId) {
      obj[key] = undefined;
      removed = true;
    } else if (value && typeof value === 'object') {
      if (removeDocRefById(value, docId)) removed = true;
    }
  }
  return removed;
}

/**
 * Remove a dead document reference from storage.
 * Finds the record by sourceKey + recordId, removes the ref by docId, and saves.
 */
export async function removeDeadReference(
  storage: StorageService,
  sourceKey: string,
  recordId: string,
  docId: string
): Promise<void> {
  const records = await storage.get<any>(sourceKey);
  const record = records.find((r: any) => r.id === recordId);
  if (!record) {
    throw new Error(`Record ${recordId} not found in ${sourceKey}`);
  }

  const removed = removeDocRefById(record, docId);
  if (!removed) {
    throw new Error(`Document reference ${docId} not found in record`);
  }

  await storage.update(sourceKey, recordId, record);
}
