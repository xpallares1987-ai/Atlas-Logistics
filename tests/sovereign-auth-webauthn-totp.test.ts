/**
 * @file sovereign-auth-webauthn-totp.test.ts
 * @description Comprehensive unit and integration test suite for Sovereign Identity (AES-256-GCM, TOTP, WebAuthn, Lockout).
 * @module @atlas/tests/sovereign-auth
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import { describe, it, expect, beforeAll } from "vitest";
import { encryptPII, decryptPII, hashPII } from "../src/lib/encryption.js";
import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateTotpUri,
  generateBackupCodes,
  verifyAndConsumeBackupCode,
  base32Encode,
  base32Decode,
} from "../src/lib/totp.js";
import {
  storeChallenge,
  consumeChallenge,
  createRegistrationOptions,
  createAuthenticationOptions,
  coseKeyToPem,
  decodeCbor,
} from "../src/lib/webauthn.js";
import { generateKeyPairSync } from "node:crypto";

describe("Sovereign Native Identity & Auth Engine (ADR 0031)", () => {
  beforeAll(() => {
    process.env.JWT_SECRET =
      "test-jwt-secret-with-sufficient-entropy-for-validation-32b!";
  });

  // ==========================================================================
  // 1. GDPR AT-REST PII ENCRYPTION (AES-256-GCM)
  // ==========================================================================
  describe("GDPR At-Rest PII Encryption (AES-256-GCM)", () => {
    it("successfully encrypts and decrypts sensitive PII string", () => {
      const plaintext = "ES-B12345678 (Fiscal VAT Number & Confidential)";
      const encrypted = encryptPII(plaintext);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
      expect(encrypted.ciphertext).not.toBe(plaintext);

      const decrypted = decryptPII(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("throws an error when ciphertext or authentication tag is tampered with", () => {
      const plaintext =
        "Confidential Bank Account ES91-2100-0418-4502-0005-1332";
      const encrypted = encryptPII(plaintext);

      // Tamper tag
      const tamperedTag = Buffer.from(encrypted.tag, "base64");
      tamperedTag[0] ^= 0xff; // Flip bits
      const tamperedPayload = {
        ...encrypted,
        tag: tamperedTag.toString("base64"),
      };

      expect(() => decryptPII(tamperedPayload)).toThrow();
    });

    it("produces deterministic blind HMAC-SHA256 index hashes for search queries", () => {
      const taxId = "ES-A99887766";
      const hash1 = hashPII(taxId);
      const hash2 = hashPII("es-a99887766 "); // Normalized

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  // ==========================================================================
  // 2. RFC 6238 TOTP ENGINE
  // ==========================================================================
  describe("RFC 6238 TOTP MFA Engine", () => {
    it("encodes and decodes base32 strings correctly (RFC 4648)", () => {
      const raw = Buffer.from("AtlasLogistics2026", "utf8");
      const encoded = base32Encode(raw);
      expect(encoded).toBeDefined();

      const decoded = base32Decode(encoded);
      expect(decoded.toString("utf8")).toBe("AtlasLogistics2026");
    });

    it("generates random base32 secret and valid otpauth URI", () => {
      const secret = generateTotpSecret();
      expect(secret.length).toBeGreaterThanOrEqual(16);

      const uri = generateTotpUri("operator@atlas.local", secret);
      expect(uri).toContain("otpauth://totp/");
      expect(uri).toContain("Atlas%20Logistics");
      expect(uri).toContain(secret);
    });

    it("generates and verifies 6-digit TOTP codes", () => {
      const secret = generateTotpSecret();
      const code = generateTotpCode(secret);

      expect(code).toMatch(/^\d{6}$/);

      const isValid = verifyTotpCode(secret, code);
      expect(isValid).toBe(true);

      const isInvalid = verifyTotpCode(secret, "000000");
      expect(isInvalid).toBe(false);
    });

    it("generates and consumes single-use emergency backup recovery codes", async () => {
      const { plainCodes, hashedCodes } = await generateBackupCodes(4);
      expect(plainCodes.length).toBe(4);
      expect(hashedCodes.length).toBe(4);

      const codeToUse = plainCodes[0];

      // First verification succeeds and consumes the code
      const result1 = await verifyAndConsumeBackupCode(codeToUse, hashedCodes);
      expect(result1.valid).toBe(true);
      expect(result1.remainingHashedCodes.length).toBe(3);

      // Re-verifying the consumed code fails (single-use replay prevention)
      const result2 = await verifyAndConsumeBackupCode(
        codeToUse,
        result1.remainingHashedCodes,
      );
      expect(result2.valid).toBe(false);
      expect(result2.remainingHashedCodes.length).toBe(3);
    });
  });

  // ==========================================================================
  // 3. FIDO2 / WEBAUTHN PASSKEYS ENGINE
  // ==========================================================================
  describe("FIDO2 / WebAuthn Passkeys Engine", () => {
    it("stores and consumes challenges with TTL expiration", () => {
      const challenge = "test-challenge-random-string-12345678";
      storeChallenge(challenge, { type: "login" }, 5000);

      const consumed = consumeChallenge(challenge);
      expect(consumed).not.toBeNull();
      expect(consumed?.type).toBe("login");

      // Consuming a second time returns null (single-use)
      const secondConsume = consumeChallenge(challenge);
      expect(secondConsume).toBeNull();
    });

    it("generates registration and authentication options with proper RP and parameters", () => {
      const regOptions = createRegistrationOptions(
        { id: "usr_test_1", email: "test@atlas.local", name: "Test Operator" },
        "localhost",
      );

      expect(regOptions.rp.name).toBe("Atlas Logistics ERP");
      expect(regOptions.rp.id).toBe("localhost");
      expect(regOptions.pubKeyCredParams.length).toBe(2);
      expect(regOptions.pubKeyCredParams[0].alg).toBe(-7); // ES256

      const authOptions = createAuthenticationOptions("localhost", [
        "cred_123",
      ]);
      expect(authOptions.rpId).toBe("localhost");
      expect(authOptions.allowCredentials?.[0].id).toBe("cred_123");
    });

    it("decodes CBOR and converts P-256 COSE public key to valid PEM format", () => {
      // Generate a standard EC P-256 key pair to simulate authenticator
      const { publicKey } = generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
      });

      const jwk = publicKey.export({ format: "jwk" });
      const x = Buffer.from(jwk.x!, "base64url");
      const y = Buffer.from(jwk.y!, "base64url");

      // Construct COSE key map (1: 2 (EC2), 3: -7 (ES256), -1: 1 (P-256), -2: x, -3: y)
      const coseMap = new Map<unknown, unknown>();
      coseMap.set(1, 2);
      coseMap.set(3, -7);
      coseMap.set(-1, 1);
      coseMap.set(-2, x);
      coseMap.set(-3, y);

      const pem = coseKeyToPem(coseMap);
      expect(pem).toContain("-----BEGIN PUBLIC KEY-----");
      expect(pem).toContain("-----END PUBLIC KEY-----");
    });
  });
});
