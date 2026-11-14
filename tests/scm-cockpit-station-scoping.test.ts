/**
 * @file scm-cockpit-station-scoping.test.ts
 * @description Integration tests for SCM Cockpit Station Scoping, Hybrid Attribution & 403 Cross-Station Execution Guard.
 * @module @atlas/tests/scm-cockpit-station-scoping
 * @see {@link docs/adr/0022-enterprise-freight-forwarding-organization-schema-and-governance.md}
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify, { FastifyInstance } from "fastify";

let testUserId = "operator_bcn_test";
let testUserRole = "OPERATOR";
const testUserCompanyId: string | null = "c-1";

// Mock auth middleware per AGENTS.md rule 3
vi.mock("../src/middleware/auth.js", () => ({
  authMiddleware: vi.fn(async (request) => {
    (request as any).user = {
      id: testUserId,
      role: testUserRole,
      companyId: testUserCompanyId,
      email: "operator.bcn@atlaslogistics.com",
    };
  }),
  requireRole: vi.fn(() => async () => {}),
}));

import { authMiddleware } from "../src/middleware/auth.js";
import { stationContextHook } from "../src/middleware/station-context.js";
import { scmV1Routes } from "../src/routes/scm-v1.routes.js";
import { db } from "../src/db/index.js";
import {
  branchOffices,
  userStationAssignments,
  users,
} from "../src/db/schema/index.js";
import { scmOperationalCockpitWorkItemsV2 } from "../src/db/schema/scm_operational_bff_sqlite.js";
import { eq } from "drizzle-orm";

describe("SCM Operational Cockpit - Station Scoping & Cross-Station Execution Guard", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    app.addHook("onRequest", authMiddleware);
    app.addHook("onRequest", stationContextHook);
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();

    // Ensure sample test work items exist in BCN and MAD
    const now = new Date();

    const sampleBcnItem = {
      workItemId: "test_task_bcn_001",
      taskId: "test_task_bcn_001",
      shipmentId: "shp_test_bcn_01",
      shipmentReference: "BK-2026-BCN01",
      serviceType: "FCL",
      taskTypeCode: "EXPORT_CUSTOMS",
      title: "File Export DUA Barcelona",
      description: "Submit export declaration to Barcelona customs",
      priority: "HIGH",
      status: "OPEN",
      isBlocked: 0,
      urgencyBucket: "IMMEDIATE_ACTION",
      attentionScore: 90,
      branchId: "stn_esbcn_01",
      stationCode: "BCN-OCEAN",
      departmentId: "CUSTOMS",
      primaryAction: {
        command: "COMPLETE_TASK",
        actionLabel: "Submit Declaration",
        inputFields: [],
      },
      updatedAt: now.toISOString(),
    };

    const sampleMadItem = {
      workItemId: "test_task_mad_001",
      taskId: "test_task_mad_001",
      shipmentId: "shp_test_mad_01",
      shipmentReference: "BK-2026-MAD01",
      serviceType: "AIR_STD",
      taskTypeCode: "MAWB_ISSUANCE",
      title: "Issue MAWB Madrid Barajas",
      description: "Issue master air waybill for MAD departure",
      priority: "MEDIUM",
      status: "OPEN",
      isBlocked: 0,
      urgencyBucket: "DUE_TODAY",
      attentionScore: 70,
      branchId: "stn_esmad_01",
      stationCode: "MAD-AIR",
      departmentId: "AIR_OPS",
      primaryAction: {
        command: "COMPLETE_TASK",
        actionLabel: "Issue AWB",
        inputFields: [],
      },
      updatedAt: now.toISOString(),
    };

    await db
      .insert(scmOperationalCockpitWorkItemsV2)
      .values([
        {
          workItemId: "test_task_bcn_001",
          taskId: "test_task_bcn_001",
          shipmentId: "shp_test_bcn_01",
          shipmentReference: "BK-2026-BCN01",
          serviceType: "FCL",
          taskTypeCode: "EXPORT_CUSTOMS",
          title: "File Export DUA Barcelona",
          priority: "HIGH",
          status: "OPEN",
          isBlocked: 0,
          urgencyBucket: "IMMEDIATE_ACTION",
          attentionScore: 90,
          itemJson: JSON.stringify(sampleBcnItem),
          updatedAt: now,
        },
        {
          workItemId: "test_task_mad_001",
          taskId: "test_task_mad_001",
          shipmentId: "shp_test_mad_01",
          shipmentReference: "BK-2026-MAD01",
          serviceType: "AIR_STD",
          taskTypeCode: "MAWB_ISSUANCE",
          title: "Issue MAWB Madrid Barajas",
          priority: "MEDIUM",
          status: "OPEN",
          isBlocked: 0,
          urgencyBucket: "DUE_TODAY",
          attentionScore: 70,
          itemJson: JSON.stringify(sampleMadItem),
          updatedAt: now,
        },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    // Clean up test items
    try {
      await db
        .delete(scmOperationalCockpitWorkItemsV2)
        .where(
          eq(scmOperationalCockpitWorkItemsV2.workItemId, "test_task_bcn_001"),
        );
      await db
        .delete(scmOperationalCockpitWorkItemsV2)
        .where(
          eq(scmOperationalCockpitWorkItemsV2.workItemId, "test_task_mad_001"),
        );
    } catch {}
    await app.close();
  });

  it("filters cockpit items by X-Station-Context header (BCN-OCEAN)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/scm/v1/operational/cockpit",
      headers: {
        "x-station-context": "BCN-OCEAN",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeDefined();

    // All returned items must belong to BCN
    for (const item of body.items) {
      if (item.branchId) {
        expect(
          item.branchId === "stn_esbcn_01" || item.stationCode === "BCN-OCEAN",
        ).toBe(true);
      }
    }
  });

  it("filters cockpit summary metrics by active station context", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/scm/v1/operational/cockpit/summary",
      headers: {
        "x-station-context": "BCN-OCEAN",
      },
    });

    expect(res.statusCode).toBe(200);
    const summary = JSON.parse(res.payload);
    expect(summary.totalTasks).toBeGreaterThanOrEqual(1);
    expect(summary.openActionableCount).toBeGreaterThanOrEqual(1);
  });

  it("blocks unauthorized cross-station execution with 403 Forbidden", async () => {
    // Current user is an OPERATOR not assigned to stn_esmad_01
    testUserRole = "OPERATOR";
    testUserId = "unassigned_bcn_operator";

    const res = await app.inject({
      method: "POST",
      url: "/api/scm/v1/operational/cockpit/test_task_mad_001/execute",
      headers: {
        authorization: "Bearer dummy-token",
      },
      payload: {},
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error).toBe("UNAUTHORIZED_CROSS_STATION_EXECUTION");
  });

  it("allows SYSTEM_ADMIN to execute across any station", async () => {
    testUserRole = "SYSTEM_ADMIN";

    const res = await app.inject({
      method: "POST",
      url: "/api/scm/v1/operational/cockpit/test_task_bcn_001/execute",
      headers: {
        authorization: "Bearer dummy-token",
      },
      payload: {},
    });

    // Should not be blocked by cross-station check (might be 200 or business error, but not 403 cross station)
    expect(res.statusCode).not.toBe(403);
  });
});
