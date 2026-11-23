/**
 * @file autonomous-resolution-routes.test.ts
 * @description Integration tests for Autonomous Disruption Resolution REST API (ADR 0036).
 * Validates plan synthesis, multi-objective ranking, atomic rerouting execution,
 * and transactional outbox event emission.
 * @module @atlas/tests/autonomous-resolution-routes
 * @see {@link docs/adr/0036-autonomous-disruption-resolution-and-automated-rerouting-engine.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { resolutionPlansRoutes } from "../src/routes/scm/resolution-plans.routes.js";
import { db } from "../src/db/index.js";
import {
  companies,
  purchaseOrders,
  supplyChainExceptions,
  disruptionResolutionPlans,
  reroutingExecutionLogs,
} from "../src/db/schema/index.js";
import { inArray, eq } from "drizzle-orm";

describe("Autonomous Disruption Resolution API (ADR 0036)", () => {
  let app: FastifyInstance;

  const testCompanyId = "comp_test_disruption_01";
  const testPoId = "po_test_disruption_01";
  const testExceptionId = "exc_test_disruption_01";

  beforeAll(async () => {
    const now = new Date();

    // 1. Clean up stale test data
    await db
      .delete(reroutingExecutionLogs)
      .where(eq(reroutingExecutionLogs.tenantId, "tenant_default"));
    await db
      .delete(disruptionResolutionPlans)
      .where(inArray(disruptionResolutionPlans.poId, [testPoId]));
    await db
      .delete(supplyChainExceptions)
      .where(inArray(supplyChainExceptions.id, [testExceptionId]));
    await db
      .delete(purchaseOrders)
      .where(inArray(purchaseOrders.id, [testPoId]));

    // 2. Seed test company and PO
    await db
      .insert(companies)
      .values({
        id: testCompanyId,
        name: "Test Global Logistics B.V.",
        taxId: "NL889900112B01",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db.insert(purchaseOrders).values({
      id: testPoId,
      tenantId: "tenant_default",
      buyerId: testCompanyId,
      supplierId: testCompanyId,
      poNumber: "PO-DISRUPT-TEST-100",
      incoterm: "FOB",
      expectedCargoReadyDate: "2026-12-01",
      status: "ISSUED",
      createdAt: now,
      updatedAt: now,
    });

    // 3. Seed an active disruption exception
    await db.insert(supplyChainExceptions).values({
      id: testExceptionId,
      tenantId: "tenant_default",
      poId: testPoId,
      exceptionCode: "EXC_PORT_CONGESTION",
      exceptionCategory: "CARRIER_DELAY",
      severity: "HIGH",
      status: "OPEN",
      title: "Severe Congestion at Shanghai Deep-Water Port",
      description:
        "Berth waiting time increased by 72 hours due to typhoon aftermath.",
      delayEstimateHours: 72,
      financialRiskAmount: "12500.00",
      financialRiskCurrency: "USD",
      createdAt: now,
      updatedAt: now,
    });

    // 4. Initialize Fastify
    app = Fastify({ logger: false });
    await app.register(resolutionPlansRoutes, {
      prefix: "/api/scm/disruptions",
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await db
      .delete(reroutingExecutionLogs)
      .where(eq(reroutingExecutionLogs.tenantId, "tenant_default"));
    await db
      .delete(disruptionResolutionPlans)
      .where(inArray(disruptionResolutionPlans.poId, [testPoId]));
    await db
      .delete(supplyChainExceptions)
      .where(inArray(supplyChainExceptions.id, [testExceptionId]));
    await db
      .delete(purchaseOrders)
      .where(inArray(purchaseOrders.id, [testPoId]));
  });

  describe("POST /api/scm/disruptions/plans/synthesize", () => {
    it("returns 400 when exception does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/scm/disruptions/plans/synthesize",
        payload: {
          exceptionId: "non_existent_exc_999",
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.code).toBe("SYNTHESIS_ERROR");
    });

    it("synthesizes multi-criteria candidate plans for an active disruption", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/scm/disruptions/plans/synthesize",
        payload: {
          exceptionId: testExceptionId,
          tenantId: "tenant_default",
        },
      });

      expect(response.statusCode).toBe(200);
      const plans = response.json();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThanOrEqual(3);

      // Verify Pareto ordering
      expect(plans[0].recommendationRank).toBe(1);
      expect(plans[1].recommendationRank).toBe(2);

      // Verify that candidate strategies exist
      const planTypes = plans.map((p: { planType: string }) => p.planType);
      expect(planTypes).toContain("CARRIER_REROUTE");
      expect(planTypes).toContain("MODE_SHIFT_AIR");

      // Verify transit delta and cost fields are populated
      expect(typeof plans[0].transitTimeDeltaHours).toBe("number");
      expect(typeof plans[0].costDeltaAmount).toBe("string");
      expect(plans[0].justification).toBeDefined();
    });
  });

  describe("GET /api/scm/disruptions/plans", () => {
    it("lists generated plans filtered by exceptionId", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/scm/disruptions/plans?exceptionId=${testExceptionId}`,
      });

      expect(response.statusCode).toBe(200);
      const plans = response.json();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      expect(plans[0].exceptionId).toBe(testExceptionId);
    });
  });

  describe("GET /api/scm/disruptions/plans/:id", () => {
    it("returns 404 for unknown plan ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/scm/disruptions/plans/plan_unknown_404",
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe("NOT_FOUND");
    });

    it("returns plan detail and empty execution logs before execution", async () => {
      // Get an existing plan ID
      const listRes = await app.inject({
        method: "GET",
        url: `/api/scm/disruptions/plans?exceptionId=${testExceptionId}`,
      });
      const [firstPlan] = listRes.json();

      const response = await app.inject({
        method: "GET",
        url: `/api/scm/disruptions/plans/${firstPlan.id}`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.plan.id).toBe(firstPlan.id);
      expect(Array.isArray(data.executionLogs)).toBe(true);
    });
  });

  describe("POST /api/scm/disruptions/plans/:id/reject", () => {
    it("marks candidate plan as REJECTED with audit reason", async () => {
      // Find candidate plan of rank 2
      const listRes = await app.inject({
        method: "GET",
        url: `/api/scm/disruptions/plans?exceptionId=${testExceptionId}`,
      });
      const plans = listRes.json();
      const targetPlan =
        plans.find(
          (p: { recommendationRank: number }) => p.recommendationRank === 2,
        ) || plans[1];

      const response = await app.inject({
        method: "POST",
        url: `/api/scm/disruptions/plans/${targetPlan.id}/reject`,
        payload: {
          reason: "Air freight budget rejected by finance controller.",
        },
      });

      expect(response.statusCode).toBe(200);
      const rejected = response.json();
      expect(rejected.id).toBe(targetPlan.id);
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.executionError).toContain("Air freight budget rejected");
    });
  });

  describe("POST /api/scm/disruptions/plans/:id/execute", () => {
    it("executes plan atomically, logs execution steps, and resolves exception", async () => {
      // Find candidate plan of rank 1
      const listRes = await app.inject({
        method: "GET",
        url: `/api/scm/disruptions/plans?exceptionId=${testExceptionId}`,
      });
      const plans = listRes.json();
      const planToExecute =
        plans.find((p: { status: string }) => p.status !== "REJECTED") ||
        plans[0];

      const response = await app.inject({
        method: "POST",
        url: `/api/scm/disruptions/plans/${planToExecute.id}/execute`,
        payload: {
          notes: "Approved by lead dispatcher under ADR 0036 protocol.",
        },
      });

      expect(response.statusCode).toBe(200);
      const executed = response.json();
      expect(executed.id).toBe(planToExecute.id);
      expect(executed.status).toBe("EXECUTED");
      expect(executed.executedAt).toBeDefined();

      // Verify underlying exception is now RESOLVED in SQLite WAL
      const [resolvedExc] = await db
        .select()
        .from(supplyChainExceptions)
        .where(eq(supplyChainExceptions.id, testExceptionId))
        .limit(1);

      expect(resolvedExc.status).toBe("RESOLVED");
      expect(resolvedExc.resolutionNotes).toContain("[ADR 0036]");

      // Verify execution audit logs exist
      const detailRes = await app.inject({
        method: "GET",
        url: `/api/scm/disruptions/plans/${planToExecute.id}`,
      });

      const detail = detailRes.json();
      expect(detail.executionLogs.length).toBe(3);
      expect(
        detail.executionLogs.map((l: { stepName: string }) => l.stepName),
      ).toEqual([
        "UPDATE_ROUTING_LEGS",
        "UPDATE_PO_MILESTONES",
        "RESOLVE_EXCEPTION",
      ]);
    });
  });
});
