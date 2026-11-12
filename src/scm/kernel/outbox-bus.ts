import fs from "fs";
import path from "path";
import { eq, desc } from "drizzle-orm";
import { client, db } from "../../db/index.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
  scmCommandIdempotency,
} from "../../db/schema/scm_foundation.js";
import { v4 as uuidv4 } from "uuid";
import { DomainEventEnvelope, DEFAULT_OPERATOR_ACTOR } from "./primitives.js";

export type DomainEventHandler<TPayload = any> = (
  event: DomainEventEnvelope<TPayload>,
) => Promise<void>;

interface RegisteredSubscriber {
  eventType: string;
  consumerName: string;
  handler: DomainEventHandler;
}

let tablesInitialized = false;

/**
 * Ensures SCM foundation tables exist by applying the versioned Drizzle migration
 * `drizzle/0026_scm_foundation_tables.sql` (single source of truth with `scm_foundation.ts`).
 */
export async function ensureScmFoundationTables(): Promise<void> {
  if (tablesInitialized) return;

  const migrationPath = path.resolve(
    process.cwd(),
    "drizzle",
    "0026_scm_foundation_tables.sql",
  );
  if (fs.existsSync(migrationPath)) {
    const rawSql = fs.readFileSync(migrationPath, "utf-8");
    const statements = rawSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sql of statements) {
      await client.execute(sql);
    }
  }

  tablesInitialized = true;
}

class TransactionalOutboxBus {
  private subscribers: RegisteredSubscriber[] = [];
  private maxRetries: number = 3;

  public setMaxRetries(retries: number): void {
    this.maxRetries = retries;
  }

  public clearSubscribers(): void {
    this.subscribers = [];
  }

  public subscribe(
    eventType: string,
    consumerName: string,
    handler: DomainEventHandler,
  ): void {
    const exists = this.subscribers.some(
      (s) => s.eventType === eventType && s.consumerName === consumerName,
    );
    if (!exists) {
      this.subscribers.push({ eventType, consumerName, handler });
    }
  }

  public async enqueueEvents(
    events: DomainEventEnvelope[],
    tx?: any,
  ): Promise<void> {
    if (events.length === 0) return;
    await ensureScmFoundationTables();

    const clientToUse = tx || db;
    for (const evt of events) {
      await clientToUse
        .insert(scmOutboxMessages)
        .values({
          eventId: evt.eventId,
          eventType: evt.eventType,
          schemaVersion: evt.schemaVersion,
          producerContext: evt.producerContext,
          aggregateType: evt.aggregateType,
          aggregateId: evt.aggregateId,
          aggregateVersion: evt.aggregateVersion,
          correlationId: evt.correlationId,
          causationId: evt.causationId,
          actorContextJson: JSON.stringify(evt.actor),
          payloadJson: JSON.stringify(evt.payload),
          status: "PENDING",
          retryCount: 0,
          occurredAt: new Date(evt.occurredAt),
        })
        .onConflictDoNothing();
    }
  }

  /**
   * Convinience method to publish a single domain event into the transactional outbox.
   */
  public async publish(
    event: {
      eventId?: string;
      eventType: string;
      schemaVersion?: number;
      producerContext?: string;
      aggregateType: string;
      aggregateId: string;
      aggregateVersion?: number;
      correlationId?: string;
      causationId?: string;
      actor?: any;
      occurredAt?: string;
      payload: any;
    },
    tx?: any,
  ): Promise<void> {
    const envelope: DomainEventEnvelope = {
      eventId: event.eventId || uuidv4(),
      eventType: event.eventType,
      schemaVersion: event.schemaVersion || 1,
      producerContext: event.producerContext || "GeneralKernel",
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion || 1,
      correlationId: event.correlationId || uuidv4(),
      causationId: event.causationId || uuidv4(),
      actor: event.actor || DEFAULT_OPERATOR_ACTOR,
      occurredAt: event.occurredAt || new Date().toISOString(),
      payload: event.payload,
    };
    await this.enqueueEvents([envelope], tx);
  }

