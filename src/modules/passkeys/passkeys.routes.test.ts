import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock auth middleware and password hashing for integration tests
vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

vi.mock("oslo/password", () => ({
  Argon2id: vi.fn().mockImplementation(() => ({
    hash: vi.fn(async () => "mocked-hash"),
    verify: vi.fn(async () => true),
  })),
}));

import app from "../../app.js";
import { generateTOTP, authenticateWithHardwareToken } from "@atlas/shared";

describe("Passkeys & Biometric Security Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/passkeys/credentials should return list of registered devices", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/passkeys/credentials",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.devices)).toBe(true);
    expect(json.devices.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/passkeys/register/options should generate WebAuthn registration challenge", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/passkeys/register/options",
      payload: {
        userEmail: "officer.security@atlas-logistics.com",
        userName: "Security Officer",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.options.challenge).toHaveLength(64);
    expect(json.options.rp.name).toContain("Atlas-Logistics");
  });

  it("POST /api/passkeys/register/verify should register a new FIDO2 device", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/passkeys/register/verify",
      payload: {
        deviceName: "YubiKey 5 NFC Test Device",
        deviceType: "YUBIKEY_FIPS",
        credentialId: "fido2-cred-test-881920",
      },
    });

    expect(response.statusCode).toBe(201);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.device.deviceName).toBe("YubiKey 5 NFC Test Device");
    expect(json.device.status).toBe("ACTIVE");
  });

  it("DELETE /api/passkeys/credentials/:id should revoke a registered device", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/passkeys/credentials/passkey-dev-001",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.revokedDeviceId).toBe("passkey-dev-001");
  });

  it("POST /api/passkeys/totp/setup should generate secret, URL, and backup recovery codes", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/passkeys/totp/setup",
      payload: {
        userEmail: "customs.agent@atlas-logistics.com",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.secret).toHaveLength(16);
    expect(json.otpauthUrl).toContain("otpauth://totp/");
    expect(json.backupCodes).toHaveLength(5);
  });

  it("POST /api/passkeys/totp/verify should accept valid token and reject invalid token", async () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const validToken = generateTOTP(secret);

    const validResponse = await app.inject({
      method: "POST",
      url: "/api/passkeys/totp/verify",
      payload: {
        secret,
        token: validToken,
      },
    });

    expect(validResponse.statusCode).toBe(200);
    const validJson = JSON.parse(validResponse.payload);
    expect(validJson.verified).toBe(true);

    const invalidResponse = await app.inject({
      method: "POST",
      url: "/api/passkeys/totp/verify",
      payload: {
        secret,
        token: "000000",
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    const invalidJson = JSON.parse(invalidResponse.payload);
    expect(invalidJson.verified).toBe(false);
  });

  it("POST /api/passkeys/step-up/verify should authorize with hardware token signature", async () => {
    const manifestId = "MNF-2026-X884";
    const hwSig = await authenticateWithHardwareToken(manifestId, "officer@atlas.com", {
      simulatedDelayMs: 5,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/passkeys/step-up/verify",
      payload: {
        actionType: "CUSTOMS_CLEARANCE",
        manifestOrTransactionId: manifestId,
        hardwareSignature: hwSig,
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.authorized).toBe(true);
    expect(json.authMethod).toContain("WEBAUTHN_HARDWARE");
  });

  it("GET /api/passkeys/policy and PUT /api/passkeys/policy should manage step-up policy", async () => {
    const getRes = await app.inject({
      method: "GET",
      url: "/api/passkeys/policy",
    });
    expect(getRes.statusCode).toBe(200);

    const putRes = await app.inject({
      method: "PUT",
      url: "/api/passkeys/policy",
      payload: {
        requirePasskeyForCustomsClearance: true,
        requirePasskeyForEblRelease: false,
        requirePasskeyForHighValuePayouts: true,
        payoutThresholdEur: 25000,
      },
    });

    expect(putRes.statusCode).toBe(200);
    const json = JSON.parse(putRes.payload);
    expect(json.policy.payoutThresholdEur).toBe(25000);
    expect(json.policy.requirePasskeyForEblRelease).toBe(false);
  });
});
