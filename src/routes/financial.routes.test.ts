import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

describe("Modular Financial API Routes (/api)", () => {
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

  describe("Financial Analytics Sub-Router", () => {
    it("GET /api/financials should return financials array", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/financials",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it("GET /api/profitability should return category margin metrics", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/profitability",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty("data");
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("GET /api/financial-stats should return KPI summary", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/financial-stats",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty("totalShipments");
      expect(data).toHaveProperty("onTimePercent");
      expect(data).toHaveProperty("marginPercent");
    });

    it("GET /api/dashboard-charts should return charts dataset", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/dashboard-charts",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data).toHaveProperty("revenueTrend");
      expect(data).toHaveProperty("volumeByStatus");
    });
  });

  describe("Invoices Sub-Router", () => {
    it("GET /api/invoices should return invoices list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/invoices",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("POST /api/invoices should create a new draft invoice", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/invoices",
        headers: authHeader,
        payload: {
          invoiceNumber: `INV-TEST-${Date.now()}`,
          type: "AR",
          totalAmount: 3200,
          currency: "EUR",
          dueDate: new Date().toISOString(),
          lines: [
            {
              description: "Ocean Freight Rotterdam - Barcelona",
              quantity: 1,
              unitPrice: 3200,
              amount: 3200,
            },
          ],
        },
      });
      expect(res.statusCode).toBe(201);
      const data = res.json();
      expect(data).toHaveProperty("id");
    });
  });

  describe("Agent Settlements Sub-Router", () => {
    it("GET /api/agent-settlements should return settlements list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/agent-settlements",
        headers: authHeader,
      });
      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
