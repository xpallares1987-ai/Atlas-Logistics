/**
 * @file health.routes.test.ts
 * @description Integration tests for health diagnostics and Prometheus metrics endpoints.
 * Validates unified Prometheus exposition format and dynamic metric updates via @prometheus-io/client.
 * @module @atlas/backend/tests/health-routes
 * @see {@link docs/superpowers/plans/2026-11-14-governance-hardening-and-observability-plan.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../app.js";
import { shipmentsCreated, dbQueryDuration } from "../monitoring/metrics.js";
import { backupSuccess, backupDuration } from "../monitoring/backupMetrics.js";

describe("Health & Monitoring Routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health should return ok status with db & system diagnostics", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(["healthy", "degraded", "ok"]).toContain(body.status);
    expect(typeof body.uptime).toBe("number");
    expect(body.timestamp).toBeDefined();
    expect(body.db).toBeDefined();
    expect(body.system).toBeDefined();
    expect(body.system.memory).toBeDefined();
    expect(typeof body.system.eventLoopDelayMs).toBe("number");
  });

  it("GET /metrics should return Prometheus formatted metrics from @prometheus-io/client", async () => {
    // 1. Simulate domain and backup metrics activity
    shipmentsCreated.inc({ mode: "sea" }, 3);
    backupSuccess.inc(1);
    backupDuration.observe(1.25);
    dbQueryDuration.observe({ operation: "SELECT", table: "shipments" }, 0.045);

    // 2. Query Fastify /metrics endpoint
    const response = await app.inject({
      method: "GET",
      url: "/metrics",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");

    const payload = response.payload;

    // 3. Verify Fastify HTTP and process metrics are present
    expect(payload).toContain("http_request");

    // 4. Verify custom SCM domain and backup metrics are registered and serialized
    expect(payload).toContain("shipments_created_total");
    expect(payload).toContain('shipments_created_total{mode="sea"}');
    expect(payload).toContain("backup_success_total");
    expect(payload).toContain("backup_duration_seconds");
    expect(payload).toContain("db_query_duration_seconds");
  });
});
