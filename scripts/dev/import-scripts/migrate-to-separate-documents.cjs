const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 10000;

// Decrypt using same algorithm as crypto.ts
async function decrypt(encryptedBase64, password) {
  const combined = Buffer.from(encryptedBase64, 'base64');
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  const authTag = encrypted.slice(-16);
  const ciphertext = encrypted.slice(0, -16);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

// Encrypt using same algorithm as crypto.ts
async function encrypt(plaintext, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, encrypted, authTag]);
  return combined.toString('base64');
}

// Generate unique document ID
function generateDocId() {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Extract MIME type and base64 data from data URL
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL format');
  }
  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

// Get file extension from MIME type
function getExtension(mimeType) {
  const map = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'text/plain': 'txt',
    'image/tiff': 'tif'
  };
  return map[mimeType] || 'bin';
}

async function migrateCollection(collectionName, dataDir, documentsDir, masterPassword) {
  const dataFile = path.join(dataDir, `${collectionName}.encrypted.json`);

  if (!fs.existsSync(dataFile)) {
    console.log(`Skipping ${collectionName} - file not found`);
    return { extracted: 0, failed: 0 };
  }

  console.log(`\n=== Migrating ${collectionName} ===`);

  // Read and decrypt
  const encryptedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const decryptedJson = await decrypt(encryptedData, masterPassword);
  const records = JSON.parse(decryptedJson);

  let extractedCount = 0;
  let failedCount = 0;
  let totalSize = 0;

  // Process each record
  for (const record of records) {
    if (!record.documents || record.documents.length === 0) {
      continue;
    }

    // Convert embedded documents to references
    const documentRefs = [];

    for (const doc of record.documents) {
      try {
        if (!doc.fileData) {
          console.warn(`  Warning: Document ${doc.filename} has no fileData`);
          continue;
        }

        // Generate unique ID
        const docId = generateDocId();

        // Parse data URL
        const { mimeType, base64Data } = parseDataUrl(doc.fileData);
        const extension = getExtension(mimeType);

        // Create encrypted filename
        const encryptedFilename = `${docId}.${extension}.encrypted`;
        const docPath = path.join(documentsDir, encryptedFilename);

        // Encrypt the base64 data (we're encrypting the already-base64 string for now)
        // In production, we'd decode base64 first, but this maintains same security level
        const encryptedContent = await encrypt(doc.fileData, masterPassword);

        // Write encrypted document
        fs.writeFileSync(docPath, encryptedContent);

        // Create reference
        documentRefs.push({
          id: docId,
          filename: doc.filename,
          mimeType: mimeType,
          uploadDate: doc.uploadDate,
          encryptedPath: encryptedFilename,
          size: Buffer.from(base64Data, 'base64').length
        });

        extractedCount++;
        totalSize += Buffer.from(base64Data, 'base64').length;

        console.log(`  ✓ Extracted: ${doc.filename} (${(Buffer.from(base64Data, 'base64').length / 1024).toFixed(1)} KB) -> ${encryptedFilename}`);
      } catch (err) {
        console.error(`  ✗ Failed to extract ${doc.filename}:`, err.message);
        failedCount++;
      }
    }

    // Replace embedded documents with references
    record.documents = documentRefs;

    // Clean up legacy fields
    delete record.attachments;
    delete record.documentPaths;
    delete record.documentPath;
  }

  // Re-encrypt and save (much smaller now!)
  const updatedJson = JSON.stringify(records, null, 2);
  const reencrypted = await encrypt(updatedJson, masterPassword);
  fs.writeFileSync(dataFile, JSON.stringify(reencrypted, null, 2));

  console.log(`\n  Summary: Extracted ${extractedCount} documents (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
  if (failedCount > 0) {
    console.log(`  Failures: ${failedCount} documents failed`);
  }

  return { extracted: extractedCount, failed: failedCount, size: totalSize };
}

async function main() {
  const masterPassword = process.argv[2];
  if (!masterPassword) {
    console.error('Usage: node migrate-to-separate-documents.cjs <master-password>');
    process.exit(1);
  }

  const dataDir = path.join(process.env.HOME, 'Documents/PersonalHub/data');
  const documentsBaseDir = path.join(process.env.HOME, 'Documents/PersonalHub/documents');

  console.log('Document Storage Migration');
  console.log('=========================');
  console.log('This will extract embedded documents from JSON files');
  console.log('and save them as separate encrypted files.\n');

  // Create documents directories
  const collections = [
    { name: 'medical_history', dir: 'medical' },
    { name: 'education_records', dir: 'education' },
    { name: 'documents_certificates', dir: 'certificates' }
  ];

  for (const { dir } of collections) {
    const docDir = path.join(documentsBaseDir, dir);
    if (!fs.existsSync(docDir)) {
      fs.mkdirSync(docDir, { recursive: true });
      console.log(`Created directory: ${docDir}`);
    }
  }

  // Migrate each collection
  let totalExtracted = 0;
  let totalFailed = 0;
  let totalSize = 0;

  for (const { name, dir } of collections) {
    const docDir = path.join(documentsBaseDir, dir);
    const result = await migrateCollection(name, dataDir, docDir, masterPassword);
    totalExtracted += result.extracted;
    totalFailed += result.failed;
    totalSize += result.size;
  }

  console.log('\n\n=== MIGRATION COMPLETE ===');
  console.log(`Total documents extracted: ${totalExtracted}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  if (totalFailed > 0) {
    console.log(`Total failures: ${totalFailed}`);
  }
  console.log('\nDocuments are now stored separately in:');
  console.log(`  ${documentsBaseDir}/`);
  console.log('\nJSON files are now much smaller and should load faster!');
  console.log('\nNOTE: You will need to restart the app and update');
  console.log('      components to load documents on-demand.');
}

main().catch(console.error);
