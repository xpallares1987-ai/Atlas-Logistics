import { eq, desc } from "drizzle-orm";
import { client, db } from "../../db/index.js";
import {
  scmOutboxMessages,
  scmInboxProcessedMessages,
  scmCommandIdempotency,
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
    `CREATE TABLE IF NOT EXISTS platform_gov_command_idempotency_v2 (
      command_key TEXT PRIMARY KEY NOT NULL,
      command_name TEXT NOT NULL,
      entity_id TEXT,
      result_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
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
    `CREATE TABLE IF NOT EXISTS tracking_events_stream (
      event_id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      event_code TEXT NOT NULL,
      milestone_code TEXT NOT NULL,
      location_locode TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_trust_rank INTEGER NOT NULL DEFAULT 1,
      timestamp_kind TEXT NOT NULL,
      event_timestamp TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      recorded_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS tracking_events_milestone_plans (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      route_version_no INTEGER NOT NULL DEFAULT 1,
      milestones_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS exception_mgmt_exceptions (
      id TEXT PRIMARY KEY NOT NULL,
      dedup_key TEXT NOT NULL UNIQUE,
      shipment_id TEXT NOT NULL,
      reference_number TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      milestone_code TEXT NOT NULL,
      location_locode TEXT NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      incident_id TEXT,
      incident_number TEXT,
      linked_work_item_id TEXT,
      evidence_log_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      first_detected_at TEXT NOT NULL,
      last_occurred_at TEXT NOT NULL,
      resolved_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS exception_mgmt_incidents (
      id TEXT PRIMARY KEY NOT NULL,
      incident_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      affected_locode TEXT NOT NULL,
      affected_vessel_or_flight TEXT,
      impacted_shipment_ids_json TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS sla_mgmt_instances (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      sla_code TEXT NOT NULL,
      sla_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ON_TRACK',
      started_at TEXT NOT NULL,
      original_deadline_at TEXT NOT NULL,
      effective_deadline_at TEXT NOT NULL,
      paused_at TEXT,
      pause_reason TEXT,
      accumulated_paused_minutes INTEGER NOT NULL DEFAULT 0,
      stop_clock_history_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS data_quality_assessments (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      active_stage TEXT NOT NULL DEFAULT 'PRE_DEPARTURE_EXPORT',
      score INTEGER NOT NULL DEFAULT 100,
      gate_status TEXT NOT NULL DEFAULT 'PASSED',
      blocking_findings_count INTEGER NOT NULL DEFAULT 0,
      warning_findings_count INTEGER NOT NULL DEFAULT 0,
      findings_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      evaluated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS consolidation_consolidations (
      id TEXT PRIMARY KEY NOT NULL,
      consolidation_reference TEXT NOT NULL UNIQUE,
      consolidation_type TEXT NOT NULL,
      mode TEXT NOT NULL,
      origin_locode TEXT NOT NULL,
      destination_locode TEXT NOT NULL,
      carrier_name TEXT NOT NULL,
      vessel_or_flight TEXT,
      voyage_number TEXT,
      master_document_number TEXT NOT NULL,
      max_capacity_weight_kg REAL NOT NULL DEFAULT 26000,
      max_capacity_volume_cbm REAL NOT NULL DEFAULT 68,
      allocated_weight_kg REAL NOT NULL DEFAULT 0,
      allocated_volume_cbm REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN_FOR_STUFFING',
      members_json TEXT NOT NULL DEFAULT '[]',
      equipment_ids_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS document_mgmt_documents (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      owner_entity_type TEXT NOT NULL DEFAULT 'SHIPMENT',
      owner_entity_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_reference TEXT NOT NULL,
      title TEXT NOT NULL,
      requires_approval INTEGER NOT NULL DEFAULT 1,
      current_version_no INTEGER NOT NULL DEFAULT 1,
      lifecycle_state TEXT NOT NULL DEFAULT 'DRAFT',
      versions_json TEXT NOT NULL DEFAULT '[]',
      approvals_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS customs_cases (
      id TEXT PRIMARY KEY NOT NULL,
      case_number TEXT NOT NULL UNIQUE,
      shipment_id TEXT NOT NULL,
      procedure_type TEXT NOT NULL,
      jurisdiction_country TEXT NOT NULL,
      customs_office_locode TEXT NOT NULL,
      declarant_eori_or_tax_id TEXT NOT NULL,
      exporter_party_id TEXT NOT NULL,
      importer_of_record_party_id TEXT NOT NULL,
      customs_broker_name TEXT NOT NULL,
      mrn_number TEXT,
      channel_assigned TEXT,
      state TEXT NOT NULL DEFAULT 'CREATED',
      tariff_items_json TEXT NOT NULL DEFAULT '[]',
      holds_json TEXT NOT NULL DEFAULT '[]',
      total_calculated_duty_eur REAL NOT NULL DEFAULT 0,
      total_calculated_vat_eur REAL NOT NULL DEFAULT 0,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS op_finance_shipment_finances (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      functional_currency TEXT NOT NULL DEFAULT 'EUR',
      financial_state TEXT NOT NULL DEFAULT 'OPEN',
      expected_cost_total_eur REAL NOT NULL DEFAULT 0,
      confirmed_cost_total_eur REAL NOT NULL DEFAULT 0,
      expected_revenue_total_eur REAL NOT NULL DEFAULT 0,
      confirmed_revenue_total_eur REAL NOT NULL DEFAULT 0,
      expected_gross_margin_eur REAL NOT NULL DEFAULT 0,
      actual_gross_margin_eur REAL NOT NULL DEFAULT 0,
      margin_percent REAL NOT NULL DEFAULT 0,
      open_accrual_amount_eur REAL NOT NULL DEFAULT 0,
      financially_ready INTEGER NOT NULL DEFAULT 0,
      lines_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS billing_sales_invoices (
      id TEXT PRIMARY KEY NOT NULL,
      invoice_number TEXT NOT NULL UNIQUE,
      shipment_id TEXT NOT NULL,
      bill_to_customer_party_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_tax_id TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      net_amount_eur REAL NOT NULL,
      tax_rate_percent REAL NOT NULL DEFAULT 21,
      tax_amount_eur REAL NOT NULL,
      gross_amount_eur REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      lines_json TEXT NOT NULL DEFAULT '[]',
      credit_note_number TEXT,
      credit_reason TEXT,
      issued_at TEXT,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS billing_purchase_invoices (
      id TEXT PRIMARY KEY NOT NULL,
      dedup_vendor_key TEXT NOT NULL UNIQUE,
      supplier_party_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      supplier_invoice_number TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL,
      shipment_id TEXT NOT NULL,
      matched_financial_line_id TEXT NOT NULL,
      claimed_amount_eur REAL NOT NULL,
      expected_cost_amount_eur REAL NOT NULL,
      variance_amount_eur REAL NOT NULL,
      variance_percent REAL NOT NULL,
      tolerance_percent REAL NOT NULL DEFAULT 2,
      match_outcome TEXT NOT NULL,
      three_way_match_status TEXT NOT NULL,
      status TEXT NOT NULL,
      approval_notes TEXT,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS workflow_rt_process_definitions (
      id TEXT PRIMARY KEY NOT NULL,
      process_key TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      nodes_json TEXT NOT NULL,
      sequence_flows_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS workflow_rt_process_instances (
      id TEXT PRIMARY KEY NOT NULL,
      process_definition_id TEXT NOT NULL,
      process_key TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      shipment_id TEXT NOT NULL UNIQUE,
      reference_number TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'RUNNING',
      current_node_id TEXT NOT NULL,
      active_tokens_json TEXT NOT NULL DEFAULT '[]',
      completed_node_ids_json TEXT NOT NULL DEFAULT '[]',
      variables_snapshot_json TEXT NOT NULL DEFAULT '{}',
      blocking_reason TEXT,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      started_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER
    );`,
    `CREATE TABLE IF NOT EXISTS rules_decisions_definitions (
      id TEXT PRIMARY KEY NOT NULL,
      decision_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      hit_policy TEXT NOT NULL DEFAULT 'FIRST',
      input_columns_json TEXT NOT NULL,
      output_columns_json TEXT NOT NULL,
      rules_rows_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS rules_decisions_evaluation_logs (
      evaluation_id TEXT PRIMARY KEY NOT NULL,
      decision_key TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      shipment_id TEXT NOT NULL,
      inputs_snapshot_json TEXT NOT NULL,
      matched_row_ids_json TEXT NOT NULL,
      rule_annotations_json TEXT NOT NULL,
      output_snapshot_json TEXT NOT NULL,
      caller_context TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      evaluated_at TEXT NOT NULL
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
