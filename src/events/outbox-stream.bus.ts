/**
 * @file outbox-stream.bus.ts
 * @description Outbox Event Bus Stream Adapter & Idempotent Consumer for SQLite WAL transactional outbox.
 * @module @atlas/events/outbox-stream
 * @see {@link docs/adr/0040-financial-settlement-automated-clearing-and-outbox-event-bus.md}
 */

import { EventEmitter } from "node:events";
import { v4 as uuidv4 } from "uuid";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
} from "../db/schema/scm_foundation.js";
import { ensureScmFoundationTables } from "../scm/kernel/outbox-bus.js";

// ============================================================================
// 1. DATA CONTRACTS & INTERFACES
// ============================================================================

const RETRY_AFTER_PREFIX = "[RETRY_AFTER:";

/**
 * Computes deterministic exponential backoff delay (in milliseconds).
 * Formula: delayMs = min(maxMs, baseMs * 2^(retryCount - 1))
 */
export function computeBackoffDelay(
  retryCount: number,
  baseMs: number,
  maxMs: number,
): number {
  if (retryCount <= 0) return 0;
  const factor = Math.pow(2, Math.min(retryCount - 1, 30));
  return Math.min(maxMs, Math.max(0, Math.floor(baseMs * factor)));
}

/**
 * Encodes next retry timestamp into the lastError string without DDL schema drift.
 */
export function encodeLastError(
  errorMessage: string,
  nextRetryAtMs: number,
): string {
  return `${RETRY_AFTER_PREFIX} ${nextRetryAtMs}] ${errorMessage}`;
}

/**
 * Parses next retry timestamp from lastError string if present.
 */
export function parseRetryAfter(
  lastError: string | null | undefined,
): number | null {
  if (!lastError || !lastError.startsWith(RETRY_AFTER_PREFIX)) {
    return null;
  }
  const endIdx = lastError.indexOf("]");
  if (endIdx === -1) return null;
  const tsStr = lastError.substring(RETRY_AFTER_PREFIX.length, endIdx).trim();
  const ts = Number(tsStr);
  return Number.isFinite(ts) ? ts : null;
}

export interface OutboxStreamEvent<T = unknown> {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  producerContext: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  causationId: string;
  occurredAt: string;
  payload: T;
  retryCount: number;
  status: "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED" | "DEAD_LETTER";
}

export interface PublishOutboxEventOptions<T = unknown> {
  eventId?: string;
  eventType: string;
  schemaVersion?: number;
  producerContext?: string;
  aggregateType: string;
  aggregateId: string;
  aggregateVersion?: number;
  correlationId?: string;
  causationId?: string;
  occurredAt?: Date | string;
  payload: T;
}

export interface OutboxStreamConfig {
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  pollIntervalMs?: number;
  batchSize?: number;
  dedupTtlMs?: number;
  dedupMaxEntries?: number;
}

export interface OutboxStreamTelemetry {
  pendingCount: number;
  processingCount: number;
  processedCount: number;
  failedCount: number;
  deadLetterCount: number;
  registeredConsumersCount: number;
  inMemoryDedupCacheSize: number;
  isPollingActive: boolean;
}

export interface DispatchResult {
  polledCount: number;
  dispatchedCount: number;
  skippedDuplicatesCount: number;
  failedCount: number;
  deadLetterCount: number;
}

export type OutboxConsumerHandler<T = unknown> = (
  event: OutboxStreamEvent<T>,
) => Promise<void>;

interface RegisteredConsumer {
  consumerName: string;
  eventType: string;
  handler: OutboxConsumerHandler<unknown>;
}

// ============================================================================
// 2. OUTBOX STREAM BUS & IDEMPOTENT CONSUMER ADAPTER
// ============================================================================

export class OutboxStreamBus extends EventEmitter {
  private config: Required<OutboxStreamConfig>;
  private consumers: RegisteredConsumer[] = [];
  private pollingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  // Sliding in-memory deduplication window: Map<`${consumerName}:${eventId}`, timestamp>
  private dedupCache: Map<string, number> = new Map();

