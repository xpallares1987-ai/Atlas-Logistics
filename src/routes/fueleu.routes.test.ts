import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("FuelEU Maritime & EU ETS API Routes (/api/fueleu)", () => {
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

  it("GET /api/fueleu/fuels should return marine fuels catalog", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/fueleu/fuels",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const fuels = res.json();
    expect(Array.isArray(fuels)).toBe(true);
    expect(fuels.length).toBeGreaterThanOrEqual(8);
  });

  it("GET /api/fueleu/vessels should return merchant fleet", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/fueleu/vessels",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const vessels = res.json();
    expect(Array.isArray(vessels)).toBe(true);
    expect(vessels.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/fueleu/voyages should return marine voyages", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/fueleu/voyages",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const voyages = res.json();
    expect(Array.isArray(voyages)).toBe(true);
    expect(voyages.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/fueleu/voyages/:id should return voyage detail with vessel and fuel info", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/fueleu/voyages",
      headers: authHeader,
    });
    const voyages = listRes.json();
    const voyageId = voyages[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/fueleu/voyages/${voyageId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const detail = res.json();
    expect(detail.id).toBe(voyageId);
    expect(detail.vessel).toBeDefined();
    expect(detail.fuel).toBeDefined();
  });

  it("GET /api/fueleu/accounts should return compliance accounts", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/fueleu/accounts",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const accounts = res.json();
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/fueleu/pools should return compliance pools", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/fueleu/pools",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const pools = res.json();
    expect(Array.isArray(pools)).toBe(true);
    expect(pools.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/fueleu/calculate-fueleu should compute GHG intensity and compliance metrics", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/fueleu/calculate-fueleu",
      headers: authHeader,
      payload: {
        reportingYear: 2025,
        fuelConsumptions: [
          {
            fuelCode: "FOSSIL_VLSFO",
            consumedTonnes: 100,
            lowerCalorificValueMjPerGram: 0.041,
            wtwFactorGco2eqPerMj: 91.16,
          },
        ],
        opsElectricityKwh: 5000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.ghgMetrics.calculatedGhgIntensityGco2eqPerMj).toBeDefined();
    expect(body.complianceMetrics.complianceStatus).toBeDefined();
  });

  it("POST /api/fueleu/calculate-ets should compute EU ETS liability and Green BAF", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/fueleu/calculate-ets",
      headers: authHeader,
      payload: {
        co2EmissionsTonnes: 500,
        ch4EmissionsTonnes: 0.1,
        n2oEmissionsTonnes: 0.02,
        scope: "INTRA_EU_100",
        euaPriceEurPerTonne: 80.0,
        carriedTeus: 4000,
        fueleuPenaltyEur: 12000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.etsLiability.totalEtsFinancialLiabilityEur).toBeGreaterThan(0);
    expect(body.greenBaf.totalGreenBafSurchargePerTeuEur).toBeGreaterThan(0);
  });

  it("POST /api/fueleu/simulate-pool should simulate fleet pooling", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/fueleu/simulate-pool",
      headers: authHeader,
      payload: {
        poolCode: "POOL-TEST-01",
        vessels: [
          {
            vesselId: "ves_1",
            vesselName: "Methanol Ship",
            complianceBalanceGco2eq: 100_000_000,
          },
          {
            vesselId: "ves_2",
            vesselName: "VLSFO Ship",
            complianceBalanceGco2eq: -20_000_000,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.poolResult.isPoolCompliant).toBe(true);
    expect(body.poolResult.totalResidualPenaltyEur).toBe(0);
  });

  it("POST /api/fueleu/voyages/:id/status should update voyage status", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/fueleu/voyages",
      headers: authHeader,
    });
    const voyages = listRes.json();
    const voyageId = voyages[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/fueleu/voyages/${voyageId}/status`,
      headers: authHeader,
      payload: {
        status: "AUDITED_THETIS",
        leadAuditorVerifier: "DNV Marine Lead Auditor",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/fueleu/voyages/:id/thetis-xml should export valid EMSA THETIS-MRV XML", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/fueleu/voyages",
      headers: authHeader,
    });
    const voyages = listRes.json();
    const voyageId = voyages[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/fueleu/voyages/${voyageId}/thetis-xml`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/xml");
    expect(res.payload).toContain("<ThetisMaritimeReport");
  });

  it("GET /api/fueleu/accounts/:id/certificate-pdf should stream FuelEU Compliance PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/fueleu/accounts",
      headers: authHeader,
    });
    const accounts = listRes.json();
    const accountId = accounts[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/fueleu/accounts/${accountId}/certificate-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/fueleu/voyages/:id/bdn-pdf should stream BDN Audit Sheet PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/fueleu/voyages",
      headers: authHeader,
    });
    const voyages = listRes.json();
    const voyageId = voyages[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/fueleu/voyages/${voyageId}/bdn-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
