import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Trade Finance & Letters of Credit API Routes (/api/trade-finance)", () => {
  let authHeader: { authorization: string };

  beforeAll(async () => {
    await app.ready();
    const token = jwt.sign(
      {
        id: "admin_user_id",
        email: "admin@atlas.com",
        role: "ADMIN",
        name: "Admin User",
      },
      JWT_SECRET,
      { expiresIn: "1h" },
    );
    authHeader = { authorization: `Bearer ${token}` };
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/trade-finance/instruments should return list of credit instruments", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/trade-finance/instruments",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const instruments = res.json();
    expect(Array.isArray(instruments)).toBe(true);
    expect(instruments.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/trade-finance/instruments/:id should return instrument details with documents and discrepancies", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/trade-finance/instruments",
      headers: authHeader,
    });
    const instruments = listRes.json();
    const instId = instruments[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/trade-finance/instruments/${instId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const detail = res.json();
    expect(detail.id).toBe(instId);
    expect(detail.documents).toBeDefined();
    expect(Array.isArray(detail.documents)).toBe(true);
    expect(detail.discrepancies).toBeDefined();
  });

  it("POST /api/trade-finance/instruments should create a new trade credit instrument", async () => {
    const testRef = `LC-2026-TEST-NEW-${Date.now()}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments",
      headers: authHeader,
      payload: {
        instrumentReference: testRef,
        instrumentType: "COMMERCIAL_LC_CONFIRMED",
        applicableRules: "UCP600",
        applicantName: "Test Importer Corp",
        beneficiaryName: "Test Exporter SA",
        issuingBankBic: "BNPAFRPPXXX",
        issuingBankName: "BNP Paribas Paris",
        currency: "EUR",
        creditAmount: 85000.0,
        issueDate: "2026-08-15",
        latestShipmentDate: "2026-09-30",
        expiryDate: "2026-10-21",
        portOfLoading: "ESVLC",
        portOfDischarge: "FRLEH",
        goodsDescriptionSummary: "CERAMIC TILES CIF LE HAVRE",
      },
    });

    expect(res.statusCode).toBe(201);
    const created = res.json();
    expect(created.instrumentReference).toBe(testRef);
    expect(created.creditAmount).toBe(85000.0);
  });

  it("POST /api/trade-finance/instruments/:id/validate-ucp should run UCP 600 audit", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments/lc_bcn_2026_01/validate-ucp",
      headers: authHeader,
      payload: {
        presentationDate: "2026-08-25",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.auditResult).toBeDefined();
    expect(body.auditResult.complianceStatus).toBe("COMPLIANT");
  });

  it("POST /api/trade-finance/calculate-fees should compute bank charges", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/trade-finance/calculate-fees",
      headers: authHeader,
      payload: {
        creditAmount: 150000.0,
        currency: "EUR",
        tenorDays: 90,
        openingFeeRatePct: 0.25,
        confirmationFeeRatePct: 0.5,
        discrepanciesCount: 1,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.feeCalculation.totalBankFeesEur).toBeGreaterThan(0);
  });

  it("GET /api/trade-finance/instruments/:id/swift-mt700 should export SWIFT MT700 text", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/trade-finance/instruments/lc_bcn_2026_01/swift-mt700",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.payload).toContain(":20:LC-2026-BCN-0089");
    expect(res.payload).toContain(":40E:UCP LATEST VERSION");
  });

  it("GET /api/trade-finance/instruments/:id/swift-mt734 should export SWIFT MT734 text", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/trade-finance/instruments/lc_val_2026_02/swift-mt734",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.payload).toContain(":20:LC-2026-VAL-0145");
    expect(res.payload).toContain(":77J:DISCREPANCIES FOUND");
  });

  it("GET /api/trade-finance/instruments/:id/presentation-dossier-pdf should stream Presentation Dossier PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/trade-finance/instruments/lc_bcn_2026_01/presentation-dossier-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/trade-finance/instruments/:id/discrepancy-report-pdf should stream Discrepancy Audit PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/trade-finance/instruments/lc_val_2026_02/discrepancy-report-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/trade-finance/instruments/:id/guarantee-certificate-pdf should stream Demand Guarantee PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/trade-finance/instruments/sblc_mad_2026_03/guarantee-certificate-pdf",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(1000);
  });
});
