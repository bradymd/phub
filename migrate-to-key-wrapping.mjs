#!/usr/bin/env node
/**
 * One-time migration to Key Wrapping Pattern
 *
 * Migrates from password-based encryption to master key encryption:
 * 1. Decrypts all data with current password
 * 2. Generates new master key
 * 3. Re-encrypts all data with master key
 * 4. Wraps master key with password
 * 5. Saves wrapped master key to file
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { webcrypto } from 'crypto';

const crypto = webcrypto;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS_OLD = 10000; // Old system
const ITERATIONS_KEK = 100000; // New system for KEK
const MASTER_KEY_LENGTH = 32;

// Current password
const CURRENT_PASSWORD = 'mdbaug02';

// Directories
const DATA_DIR = join(homedir(), 'Documents', 'PersonalHub', 'data');
const MASTER_KEY_FILE = join(homedir(), 'Documents', 'PersonalHub', '.master.key');
const DOCS_DIR = join(homedir(), 'Documents', 'PersonalHub', 'documents');

/**
 * Old PBKDF2 derivation (10k iterations)
 */
async function deriveKeyOld(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS_OLD,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * New KEK derivation (100k iterations)
 */
async function deriveKEK(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ITERATIONS_KEK,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

function base64ToArrayBuffer(base64) {
  const binary = Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decrypt with password (old system)
 */
async function decryptWithPassword(encryptedBase64, password) {
  const combined = base64ToArrayBuffer(encryptedBase64);
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKeyOld(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt with master key (new system)
 */
async function encryptWithMasterKey(plaintext, masterKeyBytes) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Import master key
  const masterKey = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    masterKey,
    data
  );

  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH);

  return arrayBufferToBase64(combined);
}

/**
 * Wrap master key with password
 */
async function wrapMasterKey(masterKeyBytes, password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const kek = await deriveKEK(password, salt);

  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    kek,
    masterKeyBytes
  );

  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + wrapped.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(wrapped), SALT_LENGTH + IV_LENGTH);

  return arrayBufferToBase64(combined);
}

/**
 * Migrate a data file
 */
async function migrateDataFile(filePath, masterKeyBytes) {
  const fileContent = await readFile(filePath, 'utf-8');

  // Parse JSON wrapper (storage service wraps encrypted data in JSON)
  const encryptedContent = JSON.parse(fileContent);

  // Decrypt with password
  const decryptedContent = await decryptWithPassword(encryptedContent, CURRENT_PASSWORD);

  // Re-encrypt with master key
  const reEncryptedContent = await encryptWithMasterKey(decryptedContent, masterKeyBytes);

  // Wrap in JSON and write back (storage service expects JSON wrapper)
  await writeFile(filePath, JSON.stringify(reEncryptedContent), 'utf-8');
}

/**
 * Migrate a document file
 */
async function migrateDocumentFile(filePath, masterKeyBytes) {
  const encryptedContent = await readFile(filePath, 'utf-8');

  // Decrypt with password
  const decryptedContent = await decryptWithPassword(encryptedContent, CURRENT_PASSWORD);

  // Re-encrypt with master key
  const reEncryptedContent = await encryptWithMasterKey(decryptedContent, masterKeyBytes);

  // Write back
  await writeFile(filePath, reEncryptedContent, 'utf-8');
}

/**
 * Main migration
 */
async function migrate() {
  console.log('🔑 Migration to Key Wrapping Pattern');
  console.log('====================================\n');

  // 1. Generate master key
  console.log('1. Generating master key...');
  const masterKeyBytes = crypto.getRandomValues(new Uint8Array(MASTER_KEY_LENGTH));
  console.log('   ✓ Master key generated\n');

  // 2. Migrate data files
  console.log('2. Migrating data files...');
  const dataFiles = await readdir(DATA_DIR);
  const encryptedDataFiles = dataFiles.filter(f => f.endsWith('.encrypted.json'));

  let dataCount = 0;
  for (const file of encryptedDataFiles) {
    const filePath = join(DATA_DIR, file);
    try {
      await migrateDataFile(filePath, masterKeyBytes);
      console.log(`   ✓ ${file}`);
      dataCount++;
    } catch (err) {
      console.log(`   ✗ ${file}: ${err.message}`);
    }
  }
  console.log(`   Migrated ${dataCount}/${encryptedDataFiles.length} data files\n`);

  // 3. Migrate document files
  console.log('3. Migrating document files...');
  const categories = ['medical', 'education', 'certificates'];
  let docCount = 0;
  let totalDocs = 0;

  for (const category of categories) {
    const categoryDir = join(DOCS_DIR, category);
    try {
      const files = await readdir(categoryDir);
      const encryptedFiles = files.filter(f => f.endsWith('.encrypted'));
      totalDocs += encryptedFiles.length;

      for (const file of encryptedFiles) {
        const filePath = join(categoryDir, file);
        try {
          await migrateDocumentFile(filePath, masterKeyBytes);
          docCount++;
        } catch (err) {
          console.log(`   ✗ ${category}/${file}: ${err.message}`);
        }
      }
    } catch (err) {
      // Category directory might not exist
    }
  }
  console.log(`   ✓ Migrated ${docCount}/${totalDocs} document files\n`);

  // 4. Wrap and save master key
  console.log('4. Wrapping and saving master key...');
  const wrappedKey = await wrapMasterKey(masterKeyBytes, CURRENT_PASSWORD);
  await writeFile(MASTER_KEY_FILE, wrappedKey, 'utf-8');
  console.log(`   ✓ Master key saved to ${MASTER_KEY_FILE}\n`);

  console.log('====================================');
  console.log('✅ Migration Complete!');
  console.log('====================================');
  console.log(`Data files migrated: ${dataCount}`);
  console.log(`Document files migrated: ${docCount}`);
  console.log('\nYour data is now encrypted with a master key.');
  console.log('Password changes will be instant (just re-wraps the key).\n');
}

// Run migration
migrate().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
