import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha256';

/**
 * Derives a 256-bit encryption key from the config key using PBKDF2
 */
function deriveKey(salt) {
  return crypto.pbkdf2Sync(
    config.encryptionKey,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );
}

/**
 * Encrypts a string value
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted value as base64 string (salt:iv:tag:ciphertext)
 */
export function encrypt(text) {
  if (!text) return text;

  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    salt.toString('base64'),
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

/**
 * Decrypts an encrypted string
 * @param {string} encryptedText - Encrypted value from encrypt()
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;

  const [saltB64, ivB64, tagB64, ciphertextB64] = encryptedText.split(':');

  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const key = deriveKey(salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Masks a string for safe display (shows last 4 chars)
 * @param {string} value
 * @returns {string}
 */
export function maskSecret(value) {
  if (!value || value.length < 8) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}
