/**
 * @file outbox-exponential-backoff-dlq.test.ts
 * @description Fine-grained unit and integration tests verifying deterministic exponential backoff, retry windows, DLQ escalation, and idempotent replay across multi-domain workers using Vitest Fake Timers (Wave P2-A).
 * @module @atlas/tests/outbox-exponential-backoff-dlq
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { v4 as uuidv4 } from "uuid";
import {
  OutboxStreamBus,
  computeBackoffDelay,
  encodeLastError,
  parseRetryAfter,
} from "../src/events/outbox-stream.bus.js";
import { db } from "../src/db/index.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
} from "../src/db/schema/scm_foundation.js";
import { eq } from "drizzle-orm";

describe("Wave P2-A: Outbox Exponential Backoff & DLQ Escalation (Fake Timers)", () => {
  describe("1. Pure Backoff Calculation & Error Header Encoding (Unit)", () => {
    it("computes exact powers of two with base multiplier up to maxBackoffMs", () => {
      const baseMs = 100;
      const maxMs = 5000;

      // retry 1: 100 * 2^0 = 100
      expect(computeBackoffDelay(1, baseMs, maxMs)).toBe(100);
      // retry 2: 100 * 2^1 = 200
      expect(computeBackoffDelay(2, baseMs, maxMs)).toBe(200);
      // retry 3: 100 * 2^2 = 400
      expect(computeBackoffDelay(3, baseMs, maxMs)).toBe(400);
      // retry 4: 100 * 2^3 = 800
      expect(computeBackoffDelay(4, baseMs, maxMs)).toBe(800);
      // retry 5: 100 * 2^4 = 1600
      expect(computeBackoffDelay(5, baseMs, maxMs)).toBe(1600);
      // retry 6: 100 * 2^5 = 3200
      expect(computeBackoffDelay(6, baseMs, maxMs)).toBe(3200);
      // retry 7: 100 * 2^6 = 6400 -> capped at 5000
      expect(computeBackoffDelay(7, baseMs, maxMs)).toBe(5000);
    });

    it("encodes and parses retry_after timestamp round-trip without data corruption", () => {
      const targetTs = 1795569999000;
      const rawError = "ETIMEDOUT: Connection refused by upstream GL sync";
      const encoded = encodeLastError(rawError, targetTs);

      expect(encoded).toContain("[RETRY_AFTER: 1795569999000]");
      expect(encoded).toContain(rawError);

      const parsed = parseRetryAfter(encoded);
      expect(parsed).toBe(targetTs);

      expect(parseRetryAfter("Standard unencoded error message")).toBeNull();
      expect(parseRetryAfter(null)).toBeNull();
      expect(parseRetryAfter(undefined)).toBeNull();
    });
  });

  describe("2. Domain Worker Resilience with Simulated Time", () => {
    let bus: OutboxStreamBus;

    beforeEach(() => {
      bus = new OutboxStreamBus({
        maxRetries: 3,
        baseBackoffMs: 200,
        maxBackoffMs: 10000,
        pollIntervalMs: 50,
      });
    });

    afterEach(() => {
      bus.clear();
      vi.useRealTimers();
    });

    // ------------------------------------------------------------------------
    // Domain A: Accounting & GL Sync
    // ------------------------------------------------------------------------
    it("Accounting Worker: enforces backoff window before re-attempting failed GL journal sync", async () => {
      vi.useFakeTimers();
      const startTime = 1795500000000;
      vi.setSystemTime(startTime);

      const eventId = `evt-gl-${uuidv4()}`;
      const eventType = `gl.sync.invoice.${uuidv4()}`;
      let attempts = 0;

      bus.registerConsumer("erp-gl-journal-worker", eventType, async () => {
        attempts++;
        if (attempts <= 2) {
          throw new Error(
            "ERP_TEMPORARY_LOCK: Journal book currently locked by batch posting",
          );
        }
      });

      await bus.publish({
        eventId,
        eventType,
        aggregateType: "AccountingInvoice",
        aggregateId: "INV-2026-X01",
        payload: { amountEur: 125000, companyId: "comp-atlas" },
      });

      // Pass 1: Attempt 1 fails at T=0
      const res1 = await bus.pollAndDispatchBatch();
      expect(attempts).toBe(1);
      expect(res1.failedCount).toBe(1);

      let row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.retryCount).toBe(1);
      expect(row.status).toBe("PENDING");

      const retryAfter1 = parseRetryAfter(row.lastError);
      // baseBackoffMs = 200 -> nextRetryAt = startTime + 200
      expect(retryAfter1).toBe(startTime + 200);

      // Pass 1.1: Advance virtual time by 100ms (T=100ms < T=200ms) -> Must NOT re-execute
      vi.advanceTimersByTime(100);
      const res1_1 = await bus.pollAndDispatchBatch();
      expect(attempts).toBe(1); // Not touched
      expect(res1_1.polledCount).toBe(1);
      expect(res1_1.dispatchedCount).toBe(0);

      // Pass 2: Advance virtual time by another 101ms (T=201ms > T=200ms) -> Executes Attempt 2
      vi.advanceTimersByTime(101);
      const res2 = await bus.pollAndDispatchBatch();
      expect(attempts).toBe(2);
      expect(res2.failedCount).toBe(1);

      row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.retryCount).toBe(2);
      const retryAfter2 = parseRetryAfter(row.lastError);
      // retry 2: baseBackoffMs * 2^1 = 400ms -> nextRetryAt = 1795500000201 + 400 = 1795500000601
      expect(retryAfter2).toBe(1795500000201 + 400);

      // Pass 2.1: Advance time by 200ms -> Still in backoff window
      vi.advanceTimersByTime(200);
      await bus.pollAndDispatchBatch();
      expect(attempts).toBe(2);

      // Pass 3: Advance time past the 400ms window -> Attempt 3 succeeds!
      vi.advanceTimersByTime(250);
      const res3 = await bus.pollAndDispatchBatch();
      expect(attempts).toBe(3);
      expect(res3.dispatchedCount).toBe(1);

      row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.status).toBe("PROCESSED");
      expect(row.lastError).toBeNull();
    });

    // ------------------------------------------------------------------------
    // Domain B: Customs & Regulatory AEAT e-Firma
    // ------------------------------------------------------------------------
    it("Customs Worker: escalates to Dead Letter Queue (DLQ) after 3 failed filing attempts", async () => {
      vi.useFakeTimers();
      const startTime = 1795510000000;
      vi.setSystemTime(startTime);

      const eventId = `evt-customs-${uuidv4()}`;
      const eventType = `customs.declaration.efirma.${uuidv4()}`;
      let attempts = 0;
      let deadLetterEmitted = false;

      bus.on("event:dead_letter", (data) => {
        if (data.eventId === eventId) {
          deadLetterEmitted = true;
        }
      });

      bus.registerConsumer(
        "aeat-customs-filing-worker",
        eventType,
        async () => {
          attempts++;
          throw new Error(
            "AEAT_GATEWAY_TIMEOUT: Spanish Tax Agency SOAP gateway 504 Gateway Timeout",
          );
        },
      );

      await bus.publish({
        eventId,
        eventType,
        aggregateType: "CustomsDeclaration",
        aggregateId: "DUA-2026-ES-9901",
        payload: { mrn: "26ES00009901A" },
      });

      // Pass 1 (T=0) -> Attempt 1
      await bus.pollAndDispatchBatch();
      expect(attempts).toBe(1);

      // Advance by 205ms -> Attempt 2
      vi.advanceTimersByTime(205);
      await bus.pollAndDispatchBatch();
      expect(attempts).toBe(2);

      // Advance by 405ms -> Attempt 3 (hits maxRetries = 3)
      vi.advanceTimersByTime(405);
      const res3 = await bus.pollAndDispatchBatch();
      expect(attempts).toBe(3);
      expect(res3.deadLetterCount).toBe(1);
      expect(deadLetterEmitted).toBe(true);

      const row = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(row.status).toBe("FAILED");
      expect(row.retryCount).toBe(3);
      expect(row.lastError).toContain("AEAT_GATEWAY_TIMEOUT");
    });

    // ------------------------------------------------------------------------
    // Domain C: Carrier Telemetry (DCSA / AIS) & Manual DLQ Replay
    // ------------------------------------------------------------------------
    it("Carrier Telemetry Worker: allows operator replay of dead-lettered event with immediate reset", async () => {
      const eventId = `evt-carrier-${uuidv4()}`;
      const eventType = `carrier.dcsa.track.${uuidv4()}`;
      let attempts = 0;

      bus.registerConsumer("dcsa-track-normalizer", eventType, async () => {
        attempts++;
      });

      // Insert directly as FAILED / Dead Letter
      await db.insert(scmOutboxMessages).values({
        eventId,
        eventType,
        schemaVersion: 1,
        producerContext: "DCSAConnector",
        aggregateType: "ContainerTracking",
        aggregateId: "MSCU1234567",
        aggregateVersion: 1,
        correlationId: "c-1",
        causationId: "c-2",
        actorContextJson: "{}",
        payloadJson: JSON.stringify({ vessel: "MSC OSCAR", speedKnots: 18.2 }),
        status: "FAILED",
        retryCount: 3,
        occurredAt: new Date(),
        lastError: "[RETRY_AFTER: 9999999999999] Stale dead letter error",
      });

      // Replay dead letter
      const replayed = await bus.replayDeadLetter(eventId);
      expect(replayed).toBe(true);

      const rowAfterReplay = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(rowAfterReplay.status).toBe("PENDING");
      expect(rowAfterReplay.retryCount).toBe(0);
      expect(rowAfterReplay.lastError).toBeNull();

      // Dispatching replayed message succeeds
      const result = await bus.pollAndDispatchBatch({ eventId });
      expect(result.dispatchedCount).toBe(1);
      expect(attempts).toBe(1);

      const finalRow = (
        await db
          .select()
          .from(scmOutboxMessages)
          .where(eq(scmOutboxMessages.eventId, eventId))
      )[0];
      expect(finalRow.status).toBe("PROCESSED");
    });

    // ------------------------------------------------------------------------
    // Inbox Idempotency Safety Across Retries
    // ------------------------------------------------------------------------
    it("Consumer Inbox Idempotency: ensures duplicate processing is prevented across multiple retry cycles", async () => {
      const eventId = `evt-inbox-${uuidv4()}`;
      const eventType = `customs.cbam.declaration.${uuidv4()}`;
      let processedTimes = 0;

      bus.registerConsumer("cbam-audit-worker", eventType, async () => {
        processedTimes++;
      });

      await bus.publish({
        eventId,
        eventType,
        aggregateType: "CbamDeclaration",
        aggregateId: "CBAM-2026-Q4-01",
        payload: { directEmissionsTons: 450.2 },
      });

      // First run: successfully processes
      const res1 = await bus.pollAndDispatchBatch({ eventId });
      expect(res1.dispatchedCount).toBe(1);
      expect(processedTimes).toBe(1);

      // Verify Inbox record exists
      const inboxRows = await db
        .select()
        .from(scmInboxProcessedMessages)
        .where(eq(scmInboxProcessedMessages.eventId, eventId));
      expect(inboxRows.length).toBe(1);
      expect(inboxRows[0].consumerName).toBe("cbam-audit-worker");

      // Artificially reset status back to PENDING (simulating redundant redelivery)
      await db
        .update(scmOutboxMessages)
        .set({ status: "PENDING", lastError: null })
        .where(eq(scmOutboxMessages.eventId, eventId));

      // Second run: ignored due to inbox idempotency check
      const res2 = await bus.pollAndDispatchBatch({ eventId });
      expect(res2.skippedDuplicatesCount).toBe(1);
      expect(res2.dispatchedCount).toBe(0);
      expect(processedTimes).toBe(1); // handler never executed twice
    });
  });
});
