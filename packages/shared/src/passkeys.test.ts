import { describe, it, expect } from "vitest";
import {
  createPasskeyChallenge,
  authenticateWithHardwareToken,
  verifyHardwareSignature,
} from "./passkeys";

describe("WebAuthn / Passkeys & Hardware Token Suite", () => {
  it("should create a cryptographically random challenge with valid TTL", () => {
    const challengeObj = createPasskeyChallenge(60000);
    expect(challengeObj.challenge).toBeDefined();
    expect(challengeObj.challenge.length).toBe(64); // 32 bytes hex
    expect(challengeObj.expiresAt).toBeGreaterThan(challengeObj.timestamp);
  });

  it("should perform hardware token authentication handshake successfully", async () => {
    const manifestId = "MNF-2026-X99";
    const userEmail = "customs.officer@atlas-logistics.com";

    const result = await authenticateWithHardwareToken(manifestId, userEmail, {
      simulatedDelayMs: 10,
      deviceModel: "YubiKey 5 FIPS",
    });

    expect(result.success).toBe(true);
    expect(result.manifestId).toBe(manifestId);
    expect(result.userEmail).toBe(userEmail);
    expect(result.deviceModel).toBe("YubiKey 5 FIPS");
    expect(result.credentialId).toContain("fido2-cred-");
    expect(result.signature).toContain(`-auth-${manifestId}`);
  });

  it("should verify a valid hardware signature result", async () => {
    const manifestId = "MNF-2026-X99";
    const userEmail = "chief.inspector@atlas-logistics.com";

    const result = await authenticateWithHardwareToken(manifestId, userEmail, {
      simulatedDelayMs: 5,
    });

    const isValid = verifyHardwareSignature(result, manifestId);
    expect(isValid).toBe(true);
  });

  it("should reject a hardware signature when manifestId does not match", async () => {
    const manifestId = "MNF-2026-X99";
    const userEmail = "chief.inspector@atlas-logistics.com";

    const result = await authenticateWithHardwareToken(manifestId, userEmail, {
      simulatedDelayMs: 5,
    });

    const isValid = verifyHardwareSignature(result, "MNF-DIFFERENT-001");
    expect(isValid).toBe(false);
  });
});
