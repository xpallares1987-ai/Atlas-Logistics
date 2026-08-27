import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock auth middleware for integration tests
vi.mock("../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

import app from "../app.js";

describe("Customs Routes Integration Tests", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/customs-declarations should return all declarations with enriched TARIC details", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/customs-declarations",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0]).toHaveProperty("duaNumber");
    expect(json[0]).toHaveProperty("hsCode");
  });

  it("POST /api/customs-declarations/calculate-tariff should compute duties, VAT, and tax breakdown", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/customs-declarations/calculate-tariff",
      payload: {
        hsCode: "8504.40.90.90",
        fobValue: 20000,
        freightCost: 1800,
        insuranceCost: 200,
        originCountry: "CN",
        destinationCountry: "ES",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.customsValueCif).toBe(22000);
    expect(json.importDuty).toBeGreaterThan(0);
    expect(json.vatAmount).toBeGreaterThan(0);
    expect(json.totalCustomsPayable).toBe(json.importDuty + json.vatAmount);
  });

  it("POST /api/customs-declarations/compliance-audit should return deterministic channel decision", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/customs-declarations/compliance-audit",
      payload: {
        eoriNumber: "ESB88492019",
        originCountry: "VN",
        destinationCountry: "ES",
        hsCode: "8471.30.00.00",
        customsValue: 15000,
        grossWeightKg: 200,
        attachedDocumentTypes: ["DOC-INV", "DOC-HBL", "DOC-PKL"],
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.channel).toBe("Green Channel");
    expect(json.isCleared).toBe(true);
    expect(json.riskScore).toBeLessThanOrEqual(20);
  });

  it("GET /api/customs-declarations/hs-codes should return TARIC catalog list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/customs-declarations/hs-codes?q=wine",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.length).toBeGreaterThan(0);
    expect(json[0].code).toBe("2204.21.06.00");
  });

  it("GET /api/customs-declarations/:id/pdf should generate and stream a DUA PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/customs-declarations",
    });
    const declarations = JSON.parse(listRes.payload);
    const sampleId = declarations[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/customs-declarations/${sampleId}/pdf`,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(100);
  });

  it("GET /api/customs-declarations/:id/xml should generate standard AEAT DUA XML", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/customs-declarations",
    });
    const declarations = JSON.parse(listRes.payload);
    const sampleId = declarations[0].id;

    const xmlRes = await app.inject({
      method: "GET",
      url: `/api/customs-declarations/${sampleId}/xml`,
    });

    expect(xmlRes.statusCode).toBe(200);
    expect(xmlRes.headers["content-type"]).toContain("application/xml");
    expect(xmlRes.payload).toContain("<DeclaracionAduaneraDUA");
    expect(xmlRes.payload).toContain("<Casilla33_CodigoTARIC>");
  });
});
