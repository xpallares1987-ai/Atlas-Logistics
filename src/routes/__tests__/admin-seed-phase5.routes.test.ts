import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../../app.js";

describe("Admin Seed Phase 5 API", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /api/admin/seed/5 should seed phase 5 records linked to sh_demo_01", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/seed/5",
      headers: { "Content-Type": "application/json" },
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
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stats.phase5).toBeDefined();
    expect(body.stats.phase5.demurrageInvoices).toBeGreaterThan(0);
    expect(body.stats.phase5.oceanBookings).toBeGreaterThan(0);
    expect(body.stats.phase5.stowagePlans).toBeGreaterThan(0);
  });
});
