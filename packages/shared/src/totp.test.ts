import { describe, it, expect } from "vitest";
import {
  generateBase32Secret,
  base32ToBuffer,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
} from "./totp";

describe("TOTP 2FA Authentication Engine", () => {
  it("should generate a valid Base32 secret string of desired length", () => {
    const secret = generateBase32Secret(16);
    expect(secret).toHaveLength(16);
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it("should decode Base32 string to Buffer correctly", () => {
    const secret = "JBSWY3DPEHPK3PXP"; // Standard RFC test vector
    const buffer = base32ToBuffer(secret);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate a 6-digit numeric TOTP token", () => {
    const secret = generateBase32Secret(16);
    const token = generateTOTP(secret);
    expect(token).toHaveLength(6);
    expect(/^\d{6}$/.test(token)).toBe(true);
  });

  it("should successfully verify a freshly generated TOTP token", () => {
    const secret = generateBase32Secret(16);
    const token = generateTOTP(secret);
    expect(verifyTOTP(secret, token)).toBe(true);
  });

  it("should accept tokens with +/- 1 time step drift (window tolerance)", () => {
    const secret = generateBase32Secret(16);
    const pastToken = generateTOTP(secret, -1);
    const futureToken = generateTOTP(secret, 1);

    expect(verifyTOTP(secret, pastToken)).toBe(true);
    expect(verifyTOTP(secret, futureToken)).toBe(true);
  });

  it("should reject an invalid or outdated token beyond window tolerance", () => {
    const secret = generateBase32Secret(16);
    const farPastToken = generateTOTP(secret, -5);
    expect(verifyTOTP(secret, farPastToken)).toBe(false);
    expect(verifyTOTP(secret, "999999")).toBe(false);
  });

  it("should generate 5 formatted backup recovery codes", () => {
    const codes = generateBackupCodes(5);
    expect(codes).toHaveLength(5);
    codes.forEach((code) => {
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
    });
  });
});
