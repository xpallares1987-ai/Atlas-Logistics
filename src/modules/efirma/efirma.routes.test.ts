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

describe("EFirma Zero-Knowledge API Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/efirma/presets should return all 4 official demo presets", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/efirma/presets",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.presets).toHaveLength(4);
    expect(json.presets[0].presetId).toBe("pedimento_a1_general");
    expect(json.presets[1].presetId).toBe("pedimento_af_immex");
    expect(json.presets[2].presetId).toBe("carta_porte_31_transfronteriza");
    expect(json.presets[3].presetId).toBe("ebl_mletr_maritimo");
  });

  it("POST /api/efirma/verify should validate a correctly formatted digital seal and cadena original", async () => {
    const payload = {
      cadenaOriginal: "||4.0|PEDIMENTO_ADUANAL|26-24-3019-1002931|2026-10-15T12:00:00Z|AAN940112XX1|TEX840211XY9|145000.00|CONTENT||",
      selloDigitalBase64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Y9x8uL1uK8V0b9X8yZa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef=",
      certificateSerial: "30001000000508192011",
      rfcTitular: "AAN940112XX1",
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/efirma/verify",
      payload,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.isValid).toBe(true);
    expect(json.algorithm).toBe("RSASSA-PKCS1-v1_5");
    expect(json.cadenaOriginalSha256).toHaveLength(64);
  });

  it("POST /api/efirma/verify should return 400 for malformed cadena original without delimiters", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/efirma/verify",
      payload: {
        cadenaOriginal: "MALFORMED_WITHOUT_DOUBLE_PIPES",
        selloDigitalBase64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Y9x8uL1uK8V0b9X8yZa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef=",
        certificateSerial: "30001000000508192011",
        rfcTitular: "AAN940112XX1",
      },
    });

    expect(response.statusCode).toBe(400);
    const json = JSON.parse(response.payload);
    expect(json.isValid).toBe(false);
  });

  it("POST /api/efirma/audit-stamp should generate an RFC 3161 audit stamp and record it in ledger", async () => {
    const payload = {
      documentId: "26-24-3019-1002931",
      documentType: "PEDIMENTO_ADUANAL",
      sealResult: {
        selloDigitalBase64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Y9x8uL1uK8V0b9X8yZa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef=",
        cadenaOriginal: "||4.0|PEDIMENTO_ADUANAL|26-24-3019-1002931|2026-10-15T12:00:00Z|AAN940112XX1|TEX840211XY9|145000.00|CONTENT||",
        cadenaOriginalSha256: "8f7a6c5b4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a",
        certificateSerial: "30001000000508192011",
        rfcTitular: "AAN940112XX1",
        razonSocial: "AGENCIA ADUANAL TRANSFRONTERIZA DEL NORTE S.C.",
        signedTimestamp: "2026-10-15T12:00:00Z",
        algorithm: "RSASSA-PKCS1-v1_5",
        hashAlgorithm: "SHA-256",
        verificationMethod: "WebCrypto API (SubtleCrypto Native)",
      },
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/efirma/audit-stamp",
      payload,
    });

    expect(response.statusCode).toBe(201);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.auditStamp.auditId).toContain("AUD-SAT-");
    expect(json.auditStamp.documentId).toBe("26-24-3019-1002931");
    expect(json.auditStamp.rfc3161TimestampToken).toContain("TSA-RFC3161-");
    expect(json.auditStamp.tamperSealHash).toHaveLength(64);
  });

  it("GET /api/efirma/audit-log should retrieve audit stamps history", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/efirma/audit-log",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.stamps)).toBe(true);
    expect(json.stamps.length).toBeGreaterThan(0);
  });
});
