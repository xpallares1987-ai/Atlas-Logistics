import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Incoterms API Routes (/api/incoterms)", () => {
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

  it("GET /api/incoterms/rules should return all 11 Incoterms rules", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/incoterms/rules",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(11);
    expect(body.rules).toBeInstanceOf(Array);
  });

  it("GET /api/incoterms/rules/CIP should return CIP rule details with Clause A insurance", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/incoterms/rules/CIP",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.rule.code).toBe("CIP");
    expect(body.rule.insuranceRequirement).toBe("MANDATORY_CLAUSE_A");
  });

  it("POST /api/incoterms/validate-mode should validate transport mode compatibility", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/incoterms/validate-mode",
      headers: authHeader,
      payload: {
        incotermCode: "FOB",
        transportMode: "AIR",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.validation.isValid).toBe(false);
    expect(body.validation.recommendation).toBe("FCA");
  });

  it("POST /api/incoterms/calculate-insurance should return insurance calculation for CIP", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/incoterms/calculate-insurance",
      headers: authHeader,
      payload: {
        incotermCode: "CIP",
        goodsValue: 150000,
        freightCost: 3500,
        currency: "EUR",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.insurance.isMandatory).toBe(true);
    expect(body.insurance.minimumInsuredValue).toBe(168850); // (150000 + 3500) * 1.1
  });

  it("POST /api/incoterms/normalize-customs-value should calculate CIF value for EXW", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/incoterms/normalize-customs-value",
      headers: authHeader,
      payload: {
        incotermCode: "EXW",
        invoiceValue: 50000,
        preCarriageCost: 500,
        exportFormalitiesCost: 120,
        internationalFreightCost: 2800,
        insuranceCost: 200,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.normalization.customsValueCif).toBe(53620);
    expect(body.normalization.totalAdditions).toBe(3620);
  });

  it("GET /api/incoterms/contracts should return seeded contracts", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/incoterms/contracts",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const contracts = res.json();
    expect(Array.isArray(contracts)).toBe(true);
    expect(contracts.length).toBeGreaterThan(0);
  });

  it("POST /api/incoterms/contracts should create a new contract", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/incoterms/contracts",
      headers: authHeader,
      payload: {
        title: "Test Freight Contract",
        incotermCode: "FCA",
        namedPlace: "Madrid Barajas Cargo Terminal, Spain",
        transportMode: "AIR",
        goodsValue: 45000,
        sellerData: {
          name: "Test Seller SL",
          address: "Gran Via 1, Madrid",
          country: "ES",
        },
        buyerData: {
          name: "Test Buyer Inc",
          address: "5th Ave, New York",
          country: "US",
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.contract.contractNumber).toContain("CTR-");
    expect(body.contract.incotermCode).toBe("FCA");
    expect(body.contract.namedPlace).toContain("Incoterms® 2020");
  });

  it("GET /api/incoterms/contracts/:id/pdf should stream a valid contract PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/incoterms/contracts",
      headers: authHeader,
    });
    const contracts = listRes.json();
    const contractId = contracts[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/incoterms/contracts/${contractId}/pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
