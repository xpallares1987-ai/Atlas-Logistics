import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Road Freight API Routes (/api/road-freight)", () => {
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

  it("GET /api/road-freight/consignments should return seeded road consignments", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/road-freight/consignments",
      headers: authHeader,
    });

    expect(res.statusCode).toBe(200);
    const consignments = res.json();
    expect(Array.isArray(consignments)).toBe(true);
    expect(consignments.length).toBeGreaterThan(0);
    expect(consignments[0].consignmentNumber).toBeDefined();
  });

  it("POST /api/road-freight/calculate-adr should evaluate 1.1.3.6 exemption", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/road-freight/calculate-adr",
      headers: authHeader,
      payload: {
        items: [
          {
            unCode: "UN 1203",
            properShippingName: "GASOLINA",
            adrClass: "3",
            transportCategory: 2,
            quantityUnits: 250, // 250 * 3 = 750 pts <= 1,000 pts
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.adr.totalPoints).toBe(750);
    expect(body.adr.isExempt1136).toBe(true);
  });

  it("POST /api/road-freight/calculate-route should compute driving hours and tachograph stops", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/road-freight/calculate-route",
      headers: authHeader,
      payload: {
        originCity: "Madrid",
        destinationCity: "Valencia",
        distanceKm: 355,
        totalPallets: 33,
        totalGrossWeightKg: 22000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.route.capacityUtilization.floorUtilizationPct).toBe(100);
    expect(body.route.estimatedDrivingHours).toBe(4.73);
  });

  it("POST /api/road-freight/consignments should create a new consignment note", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/road-freight/consignments",
      headers: authHeader,
      payload: {
        consignmentType: "INTERNATIONAL_CMR",
        senderName: "Madrid Sender Corp",
        consigneeName: "Paris Goods SARL",
        carrierName: "Trans-European Express",
        tractorPlate: "9988-XYZ",
        trailerPlate: "R-1122-MAD",
        driverName: "Juan Pérez",
        originCity: "Madrid",
        destinationCity: "Paris",
        totalDistanceKm: 1270,
        totalPallets: 30,
        totalGrossWeightKg: 18000,
        goodsDescription: "Industrial spare parts and machinery.",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.consignment.consignmentNumber).toContain("CMR-");
    expect(body.routePlan.estimatedDrivingHours).toBeGreaterThan(15);
  });

  it("GET /api/road-freight/consignments/:id/cmr-pdf should stream Geneva 24-box e-CMR PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/road-freight/consignments",
      headers: authHeader,
    });
    const consignments = listRes.json();
    const cmrConsignment = consignments.find(
      (c: any) => c.consignmentType === "INTERNATIONAL_CMR",
    );

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/road-freight/consignments/${cmrConsignment.id}/cmr-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });

  it("GET /api/road-freight/consignments/:id/carta-porte-pdf should stream Spanish Carta de Porte PDF", async () => {
    const listRes = await app.inject({
      method: "GET",
      url: "/api/road-freight/consignments",
      headers: authHeader,
    });
    const consignments = listRes.json();
    const cdpConsignment =
      consignments.find(
        (c: any) => c.consignmentType === "NATIONAL_CARTA_PORTE",
      ) || consignments[0];

    const pdfRes = await app.inject({
      method: "GET",
      url: `/api/road-freight/consignments/${cdpConsignment.id}/carta-porte-pdf`,
      headers: authHeader,
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toBe("application/pdf");
    expect(pdfRes.rawPayload.length).toBeGreaterThan(1000);
  });
});
