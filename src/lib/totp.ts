/**
 * @file totp.ts
 * @description RFC 6238 Time-Based One-Time Password (TOTP) and backup recovery codes engine.
 * @module @atlas/api/lib/totp
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { hashPassword, verifyPassword } from "./auth.js";

// ============================================================================
// 1. BASE32 ENCODING / DECODING (RFC 4648)
// ============================================================================

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a buffer to RFC 4648 base32 string without padding.
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 base32 string to Buffer.
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ============================================================================
// 2. TOTP GENERATION & VERIFICATION (RFC 6238 / RFC 4226)
// ============================================================================

const TIME_STEP_SEC = 30;
const TOTP_DIGITS = 6;

/**
 * Generates a cryptographically secure random base32 TOTP secret (20 bytes = 160 bits).
 */
export function generateTotpSecret(numBytes = 20): string {
  const buf = randomBytes(numBytes);
  return base32Encode(buf);
}

/**
 * Generates an otpauth:// URL suitable for QR code scanning by Authenticator apps.
 */
export function generateTotpUri(
  email: string,
  secret: string,
  issuer = "Atlas Logistics",
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TIME_STEP_SEC}`;
}

/**
 * Computes the 6-digit TOTP code for a secret at a given counter time step.
 */
export function computeHotp(secretBuffer: Buffer, counter: number): string {
  const counterBuffer = Buffer.alloc(8);
  // Write 64-bit integer big-endian
  counterBuffer.writeBigUInt64BE(BigInt(counter), 0);

  const hmac = createHmac("sha1", secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = digest[digest.length - 1] & 0x0f;
  const codeInt =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const code = (codeInt % Math.pow(10, TOTP_DIGITS))
    .toString()
    .padStart(TOTP_DIGITS, "0");
  return code;
}

/**
 * Calculates current TOTP code for a secret.
 */
export function generateTotpCode(
  secret: string,
  timestampMs = Date.now(),
): string {
  const secretBuffer = base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / TIME_STEP_SEC);
  return computeHotp(secretBuffer, counter);
}

/**
 * Verifies a 6-digit TOTP code against a secret with sliding window tolerance.
 * Window of 1 means: current time step, -1 step (30s ago), +1 step (30s ahead).
 */
export function verifyTotpCode(
  secret: string,
  token: string,
  windowSteps = 1,
  timestampMs = Date.now(),
): boolean {
  if (!secret || !token || token.length !== TOTP_DIGITS) {
    return false;
  }

  try {
    const secretBuffer = base32Decode(secret);
    const currentCounter = Math.floor(timestampMs / 1000 / TIME_STEP_SEC);

    for (let step = -windowSteps; step <= windowSteps; step++) {
      const expectedCode = computeHotp(secretBuffer, currentCounter + step);
      if (
        expectedCode.length === token.length &&
        timingSafeEqual(Buffer.from(expectedCode), Buffer.from(token))
      ) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

// ============================================================================
// 3. EMERGENCY SINGLE-USE BACKUP RECOVERY CODES
// ============================================================================

export interface BackupCodesResult {
  plainCodes: string[];
  hashedCodes: string[];
}

/**
 * Generates 8 cryptographically secure emergency recovery codes (e.g. "ABCD-1234").
 * Returns both plain codes (to show user ONCE) and Scrypt-hashed codes (to persist in DB).
 */
export async function generateBackupCodes(
  count = 8,
): Promise<BackupCodesResult> {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = randomBytes(2).toString("hex").toUpperCase();
    const part2 = randomBytes(2).toString("hex").toUpperCase();
    const plain = `${part1}-${part2}`;
    plainCodes.push(plain);

    const hashed = await hashPassword(plain);
    hashedCodes.push(hashed);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies a single-use backup recovery code against an array of hashed codes.
 * If valid, consumes it and returns the remaining hashed codes list.
 */
export async function verifyAndConsumeBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<{ valid: boolean; remainingHashedCodes: string[] }> {
  const normalized = code.trim().toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await verifyPassword(normalized, hashedCodes[i]);
    if (isMatch) {
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return { valid: true, remainingHashedCodes: remaining };
    }
  }

  return { valid: false, remainingHashedCodes: hashedCodes };
}