  /**
   * Relays all PENDING outbox messages to registered subscribers with
   * strict Consumer Inbox idempotency (each consumer processes a given eventId at most once).
   * Loops up to 8 passes so cascading domain events settle deterministically.
   *
   * Outbox lifecycle:
   * PENDING -> PROCESSING -> PROCESSED (on success)
   *                       -> PENDING (retry on failure if retryCount < maxRetries)
   *                       -> FAILED (Dead Letter Queue if retryCount >= maxRetries)
   */
  public async relayPendingEvents(): Promise<{
    relayedEventsCount: number;
    consumerDeliveriesCount: number;
    failedEventsCount: number;
  }> {
    await ensureScmFoundationTables();

    let relayedEventsCount = 0;
    let consumerDeliveriesCount = 0;
    let failedEventsCount = 0;
    const failedInThisInvocation = new Set<string>();

    for (let pass = 0; pass < 8; pass++) {
      const pendingRows = await db
        .select()
        .from(scmOutboxMessages)
        .where(eq(scmOutboxMessages.status, "PENDING"));

      const eligibleRows = pendingRows.filter(
        (r) => !failedInThisInvocation.has(r.eventId),
      );

      if (eligibleRows.length === 0) break;

      for (const row of eligibleRows) {
        // Transition PENDING -> PROCESSING
        await db
          .update(scmOutboxMessages)
          .set({ status: "PROCESSING" })
          .where(eq(scmOutboxMessages.eventId, row.eventId));

        const envelope: DomainEventEnvelope = {
          eventId: row.eventId,
          eventType: row.eventType,
          schemaVersion: row.schemaVersion,
          producerContext: row.producerContext,
          aggregateType: row.aggregateType,
          aggregateId: row.aggregateId,
          aggregateVersion: row.aggregateVersion,
          correlationId: row.correlationId,
          causationId: row.causationId,
          actor: JSON.parse(row.actorContextJson),
          occurredAt: row.occurredAt.toISOString(),
          payload: JSON.parse(row.payloadJson),
        };

        const matchingSubscribers = this.subscribers.filter(
          (s) => s.eventType === row.eventType || s.eventType === "*",
        );

        try {
          for (const sub of matchingSubscribers) {
            const delivered = await this.deliverIdempotently(sub, envelope);
            if (delivered) {
              consumerDeliveriesCount += 1;
            }
          }

          // Transition PROCESSING -> PROCESSED
          await db
            .update(scmOutboxMessages)
            .set({
              status: "PROCESSED",
              publishedAt: new Date(),
            })
            .where(eq(scmOutboxMessages.eventId, row.eventId));

          relayedEventsCount += 1;
        } catch (err: any) {
          failedInThisInvocation.add(row.eventId);
          const nextRetry = row.retryCount + 1;
          const isDeadLetter = nextRetry >= this.maxRetries;

          await db
            .update(scmOutboxMessages)
            .set({
              status: isDeadLetter ? "FAILED" : "PENDING",
              retryCount: nextRetry,
              lastError: err?.message || String(err),
            })
            .where(eq(scmOutboxMessages.eventId, row.eventId));

          if (isDeadLetter) {
            failedEventsCount += 1;
          }
        }
      }
    }

    return { relayedEventsCount, consumerDeliveriesCount, failedEventsCount };
  }

  /**
   * Retrieves messages that have permanently failed processing and are held in the Dead Letter Queue (DLQ).
   */
  public async getDeadLetterQueue(): Promise<
    Array<{
      eventId: string;
      eventType: string;
      aggregateId: string;
      aggregateType: string;
      retryCount: number;
      lastError: string | null;
      occurredAt: Date;
      payload: any;
    }>
  > {
    await ensureScmFoundationTables();
    const rows = await db
      .select()
      .from(scmOutboxMessages)
      .where(eq(scmOutboxMessages.status, "FAILED"))
      .orderBy(desc(scmOutboxMessages.occurredAt));

    return rows.map((r) => ({
      eventId: r.eventId,
      eventType: r.eventType,
      aggregateId: r.aggregateId,
      aggregateType: r.aggregateType,
      retryCount: r.retryCount,
      lastError: r.lastError,
      occurredAt: r.occurredAt,
      payload: JSON.parse(r.payloadJson),
    }));
  }

  /**
   * Replays a dead-lettered message from DLQ by resetting its status to PENDING and triggering relay.
   */
  public async replayDeadLetterMessage(eventId: string): Promise<boolean> {
    await ensureScmFoundationTables();
    const existing = await db
      .select()
      .from(scmOutboxMessages)
      .where(eq(scmOutboxMessages.eventId, eventId))
      .limit(1);

    if (existing.length === 0 || existing[0].status !== "FAILED") {
      return false;
    }

    await db
      .update(scmOutboxMessages)
      .set({
        status: "PENDING",
        retryCount: 0,
        lastError: null,
      })
      .where(eq(scmOutboxMessages.eventId, eventId));

    await this.relayPendingEvents();
    return true;
  }

  /**
   * Public method to test or replay a specific DomainEventEnvelope against a subscriber
   * while enforcing the Consumer Inbox idempotency check.
   */
  public async deliverIdempotently(
    sub: RegisteredSubscriber,
    envelope: DomainEventEnvelope,
  ): Promise<boolean> {
    await ensureScmFoundationTables();
    const inboxKey = `${sub.consumerName}:${envelope.eventId}`;

    const alreadyProcessed = await db
      .select({ id: scmInboxProcessedMessages.id })
      .from(scmInboxProcessedMessages)
      .where(eq(scmInboxProcessedMessages.id, inboxKey))
      .limit(1);

    if (alreadyProcessed.length > 0) {
      return false; // Duplicate delivery skipped idempotently!
    }

    await sub.handler(envelope);

    await db
      .insert(scmInboxProcessedMessages)
      .values({
        id: inboxKey,
        consumerName: sub.consumerName,
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        processedAt: new Date(),
      })
      .onConflictDoNothing();

    return true;
  }
}

export const outboxBus = new TransactionalOutboxBus();

/**
 * Executes an application command with idempotent guarantee.
 * If commandKey is provided and was already processed, returns the previous result without re-executing.
 */
export async function executeWithIdempotency<T>(
  commandKey: string | undefined,
  commandName: string,
  executor: (tx?: any) => Promise<{ result: T; entityId?: string }>,
  tx?: any,
): Promise<T> {
  if (!commandKey || !commandKey.trim()) {
    const res = await executor(tx);
    return res.result;
  }

  await ensureScmFoundationTables();
  const dbClient = tx || db;

  const existing = await dbClient
    .select()
    .from(scmCommandIdempotency)
    .where(eq(scmCommandIdempotency.commandKey, commandKey))
    .limit(1);

  if (existing.length > 0) {
    return JSON.parse(existing[0].resultJson) as T;
  }

  const { result, entityId } = await executor(tx);

  await dbClient
    .insert(scmCommandIdempotency)
    .values({
      commandKey,
      commandName,
      entityId: entityId || null,
      resultJson: JSON.stringify(result),
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  return result;
}
