import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock auth middleware for integration tests
vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: vi.fn(async () => {}),
  requireRole: vi.fn(() => async () => {}),
}));

import app from "../../app.js";

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

  it("POST /api/ocr/extract should extract structured data from commercial invoice text", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ocr/extract",
      payload: {
        documentType: "COMMERCIAL_INVOICE",
        text: "COMMERCIAL INVOICE NO: INV-2026-X991\nDATE: 2026-10-05\nTOTAL CIF: $148,000.00 USD\nHS CODE: 8542.31.00",
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.extractedFields.invoiceNumber).toBe("INV-2026-X991");
    expect(json.data.extractedFields.totalCifUsd).toBe(148000);
  });

  it("POST /api/ocr/cross-check should reconcile invoice, packing list and declaration", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ocr/cross-check",
      payload: {
        invoice: {
          invoiceNumber: "INV-1",
          totalCifUsd: 100000,
          lineItems: [{ hsCode: "8542.31.00" }],
        },
        packingList: {
          packingListNumber: "PL-1",
          grossWeightKg: 10000,
          containerNumber: "MSKU1234567",
        },
        declaration: {
          declarationNumber: "DEC-1",
          declaredCustomsValueUsd: 100000,
          primaryHsCode: "8542.31.00",
        },
        transport: {
          documentNumber: "BL-1",
          declaredGrossWeightKg: 10000,
          containerNumber: "MSKU1234567",
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(json.success).toBe(true);
    expect(json.data.overallStatus).toBe("MATCH_CLEARED");
    expect(json.data.complianceScore).toBe(100);
    expect(json.data.releaseCertificateId).toBeDefined();
  });

  it("enforces bounded pagination (limit & cursor) on GET /api/customs-declarations", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/customs-declarations?limit=2&offset=0",
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.payload);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBeLessThanOrEqual(2);
    expect(response.headers["x-total-returned"]).toBe(String(json.length));
  });

  it("enforces cross-tenant isolation on customs declarations list, analyze, create, PDF, and XML", async () => {
    // 1. Fetch a real declaration in default context
    const listRes = await app.inject({
      method: "GET",
      url: "/api/customs-declarations?limit=1",
    });
    const allDecls = JSON.parse(listRes.payload);
    expect(allDecls.length).toBeGreaterThan(0);
    const targetDecl = allDecls[0];

    // 2. Listing under a foreign tenant org_foreign_999 returns 0 declarations
    const foreignListRes = await app.inject({
      method: "GET",
      url: "/api/customs-declarations",
      headers: {
        "x-organization-id": "org_foreign_999",
      },
    });
    expect(foreignListRes.statusCode).toBe(200);
    expect(JSON.parse(foreignListRes.payload)).toEqual([]);

    // 3. Analyzing a declaration belonging to another tenant returns 403 Forbidden
    const foreignAnalyzeRes = await app.inject({
      method: "POST",
      url: `/api/customs-declarations/${targetDecl.id}/analyze`,
      headers: {
        "x-organization-id": "org_foreign_999",
      },
    });
    expect(foreignAnalyzeRes.statusCode).toBe(403);

    // 4. Downloading PDF or XML of a declaration belonging to another tenant returns 403 Forbidden
    const foreignPdfRes = await app.inject({
      method: "GET",
      url: `/api/customs-declarations/${targetDecl.id}/pdf`,
      headers: {
        "x-organization-id": "org_foreign_999",
      },
    });
    expect(foreignPdfRes.statusCode).toBe(403);

    const foreignXmlRes = await app.inject({
      method: "GET",
      url: `/api/customs-declarations/${targetDecl.id}/xml`,
      headers: {
        "x-organization-id": "org_foreign_999",
      },
    });
    expect(foreignXmlRes.statusCode).toBe(403);

    // 5. Creating a declaration against a shipment owned by another organization returns 403 Forbidden
    const foreignCreateRes = await app.inject({
      method: "POST",
      url: "/api/customs-declarations",
      headers: {
        "x-organization-id": "org_foreign_999",
      },
      payload: {
        shipmentId: targetDecl.shipmentId,
        hsCode: "8504.40.90.90",
        customsValue: 18000,
        originCountry: "CN",
        destinationCountry: "ES",
      },
    });
    expect(foreignCreateRes.statusCode).toBe(403);
  });

  it("encrypts outbound response when x-atlas-encrypted-payload is true and never leaks plaintext", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/customs-declarations?limit=1",
      headers: {
        "x-atlas-encrypted-payload": "true",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-atlas-encrypted-payload"]).toBe("true");
    const envelope = JSON.parse(response.payload);
    expect(envelope).toHaveProperty("ciphertext");
    expect(envelope).toHaveProperty("iv");
    expect(envelope).not.toHaveProperty("duaNumber");
  });
});
