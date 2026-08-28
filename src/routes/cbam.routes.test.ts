import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("CBAM & Scope 3 Decarbonization API Routes (/api/cbam)", () => {
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

  it("GET /api/cbam/catalog should return official CBAM goods catalog", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/cbam/catalog",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const catalog = res.json();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThanOrEqual(6);
  });

  it("GET /api/cbam/installations should return verified third-country installations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/cbam/installations",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const installations = res.json();
    expect(Array.isArray(installations)).toBe(true);
    expect(installations.length).toBeGreaterThanOrEqual(4);
  });

  it("GET /api/cbam/declarations should return quarterly CBAM declarations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/cbam/declarations",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const declarations = res.json();
    expect(Array.isArray(declarations)).toBe(true);
    expect(declarations.length).toBeGreaterThan(0);
    expect(declarations[0].declarationNumber).toBeDefined();
  });

  it("GET /api/cbam/declarations/:id should return declaration with line items", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cbam/declarations",
      headers: authHeader,
    });
    const declarations = listRes.json();
    const decId = declarations[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/cbam/declarations/${decId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const detail = res.json();
    expect(detail.id).toBe(decId);
    expect(Array.isArray(detail.lines)).toBe(true);
  });

  it("POST /api/cbam/calculate-emissions should compute embedded direct and indirect emissions", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cbam/calculate-emissions",
      headers: authHeader,
      payload: {
        netWeightTonnes: 1000.0,
        directEmissionFactor: 1.85,
        indirectEmissionFactor: 0.42,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.totalEmbeddedEmissionsTco2e).toBe(2270.0);
  });

  it("POST /api/cbam/calculate-liability should compute EU ETS carbon liability with foreign deductions", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cbam/calculate-liability",
      headers: authHeader,
      payload: {
        totalEmbeddedEmissionsTco2e: 1000.0,
        euEtsBenchmarkPriceEur: 85.5,
        foreignCarbonPricePaidEur: 25000.0,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.grossCarbonLiabilityEur).toBe(85500.0);
    expect(body.result.netCarbonLiabilityEur).toBe(60500.0);
  });

  it("POST /api/cbam/declarations/:id/status should update declaration status", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cbam/declarations",
      headers: authHeader,
    });
    const declarations = listRes.json();
    const decId = declarations[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/cbam/declarations/${decId}/status`,
      headers: authHeader,
      payload: {
        status: "SUBMITTED_REGISTRY",
        remarks: "Presentación telemática completada con éxito.",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/cbam/declarations/:id/xml should stream European Commission Transitional XML", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cbam/declarations",
      headers: authHeader,
    });
    const declarations = listRes.json();
    const decId = declarations[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/cbam/declarations/${decId}/xml`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("application/xml");
    expect(res.body).toContain("<CBAMQuarterlyReport");
  });

  it("GET /api/cbam/declarations/:id/pdf should stream official CBAM Declaration Certificate PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cbam/declarations",
      headers: authHeader,
    });
    const declarations = listRes.json();
    const decId = declarations[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/cbam/declarations/${decId}/pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
