import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Cargo Claims API Routes (/api/claims)", () => {
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

  it("GET /api/claims should return list of seeded cargo claims", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/claims",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const claims = res.json();
    expect(Array.isArray(claims)).toBe(true);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].claimNumber).toContain("CLM-");
  });

  it("POST /api/claims/calculate-liability should compute Montreal 22 SDR limit for air cargo", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/claims/calculate-liability",
      headers: authHeader,
      payload: {
        convention: "MONTREAL_1999",
        transportMode: "AIR",
        damagedWeightKg: 120,
        claimedAmount: 45000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.liability.statutorySdrRatePerKg).toBe(22.0);
    expect(body.liability.totalStatutoryLimitEur).toBe(3286.8);
    expect(body.liability.isLiabilityCapped).toBe(true);
  });

  it("POST /api/claims should register a new cargo claim", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/claims",
      headers: authHeader,
      payload: {
        transportDocNumber: "B/L-TEST-9921",
        transportMode: "OCEAN",
        governingConvention: "HAGUE_VISBY",
        incidentType: "WATER_DAMAGE",
        claimantName: "Test Claimant Corp",
        carrierName: "Hapag-Lloyd AG",
        packagesDamaged: 2,
        damagedWeightKg: 1800,
        claimedAmount: 12000,
        incidentDescription:
          "Seawater ingress into container during transpacific voyage.",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.claim.claimNumber).toContain("CLM-");
    expect(body.claim.statutoryLimitEur).toBe(4482.0); // 1800 * 2 * 1.245
  });

  it("GET /api/claims/:id/protest-pdf should stream a valid Notice of Claim PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/claims",
      headers: authHeader,
    });
    const claims = listRes.json();
    const claimId = claims[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/claims/${claimId}/protest-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/claims/:id/subrogation-pdf should stream a valid Subrogation Receipt PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/claims",
      headers: authHeader,
    });
    const claims = listRes.json();
    const claimId = claims[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/claims/${claimId}/subrogation-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
