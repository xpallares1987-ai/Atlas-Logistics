/**
 * @file encryption.ts
 * @description Sovereign GDPR-compliant at-rest PII encryption service using AES-256-GCM.
 * @module @atlas/api/lib/encryption
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
} from "node:crypto";

// ============================================================================
// 1. CONSTANTS & KEY DERIVATION
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag
const HKDF_INFO = "atlas-logistics-pii-at-rest-v1";
const HKDF_SALT = "atlas-sovereign-gdpr-salt-2026";

/**
 * Derives a deterministic 32-byte (256-bit) encryption key from the environment secret.
 * Falls back safely to JWT_SECRET if a dedicated ENCRYPTION_MASTER_KEY is not defined.
 */
function getDerivedKey(): Buffer {
  const masterKey =
    process.env.ENCRYPTION_MASTER_KEY ||
    process.env.JWT_SECRET ||
    "atlas-dev-fallback-encryption-master-key-32b-min!";

  const derived = hkdfSync(
    "sha256",
    Buffer.from(masterKey, "utf8"),
    Buffer.from(HKDF_SALT, "utf8"),
    Buffer.from(HKDF_INFO, "utf8"),
    32,
  );

  return Buffer.from(derived);
}

// ============================================================================
// 2. ENCRYPTION INTERFACES
// ============================================================================

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded (12 bytes)
  tag: string; // Base64 encoded (16 bytes)
}

// ============================================================================
// 3. ENCRYPTION & DECRYPTION FUNCTIONS
// ============================================================================

/**
 * Encrypts sensitive plaintext PII (Tax IDs, personal phones, residential addresses)
 * using authenticated AES-256-GCM.
 *
 * @param plaintext - The raw string to encrypt.
 * @returns EncryptedPayload containing ciphertext, iv, and authentication tag.
 */
export function encryptPII(plaintext: string): EncryptedPayload {
  if (!plaintext) {
    return { ciphertext: "", iv: "", tag: "" };
  }

  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypts authenticated AES-256-GCM ciphertext.
 * Throws an Error if the authentication tag verification fails (tamper detection).
 *
 * @param payload - The EncryptedPayload with ciphertext, iv, and tag.
 * @returns The decrypted UTF-8 plaintext string.
 */
export function decryptPII(payload: EncryptedPayload): string {
  if (!payload.ciphertext || !payload.iv || !payload.tag) {
    return "";
  }

  const key = getDerivedKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Computes a blind deterministic HMAC-SHA256 index hash for searchable encrypted fields
 * without exposing plaintext PII (e.g. searching Tax IDs / EORI numbers).
 *
 * @param value - The value to index.
 * @returns 64-character lowercase hex digest.
 */
export function hashPII(value: string): string {
  if (!value) return "";
  const key = getDerivedKey();
  return createHmac("sha256", key)
    .update(value.trim().toLowerCase(), "utf8")
    .digest("hex");
}
