#!/usr/bin/env node
/**
 * One-time migration script to re-encrypt documents with new password
 * Decrypts with old password (test1234) and re-encrypts with new password (mdbaug02)
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { webcrypto } from 'crypto';

// Use Node's Web Crypto API
const crypto = webcrypto;

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 10000;

// Passwords
const OLD_PASSWORD = 'test1234';
const NEW_PASSWORD = 'mdbaug02';

// Document directory
const DOCS_DIR = join(homedir(), 'Documents', 'PersonalHub', 'documents');

/**
 * Derives a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password, salt) {
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
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert Uint8Array to base64
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Convert base64 to Uint8Array
 */
function base64ToArrayBuffer(base64) {
  const binary = Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decrypt with old password
 */
async function decrypt(encryptedBase64, password) {
  // Decode from base64
  const combined = base64ToArrayBuffer(encryptedBase64);

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encrypted
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt with new password
 */
async function encrypt(plaintext, password) {
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt the data
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH);

  // Convert to base64 for storage
  return arrayBufferToBase64(combined);
}

/**
 * Process a single document file
 */
async function processDocument(filePath) {
  try {
    // Read encrypted file
    const encryptedContent = await readFile(filePath, 'utf-8');

    // Try to decrypt with old password
    let decryptedContent;
    try {
      decryptedContent = await decrypt(encryptedContent, OLD_PASSWORD);
      console.log(`  ✓ Decrypted with old password`);
    } catch (err) {
      // Try with new password (might already be migrated or created in Electron)
      try {
        decryptedContent = await decrypt(encryptedContent, NEW_PASSWORD);
        console.log(`  ⊙ Already encrypted with new password, skipping`);
        return 'skipped';
      } catch {
        console.log(`  ✗ Failed to decrypt with either password - skipping`);
        return 'failed';
      }
    }

    // Re-encrypt with new password
    const reEncryptedContent = await encrypt(decryptedContent, NEW_PASSWORD);
    console.log(`  ✓ Re-encrypted with new password`);

    // Write back to file
    await writeFile(filePath, reEncryptedContent, 'utf-8');
    console.log(`  ✓ Saved`);

    return 'success';
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    return 'error';
  }
}

/**
 * Main migration function
 */
async function migrateDocuments() {
  console.log('📄 Document Re-encryption Migration');
  console.log('=====================================\n');
  console.log(`Old password: ${OLD_PASSWORD}`);
  console.log(`New password: ${NEW_PASSWORD}`);
  console.log(`Documents directory: ${DOCS_DIR}\n`);

  const categories = ['medical', 'education', 'certificates'];
  const stats = { success: 0, skipped: 0, failed: 0, error: 0 };

  for (const category of categories) {
    const categoryDir = join(DOCS_DIR, category);
    console.log(`\n📁 Processing ${category}...`);

    try {
      const files = await readdir(categoryDir);
      const encryptedFiles = files.filter(f => f.endsWith('.encrypted'));

      console.log(`  Found ${encryptedFiles.length} encrypted files`);

      for (const file of encryptedFiles) {
        const filePath = join(categoryDir, file);
        console.log(`\n  ${file}`);
        const result = await processDocument(filePath);
        stats[result]++;
      }
    } catch (err) {
      console.log(`  ✗ Error reading directory: ${err.message}`);
    }
  }

  console.log('\n\n=====================================');
  console.log('Migration Complete!');
  console.log('=====================================');
  console.log(`✓ Successfully migrated: ${stats.success}`);
  console.log(`⊙ Already migrated (skipped): ${stats.skipped}`);
  console.log(`✗ Failed to decrypt: ${stats.failed}`);
  console.log(`✗ Errors: ${stats.error}`);
  console.log('');
}

// Run migration
migrateDocuments().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
