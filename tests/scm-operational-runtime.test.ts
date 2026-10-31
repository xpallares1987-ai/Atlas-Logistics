import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import {
  outboxBus,
  ensureScmFoundationTables,
} from "../src/scm/kernel/outbox-bus.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
} from "../src/db/schema/scm_foundation.js";
import { scmLogicalShipments } from "../src/db/schema/scm_entities_sqlite.js";
import {
  createOperationalShipment,
  createInitialRoutePlan,
  getOperationalAuditTrail,
} from "../src/scm/contexts/operational-core/operational-core.context.js";
import {
  createTask,
  addTaskDependency,
  completeTask,
} from "../src/scm/contexts/work-management/work-management.context.js";
import { DEFAULT_OPERATOR_ACTOR } from "../src/scm/kernel/primitives.js";

describe("SCM Logical Model v1 — Vertical Slice 3: Reliable Event Processing & Operational Runtime", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();
    await ensureScmFoundationTables();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("1. Consumer Idempotency (Inbox Pattern)", () => {
    it("guarantees an event is delivered to a consumer exactly once, dropping duplicates idempotently", async () => {
      let executionCount = 0;
      const testSubscriber = {
        eventType: "runtime.test.PingEvent.v1",
        consumerName: "runtime.TestPingConsumer",
        handler: async () => {
          executionCount += 1;
        },
      };

      const eventEnvelope = {
        eventId: `evt_idemp_${Date.now()}`,
        eventType: "runtime.test.PingEvent.v1",
        schemaVersion: 1,
        producerContext: "test_runtime",
        aggregateType: "TestPing",
        aggregateId: "ping_001",
        aggregateVersion: 1,
        correlationId: "corr_ping_1",
        causationId: "cmd_ping_1",
        actor: DEFAULT_OPERATOR_ACTOR,
        occurredAt: new Date().toISOString(),
        payload: { message: "ping" },
      };

      const firstAttempt = await outboxBus.deliverIdempotently(
        testSubscriber,
        eventEnvelope,
      );
      const secondAttempt = await outboxBus.deliverIdempotently(
        testSubscriber,
        eventEnvelope,
      );

      expect(firstAttempt).toBe(true);
      expect(secondAttempt).toBe(false);
      expect(executionCount).toBe(1);

      // Verify recorded in platform_gov_inbox_processed
      const inboxRows = await db
        .select()
        .from(scmInboxProcessedMessages)
        .where(
          eq(
            scmInboxProcessedMessages.id,
            `${testSubscriber.consumerName}:${eventEnvelope.eventId}`,
          ),
        );
      expect(inboxRows.length).toBe(1);
      expect(inboxRows[0].consumerName).toBe(testSubscriber.consumerName);
      expect(inboxRows[0].eventId).toBe(eventEnvelope.eventId);
    });
  });

  describe("2. Outbox Lifecycle & Retry / DLQ (Dead Letter Queue)", () => {
    it("tracks outbox status transitions from PENDING -> PROCESSING -> PROCESSED on successful delivery", async () => {
      const eventId = `evt_lifecycle_${Date.now()}`;
      let subscriberInvoked = false;

      outboxBus.subscribe(
        "runtime.test.LifecycleEvent.v1",
        "runtime.LifecycleConsumer",
        async () => {
          subscriberInvoked = true;
        },
      );

      await outboxBus.enqueueEvents([
        {
          eventId,
          eventType: "runtime.test.LifecycleEvent.v1",
          schemaVersion: 1,
          producerContext: "runtime_test",
          aggregateType: "Lifecycle",
          aggregateId: "lc_1",
          aggregateVersion: 1,
          correlationId: "corr_lc_1",
          causationId: "cmd_lc_1",
          actor: DEFAULT_OPERATOR_ACTOR,
          occurredAt: new Date().toISOString(),
          payload: { step: "lifecycle" },
        },
      ]);

      // Before relaying: PENDING
      const beforeRelay = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, eventId));
      expect(beforeRelay[0].status).toBe("PENDING");

      // Relay
      const relayResult = await outboxBus.relayPendingEvents();
      expect(relayResult.relayedEventsCount).toBeGreaterThanOrEqual(1);
      expect(subscriberInvoked).toBe(true);

      // After relay: PROCESSED
      const afterRelay = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, eventId));
      expect(afterRelay[0].status).toBe("PROCESSED");
      expect(afterRelay[0].publishedAt).toBeDefined();
    });

    it("retries failing consumers up to maxRetries, moves to FAILED (DLQ), and allows replay recovery", async () => {
      const failingEventId = `evt_failing_${Date.now()}`;
      let failureCount = 0;
      let shouldRecover = false;

      outboxBus.subscribe(
        "runtime.test.FaultEvent.v1",
        "runtime.FaultTolerantConsumer",
        async () => {
          if (!shouldRecover) {
            failureCount += 1;
            throw new Error(
              `Simulated transient network failure #${failureCount}`,
            );
          }
        },
      );

      await outboxBus.enqueueEvents([
        {
          eventId: failingEventId,
          eventType: "runtime.test.FaultEvent.v1",
          schemaVersion: 1,
          producerContext: "runtime_test",
          aggregateType: "FaultTest",
          aggregateId: "fault_1",
          aggregateVersion: 1,
          correlationId: "corr_fault_1",
          causationId: "cmd_fault_1",
          actor: DEFAULT_OPERATOR_ACTOR,
          occurredAt: new Date().toISOString(),
          payload: { code: "ERR_SIMULATED" },
        },
      ]);

      // Attempt 1: fails, increments retryCount to 1, stays in PENDING for retry
      await outboxBus.relayPendingEvents();
      let row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, failingEventId))
      )[0];
      expect(row.retryCount).toBe(1);
      expect(row.status).toBe("PENDING");
      expect(row.lastError).toContain("Simulated transient network failure #1");

      // Attempt 2: fails again, increments retryCount to 2
      await outboxBus.relayPendingEvents();
      row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, failingEventId))
      )[0];
      expect(row.retryCount).toBe(2);

      // Attempt 3: fails again, reaches maxRetries (3) -> transitions to FAILED (Dead Letter Queue)
      await outboxBus.relayPendingEvents();
      row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, failingEventId))
      )[0];
      expect(row.retryCount).toBe(3);
      expect(row.status).toBe("FAILED");

      // Verify visible in Dead Letter Queue (DLQ)
      const dlq = await outboxBus.getDeadLetterQueue();
      const inDlq = dlq.find((m) => m.eventId === failingEventId);
      expect(inDlq).toBeDefined();
      expect(inDlq?.retryCount).toBe(3);
      expect(inDlq?.lastError).toContain("Simulated transient network failure");

      // API DLQ endpoint check
      const resDlq = await app.inject({
        method: "GET",
        url: "/api/scm/v1/operational/outbox/dlq",
      });
      expect(resDlq.statusCode).toBe(200);
      expect(resDlq.json().dlqCount).toBeGreaterThanOrEqual(1);

      // Replay recovery: issue resolved, replaying resets to PENDING and succeeds
      shouldRecover = true;
      const resReplay = await app.inject({
        method: "POST",
        url: `/api/scm/v1/operational/outbox/dlq/${failingEventId}/replay`,
      });
      expect(resReplay.statusCode).toBe(200);
      expect(resReplay.json().replayed).toBe(true);

      const recoveredRow = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, failingEventId))
      )[0];
      expect(recoveredRow.status).toBe("PROCESSED");
    });
  });

  describe("3. Atomic Transaction Boundaries", () => {
    it("ensures Aggregate Mutation + Outbox Event commit atomically or roll back completely on failure", async () => {
      const rollbackRef = `SHP-ROLLBACK-${Date.now()}`;
      const failEventId = `evt_rollback_${Date.now()}`;

      // Simulate a transaction failure: aggregate inserts, but transaction throws before commit
      let caughtError = false;
      try {
        await db.transaction(async (tx) => {
          await tx.insert(scmLogicalShipments).values({
            shipmentId: `shp_rb_${Date.now()}`,
            shipmentReference: rollbackRef,
            serviceType: "AIR_PRIORITY",
            owningOrganizationId: "ORG-TEST",
            lifecycle: "CREATED",
            closureStatus: "OPEN",
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          });

          await outboxBus.enqueueEvents(
            [
              {
                eventId: failEventId,
                eventType: "test.RollbackEvent.v1",
                schemaVersion: 1,
                producerContext: "test",
                aggregateType: "Shipment",
                aggregateId: "shp_rb_test",
                aggregateVersion: 1,
                correlationId: "corr_rb",
                causationId: "cmd_rb",
                actor: DEFAULT_OPERATOR_ACTOR,
                occurredAt: new Date().toISOString(),
                payload: {},
              },
            ],
            tx,
          );

          // Force transaction rollback
          throw new Error(
            "Simulated unhandled database failure inside transaction",
          );
        });
      } catch (err: any) {
        if (err.message.includes("Simulated unhandled database failure")) {
          caughtError = true;
        }
      }

      expect(caughtError).toBe(true);

      // Verify clean rollback: NEITHER the shipment NOR the outbox message exists in SQLite
      const shpInDb = await db
        .select()
        .from(scmLogicalShipments)
        .where(eq(scmLogicalShipments.shipmentReference, rollbackRef));
      expect(shpInDb.length).toBe(0);

      const outboxInDb = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, failEventId));
      expect(outboxInDb.length).toBe(0);
    });
  });

  describe("4. Command Idempotency", () => {
    it("handles duplicate createOperationalShipment calls idempotently", async () => {
      const idempKey = `idemp_shp_${Date.now()}`;
      const ref = `SHP-IDEMP-${Date.now()}`;

      const res1 = await app.inject({
        method: "POST",
        url: "/api/scm/v1/operational/shipments",
        headers: { "x-idempotency-key": idempKey },
        payload: {
          shipmentReference: ref,
          serviceType: "ROAD_FTL",
          customerPartyId: "pty_idemp_cust",
        },
      });

      expect(res1.statusCode).toBe(201);
      const shp1 = res1.json();
      expect(shp1.shipmentReference).toBe(ref);

      // Repeat identical request with same idempotency key / reference
      const res2 = await app.inject({
        method: "POST",
        url: "/api/scm/v1/operational/shipments",
        headers: { "x-idempotency-key": idempKey },
        payload: {
          shipmentReference: ref,
          serviceType: "ROAD_FTL",
          customerPartyId: "pty_idemp_cust",
        },
      });

      expect(res2.statusCode).toBe(201);
      const shp2 = res2.json();
      expect(shp2.shipmentId).toBe(shp1.shipmentId);
      expect(shp2.shipmentReference).toBe(shp1.shipmentReference);

      // Confirm only 1 shipment record exists in SQLite
      const records = await db
        .select()
        .from(scmLogicalShipments)
        .where(eq(scmLogicalShipments.shipmentReference, ref));
      expect(records.length).toBe(1);
    });

    it("handles duplicate completeTask calls idempotently without re-triggering cascade or throwing errors", async () => {
      const task = await createTask({
        taskType: "GENERATE_CUSTOMS_WAYBILL",
        subjectType: "SHIPMENT",
        subjectId: "shp_idemp_task_1",
      });

      const firstCompletion = await completeTask(task.taskId, {
        waybillNo: "WB-12345",
      });
      expect(firstCompletion.status).toBe("COMPLETED");

      // Second completion with same or new payload returns current completed state gracefully
      const secondCompletion = await completeTask(task.taskId, {
        waybillNo: "WB-12345",
      });
      expect(secondCompletion.status).toBe("COMPLETED");
      expect(secondCompletion.taskId).toBe(task.taskId);
    });
  });

  describe("5. End-to-End Operational Audit Trail", () => {
    it("reconstructs the complete causality chain: Shipment Created -> Route Planned -> Milestones Generated -> Tasks Generated -> Task Completed -> Successor Unblocked", async () => {
      const shipmentRef = `SHP-AUDIT-${Date.now()}`;

      // Step 1: Create Shipment
      const shipment = await createOperationalShipment({
        shipmentReference: shipmentRef,
        serviceType: "OCEAN_FCL",
        customerPartyId: "pty_audit_test",
      });

      // Step 2: Publish Route Plan (triggers MilestonePlan + Tasks generation via Outbox)
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
            plannedDeparture: "2026-11-10T10:00:00Z",
            plannedArrival: "2026-11-22T16:00:00Z",
          },
        ],
      });

      // Query audit trail via API after planning
      let resAudit = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/audit-trail`,
      });
      expect(resAudit.statusCode).toBe(200);
      let auditSteps = resAudit.json();

      expect(auditSteps.length).toBeGreaterThanOrEqual(4);
      const initialStages = auditSteps.map((s: any) => s.stage);
      expect(initialStages).toContain("SHIPMENT_CREATED");
      expect(initialStages).toContain("ROUTE_PLANNED");
      expect(initialStages).toContain("MILESTONES_GENERATED");
      expect(initialStages).toContain("TASKS_GENERATED");

      // Step 3: Complete first task (CONFIRM_CARRIER_BOOKING) to trigger Successor Unblocking
      const taskPipeline = auditSteps.find(
        (s: any) => s.stage === "TASKS_GENERATED",
      );
      const firstTaskId = taskPipeline.details.taskIds[0];

      await completeTask(firstTaskId, { bookingConfirmation: "MAEU-992211" });

      // Step 4: Re-query audit trail to verify Task Completed and Task Unblocked events
      resAudit = await app.inject({
        method: "GET",
        url: `/api/scm/v1/operational/shipments/${shipment.shipmentId}/audit-trail`,
      });
      auditSteps = resAudit.json();

      const stages = auditSteps.map((s: any) => s.stage);
      expect(stages).toContain("SHIPMENT_CREATED");
      expect(stages).toContain("ROUTE_PLANNED");
      expect(stages).toContain("MILESTONES_GENERATED");
      expect(stages).toContain("TASKS_GENERATED");
      expect(stages).toContain("TASK_COMPLETED");
      expect(stages).toContain("TASK_UNBLOCKED");

      // Verify that every step is sequential and carries proper correlation/causation metadata
      for (let i = 0; i < auditSteps.length; i++) {
        expect(auditSteps[i].stepIndex).toBe(i + 1);
        expect(auditSteps[i].eventId).toBeDefined();
        expect(auditSteps[i].causationId).toBeDefined();
        expect(auditSteps[i].description).toBeDefined();
      }
    });
  });
});
