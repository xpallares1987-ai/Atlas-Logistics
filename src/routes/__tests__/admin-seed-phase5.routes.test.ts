import { describe, it, expect, beforeAll, afterAll } from "vitest";
import jwt from "jsonwebtoken";
import app from "../../app.js";
import { getJWTConfig } from "../../config/jwt.js";

describe("Admin Seed Phase 5 API", () => {
  let adminAuth: string;

  beforeAll(async () => {
    await app.ready();
    const token = jwt.sign(
      {
        id: "admin_user_id",
        email: "admin@atlas.com",
        role: "ADMIN",
        companyId: "c-1",
      },
      getJWTConfig().secret,
      { expiresIn: "1h" },
    );
    adminAuth = `Bearer ${token}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/admin/seed/5 should seed phase 5 records linked to sh_demo_01", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/seed/5",
      headers: {
        "Content-Type": "application/json",
        authorization: adminAuth,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.phase).toBe("5");
  });

  it("GET /api/admin/seed/status should include phase 5 telemetry", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/seed/status",
      headers: { authorization: adminAuth },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stats.phase5).toBeDefined();
    expect(body.stats.phase5.demurrageInvoices).toBeGreaterThan(0);
    expect(body.stats.phase5.oceanBookings).toBeGreaterThan(0);
    expect(body.stats.phase5.stowagePlans).toBeGreaterThan(0);
  });
});
