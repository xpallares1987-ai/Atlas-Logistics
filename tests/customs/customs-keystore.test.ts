/**
 * @file customs-keystore.test.ts
 * @description Unit tests for CustomsKeystoreService (ADR 0038 / ADR 0039).
 * Tests AES-256-GCM encryption/decryption roundtrip, cryptographic auth tag tampering defense,
 * wrong passphrase rejection, and X.509 certificate metadata & thumbprint extraction.
 */

import { describe, it, expect } from "vitest";
import { generateKeyPairSync, createSign, createHash } from "node:crypto";
import {
  CustomsKeystoreService,
  customsKeystoreService,
} from "../../src/services/customs/customs-keystore.service.js";

describe("CustomsKeystoreService (Cryptographic Vault)", () => {
  const samplePkcs12Buffer = Buffer.from(
    "MIIKQgIBAzCCCgcGCSqGSIb3DQEHAaCCCfgEggn0MIIJ8DCCBO8GCSqGSIb3DQEHAaCCBN4EggTa...SIMULATED_PKCS12_BINARY_DATA",
    "utf8",
  );

  it("successfully encrypts and decrypts a PKCS#12 buffer with AES-256-GCM", () => {
    const encrypted = customsKeystoreService.encryptPkcs12(samplePkcs12Buffer);

    expect(encrypted.encryptedBlob).toBeDefined();
    expect(encrypted.ivHex).toHaveLength(24); // 12 bytes = 24 hex chars
    expect(encrypted.authTagHex).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(encrypted.encryptedBlob).not.toContain("SIMULATED_PKCS12");

    const decrypted = customsKeystoreService.decryptPkcs12(
      encrypted.encryptedBlob,
      encrypted.ivHex,
      encrypted.authTagHex,
    );

    expect(decrypted.toString("utf8")).toBe(
      samplePkcs12Buffer.toString("utf8"),
    );
  });

  it("fails decryption if the ciphertext is tampered with", () => {
    const encrypted = customsKeystoreService.encryptPkcs12(samplePkcs12Buffer);

    // Tamper with ciphertext by corrupting last character
    const tamperedBlob =
      encrypted.encryptedBlob.slice(0, -2) +
      (encrypted.encryptedBlob.endsWith("A") ? "B" : "A");

    expect(() =>
      customsKeystoreService.decryptPkcs12(
        tamperedBlob,
        encrypted.ivHex,
        encrypted.authTagHex,
      ),
    ).toThrow(/Certificate vault decryption failed/);
  });

  it("fails decryption if the authentication tag is invalid", () => {
    const encrypted = customsKeystoreService.encryptPkcs12(samplePkcs12Buffer);
    const corruptedTag = "00".repeat(16);

    expect(() =>
      customsKeystoreService.decryptPkcs12(
        encrypted.encryptedBlob,
        encrypted.ivHex,
        corruptedTag,
      ),
    ).toThrow(/Certificate vault decryption failed/);
  });

  it("fails decryption if a different secret passphrase is provided", () => {
    const encrypted = customsKeystoreService.encryptPkcs12(
      samplePkcs12Buffer,
      "correct-vault-passphrase-2026",
    );

    expect(() =>
      customsKeystoreService.decryptPkcs12(
        encrypted.encryptedBlob,
        encrypted.ivHex,
        encrypted.authTagHex,
        "wrong-vault-passphrase-attack",
      ),
    ).toThrow(/Certificate vault decryption failed/);
  });

  it("rejects encryption of empty buffers", () => {
    expect(() => customsKeystoreService.encryptPkcs12(Buffer.alloc(0))).toThrow(
      /Cannot encrypt empty/,
    );
  });

  it("correctly computes deterministic SHA-256 digests", () => {
    const input = "TEST_DUA_PAYLOAD_XML_CANONICAL";
    const expected = createHash("sha256")
      .update(input)
      .digest("hex")
      .toUpperCase();

    const actual = customsKeystoreService.computeSha256(input);
    expect(actual).toBe(expected);
  });
});
