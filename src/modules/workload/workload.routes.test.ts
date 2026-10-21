import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import workloadRoutes from "./workload.routes.js";

describe("Workload & Axle Heatmap Fastify Routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(workloadRoutes, { prefix: "/api/workload" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/workload/settings - should return default settings", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/workload/settings",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.settings.weightShipment).toBe(1.0);
    expect(body.settings.capacityThreshold).toBe(100.0);
  });

  it("POST /api/workload/settings - should update capacity threshold", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/workload/settings",
      payload: { capacityThreshold: 110.0 },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.settings.capacityThreshold).toBe(110.0);
  });

  it("GET /api/workload/analysis - should return operatives and rebalancing recommendations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/workload/analysis",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.summary.totalOperatives).toBeGreaterThanOrEqual(4);
    expect(body.operatives.length).toBeGreaterThanOrEqual(4);
    // TEST02 must be excluded from traffic score
    const test02 = body.operatives.find((o: any) =>
      o.operativeName.includes("TEST02"),
    );
    expect(test02.isExcluded).toBe(true);
  });

  it("POST /api/workload/stowage/axle-heatmap - should compute 5-axle loads and heatmap grid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/workload/stowage/axle-heatmap",
      payload: {
        coils: [
          { coilId: "C-01", weightKg: 3000, xPositionM: 2.5, yPositionM: 0.8 },
          { coilId: "C-02", weightKg: 3000, xPositionM: 2.5, yPositionM: 1.5 },
          { coilId: "C-03", weightKg: 3000, xPositionM: 8.5, yPositionM: 0.8 },
          { coilId: "C-04", weightKg: 3000, xPositionM: 8.5, yPositionM: 1.5 },
        ],
        isUsa: false,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.result.axles.length).toBe(5);
    expect(body.result.isFullyLegal).toBe(true);
    expect(body.result.heatmapGrid.length).toBe(10);
  });

  it("GET /api/workload/charge-audit/discrepancies - should return audited findings", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/workload/charge-audit/discrepancies",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.findings.length).toBeGreaterThan(0);
    expect(body.totalDiscrepancyEur).toBeGreaterThan(0);
  });
});
