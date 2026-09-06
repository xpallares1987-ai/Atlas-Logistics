import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Modular Operations API Routes (/api/operations)", () => {
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

  describe("Bookings & Core Sub-Router", () => {
    it("GET /api/operations/companies should return companies list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/operations/companies",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("GET /api/operations/bookings should return seeded bookings list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/operations/bookings",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("referenceNumber");
      expect(data[0]).toHaveProperty("customer");
    });

    it("GET /api/operations/esg/carbon should calculate carbon tracker metrics", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/operations/esg/carbon",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data)).toBe(true);
      if (data.length > 0) {
        expect(data[0]).toHaveProperty("co2eTonnes");
        expect(data[0]).toHaveProperty("mode");
      }
    });

    it("POST /api/operations/bookings should create a new booking", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/operations/bookings",
        headers: authHeader,
        payload: {
          referenceNumber: `BKG-TEST-${Date.now()}`,
          origin: "Valencia, ES",
          destination: "Miami, US",
          serviceType: "Ocean",
          commodity: "Ceramics",
          weight: 18000,
        },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty("id");
      expect(data.origin).toBe("Valencia, ES");
    });
  });

  describe("Demurrage & Detention Sub-Router", () => {
    it("GET /api/operations/demurrage should return demurrage alerts array", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/operations/demurrage",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("LCL & Container Sub-Router", () => {
    it("GET /api/operations/lcl/cargo should return cargo pool for consolidation", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/operations/lcl/cargo",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it("POST /api/operations/lcl/optimize should return FFD optimization recommendations", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/operations/lcl/optimize",
        headers: authHeader,
        payload: {
          unassignedPool: [
            { id: "cargo-1", typeId: "euro-pallet" },
            { id: "cargo-2", typeId: "ind-pallet" },
            { id: "cargo-3", typeId: "heavy-box" },
          ],
          containerSpec: {
            maxWeight: 25.0,
            volume: 33.2,
          },
        },
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty("recommendedCargoIds");
      expect(data).toHaveProperty("utilization");
      expect(Array.isArray(data.recommendedCargoIds)).toBe(true);
    });
  });

  describe("Warehouse Traffic & Inventory Sub-Router", () => {
    it("GET /api/operations/warehouse/traffic should return traffic status", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/operations/warehouse/traffic",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("GET /api/operations/warehouse/inventory should return 3D formatted inventory", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/operations/warehouse/inventory",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      if (data.data.length > 0) {
        expect(data.data[0]).toHaveProperty("pos");
        expect(data.data[0]).toHaveProperty("sku");
      }
    });
  });
});