  constructor(config?: OutboxStreamConfig) {
    super();
    this.config = {
      maxRetries: config?.maxRetries ?? 5,
      baseBackoffMs: config?.baseBackoffMs ?? 200,
      maxBackoffMs: config?.maxBackoffMs ?? 30000,
      pollIntervalMs: config?.pollIntervalMs ?? 1000,
      batchSize: config?.batchSize ?? 50,
      dedupTtlMs: config?.dedupTtlMs ?? 300000, // 5 minutes
      dedupMaxEntries: config?.dedupMaxEntries ?? 10000,
    };
  }

  // --------------------------------------------------------------------------
  // 2.1 Enqueue / Transactional Outbox Publishing
  // --------------------------------------------------------------------------

  /**
   * Enqueues an event into the transactional outbox table in SQLite WAL.
   * Can participate in an existing Drizzle transaction.
   */
  public async publish<T = unknown>(
    options: PublishOutboxEventOptions<T>,
    tx?: typeof db,
  ): Promise<string> {
    await ensureScmFoundationTables();

    const eventId = options.eventId || uuidv4();
    const correlationId = options.correlationId || uuidv4();
    const causationId = options.causationId || uuidv4();
    const occurredAtDate =
      options.occurredAt instanceof Date
        ? options.occurredAt
        : options.occurredAt
          ? new Date(options.occurredAt)
          : new Date();

    const clientToUse = tx || db;

    await clientToUse
      .insert(scmOutboxMessages)
      .values({
        eventId,
        eventType: options.eventType,
        schemaVersion: options.schemaVersion ?? 1,
        producerContext: options.producerContext ?? "AtlasOutboxStream",
        aggregateType: options.aggregateType,
        aggregateId: options.aggregateId,
        aggregateVersion: options.aggregateVersion ?? 1,
        correlationId,
        causationId,
        actorContextJson: JSON.stringify({ system: "outbox-stream.bus" }),
        payloadJson: JSON.stringify(options.payload),
        status: "PENDING",
        retryCount: 0,
        occurredAt: occurredAtDate,
      })
      .onConflictDoNothing();

    this.emit("event:enqueued", { eventId, eventType: options.eventType });
    return eventId;
  }

  /**
   * Enqueues a batch of events within a single database call.
   */
  public async publishBatch<T = unknown>(
    events: PublishOutboxEventOptions<T>[],
    tx?: typeof db,
  ): Promise<string[]> {
    if (events.length === 0) return [];
    await ensureScmFoundationTables();

    const clientToUse = tx || db;
    const eventIds: string[] = [];

    const valuesToInsert = events.map((e) => {
      const eventId = e.eventId || uuidv4();
      eventIds.push(eventId);
      return {
        eventId,
        eventType: e.eventType,
        schemaVersion: e.schemaVersion ?? 1,
        producerContext: e.producerContext ?? "AtlasOutboxStream",
        aggregateType: e.aggregateType,
        aggregateId: e.aggregateId,
        aggregateVersion: e.aggregateVersion ?? 1,
        correlationId: e.correlationId || uuidv4(),
        causationId: e.causationId || uuidv4(),
        actorContextJson: JSON.stringify({ system: "outbox-stream.bus" }),
        payloadJson: JSON.stringify(e.payload),
        status: "PENDING" as const,
        retryCount: 0,
        occurredAt:
          e.occurredAt instanceof Date
            ? e.occurredAt
            : e.occurredAt
              ? new Date(e.occurredAt)
              : new Date(),
      };
    });

    await clientToUse
      .insert(scmOutboxMessages)
      .values(valuesToInsert)
      .onConflictDoNothing();

    return eventIds;
  }

  // --------------------------------------------------------------------------
  // 2.2 Consumer Registration & Deduplication
  // --------------------------------------------------------------------------

  /**
   * Registers a durable consumer with an idempotent consumer inbox.
   */
  public registerConsumer<T = unknown>(
    consumerName: string,
    eventType: string,
    handler: OutboxConsumerHandler<T>,
  ): () => void {
    const existing = this.consumers.find(
      (c) => c.consumerName === consumerName && c.eventType === eventType,
    );
    if (!existing) {
      this.consumers.push({
        consumerName,
        eventType,
        handler: handler as OutboxConsumerHandler<unknown>,
      });
    }

    return () => {
      this.consumers = this.consumers.filter(
        (c) => !(c.consumerName === consumerName && c.eventType === eventType),
      );
    };
  }

