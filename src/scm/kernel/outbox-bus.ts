import { eq } from "drizzle-orm";
import { client, db } from "../../db/index.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
} from "../../db/schema/scm_foundation.js";
import { DomainEventEnvelope } from "./primitives.js";

export type DomainEventHandler<TPayload = any> = (
  event: DomainEventEnvelope<TPayload>,
) => Promise<void>;

interface RegisteredSubscriber {
  eventType: string;
  consumerName: string;
  handler: DomainEventHandler;
}

let tablesInitialized = false;

export async function ensureScmFoundationTables(): Promise<void> {
  if (tablesInitialized) return;

  const statements = [
    `CREATE TABLE IF NOT EXISTS platform_gov_outbox_messages (
      event_id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      producer_context TEXT NOT NULL,
      aggregate_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      aggregate_version INTEGER NOT NULL,
      correlation_id TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      actor_context_json TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      retry_count INTEGER NOT NULL DEFAULT 0,
      occurred_at INTEGER NOT NULL,
      published_at INTEGER,
      last_error TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS platform_gov_inbox_processed (
      id TEXT PRIMARY KEY NOT NULL,
      consumer_name TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      processed_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS orders_customer_orders (
      id TEXT PRIMARY KEY NOT NULL,
      order_number TEXT NOT NULL UNIQUE,
      customer_party_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      quotation_id TEXT,
      service_mode TEXT NOT NULL,
      incoterm TEXT NOT NULL,
      movement_scope TEXT NOT NULL DEFAULT 'PORT_TO_PORT',
      origin_location_id TEXT NOT NULL,
      destination_location_id TEXT NOT NULL,
      cargo_ready_date TEXT NOT NULL,
      required_delivery_date TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      cargo_requirements_json TEXT NOT NULL,
      commercial_refs_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS orders_fulfilment_allocations (
      id TEXT PRIMARY KEY NOT NULL,
      order_id TEXT NOT NULL,
      shipment_id TEXT NOT NULL,
      shipment_reference TEXT NOT NULL,
      allocated_packages INTEGER NOT NULL,
      allocated_weight_kg REAL NOT NULL,
      allocated_volume_cbm REAL NOT NULL,
      allocation_type TEXT NOT NULL DEFAULT 'FULL',
      created_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS shipment_exec_shipments (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_reference TEXT NOT NULL UNIQUE,
      customer_account_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      service_mode TEXT NOT NULL,
      service_type TEXT NOT NULL,
      incoterm TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'IMPORT',
      origin_location_id TEXT NOT NULL,
      destination_location_id TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL DEFAULT 'CREATED',
      execution_phase TEXT NOT NULL DEFAULT 'ORIGIN_PREPARATION',
      closure_state TEXT NOT NULL DEFAULT 'OPEN',
      health_status TEXT NOT NULL DEFAULT 'ON_TRACK',
      health_score INTEGER NOT NULL DEFAULT 100,
      health_reasons_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      order_links_json TEXT NOT NULL DEFAULT '[]',
      party_roles_json TEXT NOT NULL DEFAULT '[]',
      external_refs_json TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS transport_plan_route_plans (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      active_version_no INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PUBLISHED',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS transport_plan_route_versions (
      id TEXT PRIMARY KEY NOT NULL,
      route_plan_id TEXT NOT NULL,
      shipment_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PUBLISHED',
      change_reason TEXT,
      stops_json TEXT NOT NULL,
      legs_json TEXT NOT NULL,
      published_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS cargo_equip_cargos (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      total_packages INTEGER NOT NULL,
      total_gross_weight_kg REAL NOT NULL,
      total_volume_cbm REAL NOT NULL,
      chargeable_weight_kg REAL NOT NULL,
      has_dangerous_goods INTEGER NOT NULL DEFAULT 0,
      has_temperature_control INTEGER NOT NULL DEFAULT 0,
      packages_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS cargo_equip_equipment_assignments (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      consolidation_id TEXT,
      equipment_category TEXT NOT NULL,
      iso_type_code TEXT NOT NULL,
      equipment_number TEXT NOT NULL,
      seals_json TEXT NOT NULL DEFAULT '[]',
      tare_weight_kg REAL NOT NULL DEFAULT 3800,
      max_payload_kg REAL NOT NULL DEFAULT 28000,
      vgm_weight_kg REAL,
      pickup_pin TEXT,
      status TEXT NOT NULL DEFAULT 'ASSIGNED',
      cargo_allocations_json TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS op_intelligence_shipment_360_views (
      shipment_id TEXT PRIMARY KEY NOT NULL,
      reference_number TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customer_account_id TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL,
      health_status TEXT NOT NULL,
      projection_version INTEGER NOT NULL DEFAULT 1,
      read_model_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS op_intelligence_cockpit_items (
      work_item_id TEXT PRIMARY KEY NOT NULL,
      work_item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      attention_score INTEGER NOT NULL,
      urgency_bucket TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      assignee_user_id TEXT,
      shipment_id TEXT,
      reference_number TEXT NOT NULL,
      item_model_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

  tablesInitialized = true;
}

class TransactionalOutboxBus {
  private subscribers: RegisteredSubscriber[] = [];

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

  public async enqueueEvents(events: DomainEventEnvelope[]): Promise<void> {
    if (events.length === 0) return;
    await ensureScmFoundationTables();

    for (const evt of events) {
      await db
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
   * Relays all PENDING outbox messages to registered subscribers with
   * strict Consumer Inbox idempotency (each consumer processes a given eventId at most once).
   */
  public async relayPendingEvents(): Promise<{
    relayedEventsCount: number;
    consumerDeliveriesCount: number;
  }> {
    await ensureScmFoundationTables();

    const pendingRows = await db
      .select()
      .from(scmOutboxMessages)
      .where(eq(scmOutboxMessages.status, "PENDING"));

    let relayedEventsCount = 0;
    let consumerDeliveriesCount = 0;

    for (const row of pendingRows) {
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

        await db
          .update(scmOutboxMessages)
          .set({
            status: "PUBLISHED",
            publishedAt: new Date(),
          })
          .where(eq(scmOutboxMessages.eventId, row.eventId));

        relayedEventsCount += 1;
      } catch (err: any) {
        await db
          .update(scmOutboxMessages)
          .set({
            retryCount: row.retryCount + 1,
            lastError: err?.message || "Unknown consumer error",
          })
          .where(eq(scmOutboxMessages.eventId, row.eventId));
        throw err;
      }
    }

    return { relayedEventsCount, consumerDeliveriesCount };
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
