/**
 * @file iso6346.ts
 * @description ISO 6346 Freight Container Identification and Check Digit calculator/validator.
 * Follows official ISO 6346:2022 and BIC (Bureau International des Conteneurs) rules.
 * @module @atlas/shared/iso6346
 */

const LETTER_VALUES: Record<string, number> = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38,
};

const POSITION_WEIGHTS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];

/**
 * Calculates the ISO 6346 check digit for the first 10 characters (4 letters + 6 digits).
 * Returns a number between 0 and 9.
 */
export function calculateIso6346CheckDigit(prefix10: string): number {
  const clean = prefix10.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 10) {
    throw new Error(
      `ISO 6346 calculation requires at least 10 characters, received: ${prefix10}`,
    );
  }

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = clean[i];
    let val: number;
    if (ch >= "0" && ch <= "9") {
      val = Number(ch);
    } else if (LETTER_VALUES[ch] !== undefined) {
      val = LETTER_VALUES[ch];
    } else {
      throw new Error(`Invalid character in ISO 6346 string: ${ch}`);
    }
    sum += val * POSITION_WEIGHTS[i];
  }

  const remainder = sum % 11;
  return remainder % 10;
}

/**
 * Validates whether a full 11-character container number complies with ISO 6346.
 */
export function isValidIso6346(containerNumber: string): boolean {
  if (!containerNumber) return false;
  const clean = containerNumber
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (clean.length !== 11) return false;

  // Format: 3-letter owner code + 1-letter category (U, J, Z, R) + 6 digits + 1 check digit
  const pattern = /^[A-Z]{3}[UJZ][0-9]{7}$/;
  if (!pattern.test(clean)) return false;

  const expectedDigit = calculateIso6346CheckDigit(clean.slice(0, 10));
  const actualDigit = Number(clean[10]);
  return expectedDigit === actualDigit;
}

/**
 * Generates a valid 11-character ISO 6346 container number given an owner prefix (3 or 4 letters) and serial.
 */
export function generateValidIso6346(
  ownerPrefix: string = "MSK",
  serial6?: number | string,
): string {
  let prefix = ownerPrefix.toUpperCase().replace(/[^A-Z]/g, "");
  if (prefix.length === 3) {
    prefix += "U"; // 'U' for standard freight containers
  } else if (prefix.length > 4) {
    prefix = prefix.slice(0, 4);
  }

  let serialStr: string;
  if (serial6 !== undefined) {
    serialStr = String(serial6).padStart(6, "0").slice(0, 6);
  } else {
    serialStr = String(Math.floor(100000 + Math.random() * 900000));
  }

  const first10 = `${prefix}${serialStr}`;
  const checkDigit = calculateIso6346CheckDigit(first10);
  return `${first10}${checkDigit}`;
}