  /**
   * Checks if an event has already been processed by the given consumer.
   * Employs a 2-tier check: in-memory sliding window + persistent inbox table.
   */
  public async isEventProcessed(
    consumerName: string,
    eventId: string,
  ): Promise<boolean> {
    const dedupKey = `${consumerName}:${eventId}`;

    // Tier 1: In-memory LRU window
    const cachedAt = this.dedupCache.get(dedupKey);
    const now = Date.now();
    if (cachedAt && now - cachedAt < this.config.dedupTtlMs) {
      return true;
    }

    // Tier 2: Persistent Inbox Table
    await ensureScmFoundationTables();
    const existing = await db
      .select({ id: scmInboxProcessedMessages.id })
      .from(scmInboxProcessedMessages)
      .where(eq(scmInboxProcessedMessages.id, dedupKey))
      .limit(1);

    if (existing.length > 0) {
      this.addInMemoryDedup(dedupKey);
      return true;
    }

    return false;
  }

  /**
   * Marks an event as processed by a specific consumer.
   */
  public async markEventProcessed(
    consumerName: string,
    eventId: string,
    eventType: string,
  ): Promise<void> {
    const dedupKey = `${consumerName}:${eventId}`;
    await ensureScmFoundationTables();

    await db
      .insert(scmInboxProcessedMessages)
      .values({
        id: dedupKey,
        consumerName,
        eventId,
        eventType,
        processedAt: new Date(),
      })
      .onConflictDoNothing();

    this.addInMemoryDedup(dedupKey);
  }

  private addInMemoryDedup(key: string): void {
    if (this.dedupCache.size >= this.config.dedupMaxEntries) {
      // Evict oldest entries
      const oldestKey = this.dedupCache.keys().next().value;
      if (oldestKey) this.dedupCache.delete(oldestKey);
    }
    this.dedupCache.set(key, Date.now());
  }

  // --------------------------------------------------------------------------
  // 2.3 Dispatch & Stream Processing Engine
  // --------------------------------------------------------------------------

