// @ts-nocheck
import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "./crypto";

describe("crypto utilities", () => {
  it("should encrypt and decrypt a token correctly", async () => {
    const token = "my-secret-token";
    const pin = "1234";
    const encrypted = await encryptToken(token, pin);
    const decrypted = await decryptToken(encrypted, pin);
    expect(decrypted).toBe(token);
  });

  it("should throw an error for an incorrect PIN", async () => {
    const token = "my-secret-token";
    const pin = "1234";
    const encrypted = await encryptToken(token, pin);
    await expect(decryptToken(encrypted, "0000")).rejects.toThrow(
      "Invalid PIN or corrupted data",
    );
  });

  it("should throw an error for corrupted data", async () => {
    const token = "my-secret-token";
    const pin = "1234";
    const encrypted = await encryptToken(token, pin);
    const corrupted = encrypted.slice(0, 10) + "invalid" + encrypted.slice(10);
    await expect(decryptToken(corrupted, pin)).rejects.toThrow(
      "Invalid PIN or corrupted data",
    );
  });
});

