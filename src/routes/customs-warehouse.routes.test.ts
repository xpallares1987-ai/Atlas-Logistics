import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Customs Warehouse & Special Regimes API Routes (/api/customs-warehouse)", () => {
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

  it("GET /api/customs-warehouse/facilities should return authorized customs facilities", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/facilities",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const facilities = res.json();
    expect(Array.isArray(facilities)).toBe(true);
    expect(facilities.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/customs-warehouse/guarantees should return bank guarantees ante la AEAT", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/guarantees",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const guarantees = res.json();
    expect(Array.isArray(guarantees)).toBe(true);
    expect(guarantees.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /api/customs-warehouse/lots should return customs inventory lots", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/lots",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const lots = res.json();
    expect(Array.isArray(lots)).toBe(true);
    expect(lots.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/customs-warehouse/lots/:id should return lot detail with ledger entries", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/lots",
      headers: authHeader,
    });
    const lots = listRes.json();
    const lotId = lots[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/customs-warehouse/lots/${lotId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const detail = res.json();
    expect(detail.id).toBe(lotId);
    expect(Array.isArray(detail.entries)).toBe(true);
  });

  it("GET /api/customs-warehouse/ledger should return stock ledger entries", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/ledger",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const ledger = res.json();
    expect(Array.isArray(ledger)).toBe(true);
    expect(ledger.length).toBeGreaterThanOrEqual(4);
  });

  it("POST /api/customs-warehouse/calculate-debt should compute suspended tariff & VAT", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/customs-warehouse/calculate-debt",
      headers: authHeader,
      payload: {
        customsValueEur: 100000,
        tariffRatePercent: 5.0,
        importVatRatePercent: 21.0,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.suspendedDutyAmountEur).toBe(5000);
    expect(body.result.taxableVatBaseEur).toBe(105000);
    expect(body.result.suspendedVatAmountEur).toBe(22050);
  });

  it("POST /api/customs-warehouse/calculate-discharge should compute tax settlement on exit", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/customs-warehouse/calculate-discharge",
      headers: authHeader,
      payload: {
        totalLotCustomsValueEur: 100000,
        totalLotDutyAmountEur: 5000,
        totalLotVatAmountEur: 22050,
        initialPackagesCount: 100,
        dischargedPackagesCount: 20,
        dischargeRegimeCode: "4071",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.settledDutyAmountEur).toBe(1000);
    expect(body.result.settledVatAmountEur).toBe(4410);
    expect(body.result.totalSettledTaxesEur).toBe(5410);
  });

  it("POST /api/customs-warehouse/lots/:id/status should update lot status", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/lots",
      headers: authHeader,
    });
    const lots = listRes.json();
    const lotId = lots[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/customs-warehouse/lots/${lotId}/status`,
      headers: authHeader,
      payload: {
        status: "ACTIVE",
        remarks: "Estado verificado por el inspector de aduanas.",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/customs-warehouse/lots/:id/dvd-pdf should stream Documento de Vinculación a Depósito PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/lots",
      headers: authHeader,
    });
    const lots = listRes.json();
    const lotId = lots[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/customs-warehouse/lots/${lotId}/dvd-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/customs-warehouse/stock-certificate-pdf should stream Certificado de Existencias PDF", async () => {
    const pdfRes = await app.inject({
      method: "GET",
      url: "/api/customs-warehouse/stock-certificate-pdf",
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