  /**
   * Polls a batch of pending/failed events and dispatches them to matching consumers.
   */
  public async pollAndDispatchBatch(
    options?: { limit?: number; eventType?: string; eventId?: string } | number,
  ): Promise<DispatchResult> {
    if (this.isProcessing) {
      return {
        polledCount: 0,
        dispatchedCount: 0,
        skippedDuplicatesCount: 0,
        failedCount: 0,
        deadLetterCount: 0,
      };
    }

    const opts =
      typeof options === "number" ? { limit: options } : options || {};
    const batchLimit = opts.limit ?? this.config.batchSize;

    this.isProcessing = true;
    let dispatchedCount = 0;
    let skippedDuplicatesCount = 0;
    let failedCount = 0;
    let deadLetterCount = 0;

    try {
      await ensureScmFoundationTables();

      const registeredTypes = Array.from(
        new Set(this.consumers.map((c) => c.eventType)),
      );
      const hasWildcard = registeredTypes.includes("*");

      // Build conditions
      const conditions = [
        sql`${scmOutboxMessages.status} IN ('PENDING', 'FAILED')`,
        lte(scmOutboxMessages.retryCount, this.config.maxRetries),
      ];

      if (opts.eventId) {
        conditions.push(eq(scmOutboxMessages.eventId, opts.eventId));
      } else if (opts.eventType) {
        conditions.push(eq(scmOutboxMessages.eventType, opts.eventType));
      } else if (!hasWildcard && registeredTypes.length > 0) {
        conditions.push(
          sql`${scmOutboxMessages.eventType} IN (${sql.join(
            registeredTypes.map((t) => sql`${t}`),
            sql`, `,
          )})`,
        );
      }

      // Fetch candidate events
      const candidateRows = await db
        .select()
        .from(scmOutboxMessages)
        .where(and(...conditions))
        .orderBy(sql`${scmOutboxMessages.occurredAt} DESC`)
        .limit(batchLimit);

      for (const row of candidateRows) {
        // Enforce exponential backoff: skip rows whose retry_after timestamp has not elapsed yet
        const retryAfter = parseRetryAfter(row.lastError);
        if (retryAfter && retryAfter > Date.now()) {
          continue;
        }

        const matchingConsumers = this.consumers.filter(
          (c) => c.eventType === row.eventType || c.eventType === "*",
        );

        // If no consumer registered for this event, do not process
        if (matchingConsumers.length === 0) continue;

        // Atomic claim transition: PENDING/FAILED -> PROCESSING
        const claimed = await db
          .update(scmOutboxMessages)
          .set({ status: "PROCESSING" })
          .where(
            and(
              eq(scmOutboxMessages.eventId, row.eventId),
              sql`${scmOutboxMessages.status} IN ('PENDING', 'FAILED')`,
            ),
          )
          .returning({ eventId: scmOutboxMessages.eventId });

        if (claimed.length === 0) continue;

        let parsedPayload: unknown;
        try {
          parsedPayload = JSON.parse(row.payloadJson);
        } catch {
          parsedPayload = row.payloadJson;
        }

        const streamEvent: OutboxStreamEvent = {
          eventId: row.eventId,
          eventType: row.eventType,
          schemaVersion: row.schemaVersion,
          producerContext: row.producerContext,
          aggregateType: row.aggregateType,
          aggregateId: row.aggregateId,
          aggregateVersion: row.aggregateVersion,
          correlationId: row.correlationId,
          causationId: row.causationId,
          occurredAt: row.occurredAt.toISOString(),
          payload: parsedPayload,
          retryCount: row.retryCount,
          status: "PROCESSING",
        };

        let rowError: Error | null = null;

        for (const consumer of matchingConsumers) {
          const isProcessed = await this.isEventProcessed(
            consumer.consumerName,
            row.eventId,
          );

          if (isProcessed) {
            skippedDuplicatesCount++;
            continue;
          }

          try {
            await consumer.handler(streamEvent);
            await this.markEventProcessed(
              consumer.consumerName,
              row.eventId,
              row.eventType,
            );
            dispatchedCount++;
          } catch (err) {
            rowError = err instanceof Error ? err : new Error(String(err));
            break; // Stop remaining consumers for this row on error
          }
        }

        if (rowError) {
          const nextRetry = row.retryCount + 1;
          const isDeadLetter = nextRetry >= this.config.maxRetries;
          const backoffDelayMs = computeBackoffDelay(
            nextRetry,
            this.config.baseBackoffMs,
            this.config.maxBackoffMs,
          );
          const nextRetryAt = Date.now() + backoffDelayMs;
          const encodedError = isDeadLetter
            ? rowError.message
            : encodeLastError(rowError.message, nextRetryAt);

          await db
            .update(scmOutboxMessages)
            .set({
              status: isDeadLetter ? "FAILED" : "PENDING",
              retryCount: nextRetry,
              lastError: encodedError,
            })
            .where(eq(scmOutboxMessages.eventId, row.eventId));

          if (isDeadLetter) {
            deadLetterCount++;
            this.emit("event:dead_letter", {
              eventId: row.eventId,
              error: rowError.message,
            });
          } else {
            failedCount++;
          }
        } else {
          // Success: transition PROCESSING -> PROCESSED
          await db
            .update(scmOutboxMessages)
            .set({
              status: "PROCESSED",
              publishedAt: new Date(),
              lastError: null,
            })
            .where(eq(scmOutboxMessages.eventId, row.eventId));

          this.emit("event:processed", {
            eventId: row.eventId,
            eventType: row.eventType,
          });
        }
      }

      return {
        polledCount: candidateRows.length,
        dispatchedCount,
        skippedDuplicatesCount,
        failedCount,
        deadLetterCount,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  // --------------------------------------------------------------------------
  // 2.4 Streaming Async Generator
  // --------------------------------------------------------------------------

  /**
   * Async iterable generator that yields events as they are polled from the outbox.
   */
  public async *streamEvents(
    eventTypeFilter?: string,
  ): AsyncIterableIterator<OutboxStreamEvent> {
    await ensureScmFoundationTables();

    const rows = await db
      .select()
      .from(scmOutboxMessages)
      .where(
        eventTypeFilter
          ? eq(scmOutboxMessages.eventType, eventTypeFilter)
          : undefined,
      )
      .orderBy(sql`${scmOutboxMessages.occurredAt} ASC`);

    for (const r of rows) {
      let payload: unknown;
      try {
        payload = JSON.parse(r.payloadJson);
      } catch {
        payload = r.payloadJson;
      }

      yield {
        eventId: r.eventId,
        eventType: r.eventType,
        schemaVersion: r.schemaVersion,
        producerContext: r.producerContext,
        aggregateType: r.aggregateType,
        aggregateId: r.aggregateId,
        aggregateVersion: r.aggregateVersion,
        correlationId: r.correlationId,
        causationId: r.causationId,
        occurredAt: r.occurredAt.toISOString(),
        payload,
        retryCount: r.retryCount,
        status: r.status as OutboxStreamEvent["status"],
      };
    }
  }

  // --------------------------------------------------------------------------
  // 2.5 Dead Letter Queue & Operations
  // --------------------------------------------------------------------------

  /**
   * Replays an event from the Dead Letter Queue by resetting its status to PENDING.
   */
  public async replayDeadLetter(eventId: string): Promise<boolean> {
    await ensureScmFoundationTables();

    const updated = await db
      .update(scmOutboxMessages)
      .set({
        status: "PENDING",
        retryCount: 0,
        lastError: null,
      })
      .where(
        and(
          eq(scmOutboxMessages.eventId, eventId),
          eq(scmOutboxMessages.status, "FAILED"),
        ),
      )
      .returning({ eventId: scmOutboxMessages.eventId });

    return updated.length > 0;
  }

  /**
   * Replays all Dead Letter Queue events.
   */
  public async replayAllDeadLetters(eventType?: string): Promise<number> {
    await ensureScmFoundationTables();

    const conditions = [eq(scmOutboxMessages.status, "FAILED")];
    if (eventType) {
      conditions.push(eq(scmOutboxMessages.eventType, eventType));
    }

    const updated = await db
      .update(scmOutboxMessages)
      .set({
        status: "PENDING",
        retryCount: 0,
        lastError: null,
      })
      .where(and(...conditions))
      .returning({ eventId: scmOutboxMessages.eventId });

    return updated.length;
  }

  // --------------------------------------------------------------------------
  // 2.6 Background Polling Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Starts background continuous polling.
   */
  public start(intervalMs?: number): void {
    if (this.pollingTimer) return;

    const interval = intervalMs ?? this.config.pollIntervalMs;
    this.pollingTimer = setInterval(async () => {
      try {
        await this.pollAndDispatchBatch();
      } catch (err) {
        this.emit("error", err);
      }
    }, interval);

    this.emit("polling:started", { intervalMs: interval });
  }

  /**
   * Stops background continuous polling.
   */
  public stop(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      this.emit("polling:stopped");
    }
  }

  // --------------------------------------------------------------------------
  // 2.7 Telemetry & Health
  // --------------------------------------------------------------------------

  /**
   * Returns current outbox stream telemetry metrics.
   */
  public async getTelemetry(): Promise<OutboxStreamTelemetry> {
    await ensureScmFoundationTables();

    const rows = await db
      .select({
        status: scmOutboxMessages.status,
        retryCount: scmOutboxMessages.retryCount,
      })
      .from(scmOutboxMessages);

    let pendingCount = 0;
    let processingCount = 0;
    let processedCount = 0;
    let failedCount = 0;
    let deadLetterCount = 0;

    for (const r of rows) {
      if (r.status === "PENDING") pendingCount++;
      else if (r.status === "PROCESSING") processingCount++;
      else if (r.status === "PROCESSED") processedCount++;
      else if (r.status === "FAILED") {
        if (r.retryCount >= this.config.maxRetries) {
          deadLetterCount++;
        } else {
          failedCount++;
        }
      }
    }

    return {
      pendingCount,
      processingCount,
      processedCount,
      failedCount,
      deadLetterCount,
      registeredConsumersCount: this.consumers.length,
      inMemoryDedupCacheSize: this.dedupCache.size,
      isPollingActive: this.pollingTimer !== null,
    };
  }

  /**
   * Clears internal state (for testing).
   */
  public clear(): void {
    this.stop();
    this.consumers = [];
    this.dedupCache.clear();
    this.removeAllListeners();
  }
}

export const outboxStreamBus = new OutboxStreamBus();
