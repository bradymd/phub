/**
 * Master Key Service
 * Implements Key Wrapping Pattern for secure password changes
 *
 * Architecture:
 * - Master Key (DEK - Data Encryption Key): Random 256-bit key, encrypts all data
 * - KEK (Key Encryption Key): Derived from user password, encrypts Master Key
 * - Stored: Wrapped (encrypted) Master Key in ~/.PersonalHub/.master.key
 *
 * Benefits:
 * - Password change only re-encrypts 32-byte Master Key, not all data
 * - Industry best practice (used by 1Password, BitWarden, etc.)
 */

const MASTER_KEY_LENGTH = 32; // 256 bits for AES-256-GCM
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000; // Higher iterations for KEK (only used once per session)

/**
 * Derives a Key Encryption Key (KEK) from password
 * Used to wrap/unwrap the Master Key
 */
async function deriveKEK(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
 * Converts Uint8Array to base64
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 to Uint8Array
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a random Master Key (DEK)
 */
export function generateMasterKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(MASTER_KEY_LENGTH));
}

/**
 * Wraps (encrypts) the Master Key with a password-derived KEK
 * Returns base64-encoded wrapped key with salt and IV
 */
export async function wrapMasterKey(masterKey: Uint8Array, password: string): Promise<string> {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive KEK from password
    const kek = await deriveKEK(password, salt);

    // Encrypt Master Key with KEK
    const wrapped = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      kek,
      masterKey
    );

    // Combine salt + iv + wrapped key
    const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + wrapped.byteLength);
    combined.set(salt, 0);
    combined.set(iv, SALT_LENGTH);
    combined.set(new Uint8Array(wrapped), SALT_LENGTH + IV_LENGTH);

    // Convert to base64
    return arrayBufferToBase64(combined);
  } catch (error) {
    console.error('Failed to wrap master key:', error);
    throw new Error('Failed to wrap master key');
  }
}

/**
 * Unwraps (decrypts) the Master Key using password
 * Returns the raw Master Key bytes
 */
export async function unwrapMasterKey(wrappedKeyBase64: string, password: string): Promise<Uint8Array> {
  try {
    // Decode from base64
    const combined = base64ToArrayBuffer(wrappedKeyBase64);

    // Extract salt, iv, and wrapped key
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const wrapped = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive KEK from password
    const kek = await deriveKEK(password, salt);

    // Decrypt wrapped key with KEK
    const masterKey = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      kek,
      wrapped
    );

    return new Uint8Array(masterKey);
  } catch (error) {
    console.error('Failed to unwrap master key:', error);
    throw new Error('Failed to unwrap master key - wrong password or corrupted key');
  }
}

/**
 * Converts Master Key bytes to base64 string for storage service
 */
export function masterKeyToString(masterKey: Uint8Array): string {
  return arrayBufferToBase64(masterKey);
}

/**
 * Converts base64 string back to Master Key bytes
 */
export function stringToMasterKey(masterKeyString: string): Uint8Array {
  return base64ToArrayBuffer(masterKeyString);
}
