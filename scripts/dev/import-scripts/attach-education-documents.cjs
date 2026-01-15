const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 10000;

// Decrypt using same algorithm as crypto.ts
async function decrypt(encryptedBase64, password) {
  // Decode from base64
  const combined = Buffer.from(encryptedBase64, 'base64');

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Derive key from password using PBKDF2
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

  // Decrypt using AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

  // Extract auth tag (last 16 bytes of encrypted data)
  const authTag = encrypted.slice(-16);
  const ciphertext = encrypted.slice(0, -16);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

// Encrypt using same algorithm as crypto.ts
async function encrypt(plaintext, password) {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from password
  const key = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

  // Encrypt the data
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine salt + iv + encrypted + authTag
  const combined = Buffer.concat([salt, iv, encrypted, authTag]);

  // Convert to base64
  return combined.toString('base64');
}

async function main() {
  const masterPassword = process.argv[2];
  if (!masterPassword) {
    console.error('Usage: node attach-education-documents.cjs <master-password>');
    process.exit(1);
  }

  // Paths
  const dataFile = path.join(process.env.HOME, 'Documents/PersonalHub/data/education_records.encrypted.json');
  const educationDir = '/home/mb12aeh/src/phub/public/documents/education';

  // Read and decrypt education records
  console.log('Reading encrypted education records...');
  const encryptedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const decryptedJson = await decrypt(encryptedData, masterPassword);
  const records = JSON.parse(decryptedJson);

  console.log(`Found ${records.length} education records`);

  // Get all files in education directory
  const educationFiles = fs.readdirSync(educationDir);
  console.log(`Found ${educationFiles.length} files in education directory`);

  let attachedCount = 0;
  let skippedCount = 0;

  // Process each record
  for (const record of records) {
    // Education records use documentPaths instead of attachments
    const documentPaths = record.documentPaths || (record.documentPath ? [record.documentPath] : []);

    if (!documentPaths || documentPaths.length === 0) {
      continue;
    }

    // Skip if already has documents
    if (record.documents && record.documents.length > 0) {
      console.log(`Skipping "${record.qualification}" - already has ${record.documents.length} documents attached`);
      skippedCount++;
      continue;
    }

    console.log(`\nProcessing: ${record.qualification} (${record.institution}, ${record.year})`);
    console.log(`  Legacy document paths: ${documentPaths.join(', ')}`);

    record.documents = record.documents || [];

    // Try to match each document path to actual files
    for (const docPath of documentPaths) {
      // Extract filename from path (e.g., "documents/education/Msc Hatfield Polytechnic.pdf" -> "Msc Hatfield Polytechnic.pdf")
      const filename = path.basename(docPath);

      // Find matching file (case-insensitive)
      const matchingFile = educationFiles.find(f =>
        f.toLowerCase() === filename.toLowerCase()
      );

      if (matchingFile) {
        const filePath = path.join(educationDir, matchingFile);
        const fileContent = fs.readFileSync(filePath);
        const ext = path.extname(matchingFile).toLowerCase();

        // Determine MIME type
        let mimeType = 'application/octet-stream';
        if (ext === '.pdf') mimeType = 'application/pdf';
        else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.txt') mimeType = 'text/plain';

        // Convert to base64 with data URL prefix
        const base64 = `data:${mimeType};base64,${fileContent.toString('base64')}`;

        // Add to documents array
        record.documents.push({
          filename: matchingFile,
          fileData: base64,
          uploadDate: new Date().toISOString()
        });

        console.log(`  ✓ Attached: ${matchingFile} (${(fileContent.length / 1024).toFixed(1)} KB)`);
        attachedCount++;
      } else {
        console.log(`  ✗ Not found: ${filename} (from path: ${docPath})`);
      }
    }
  }

  // Re-encrypt and save
  console.log('\n\nSaving updated records...');
  const updatedJson = JSON.stringify(records);
  const reencrypted = await encrypt(updatedJson, masterPassword);
  fs.writeFileSync(dataFile, JSON.stringify(reencrypted, null, 2));

  console.log('\n=== COMPLETE ===');
  console.log(`Attached ${attachedCount} documents`);
  console.log(`Skipped ${skippedCount} records (already had documents)`);
  console.log('\nRestart the app to see the changes!');
}

main().catch(console.error);
