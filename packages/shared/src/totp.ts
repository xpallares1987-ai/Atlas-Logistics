import crypto from "node:crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generates a random Base32 secret key for TOTP (RFC 6238).
 */
export function generateBase32Secret(length = 16): string {
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[crypto.randomInt(0, 32)];
  }
  return secret;
}

/**
 * Decodes a Base32 encoded string into a byte Buffer.
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
  return Buffer.from(bytes);
}

/**
 * Generates a 6-digit Time-based One-Time Password (TOTP) for the given secret.
 * Defaults to 30-second time steps.
 */
export function generateTOTP(secret: string, windowOffset = 0): string {
  try {
    const key = base32ToBuffer(secret);
    const epoch = Math.floor(Date.now() / 1000 / 30) + windowOffset;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(epoch), 0);

    const hmac = crypto.createHmac("sha1", key);
    hmac.update(timeBuffer);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, "0");
    return otp;
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
 * Generates human-friendly 8-character backup recovery codes formatted as XXXX-XXXX.
 */
export function generateBackupCodes(count = 5): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}
