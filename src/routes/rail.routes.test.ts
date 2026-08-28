import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Rail Intermodal Freight & Corridors API Routes (/api/rail)", () => {
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

  it("GET /api/rail/corridors should return TEN-T rail corridors", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/rail/corridors",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const corridors = res.json();
    expect(Array.isArray(corridors)).toBe(true);
    expect(corridors.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /api/rail/terminals should return intermodal terminals", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/rail/terminals",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const terminals = res.json();
    expect(Array.isArray(terminals)).toBe(true);
    expect(terminals.length).toBeGreaterThanOrEqual(8);
  });

  it("GET /api/rail/wagons should return rolling stock wagons", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/rail/wagons",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const wagons = res.json();
    expect(Array.isArray(wagons)).toBe(true);
    expect(wagons.length).toBeGreaterThanOrEqual(5);
  });

  it("GET /api/rail/consignments should return CIM rail consignments", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/rail/consignments",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const consignments = res.json();
    expect(Array.isArray(consignments)).toBe(true);
    expect(consignments.length).toBeGreaterThan(0);
    expect(consignments[0].cimNumber).toBeDefined();
  });

  it("GET /api/rail/consignments/:id should return consignment detail with allocations", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/rail/consignments",
      headers: authHeader,
    });
    const consignments = listRes.json();
    const cimId = consignments[0].id;

    const res = await app.inject({
      method: "GET",
      url: `/api/rail/consignments/${cimId}`,
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const detail = res.json();
    expect(detail.id).toBe(cimId);
    expect(Array.isArray(detail.allocations)).toBe(true);
  });

  it("GET /api/rail/trains should return train consist runs", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/rail/trains",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const trains = res.json();
    expect(Array.isArray(trains)).toBe(true);
    expect(trains.length).toBeGreaterThanOrEqual(2);
  });

  it("POST /api/rail/calculate-physics should compute train length, mass, and brake percentage", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/rail/calculate-physics",
      headers: authHeader,
      payload: {
        locomotiveLengthMeters: 23.0,
        locomotiveWeightTonnes: 123.0,
        locomotiveBrakedWeightTonnes: 110.0,
        maxAllowedLengthMeters: 750,
        requiredBrakePercentage: 65.0,
        corridorLineCategory: "D",
        wagons: [
          {
            wagonSeries: "Sggmrss 90'",
            tareWeightTonnes: 28.5,
            payloadMassTonnes: 50.0,
            lengthOverBuffersMeters: 29.59,
            brakedWeightTonnes: 80.0,
            numberOfAxles: 6,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.totalTrainLengthMeters).toBe(52.6);
    expect(body.result.isLengthCompliant).toBe(true);
    expect(body.result.calculatedBrakePercentage).toBeGreaterThan(65.0);
  });

  it("POST /api/rail/calculate-axle-load should calculate axle distribution against line category", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/rail/calculate-axle-load",
      headers: authHeader,
      payload: {
        wagonTareTonnes: 28.5,
        payloadTonnes: 60.0,
        numberOfAxles: 6,
        lineCategory: "D",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.result.calculatedAxleLoadTonnes).toBe(14.75);
    expect(body.result.isCompliant).toBe(true);
  });

  it("POST /api/rail/consignments/:id/status should update CIM status", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/rail/consignments",
      headers: authHeader,
    });
    const consignments = listRes.json();
    const cimId = consignments[0].id;

    const res = await app.inject({
      method: "POST",
      url: `/api/rail/consignments/${cimId}/status`,
      headers: authHeader,
      payload: {
        status: "DELIVERED",
        remarks: "Entrega completada en vía de destino sin incidencias.",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/rail/consignments/:id/cim-pdf should stream official CIM Consignment Note PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/rail/consignments",
      headers: authHeader,
    });
    const consignments = listRes.json();
    const cimId = consignments[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/rail/consignments/${cimId}/cim-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/rail/trains/:id/braking-sheet-pdf should stream Train Composition & Brake Sheet PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/rail/trains",
      headers: authHeader,
    });
    const trains = listRes.json();
    const trainId = trains[0].id;

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/rail/trains/${trainId}/braking-sheet-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/rail/trains/:id/taf-tsi-xml should stream TAF-TSI XML", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/rail/trains",
      headers: authHeader,
    });
    const trains = listRes.json();
    const trainId = trains[0].id;

    const xmlRes = await app.inject({
      method: "GET",
      url: `/api/rail/trains/${trainId}/taf-tsi-xml`,
      headers: authHeader,
    });

    expect(xmlRes.statusCode).toBe(200);
    expect(xmlRes.headers["content-type"]).toBe("application/xml");
    expect(xmlRes.body).toContain("<TAFTSI_TrainCompositionMessage");
  });
});
