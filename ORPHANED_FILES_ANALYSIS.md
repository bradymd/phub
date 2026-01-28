# Orphaned Files Analysis - Personal Hub

## Date: 2026-01-28

## What are Orphaned Files?

Orphaned files are encrypted document files that exist on disk in the `PersonalHub/documents/` directory but have no corresponding metadata reference in the application's database. These files are "orphaned" because the app doesn't know they exist.

## How Orphaned Files are Detected

The integrity service (`src/services/integrity.ts`) performs the following:

1. **Scans all document directories** on disk (`PersonalHub/documents/*/`)
2. **Loads all metadata** from the encrypted storage (all document references)
3. **Cross-references** files on disk with metadata entries
4. **Identifies mismatches**:
   - Files in metadata but not on disk = "Missing Files"
   - Files on disk but not in metadata = "Orphaned Files"

## How Orphaned Files Can Occur

### 1. **Incomplete Delete Operations**
- When deleting a record (e.g., Property, Vehicle), the code attempts to delete both:
  - The metadata record from storage
  - The physical encrypted files from disk
- If the file deletion fails but metadata deletion succeeds, files become orphaned

### 2. **Password Changes**
- Files encrypted with an old password become unreadable with the new password
- If the app can't decrypt them, they appear as orphaned
- The backup panel has a retry mechanism with old password for this scenario

### 3. **Application Crashes/Interruptions**
- If the app crashes during a delete operation:
  - Metadata might be removed but files remain
  - Or during save: files created but metadata not saved

### 4. **Manual File System Operations**
- Users manually copying files into the documents folder
- Files from different installations or backups mixed together

### 5. **Migration/Update Issues**
- Schema changes that don't properly migrate file references
- Updates that change the file naming convention

### 6. **Concurrent Access**
- Multiple instances of the app running simultaneously
- Race conditions in file operations

## Current Delete Flow Analysis

### Document Deletion Process:
```typescript
// 1. Components call documentService.deleteDocument()
await documentService.deleteDocument('category', docRef);

// 2. Document service deletes:
//    - Main encrypted file
//    - Thumbnail file (if exists)
const filePath = `PersonalHub/documents/${category}/${docRef.encryptedPath}`;
await window.electronAPI.docs.remove(filePath);

// 3. Parent component updates metadata
await storage.remove('storageKey', id);
```

### Potential Issues Found:

1. **No Transaction Support**: File and metadata deletions are not atomic
2. **No Error Recovery**: If file deletion fails, metadata is still removed
3. **No Verification**: No check that file was actually deleted
4. **Silent Failures**: Errors in file deletion might be swallowed

## Why You Had 5+ Orphaned Files

Based on the code analysis, likely causes:
1. **Previous delete operations** that partially failed
2. **Development/testing** creating files without proper cleanup
3. **Password changes** making old files undecryptable
4. **App crashes** during file operations

## Recommendations

### Immediate Actions:
1. **Investigate before deleting** - Try to decrypt with old passwords
2. **Check file dates** - Old files are likely safe to delete
3. **Backup first** - Before bulk deletion, create a backup

### Code Improvements Needed:

1. **Atomic Operations**:
   ```typescript
   // Delete metadata only after file deletion succeeds
   const fileDeleted = await documentService.deleteDocument(category, docRef);
   if (fileDeleted) {
     await storage.remove(key, id);
   }
   ```

2. **Add Cleanup Job**:
   - Periodic integrity check
   - Automatic orphan detection
   - User prompt for cleanup

3. **Better Error Handling**:
   - Log all deletion failures
   - Retry mechanism for file operations
   - User notifications for failures

4. **File Verification**:
   - Verify file exists before creating metadata
   - Verify file deleted after delete operation
   - Add checksums to detect corruption

5. **Transaction Log**:
   - Log all file operations
   - Allow rollback on failure
   - Track operation history

## Testing for Orphaned Files

To reproduce orphaned files for testing:
1. Create a document in any panel
2. Find the encrypted file in `PersonalHub/documents/`
3. Delete the record through the UI
4. If the file remains but record is gone = orphaned

## Safe Cleanup Strategy

1. **Run integrity check** regularly
2. **For each orphaned file**:
   - Check age (old = safer to delete)
   - Try decryption with current password
   - If fails, try with previous passwords
   - If still fails and >30 days old = safe to delete
3. **Always backup** before bulk operations

## Conclusion

Orphaned files are a symptom of non-atomic operations between file system and database. While not critical, they:
- Waste disk space
- Indicate potential data integrity issues
- Could contain important documents if metadata was lost

The current implementation needs improvement to prevent orphaned files through better error handling and atomic operations.