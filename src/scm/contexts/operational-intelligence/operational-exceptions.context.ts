import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { scmOperationalExceptionsV2 } from "../../../db/schema/scm_operational_intelligence_sqlite.js";
import { scmLogicalShipments } from "../../../db/schema/scm_entities_sqlite.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import { ensureOperationalBffTables } from "../../kernel/operational-bff-tables.js";
import { outboxBus } from "../../kernel/outbox-bus.js";

// ============================================================================
// DOMAIN TYPES & CONSTANTS
// ============================================================================

export type OperationalExceptionCategory =
  | "CUSTOMS_HOLD"
  | "WEATHER_DELAY"
  | "CARRIER_ROLL"
  | "EQUIPMENT_DEFECT"
  | "SLA_BREACH"
  | "DOCUMENTATION_ERROR"
  | "ROUTE_DEVIATION"
  | "SECURITY_AUDIT_HOLD"
  | "TERMINAL_CONGESTION";

export type OperationalExceptionSeverity =
  "CRITICAL" | "MAJOR" | "MINOR" | "INFO";

export type OperationalExceptionStatus =
  "OPEN" | "IN_REVIEW" | "RESOLVED" | "WAIVED";

export interface OperationalExceptionRecord {
  exceptionId: string;
  shipmentId: string;
  category: OperationalExceptionCategory;
  severity: OperationalExceptionSeverity;
  status: OperationalExceptionStatus;
  isBlocking: boolean;
  title: string;
  description: string;
  rootCause?: string | null;
  assignedToUserId?: string | null;
  assignedTeam?: string | null;
  resolutionNotes?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaiseOperationalExceptionInput {
  shipmentId: string;
  category: OperationalExceptionCategory;
  severity: OperationalExceptionSeverity;
  isBlocking?: boolean;
  title: string;
  description: string;
  rootCause?: string;
  assignedToUserId?: string;
  assignedTeam?: string;
}

export interface AssignOperationalExceptionInput {
  assignedToUserId?: string;
  assignedTeam?: string;
}

export interface ResolveOperationalExceptionInput {
  resolutionNotes: string;
  resolutionStatus?: "RESOLVED" | "WAIVED";
}

// ============================================================================
// MAPPER
// ============================================================================

function mapRowToRecord(row: any): OperationalExceptionRecord {
  return {
    exceptionId: row.exceptionId,
    shipmentId: row.shipmentId,
    category: row.category as OperationalExceptionCategory,
    severity: row.severity as OperationalExceptionSeverity,
    status: row.status as OperationalExceptionStatus,
    isBlocking: row.isBlocking === 1,
    title: row.title,
    description: row.description,
    rootCause: row.rootCause,
    assignedToUserId: row.assignedToUserId,
    assignedTeam: row.assignedTeam,
    resolutionNotes: row.resolutionNotes,
    resolvedByUserId: row.resolvedByUserId,
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

// ============================================================================
// APPLICATION COMMANDS
// ============================================================================

export async function raiseOperationalException(
  input: RaiseOperationalExceptionInput,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<OperationalExceptionRecord> {
  await ensureOperationalBffTables();

  assertInvariant(
    Boolean(input.shipmentId && input.title && input.description),
    "operational_intelligence",
    "INVALID_EXCEPTION_INPUT",
    "Shipment ID, title, and description are required to raise an operational exception",
  );

  // Validate shipment existence
  const shipmentRows = await db
    .select()
    .from(scmLogicalShipments)
    .where(eq(scmLogicalShipments.shipmentId, input.shipmentId))
    .limit(1);

  assertInvariant(
    shipmentRows.length > 0,
    "operational_intelligence",
    "SHIPMENT_NOT_FOUND",
    `Shipment '${input.shipmentId}' not found`,
  );

  const exceptionId = `exc_${randomUUID()}`;
  const now = new Date();
  const isBlocking = input.isBlocking !== false;

  await db.transaction(async (tx) => {
    await tx.insert(scmOperationalExceptionsV2).values({
      exceptionId,
      shipmentId: input.shipmentId,
      category: input.category,
      severity: input.severity,
      status: "OPEN",
      isBlocking: isBlocking ? 1 : 0,
      title: input.title,
      description: input.description,
      rootCause: input.rootCause || null,
      assignedToUserId: input.assignedToUserId || null,
      assignedTeam: input.assignedTeam || "OPERATIONS",
      resolutionNotes: null,
      resolvedByUserId: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await outboxBus.enqueueEvents(
      [
        {
          eventId: `evt_${randomUUID()}`,
          eventType: "op_intelligence.OperationalExceptionRaised.v2",
          schemaVersion: 1,
          producerContext: "operational_intelligence",
          aggregateType: "SHIPMENT",
          aggregateId: input.shipmentId,
          aggregateVersion: 1,
          correlationId: `corr_${input.shipmentId}`,
          causationId: `cmd_raise_exception`,
          actor,
          payload: {
            exceptionId,
            shipmentId: input.shipmentId,
            category: input.category,
            severity: input.severity,
            isBlocking,
            title: input.title,
            description: input.description,
            assignedTeam: input.assignedTeam || "OPERATIONS",
            raisedByUserId: actor.userId,
          },
          occurredAt: now.toISOString(),
        },
      ],
      tx,
    );
  });

  await outboxBus.relayPendingEvents();

  const createdRecord: OperationalExceptionRecord = {
    exceptionId,
    shipmentId: input.shipmentId,
    category: input.category,
    severity: input.severity,
    status: "OPEN",
    isBlocking,
    title: input.title,
    description: input.description,
    rootCause: input.rootCause || null,
    assignedToUserId: input.assignedToUserId || null,
    assignedTeam: input.assignedTeam || "OPERATIONS",
    resolutionNotes: null,
    resolvedByUserId: null,
    resolvedAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return createdRecord;
}

export async function assignOperationalException(
  exceptionId: string,
  input: AssignOperationalExceptionInput,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<OperationalExceptionRecord> {
  await ensureOperationalBffTables();

  const rows = await db
    .select()
    .from(scmOperationalExceptionsV2)
    .where(eq(scmOperationalExceptionsV2.exceptionId, exceptionId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "operational_intelligence",
    "EXCEPTION_NOT_FOUND",
    `Operational exception '${exceptionId}' not found`,
  );

  const existing = rows[0];
  assertInvariant(
    existing.status !== "RESOLVED" && existing.status !== "WAIVED",
    "operational_intelligence",
    "EXCEPTION_ALREADY_CLOSED",
    `Cannot reassign closed exception '${exceptionId}'`,
  );

  const now = new Date();
  const nextStatus = existing.status === "OPEN" ? "IN_REVIEW" : existing.status;

  await db.transaction(async (tx) => {
    await tx
      .update(scmOperationalExceptionsV2)
      .set({
        assignedToUserId:
          input.assignedToUserId !== undefined
            ? input.assignedToUserId
            : existing.assignedToUserId,
        assignedTeam:
          input.assignedTeam !== undefined
            ? input.assignedTeam
            : existing.assignedTeam,
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(scmOperationalExceptionsV2.exceptionId, exceptionId));

    await outboxBus.enqueueEvents(
      [
        {
          eventId: `evt_${randomUUID()}`,
          eventType: "op_intelligence.OperationalExceptionAssigned.v2",
          schemaVersion: 1,
          producerContext: "operational_intelligence",
          aggregateType: "SHIPMENT",
          aggregateId: existing.shipmentId,
          aggregateVersion: 1,
          correlationId: `corr_${existing.shipmentId}`,
          causationId: `cmd_assign_exception`,
          actor,
          payload: {
            exceptionId,
            shipmentId: existing.shipmentId,
            assignedToUserId: input.assignedToUserId,
            assignedTeam: input.assignedTeam,
            status: nextStatus,
            assignedByUserId: actor.userId,
          },
          occurredAt: now.toISOString(),
        },
      ],
      tx,
    );
  });

  await outboxBus.relayPendingEvents();

  return getOperationalExceptionById(exceptionId);
}

export async function resolveOperationalException(
  exceptionId: string,
  input: ResolveOperationalExceptionInput,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<OperationalExceptionRecord> {
  await ensureOperationalBffTables();

  assertInvariant(
    Boolean(input.resolutionNotes && input.resolutionNotes.trim()),
    "operational_intelligence",
    "RESOLUTION_NOTES_REQUIRED",
    "Resolution notes are required to resolve an operational exception",
  );

  const rows = await db
    .select()
    .from(scmOperationalExceptionsV2)
    .where(eq(scmOperationalExceptionsV2.exceptionId, exceptionId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "operational_intelligence",
    "EXCEPTION_NOT_FOUND",
    `Operational exception '${exceptionId}' not found`,
  );

  const existing = rows[0];
  assertInvariant(
    existing.status !== "RESOLVED" && existing.status !== "WAIVED",
    "operational_intelligence",
    "EXCEPTION_ALREADY_CLOSED",
    `Exception '${exceptionId}' is already ${existing.status}`,
  );

  const now = new Date();
  const finalStatus = input.resolutionStatus || "RESOLVED";

  await db.transaction(async (tx) => {
    await tx
      .update(scmOperationalExceptionsV2)
      .set({
        status: finalStatus,
        resolutionNotes: input.resolutionNotes,
        resolvedByUserId: actor.userId,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(scmOperationalExceptionsV2.exceptionId, exceptionId));

    await outboxBus.enqueueEvents(
      [
        {
          eventId: `evt_${randomUUID()}`,
          eventType: "op_intelligence.OperationalExceptionResolved.v2",
          schemaVersion: 1,
          producerContext: "operational_intelligence",
          aggregateType: "SHIPMENT",
          aggregateId: existing.shipmentId,
          aggregateVersion: 1,
          correlationId: `corr_${existing.shipmentId}`,
          causationId: `cmd_resolve_exception`,
          actor,
          payload: {
            exceptionId,
            shipmentId: existing.shipmentId,
            status: finalStatus,
            resolutionNotes: input.resolutionNotes,
            resolvedByUserId: actor.userId,
            category: existing.category,
            wasBlocking: existing.isBlocking === 1,
          },
          occurredAt: now.toISOString(),
        },
      ],
      tx,
    );
  });

  await outboxBus.relayPendingEvents();

  return getOperationalExceptionById(exceptionId);
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getOperationalExceptionById(
  exceptionId: string,
): Promise<OperationalExceptionRecord> {
  await ensureOperationalBffTables();

  const rows = await db
    .select()
    .from(scmOperationalExceptionsV2)
    .where(eq(scmOperationalExceptionsV2.exceptionId, exceptionId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "operational_intelligence",
    "EXCEPTION_NOT_FOUND",
    `Operational exception '${exceptionId}' not found`,
  );

  return mapRowToRecord(rows[0]);
}

export async function listOperationalExceptionsForShipment(
  shipmentId: string,
): Promise<OperationalExceptionRecord[]> {
  await ensureOperationalBffTables();

  const rows = await db
    .select()
    .from(scmOperationalExceptionsV2)
    .where(eq(scmOperationalExceptionsV2.shipmentId, shipmentId))
    .orderBy(desc(scmOperationalExceptionsV2.createdAt));

  return rows.map(mapRowToRecord);
}

export async function listAllOperationalExceptions(params?: {
  status?: string;
  severity?: string;
  isBlocking?: boolean;
  category?: string;
  assignedTeam?: string;
}): Promise<OperationalExceptionRecord[]> {
  await ensureOperationalBffTables();

  const conditions = [];

  if (params?.status) {
    conditions.push(eq(scmOperationalExceptionsV2.status, params.status));
  }
  if (params?.severity) {
    conditions.push(eq(scmOperationalExceptionsV2.severity, params.severity));
  }
  if (params?.isBlocking !== undefined) {
    conditions.push(
      eq(scmOperationalExceptionsV2.isBlocking, params.isBlocking ? 1 : 0),
    );
  }
  if (params?.category) {
    conditions.push(eq(scmOperationalExceptionsV2.category, params.category));
  }
  if (params?.assignedTeam) {
    conditions.push(
      eq(scmOperationalExceptionsV2.assignedTeam, params.assignedTeam),
    );
  }

  const query = db.select().from(scmOperationalExceptionsV2);
  const rows =
    conditions.length > 0
      ? await query
          .where(and(...conditions))
          .orderBy(desc(scmOperationalExceptionsV2.createdAt))
      : await query.orderBy(desc(scmOperationalExceptionsV2.createdAt));

  return rows.map(mapRowToRecord);
}
