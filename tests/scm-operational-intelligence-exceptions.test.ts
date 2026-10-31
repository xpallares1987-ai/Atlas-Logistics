import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { ensureOperationalBffTables } from "../src/scm/kernel/operational-bff-tables.js";
import {
  getShipment360View,
  computeAttentionScoreAndUrgency,
  getShipmentOperationalTimeline,
  getProjectionsHealth,
  rebuildAllOperationalProjections,
} from "../src/scm/contexts/operational-intelligence/operations-cockpit-bff.context.js";
import {
  raiseOperationalException,
  assignOperationalException,
  resolveOperationalException,
  getOperationalExceptionById,
  listOperationalExceptionsForShipment,
} from "../src/scm/contexts/operational-intelligence/operational-exceptions.context.js";
import {
  createOperationalShipment,
  createInitialRoutePlan,
} from "../src/scm/contexts/operational-core/operational-core.context.js";
import { outboxBus } from "../src/scm/kernel/outbox-bus.js";

describe("SCM Operational Intelligence — Exceptions, Signals, Explainability & Timeline", () => {
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

  describe("1. Operational Exception Lifecycle & Transactional Outbox", () => {
    it("raises, assigns, and resolves an operational exception with transactional outbox events", async () => {
      const ref = `SHP-EXC-LIFECYCLE-${Date.now()}`;
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_exc_1",
      });

      // 1. Raise Exception via REST API
      const raiseRes = await app.inject({
        method: "POST",
        url: "/api/scm/v1/operational/exceptions",
        payload: {
          shipmentId: shipment.shipmentId,
          category: "CUSTOMS_HOLD",
          severity: "CRITICAL",
          isBlocking: true,
          title: "Customs Physical Inspection Required",
          description:
            "Port Authority placed container on hold for physical DUA inspection",
          assignedTeam: "CUSTOMS_BROKERAGE",
        },
      });

      expect(raiseRes.statusCode).toBe(201);
      const exc = raiseRes.json();
      expect(exc.exceptionId).toMatch(/^exc_/);
      expect(exc.shipmentId).toBe(shipment.shipmentId);
      expect(exc.category).toBe("CUSTOMS_HOLD");
      expect(exc.severity).toBe("CRITICAL");
      expect(exc.status).toBe("OPEN");
      expect(exc.isBlocking).toBe(true);

      // 2. Assign Exception via REST API
      const assignRes = await app.inject({
        method: "PUT",
        url: `/api/scm/v1/operational/exceptions/${exc.exceptionId}/assign`,
        payload: {
          assignedToUserId: "usr_customs_lead_42",
          assignedTeam: "CUSTOMS_RAPID_RESPONSE",
        },
      });

      expect(assignRes.statusCode).toBe(200);
      const assigned = assignRes.json();
      expect(assigned.status).toBe("IN_REVIEW");
      expect(assigned.assignedToUserId).toBe("usr_customs_lead_42");
      expect(assigned.assignedTeam).toBe("CUSTOMS_RAPID_RESPONSE");

      // 3. Resolve Exception via REST API
      const resolveRes = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/exceptions/${exc.exceptionId}/resolve`,
        payload: {
          resolutionNotes:
            "Physical inspection complete. Release code received from Customs.",
          resolutionStatus: "RESOLVED",
        },
      });

      expect(resolveRes.statusCode).toBe(200);
      const resolved = resolveRes.json();
      expect(resolved.status).toBe("RESOLVED");
      expect(resolved.resolutionNotes).toContain("Release code received");
      expect(resolved.resolvedAt).toBeDefined();

      // Invariant: Cannot resolve already closed exception
      const invalidRes = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/exceptions/${exc.exceptionId}/resolve`,
        payload: { resolutionNotes: "Attempting duplicate resolution" },
      });
      expect(invalidRes.statusCode).toBe(422);
    });
  });

  describe("2. Shipment 360 Impact, Operational Signals & Explainability", () => {
    it("degrades health to CRITICAL, injects explainable blockers & recommended actions upon blocking exception", async () => {
      const ref = `SHP-EXC-360-${Date.now()}`;
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "AIR_EXPEDITE",
        customerPartyId: "pty_cust_signals",
      });

      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "ESMAD", stopType: "AIRPORT" },
          { sequence: 2, locationId: "FRCDG", stopType: "AIRPORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "ESMAD",
            destinationLocationId: "FRCDG",
            transportMode: "AIR",
            plannedDeparture: "2026-11-25T10:00:00Z",
            plannedArrival: "2026-11-25T13:30:00Z",
          },
        ],
      });

      // Initially verify healthy baseline before exceptions
      const initial360 = await getShipment360View(shipment.shipmentId);
      expect(["ON_TRACK", "AT_RISK"]).toContain(initial360.health.status);
      expect(initial360.health.score).toBeGreaterThanOrEqual(70);

      // Raise a CRITICAL blocking exception
      const exc = await raiseOperationalException({
        shipmentId: shipment.shipmentId,
        category: "CARRIER_ROLL",
        severity: "CRITICAL",
        isBlocking: true,
        title: "Flight Cancelled - Air Cargo Rolled to Next Available Leg",
        description:
          "Scheduled flight MAD-CDG grounded due to severe weather. Space rolled to next day.",
      });

      // Relay outbox to ensure CQRS projections react
      await outboxBus.relayPendingEvents();

      // Query Shipment 360 via API
      const res360 = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/360`,
      });
      expect(res360.statusCode).toBe(200);
      const view = res360.json();

      // 1. Health degradation
      expect(view.health.status).toBe("CRITICAL");
      expect(view.health.score).toBeLessThanOrEqual(60);
      expect(
        view.health.blockers.some((b: string) => b.includes("CARRIER_ROLL")),
      ).toBe(true);

      // 2. Operational Signals
      expect(view.signals.length).toBeGreaterThan(0);
      const rollSignal = view.signals.find(
        (s: any) =>
          s.signalType === "BLOCKING_EXCEPTION" && s.severity === "CRITICAL",
      );
      expect(rollSignal).toBeDefined();
      expect(rollSignal.title).toContain("Air Cargo Rolled");

      // 3. Transparent Explainability
      expect(view.explainability.isBlocked).toBe(true);
      expect(view.explainability.recommendedAction).toBeDefined();
      expect(view.explainability.recommendedAction.actionType).toBe(
        "RESOLVE_EXCEPTION",
      );
      expect(view.explainability.recommendedAction.targetId).toBe(
        exc.exceptionId,
      );
      expect(view.explainability.recommendedAction.isBlocking).toBe(true);

      // 4. Attention Score Breakdown (no black-box scoring)
      expect(view.explainability.attentionScoreBreakdown).toBeDefined();
      expect(
        view.explainability.attentionScoreBreakdown.length,
      ).toBeGreaterThan(0);
      const excFactor = view.explainability.attentionScoreBreakdown.find(
        (f: any) => f.factor === "ACTIVE_BLOCKING_EXCEPTIONS",
      );
      expect(excFactor).toBeDefined();
      expect(excFactor.points).toBeGreaterThan(0);
    });
  });

  describe("3. Operations Cockpit Queue & In-Situ Exception Resolution", () => {
    it("displays exceptions in the prioritized queue and resolves them in-situ, restoring shipment health", async () => {
      const ref = `SHP-COCKPIT-EXC-${Date.now()}`;
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_cockpit_exc",
      });

      // Raise a MAJOR blocking exception
      const exc = await raiseOperationalException({
        shipmentId: shipment.shipmentId,
        category: "DOCUMENTATION_ERROR",
        severity: "MAJOR",
        isBlocking: true,
        title: "Commercial Invoice Discrepancy",
        description:
          "Invoice amount does not match packing list declared units.",
      });

      await outboxBus.relayPendingEvents();

      // Query Cockpit / My Work items
      const cockpitRes = await app.inject({
        method: "GET",
        url: "/api/scm/v1/operational/cockpit",
      });
      expect(cockpitRes.statusCode).toBe(200);
      const cockpit = cockpitRes.json();

      const excWorkItem = cockpit.items.find(
        (i: any) => i.workItemId === exc.exceptionId,
      );
      expect(excWorkItem).toBeDefined();
      expect(excWorkItem.itemType).toBe("EXCEPTION");
      expect(excWorkItem.urgencyBucket).toBe("IMMEDIATE_ACTION");
      expect(excWorkItem.attentionScore).toBeGreaterThanOrEqual(80);
      expect(excWorkItem.primaryAction.command).toBe("RESOLVE_EXCEPTION");

      // Execute in-situ resolution via Cockpit endpoint
      const execRes = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/cockpit/${exc.exceptionId}/execute`,
        payload: {
          notes:
            "Corrected commercial invoice re-uploaded and matched with packing list.",
          resolutionStatus: "RESOLVED",
        },
      });

      expect(execRes.statusCode).toBe(200);
      const execData = execRes.json();
      expect(execData.success).toBe(true);
      expect(execData.executedWorkItemId).toBe(exc.exceptionId);
      expect(execData.resolvedException).toBeDefined();
      expect(execData.resolvedException.status).toBe("RESOLVED");

      // Shipment 360 projection in response reflects recovered health
      expect(execData.shipment360.health.status).toBe("ON_TRACK");
      expect(execData.shipment360.health.score).toBe(100);
    });
  });

  describe("4. Transparent Attention Score Explainability", () => {
    it("provides explicit score breakdown factors and human-readable explanations", () => {
      // 1. Critical open task on air freight
      const criticalTask = computeAttentionScoreAndUrgency(
        {
          itemType: "TASK",
          status: "OPEN",
          isBlocked: false,
          priority: "CRITICAL",
          hasBlockingException: true,
        },
        "AIR_EXPEDITE",
      );

      expect(criticalTask.attentionScore).toBeGreaterThanOrEqual(85);
      expect(criticalTask.urgencyBucket).toBe("IMMEDIATE_ACTION");
      expect(criticalTask.scoreBreakdown.length).toBeGreaterThanOrEqual(4);
      expect(
        criticalTask.scoreBreakdown.some(
          (b) => b.factor === "PRIORITY_CRITICAL",
        ),
      ).toBe(true);
      expect(
        criticalTask.scoreBreakdown.some(
          (b) => b.factor === "SERVICE_AIR_EXPEDITE",
        ),
      ).toBe(true);
      expect(
        criticalTask.scoreBreakdown.some(
          (b) => b.factor === "BLOCKING_EXCEPTION_IMPACT",
        ),
      ).toBe(true);

      // 2. Blocked task
      const blockedTask = computeAttentionScoreAndUrgency(
        {
          itemType: "TASK",
          status: "BLOCKED",
          isBlocked: true,
          priority: "HIGH",
        },
        "OCEAN_FCL",
      );
      expect(blockedTask.urgencyBucket).toBe("BLOCKED");
      expect(blockedTask.attentionScore).toBe(15);
      expect(blockedTask.scoreBreakdown[0].factor).toBe("BLOCKED_PREREQUISITE");

      // 3. Completed item
      const completedTask = computeAttentionScoreAndUrgency(
        {
          itemType: "TASK",
          status: "COMPLETED",
          isBlocked: false,
          priority: "CRITICAL",
        },
        "OCEAN_FCL",
      );
      expect(completedTask.attentionScore).toBe(0);
      expect(completedTask.urgencyBucket).toBe("UPCOMING");
      expect(completedTask.scoreBreakdown[0].factor).toBe("ITEM_COMPLETED");
    });
  });

  describe("5. Shipment 360 Operational Timeline (Chronological Audit)", () => {
    it("synthesizes complete chronological event-sourcing timeline across outbox, exceptions, and workflow", async () => {
      const ref = `SHP-TIMELINE-${Date.now()}`;
      const shipment = await createOperationalShipment({
        shipmentReference: ref,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_cust_timeline",
      });

      await createInitialRoutePlan({
        shipmentId: shipment.shipmentId,
        stops: [
          { sequence: 1, locationId: "ESVAL", stopType: "PORT" },
          { sequence: 2, locationId: "USMIA", stopType: "PORT" },
        ],
        legs: [
          {
            sequence: 1,
            originLocationId: "ESVAL",
            destinationLocationId: "USMIA",
            transportMode: "OCEAN",
            plannedDeparture: "2026-11-28T06:00:00Z",
            plannedArrival: "2026-12-10T14:00:00Z",
          },
        ],
      });

      const exc = await raiseOperationalException({
        shipmentId: shipment.shipmentId,
        category: "WEATHER_DELAY",
        severity: "MINOR",
        isBlocking: false,
        title: "Atlantic Gale Warning",
        description:
          "Vessel altering route by 20 nautical miles south to avoid storm system.",
      });

      await resolveOperationalException(exc.exceptionId, {
        resolutionNotes:
          "Storm system bypassed safely; ETA revised by 3 hours.",
      });

      await outboxBus.relayPendingEvents();

      // Query timeline endpoint via API
      const res = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/timeline`,
      });

      expect(res.statusCode).toBe(200);
      const timeline = res.json();
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThanOrEqual(4);

      // Verify chronological ordering
      for (let i = 1; i < timeline.length; i++) {
        const prev = new Date(timeline[i - 1].timestamp).getTime();
        const curr = new Date(timeline[i].timestamp).getTime();
        expect(curr).toBeGreaterThanOrEqual(prev);
      }

      // Check key events present
      expect(
        timeline.some((e: any) => e.eventType.includes("ShipmentCreated")),
      ).toBe(true);
      expect(
        timeline.some((e: any) => e.eventType.includes("RoutePlanned")),
      ).toBe(true);
      expect(
        timeline.some((e: any) =>
          e.eventType.includes("OperationalExceptionRaised"),
        ),
      ).toBe(true);
      expect(
        timeline.some((e: any) =>
          e.eventType.includes("OperationalExceptionResolved"),
        ),
      ).toBe(true);
    });
  });

  describe("6. Projection Health Report & Authoritative Rebuild", () => {
    it("returns real-time projection health and performs authoritative full rebuild", async () => {
      // 1. Health Endpoint
      const healthRes = await app.inject({
        method: "GET",
        url: "/api/scm/v1/operational/projections/health",
      });

      expect(healthRes.statusCode).toBe(200);
      const health = healthRes.json();
      expect(health.status).toBeDefined();
      expect(["HEALTHY", "DEGRADED", "OUT_OF_SYNC"]).toContain(health.status);
      expect(health.outboxMetrics).toBeDefined();
      expect(health.outboxMetrics.pendingCount).toBeGreaterThanOrEqual(0);
      expect(health.projectionMetrics).toBeDefined();
      expect(health.projectionMetrics.shipment360Count).toBeGreaterThan(0);
      expect(health.projectorLagMs).toBeGreaterThanOrEqual(0);

      // 2. Full Rebuild Endpoint
      const rebuildRes = await app.inject({
        method: "POST",
        url: "/api/scm/v1/operational/projections/rebuild",
      });

      expect(rebuildRes.statusCode).toBe(200);
      const rebuildData = rebuildRes.json();
      expect(rebuildData.success).toBe(true);
      expect(rebuildData.shipmentsRebuiltCount).toBeGreaterThan(0);
      expect(rebuildData.durationMs).toBeGreaterThanOrEqual(0);
    }, 15000);
  });
});
