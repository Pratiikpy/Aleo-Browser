import crypto from 'crypto';

/**
 * AES-256-GCM encryption utility for secure data storage
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const ITERATIONS = 100000;

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
}

/**
 * Derive a cryptographic key from a password using PBKDF2
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Generate a random salt
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Generate a random initialization vector
 */
export function generateIV(): Buffer {
  return crypto.randomBytes(IV_LENGTH);
}

/**
 * Encrypt data using AES-256-GCM
 * @param plaintext - The data to encrypt
 * @param password - The password to derive the encryption key from
 * @returns Encrypted data with IV, auth tag, and salt
 */
export function encrypt(plaintext: string, password: string): EncryptedData {
  try {
    // Generate salt and derive key
    const salt = generateSalt();
    const key = deriveKey(password, salt);

    // Generate IV
    const iv = generateIV();

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - The encrypted data object
 * @param password - The password to derive the decryption key from
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: EncryptedData, password: string): string {
  try {
    // Convert hex strings back to buffers
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Derive key using the same salt
    const key = deriveKey(password, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Invalid password or corrupted data'}`);
  }
}

/**
 * Hash a password using SHA-256
 * @param password - The password to hash
 * @returns Hex-encoded hash
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate a secure random string
 * @param length - Length of the random string in bytes (default: 32)
 * @returns Hex-encoded random string
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Verify password strength
 * @param password - Password to verify
 * @returns Object with strength indication and requirements met
 */
export function verifyPasswordStrength(password: string): {
  isStrong: boolean;
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
  score: number;
} {
  const requirements = {
    minLength: password.length >= 12,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  const isStrong = score >= 4 && requirements.minLength;

  return {
    isStrong,
    requirements,
    score
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Securely wipe sensitive data from memory
 * @param buffer - Buffer to wipe
 */
export function secureWipe(buffer: Buffer): void {
  if (buffer && Buffer.isBuffer(buffer)) {
    crypto.randomFillSync(buffer);
    buffer.fill(0);
  }
}
