/**
 * @file unece-transport-statistics.test.ts
 * @description Integration tests for UNECE Statistical Database (STAT__40-TRTRANS)
 * SQLite snapshot ingestion, modal split calculations, and Fastify analytics endpoints.
 * @module @atlas/tests/unece-transport-statistics
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import uneceTransportRoutes from "../src/routes/unece-transport.routes.js";
import { seedUneceTransportStatsFromSnapshot } from "../src/services/unece-transport-stats.service.js";

describe("UNECE Transport Statistics (STAT__40-TRTRANS) Analytics API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await seedUneceTransportStatsFromSnapshot();
    app = Fastify();
    await app.register(uneceTransportRoutes, {
      prefix: "/api/analytics/unece-transport",
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns real UNECE Road, Rail, Inland Waterway & Infrastructure benchmarks for Spain (ES)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/analytics/unece-transport?country=ES",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(20);
    expect(body.countryHighlight).toBe("ES");
    expect(body.modalSplit.roadMillionTkm).toBeGreaterThan(100000);
    expect(body.modalSplit.railMillionTkm).toBeGreaterThan(5000);
    expect(body.modalSplit.railInfraKm).toBeGreaterThan(10000);
    expect(body.modalSplit.motorwayInfraKm).toBeGreaterThan(10000);
    expect(
      body.modalSplit.roadSharePct + body.modalSplit.railSharePct,
    ).toBeGreaterThan(95);
  });

  it("supports mode filtering (ROAD, RAIL, INLAND_WATERWAY, INFRASTRUCTURE) across European corridors", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/analytics/unece-transport?country=DE&mode=INLAND_WATERWAY",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(
      body.data.every((r: any) => r.transportMode === "INLAND_WATERWAY"),
    ).toBe(true);
    expect(body.data.every((r: any) => r.countryCode === "DE")).toBe(true);
  });
});
