import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { ensureOperationalBffTables } from "../src/scm/kernel/operational-bff-tables.js";
import {
  getShipment360View,
  listShipment360Views,
  listOperationsCockpitItems,
  getCockpitSummary,
  executeCockpitWorkItem,
} from "../src/scm/contexts/operational-intelligence/operations-cockpit-bff.context.js";
import {
  createOperationalShipment,
  createInitialRoutePlan,
} from "../src/scm/contexts/operational-core/operational-core.context.js";
import { outboxBus } from "../src/scm/kernel/outbox-bus.js";

describe("SCM Operational Intelligence BFF — Shipment 360 & Operations Cockpit (CQRS)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();
    await ensureOperationalBffTables();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Shipment 360 Projected Read Model", () => {
    it("projects complete unified shipment 360 view with routing, milestones, workflow instance, and task DAG", async () => {
      const ref = `SHP-BFF-360-${Date.now()}`;

      // 1. Create shipment
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_360",
      });

      // 2. Plan Route (triggers RoutePlanned.v2 -> Milestones -> Workflow instantiation)
      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "ESBCN", stopType: "PORT" },
          { sequence: 2, locationId: "USNYC", stopType: "PORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "ESBCN",
            destinationLocationId: "USNYC",
            transportMode: "OCEAN",
            plannedDeparture: "2026-11-20T08:00:00Z",
            plannedArrival: "2026-12-02T18:00:00Z",
          },
        ],
      });

      // 3. Query via BFF API
      const res = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/360`,
      });

      expect(res.statusCode).toBe(200);
      const view = res.json();

      // Check header and identity
      expect(view.shipmentId).toBe(shipment.shipmentId);
      expect(view.shipmentReference).toBe(ref);
      expect(view.serviceType).toBe("OCEAN_FCL");
      expect(view.lifecycle).toBe("PLANNED");

      // Check backward-compatibility properties
      expect(view.shipment).toBeDefined();
      expect(view.routePlan).toBeDefined();
      expect(view.routePlan.stops.length).toBe(2);
      expect(view.milestonePlan).toBeDefined();
      expect(view.milestonePlan.milestones.length).toBe(5);

      // Check Workflow Engine integration
      expect(view.workflow).toBeDefined();
      expect(view.workflow.definitionCode).toBe("OCEAN_EXPORT_STANDARD");
      expect(view.workflow.versionNumber).toBe(1);
      expect(view.workflow.status).toBe("RUNNING");
      expect(view.workflow.progressPercentage).toBe(0);

      // Check Task DAG & Action Metadata
      expect(view.tasks.length).toBe(3);
      const taskA = view.tasks.find(
        (t: any) => t.taskType === "CONFIRM_CARRIER_BOOKING",
      );
      expect(taskA).toBeDefined();
      expect(taskA.status).toBe("OPEN");
      expect(taskA.isBlocked).toBe(false);
      expect(taskA.primaryAction).toBeDefined();
      expect(taskA.primaryAction.actionLabel).toBe("Confirm Carrier Booking");
      expect(taskA.primaryAction.inputFields[0].name).toBe("bookingRef");

      // Check Health & Metrics
      expect(view.health).toBeDefined();
      expect(view.health.status).toBeDefined();
      expect(view.metrics.totalTasks).toBe(3);
      expect(view.metrics.openTasks).toBe(1);
      expect(view.metrics.blockedTasks).toBe(2);
      expect(view.metrics.completedTasks).toBe(0);
    });
  });

  describe("2. Operations Cockpit / My Work Prioritized Queue", () => {
    it("returns prioritized, actionable work items with attention scores, urgency buckets, and primary actions", async () => {
      const ref = `SHP-COCKPIT-${Date.now()}`;

      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_cockpit",
      });

      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "ESVLC", stopType: "PORT" },
          { sequence: 2, locationId: "USMIA", stopType: "PORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "ESVLC",
            destinationLocationId: "USMIA",
            transportMode: "OCEAN",
            plannedDeparture: "2026-11-20T08:00:00Z",
            plannedArrival: "2026-12-05T12:00:00Z",
          },
        ],
      });

      // Fetch open cockpit items via API
      const res = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/cockpit?shipmentId=${shipment.shipmentId}&status=OPEN`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.total).toBeGreaterThanOrEqual(1);

      // First actionable item should be CONFIRM_CARRIER_BOOKING
      const firstItem = body.items.find(
        (i: any) => i.taskTypeCode === "CONFIRM_CARRIER_BOOKING",
      );
      expect(firstItem).toBeDefined();
      expect(firstItem.status).toBe("OPEN");
      expect(firstItem.isBlocked).toBe(false);
      expect(firstItem.attentionScore).toBeGreaterThanOrEqual(50);
      expect(firstItem.primaryAction.command).toBe("COMPLETE_TASK");
      expect(firstItem.primaryAction.actionLabel).toBe(
        "Confirm Carrier Booking",
      );

      // Test alias /operational/my-work
      const resMyWork = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/my-work?shipmentId=${shipment.shipmentId}&status=OPEN`,
      });
      expect(resMyWork.statusCode).toBe(200);
      expect(resMyWork.json().total).toBe(body.total);
    });

    it("supports querying blocked work items and identifying predecessor blockers", async () => {
      const ref = `SHP-BLOCKED-${Date.now()}`;

      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_blocked",
      });

      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "ESBCN", stopType: "PORT" },
          { sequence: 2, locationId: "USNYC", stopType: "PORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "ESBCN",
            destinationLocationId: "USNYC",
            transportMode: "OCEAN",
            plannedDeparture: "2026-11-20T08:00:00Z",
            plannedArrival: "2026-12-05T12:00:00Z",
          },
        ],
      });

      const resBlocked = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/cockpit?shipmentId=${shipment.shipmentId}&status=BLOCKED`,
      });

      expect(resBlocked.statusCode).toBe(200);
      const blockedBody = resBlocked.json();
      expect(blockedBody.total).toBe(2); // VGM and BL tasks are blocked

      const vgmTask = blockedBody.items.find(
        (i: any) => i.taskTypeCode === "VERIFY_VGM_CUTOFF",
      );
      expect(vgmTask).toBeDefined();
      expect(vgmTask.isBlocked).toBe(true);
      expect(vgmTask.urgencyBucket).toBe("BLOCKED");
      expect(vgmTask.blockedByTasks.length).toBeGreaterThan(0);
    });
  });

  describe("3. In-situ Cockpit Execution & Reactive Unblocking", () => {
    it("executes work item in-situ, cascades unblocking, updates 360 projection, and returns newly unlocked work items", async () => {
      const ref = `SHP-INSITU-${Date.now()}`;

      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_blocked",
      });

      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "ESBCN", stopType: "PORT" },
          { sequence: 2, locationId: "SGSIN", stopType: "PORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "ESBCN",
            destinationLocationId: "SGSIN",
            transportMode: "OCEAN",
            plannedDeparture: "2026-11-20T08:00:00Z",
            plannedArrival: "2026-12-05T12:00:00Z",
          },
        ],
      });

      // Find the first actionable task
      const cockpitRes = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/cockpit?shipmentId=${shipment.shipmentId}&status=OPEN`,
      });
      const taskA = cockpitRes
        .json()
        .items.find((i: any) => i.taskTypeCode === "CONFIRM_CARRIER_BOOKING");
      expect(taskA).toBeDefined();

      // Execute task A in-situ via POST /operational/cockpit/:workItemId/execute
      const resExec = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/cockpit/${taskA.workItemId}/execute`,
        payload: {
          result: { bookingRef: "BK-INSITU-001" },
        },
      });

      expect(resExec.statusCode).toBe(200);
      const execResult = resExec.json();

      expect(execResult.success).toBe(true);
      expect(execResult.executedWorkItemId).toBe(taskA.workItemId);
      expect(execResult.completedTask.status).toBe("COMPLETED");

      // Verify that Task B (VERIFY_VGM_CUTOFF) is reported as newly unlocked
      expect(execResult.unlockedWorkItems.length).toBeGreaterThan(0);
      const unlockedVgm = execResult.unlockedWorkItems.find(
        (i: any) => i.taskTypeCode === "VERIFY_VGM_CUTOFF",
      );
      expect(unlockedVgm).toBeDefined();
      expect(unlockedVgm.status).toBe("OPEN");
      expect(unlockedVgm.isBlocked).toBe(false);

      // Verify updated shipment 360 returned in response
      expect(execResult.shipment360).toBeDefined();
      expect(execResult.shipment360.workflow.progressPercentage).toBe(33);
      expect(execResult.shipment360.metrics.completedTasks).toBe(1);
      expect(execResult.shipment360.metrics.openTasks).toBe(1);
    });
  });

  describe("4. Cockpit Summary Metrics & Shipments 360 List", () => {
    it("serves real-time KPI metrics for dashboard cards", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/scm/v1/operational/cockpit/summary",
      });

      expect(res.statusCode).toBe(200);
      const summary = res.json();

      expect(typeof summary.totalTasks).toBe("number");
      expect(typeof summary.openActionableCount).toBe("number");
      expect(typeof summary.blockedCount).toBe("number");
      expect(typeof summary.completedCount).toBe("number");
      expect(typeof summary.activeWorkflowsCount).toBe("number");
      expect(typeof summary.completedWorkflowsCount).toBe("number");
    });

    it("serves fast, filtered list of all shipments with 360 projections", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/scm/v1/operational/shipments-360?serviceType=OCEAN_FCL",
      });

      expect(res.statusCode).toBe(200);
      const list = res.json();

      expect(list.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(list.items)).toBe(true);

      const first = list.items[0];
      expect(first.shipmentId).toBeDefined();
      expect(first.shipmentReference).toBeDefined();
      expect(first.serviceType).toBe("OCEAN_FCL");
      expect(first.health).toBeDefined();
      expect(first.metrics).toBeDefined();
    });
  });
});
