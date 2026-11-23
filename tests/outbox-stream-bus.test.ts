/**
 * @file outbox-stream-bus.test.ts
 * @description Unit and integration tests for OutboxStreamBus and Idempotent Consumer (T-65 / ADR 0040).
 * @module @atlas/tests/outbox-stream-bus
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { OutboxStreamBus } from "../src/events/outbox-stream.bus.js";
import { db } from "../src/db/index.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
} from "../src/db/schema/scm_foundation.js";
import { eq } from "drizzle-orm";

describe("OutboxStreamBus & Idempotent Consumer (T-65 / ADR 0040)", () => {
  let bus: OutboxStreamBus;

  beforeEach(() => {
    bus = new OutboxStreamBus({
      maxRetries: 3,
      pollIntervalMs: 50,
      baseBackoffMs: 10,
    });
  });

  afterEach(() => {
    bus.clear();
  });

  describe("1. Transactional Publishing", () => {
    it("enqueues a domain event into scmOutboxMessages with PENDING status", async () => {
      const eventId = `test-evt-${uuidv4()}`;
      const publishedId = await bus.publish({
        eventId,
        eventType: "financial.clearing.netted",
        aggregateType: "SettlementCycle",
        aggregateId: "SETTLE-2026-001",
        payload: { netAmountEur: 14500.5, currency: "EUR" },
      });

      expect(publishedId).toBe(eventId);

      const rows = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, eventId));

      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe("PENDING");
      expect(rows[0].eventType).toBe("financial.clearing.netted");
      expect(JSON.parse(rows[0].payloadJson)).toEqual({
        netAmountEur: 14500.5,
        currency: "EUR",
      });
    });

    it("enqueues a batch of events atomically", async () => {
      const id1 = `test-batch-${uuidv4()}`;
      const id2 = `test-batch-${uuidv4()}`;

      const ids = await bus.publishBatch([
        {
          eventId: id1,
          eventType: "customs.cbam.declaration_submitted",
          aggregateType: "CbamDeclaration",
          aggregateId: "CBAM-2026-Q3-01",
          payload: { declarationNumber: "CBAM-2026-Q3-01" },
        },
        {
          eventId: id2,
          eventType: "fueleu.pooling.settled",
          aggregateType: "CompliancePool",
          aggregateId: "POOL-2026-A",
          payload: { balanceMj: 1200000 },
        },
      ]);

      expect(ids).toEqual([id1, id2]);

      const rows1 = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, id1));
      const rows2 = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, id2));

      expect(rows1.length).toBe(1);
      expect(rows2.length).toBe(1);
    });
  });

  describe("2. Consumer Dispatch & Idempotency Window", () => {
    it("dispatches events to registered consumers and marks them PROCESSED", async () => {
      const eventId = `test-disp-${uuidv4()}`;
      const eventType = `treasury.invoice.cleared.${uuidv4()}`;
      const receivedEvents: Array<{ eventId: string; payload: unknown }> = [];

      bus.registerConsumer(
        "accounting-sync-worker",
        eventType,
        async (event) => {
          receivedEvents.push({
            eventId: event.eventId,
            payload: event.payload,
          });
        },
      );

      await bus.publish({
        eventId,
        eventType,
        aggregateType: "Invoice",
        aggregateId: "INV-9901",
        payload: { amountEur: 5000 },
      });

      const result = await bus.pollAndDispatchBatch();
      expect(result.dispatchedCount).toBeGreaterThanOrEqual(1);
      expect(receivedEvents.some((e) => e.eventId === eventId)).toBe(true);

      // Verify DB status is PROCESSED
      const rows = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.eventId, eventId));
      expect(rows[0].status).toBe("PROCESSED");
      expect(rows[0].publishedAt).not.toBeNull();

      // Verify Inbox processed record was created
      const isProcessed = await bus.isEventProcessed(
        "accounting-sync-worker",
        eventId,
      );
      expect(isProcessed).toBe(true);
    });

    it("skips duplicate processing for the same consumer (Inbox Idempotency Pattern)", async () => {
      const eventId = `test-dedup-${uuidv4()}`;
      const eventType = `gl.entry.posted.${uuidv4()}`;
      let callCount = 0;

      bus.registerConsumer("erp-sync-service", eventType, async () => {
        callCount++;
      });

      await bus.publish({
        eventId,
        eventType,
        aggregateType: "GlEntry",
        aggregateId: "GL-100",
        payload: { debit: 100, credit: 100 },
      });

      // First dispatch pass
      const result1 = await bus.pollAndDispatchBatch();
      expect(callCount).toBe(1);

      // Reset outbox message status to PENDING artificially to simulate duplicate redelivery
      await db
        .update(scmOutboxMessages)
        .set({ status: "PENDING" })
        .where(eq(scmOutboxMessages.eventId, eventId));

      // Second dispatch pass: should be skipped by Inbox check
      const result2 = await bus.pollAndDispatchBatch();
      expect(result2.skippedDuplicatesCount).toBeGreaterThanOrEqual(1);
      expect(callCount).toBe(1); // handler was NOT invoked a second time
    });
  });

  describe("3. Resilience, Exponential Retries & Dead Letter Queue (DLQ)", () => {
    it("retries on handler failure and routes to Dead Letter Queue after maxRetries", async () => {
      const eventId = `test-fail-${uuidv4()}`;
      const eventType = `external.webhook.notify.${uuidv4()}`;

      bus.registerConsumer("failing-webhook-consumer", eventType, async () => {
        throw new Error("HTTP 503 Service Unavailable");
      });

      await bus.publish({
        eventId,
        eventType,
        aggregateType: "WebhookNotification",
        aggregateId: "WH-1",
        payload: { targetUrl: "https://agent.example.com/webhook" },
      });

      // Pass 1: retryCount becomes 1 (PENDING)
      await bus.pollAndDispatchBatch();
      let row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.retryCount).toBe(1);
      expect(row.status).toBe("PENDING");
      expect(row.lastError).toContain("503");

      // Pass 2: retryCount becomes 2 (PENDING)
      await bus.pollAndDispatchBatch();
      row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.retryCount).toBe(2);

      // Pass 3: retryCount becomes 3 >= maxRetries (3) -> Dead Letter Queue (FAILED)
      const res3 = await bus.pollAndDispatchBatch();
      expect(res3.deadLetterCount).toBe(1);

      row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.status).toBe("FAILED");
      expect(row.retryCount).toBe(3);
    });

    it("supports replaying dead-lettered events back to PENDING", async () => {
      const eventId = `test-replay-${uuidv4()}`;

      // Insert directly as FAILED / Dead Letter
      await db.insert(scmOutboxMessages).values({
        eventId,
        eventType: "dlq.test.event",
        schemaVersion: 1,
        producerContext: "Test",
        aggregateType: "TestAgg",
        aggregateId: "AGG-1",
        aggregateVersion: 1,
        correlationId: "c-1",
        causationId: "c-2",
        actorContextJson: "{}",
        payloadJson: "{}",
        status: "FAILED",
        retryCount: 5,
        occurredAt: new Date(),
        lastError: "Network failure",
      });

      const replayed = await bus.replayDeadLetter(eventId);
      expect(replayed).toBe(true);

      const row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.status).toBe("PENDING");
      expect(row.retryCount).toBe(0);
      expect(row.lastError).toBeNull();
    });
  });

  describe("4. Telemetry & Streaming Generator", () => {
    it("reports real-time telemetry metrics", async () => {
      const telemetry = await bus.getTelemetry();
      expect(typeof telemetry.pendingCount).toBe("number");
      expect(typeof telemetry.processedCount).toBe("number");
      expect(typeof telemetry.failedCount).toBe("number");
      expect(typeof telemetry.deadLetterCount).toBe("number");
      expect(typeof telemetry.registeredConsumersCount).toBe("number");
    });

    it("streams events via async iterable generator", async () => {
      const uniqueType = `stream.test.${uuidv4().substring(0, 8)}`;
      await bus.publish({
        eventType: uniqueType,
        aggregateType: "StreamItem",
        aggregateId: "ITEM-1",
        payload: { step: 1 },
      });
      await bus.publish({
        eventType: uniqueType,
        aggregateType: "StreamItem",
        aggregateId: "ITEM-2",
        payload: { step: 2 },
      });

      const collected: unknown[] = [];
      for await (const event of bus.streamEvents(uniqueType)) {
        collected.push(event.payload);
      }

      expect(collected).toEqual([{ step: 1 }, { step: 2 }]);
    });
  });
});
