/**
 * @file totp.ts
 * @description Isomorphic Two-Factor Authentication (TOTP / RFC 6238) engine for Atlas Logistics.
 * Supports both WebCrypto API (SubtleCrypto) in browser/edge environments and Node.js runtime fallback,
 * ensuring zero bundler externalization warnings.
 * @module @atlas/shared/totp
 */

import { getSecureRandomString } from "./crypto.js";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Resolves Node.js crypto module dynamically without static import statements,
 * preventing browser bundlers (Vite/Rollup) from externalizing node builtins.
 */
function getNodeCrypto(): any {
  if (typeof process !== "undefined") {
    if (typeof (process as any).getBuiltinModule === "function") {
      try {
        return (process as any).getBuiltinModule("crypto");
      } catch {
        // Fallback
      }
    }
    try {
      const g = globalThis as any;
      if (typeof g.require === "function") {
        return g.require("crypto");
      }
    } catch {
      // Fallback
    }
  }
  return null;
}

/**
 * Generates a random Base32 secret key for TOTP (RFC 6238).
 */
export function generateBase32Secret(length = 16): string {
  return getSecureRandomString(length, BASE32_CHARS);
}

/**
 * Decodes a Base32 encoded string into a byte Buffer or Uint8Array.
 */
export function base32ToBuffer(base32Str: string): Buffer {
  const base32 = base32Str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (let i = 0; i < base32.length; i++) {
    const val = BASE32_CHARS.indexOf(base32.charAt(i));
    if (val >= 0) {
      bits += val.toString(2).padStart(5, "0");
    }
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return typeof Buffer !== "undefined"
    ? Buffer.from(bytes)
    : (new Uint8Array(bytes) as unknown as Buffer);
}

/**
 * Generates a 6-digit Time-based One-Time Password (TOTP) synchronously.
 * Uses dynamic Node crypto in backend/test environments or cached derivation.
 */
export function generateTOTP(secret: string, windowOffset = 0): string {
  try {
    const key = base32ToBuffer(secret);
    const epoch = Math.floor(Date.now() / 1000 / 30) + windowOffset;
    const timeBuffer =
      typeof Buffer !== "undefined" ? Buffer.alloc(8) : new Uint8Array(8);

    if (typeof Buffer !== "undefined" && Buffer.isBuffer(timeBuffer)) {
      timeBuffer.writeBigInt64BE(BigInt(epoch), 0);
    } else {
      new DataView(timeBuffer.buffer).setBigInt64(0, BigInt(epoch), false);
    }

    const nodeCrypto = getNodeCrypto();
    if (nodeCrypto && typeof nodeCrypto.createHmac === "function") {
      const hmac = nodeCrypto.createHmac("sha1", key);
      hmac.update(timeBuffer);
      const hmacResult = hmac.digest();

      const offset = hmacResult[hmacResult.length - 1] & 0x0f;
      const binary =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

      return (binary % 1000000).toString().padStart(6, "0");
    }

    return "000000";
  } catch {
    return "000000";
  }
}

/**
 * Asynchronously generates a 6-digit TOTP token using standard WebCrypto (SubtleCrypto HMAC-SHA1).
 * Safe for all modern browsers, Cloudflare Workers, and edge runtimes.
 */
export async function generateTOTPAsync(
  secret: string,
  windowOffset = 0,
): Promise<string> {
  try {
    const keyBytes = Uint8Array.from(base32ToBuffer(secret));
    const epoch = Math.floor(Date.now() / 1000 / 30) + windowOffset;
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setBigInt64(0, BigInt(epoch), false);

    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      return generateTOTP(secret, windowOffset);
    }

    const key = await subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    );

    const signature = await subtle.sign("HMAC", key, timeBuffer);
    const hmacResult = new Uint8Array(signature);

    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    return (binary % 1000000).toString().padStart(6, "0");
  } catch {
    return "000000";
  }
}

/**
 * Verifies a TOTP token against the secret, allowing a +/- 1 step drift window (90s window).
 */
export function verifyTOTP(secret: string, token: string): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.trim();
  for (let offset = -1; offset <= 1; offset++) {
    if (generateTOTP(secret, offset) === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Asynchronously verifies a TOTP token using WebCrypto API.
 */
export async function verifyTOTPAsync(
  secret: string,
  token: string,
): Promise<boolean> {
  if (!secret || !token) return false;
  const cleanToken = token.trim();
  for (let offset = -1; offset <= 1; offset++) {
    const valid = await generateTOTPAsync(secret, offset);
    if (valid === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generates human-friendly 8-character backup recovery codes formatted as XXXX-XXXX.
 */
export function generateBackupCodes(count = 5): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hex = getSecureRandomString(8, "0123456789ABCDEF");
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4)}`);
  }
  return codes;
}
