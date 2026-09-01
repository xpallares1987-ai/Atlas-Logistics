import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Cargo Insurance API Routes (/api/cargo-insurance)", () => {
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

  it("POST /api/cargo-insurance/open-policies should create a new Open Cover policy", async () => {
    const testPol = `POL-TEST-${Date.now().toString().slice(-6)}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/cargo-insurance/open-policies",
      headers: authHeader,
      payload: {
        policyNumber: testPol,
        insurerName: "Lloyd's Marine Syndicate",
        brokerName: "Marsh McLennan",
        policyHolderName: "Atlas Forwarding SL",
        policyHolderTaxId: "B-99201452",
        currency: "EUR",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        conveyanceLimitAmount: 3000000.0,
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.policyNumber).toBe(testPol);
  });

  it("GET /api/cargo-insurance/open-policies should return list of policies", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/cargo-insurance/open-policies",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/cargo-insurance/open-policies/:id should return single policy with bordereaux and certs", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cargo-insurance/open-policies",
      headers: authHeader,
    });
    const polId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/cargo-insurance/open-policies/${polId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(polId);
    expect(Array.isArray(json.data.certificates)).toBe(true);
  });

  it("POST /api/cargo-insurance/certificates should issue new certificate of insurance", async () => {
    const testCert = `INS-TEST-${Date.now().toString().slice(-6)}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/cargo-insurance/certificates",
      headers: authHeader,
      payload: {
        certificateNumber: testCert,
        shipmentReference: "SH-TEST-001",
        transportMode: "MARITIME_OCEAN",
        carrierName: "Hapag-Lloyd",
        vesselOrFlightOrVehiclePlate: "MV Berlin Express",
        originPortOrCountry: "Puerto de Barcelona",
        destinationPortOrCountry: "Puerto de Veracruz",
        insuredPartyName: "Iberica Export SL",
        insuredPartyAddress: "Barcelona, Spain",
        consigneeOrToOrderName: "TO ORDER OF BANCO SANTANDER MEXICO",
        claimSurveyAgentNameAddress: "Lloyd's Agency Veracruz",
        goodsDescription: "Maquinaria industrial de envasado",
        packageCount: 6,
        grossWeightKg: 8500,
        commercialInvoiceValue: 200000,
        freightAmount: 10000,
        coverageClause: "ICC_A_ALL_RISKS_2009",
      },
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.data.certificateNumber).toBe(testCert);
    expect(json.data.totalInsuredValue).toBe(231000); // (200k + 10k) * 1.10 = 210k * 1.10 = 231k
  });

  it("POST /api/cargo-insurance/calculate-insured-value should calculate 110% CIF sum", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cargo-insurance/calculate-insured-value",
      headers: authHeader,
      payload: {
        commercialInvoiceValue: 100000,
        freightAmount: 8000,
        estimatedInsuranceAmount: 500,
        markupPercentage: 10,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.calculation.totalInsuredValue).toBe(119350);
  });

  it("POST /api/cargo-insurance/calculate-premium should calculate actuarial premium & taxes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cargo-insurance/calculate-premium",
      headers: authHeader,
      payload: {
        insuredValue: 100000,
        coverageClause: "ICC_A_ALL_RISKS_2009",
        commodityType: "GENERAL_CARGO",
        transportMode: "MARITIME_OCEAN_FCL",
        hasWarStrikesCover: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.rating.grossPremiumPayable).toBe(307.41);
  });

  it("POST /api/cargo-insurance/adjust-claim should compute claim settlement indemnity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cargo-insurance/adjust-claim",
      headers: authHeader,
      payload: {
        totalInsuredValue: 110000,
        soundMarketValueAtDestination: 100000,
        damagedSalvageValueAtDestination: 40000,
        deductibleAmount: 1000,
      },
    });

    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.success).toBe(true);
    expect(json.claimAdjustment.netIndemnityPayableAmount).toBe(65000);
  });

  it("GET /api/cargo-insurance/certificates/:id/certificate-pdf should stream Insurance Certificate PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cargo-insurance/certificates",
      headers: authHeader,
    });
    const certId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/cargo-insurance/certificates/${certId}/certificate-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/cargo-insurance/open-policies/:id/policy-pdf should stream Open Policy Schedule PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cargo-insurance/open-policies",
      headers: authHeader,
    });
    const polId = listRes.json().data[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/cargo-insurance/open-policies/${polId}/policy-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });

  it("GET /api/cargo-insurance/claims/:id/adjustment-pdf should stream Claim Adjustment PDF", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/cargo-insurance/claims/ins_claim_01/adjustment-pdf`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.rawPayload.length).toBeGreaterThan(500);
  });
});
