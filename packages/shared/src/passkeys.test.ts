import { describe, it, expect } from "vitest";
import {
  createPasskeyChallenge,
  authenticateWithHardwareToken,
  verifyHardwareSignature,
  createWebAuthnRegistrationOptions,
  createWebAuthnAuthenticationOptions,
  simulatePasskeyRegistration,
  DEFAULT_STEP_UP_POLICY,
  SAMPLE_REGISTERED_PASSKEYS,
} from "./passkeys.js";

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

  it("should build compliant WebAuthn registration options", () => {
    const options = createWebAuthnRegistrationOptions(
      "admin@atlas-logistics.com",
      "System Admin",
      "atlas-logistics.internal"
    );

    expect(options.challenge).toHaveLength(64);
    expect(options.rp.name).toContain("Atlas-Logistics");
    expect(options.rp.id).toBe("atlas-logistics.internal");
    expect(options.user.name).toBe("admin@atlas-logistics.com");
    expect(options.user.displayName).toBe("System Admin");
    expect(options.pubKeyCredParams).toHaveLength(2);
    expect(options.authenticatorSelection.userVerification).toBe("preferred");
  });

  it("should build compliant WebAuthn authentication options", () => {
    const options = createWebAuthnAuthenticationOptions("atlas-logistics.internal", [
      "fido2-cred-001",
      "fido2-cred-002",
    ]);

    expect(options.challenge).toHaveLength(64);
    expect(options.rpId).toBe("atlas-logistics.internal");
    expect(options.allowCredentials).toHaveLength(2);
    expect(options.allowCredentials?.[0].id).toBe("fido2-cred-001");
  });

  it("should simulate passkey registration and produce a valid device", async () => {
    const device = await simulatePasskeyRegistration(
      "YubiKey 5 NFC Admin",
      "admin@atlas-logistics.com",
      "YUBIKEY_FIPS"
    );

    expect(device.id).toContain("passkey-dev-");
    expect(device.deviceName).toBe("YubiKey 5 NFC Admin");
    expect(device.deviceType).toBe("YUBIKEY_FIPS");
    expect(device.credentialId).toContain("fido2-cred-");
    expect(device.status).toBe("ACTIVE");
  });

  it("should provide default step-up security policy and sample devices", () => {
    expect(DEFAULT_STEP_UP_POLICY.requirePasskeyForCustomsClearance).toBe(true);
    expect(DEFAULT_STEP_UP_POLICY.requirePasskeyForEblRelease).toBe(true);
    expect(DEFAULT_STEP_UP_POLICY.payoutThresholdEur).toBe(10000);
    expect(SAMPLE_REGISTERED_PASSKEYS.length).toBeGreaterThanOrEqual(3);
  });
});
