import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../../app.js";

describe("Admin Seed Management Routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/admin/seed/status returns statistics for all 3 phases", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/seed/status",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();
    expect(body.stats.phase1.shipments).toBeGreaterThan(0);
    expect(body.stats.phase1.incidents).toBeGreaterThan(0);
    expect(body.stats.phase2.coldChainShipments).toBeGreaterThan(0);
    expect(body.stats.phase2.temperatureReadings).toBeGreaterThan(0);
    expect(body.stats.phase3.invoices).toBeGreaterThan(0);
  });

  it("POST /api/admin/seed/unknown returns 400 error for unsupported phase", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/seed/unknown",
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error).toContain("Fase desconocida");
  });

  it("POST /api/admin/seed/2 executes Phase 2 seed successfully", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/seed/2",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.phase).toBe("2");
    expect(body.durationMs).toBeGreaterThan(0);
  });
});
