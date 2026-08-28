import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Cold Chain & Pharma GDP API Routes (/api/cold-chain)", () => {
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

  it("GET /api/cold-chain/profiles should return regulated temperature profiles", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/cold-chain/profiles",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const profiles = res.json();
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThanOrEqual(5);
  });

  it("GET /api/cold-chain/shipments should return seeded cold chain shipments", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/cold-chain/shipments",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const shipments = res.json();
    expect(Array.isArray(shipments)).toBe(true);
    expect(shipments.length).toBeGreaterThan(0);
    expect(shipments[0].trackingNumber).toBeDefined();
  });

  it("GET /api/cold-chain/shipments/:id should return detailed telemetry and profile", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cold-chain/shipments",
      headers: authHeader,
    });
    const shipments = listRes.json();
    const shipmentId = shipments[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/cold-chain/shipments/${shipmentId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const detail = res.json();
    expect(detail.id).toBe(shipmentId);
    expect(detail.profile).toBeDefined();
    expect(Array.isArray(detail.readings)).toBe(true);
  });

  it("POST /api/cold-chain/calculate-mkt should compute Arrhenius MKT score", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cold-chain/calculate-mkt",
      headers: authHeader,
      payload: {
        readings: [
          { celsius: 4.8, durationMinutes: 60 },
          { celsius: 5.2, durationMinutes: 60 },
          { celsius: 5.0, durationMinutes: 60 },
        ],
        minAllowedCelsius: 2.0,
        maxAllowedCelsius: 8.0,
        targetCelsius: 5.0,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.evaluation.mktCelsius).toBeDefined();
    expect(body.evaluation.isCompliant).toBe(true);
  });

  it("POST /api/cold-chain/simulate-dry-ice should calculate holdover hours", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cold-chain/simulate-dry-ice",
      headers: authHeader,
      payload: {
        initialWeightKg: 45.0,
        currentWeightKg: 32.0,
        sublimationRateKgHr: 0.45,
        transitHoursRemaining: 24,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.holdoverHoursRemaining).toBe(71.1);
  });

  it("POST /api/cold-chain/simulate-reefer-power should estimate genset fuel consumption", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/cold-chain/simulate-reefer-power",
      headers: authHeader,
      payload: {
        ambientTempCelsius: 32.0,
        setpointCelsius: 20.0,
        transitHours: 24,
        tankCapacityLiters: 450,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.fuelBurnRateLitersPerHr).toBeGreaterThan(0);
  });

  it("POST /api/cold-chain/shipments/:id/release should record Responsible Person GDP verdict", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cold-chain/shipments",
      headers: authHeader,
    });
    const shipments = listRes.json();
    const shipmentId = shipments[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/cold-chain/shipments/${shipmentId}/release`,
      headers: authHeader,
      payload: {
        gdpReleaseVerdict: "RELEASED_FOR_DISTRIBUTION",
        responsiblePersonName: "Dra. Elena Ruiz (QP/RP)",
        qualityAuditNotes:
          "Liberación formal certificada en auditoría de calidad.",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/cold-chain/shipments/:id/certificate-pdf should stream official GDP release PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/cold-chain/shipments",
      headers: authHeader,
    });
    const shipments = listRes.json();
    const shipmentId = shipments[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/cold-chain/shipments/${shipmentId}/certificate-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
