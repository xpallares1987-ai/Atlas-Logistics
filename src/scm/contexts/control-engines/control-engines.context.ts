import { randomInt } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmSlaInstances,
  scmQualityAssessments,
  scmOperationalExceptions,
  scmOperationalIncidents,
  scmShipment360Views,
  scmCockpitWorkItems,
} from "../../../db/schema/scm_foundation.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";
import {
  isSolasVgmApplicable,
  resolveModeFromLegs,
  resolvePreDepartureCutoffMilestone,
} from "../../kernel/transport-mode.js";

let controlSubscribersRegistered = false;

function calculateAttentionScore(params: {
  slaScore: number;
  healthScore: number;
  severityScore: number;
  commercialTierScore: number;
  workflowGateScore: number;
}) {
  const total = Math.round(
    0.35 * params.slaScore +
      0.25 * params.healthScore +
      0.2 * params.severityScore +
      0.1 * params.commercialTierScore +
      0.1 * params.workflowGateScore,
  );
  return {
    ...params,
    totalAttentionScore: Math.min(100, Math.max(0, total)),
  };
}

export type DataQualityStage =
  "BOOKING" | "PRE_DEPARTURE_EXPORT" | "CUSTOMS_CLEARANCE" | "BILLING_READY";

export interface QualityFinding {
  findingCode: string;
  stage: DataQualityStage;
  severity: "INFO" | "WARN" | "BLOCKING";
  fieldPath: string;
  message: string;
  remediationHint: string;
}

export interface StopClockEntry {
  action: "PAUSED" | "RESUMED";
  timestamp: string;
  reason: string;
  pausedDurationMinutes?: number;
  triggeredBy: string;
}

/**
 * 18. SLA MANAGEMENT: Initializes reactive SLA clocks for a shipment when its route is published.
 */
export async function initializeSlaClocksForShipment(
  payload: {
    shipmentId: string;
    stops: any[];
    legs: any[];
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureScmFoundationTables();

  const existing = await db
    .select()
    .from(scmSlaInstances)
    .where(eq(scmSlaInstances.shipmentId, payload.shipmentId));

  if (existing.length > 0) return existing;

  const nowIso = new Date().toISOString();
  const firstStop = payload.stops[0];
  const firstLeg = payload.legs[0];
  const lastLeg = payload.legs[payload.legs.length - 1];
  // Mode-aware pre-departure cut-off (SOLAS VGM applies only to Ocean)
  const cutoffMeta = resolvePreDepartureCutoffMilestone(
    resolveModeFromLegs(payload.legs),
  );

  const vgmDeadline =
    (cutoffMeta.milestoneCode === "VGM_CUTOFF"
      ? firstStop?.cutOffs?.vgmCutOffAt
      : firstStop?.cutOffs?.gateInCutOffAt) ||
    (firstLeg?.plannedDepartureAt
      ? new Date(
          new Date(firstLeg.plannedDepartureAt).getTime() - 24 * 3600 * 1000,
        ).toISOString()
      : new Date(Date.now() + 24 * 3600 * 1000).toISOString());

  const transitDeadline =
    lastLeg?.plannedArrivalAt ||
    new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

  const customsDeadline = new Date(
    new Date(transitDeadline).getTime() + 18 * 3600 * 1000,
  ).toISOString();

  const clocks = [
    {
      id: `sla_${uuidv4()}`,
      shipmentId: payload.shipmentId,
      slaCode: "SLA_PRE_DEPARTURE_CUTOFF",
      slaName: cutoffMeta.slaName,
      status: "ON_TRACK",
      startedAt: nowIso,
      originalDeadlineAt: vgmDeadline,
      effectiveDeadlineAt: vgmDeadline,
      pausedAt: null,
      pauseReason: null,
      accumulatedPausedMinutes: 0,
      stopClockHistoryJson: "[]",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      updatedAt: new Date(),
    },
    {
      id: `sla_${uuidv4()}`,
      shipmentId: payload.shipmentId,
      slaCode: "SLA_TRANSIT_PUNCTUALITY",
      slaName: "On-Time Arrival (OTA) Compromiso Cliente",
      status: "ON_TRACK",
      startedAt: nowIso,
      originalDeadlineAt: transitDeadline,
      effectiveDeadlineAt: transitDeadline,
      pausedAt: null,
      pauseReason: null,
      accumulatedPausedMinutes: 0,
      stopClockHistoryJson: "[]",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      updatedAt: new Date(),
    },
    {
      id: `sla_${uuidv4()}`,
      shipmentId: payload.shipmentId,
      slaCode: "SLA_CUSTOMS_RELEASE",
      slaName: "Ventana de Despacho Aduanero (Stop-Clock Eligible)",
      status: "ON_TRACK",
      startedAt: nowIso,
      originalDeadlineAt: customsDeadline,
      effectiveDeadlineAt: customsDeadline,
      pausedAt: null,
      pauseReason: null,
      accumulatedPausedMinutes: 0,
      stopClockHistoryJson: "[]",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      updatedAt: new Date(),
    },
  ];

  for (const c of clocks) {
    await db.insert(scmSlaInstances).values(c).onConflictDoNothing();
  }

  return clocks;
}

/**
 * 18. SLA MANAGEMENT: Pauses or Resumes an SLA clock (Stop-Clock mechanism).
 * When resumed, extends `effectiveDeadlineAt` by the exact paused duration.
 */
export async function toggleSlaStopClock(
  input: {
    shipmentId: string;
    slaCode: string;
    action: "PAUSE" | "RESUME";
    reason: string;
    simulatedPauseMinutes?: number;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmSlaInstances)
    .where(
      and(
        eq(scmSlaInstances.shipmentId, input.shipmentId),
        eq(scmSlaInstances.slaCode, input.slaCode),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const sla = rows[0];
  const history: StopClockEntry[] = JSON.parse(sla.stopClockHistoryJson);
  const nowIso = new Date().toISOString();

  if (input.action === "PAUSE" && sla.status !== "PAUSED") {
    history.unshift({
      action: "PAUSED",
      timestamp: nowIso,
      reason: input.reason,
      triggeredBy: actor.userId,
    });

    await db
      .update(scmSlaInstances)
      .set({
        status: "PAUSED",
        pausedAt: nowIso,
        pauseReason: input.reason,
        stopClockHistoryJson: JSON.stringify(history),
        updatedAt: new Date(),
      })
      .where(eq(scmSlaInstances.id, sla.id));

    await outboxBus.enqueueEvents([
      {
        eventId: `evt_${uuidv4()}`,
        eventType: "sla_mgmt.SLAPaused.v1",
        schemaVersion: 1,
        producerContext: "sla_mgmt",
        aggregateType: "SLAInstance",
        aggregateId: sla.id,
        aggregateVersion: 2,
        correlationId: uuidv4(),
        causationId: uuidv4(),
        actor,
        occurredAt: nowIso,
        payload: {
          slaId: sla.id,
          shipmentId: input.shipmentId,
          slaCode: input.slaCode,
          slaName: sla.slaName,
          status: "PAUSED",
          pauseReason: input.reason,
          pausedAt: nowIso,
        },
      },
    ]);

    return {
      ...sla,
      status: "PAUSED",
      pausedAt: nowIso,
      pauseReason: input.reason,
      stopClockHistory: history,
    };
  }

  if (input.action === "RESUME" && sla.status === "PAUSED") {
    const elapsedMinutes =
      input.simulatedPauseMinutes ??
      Math.max(
        15,
        Math.round(
          (Date.now() - new Date(sla.pausedAt || nowIso).getTime()) / 60000,
        ),
      );

    const newAccumulated = sla.accumulatedPausedMinutes + elapsedMinutes;
    const newEffectiveDeadline = new Date(
      new Date(sla.effectiveDeadlineAt).getTime() + elapsedMinutes * 60000,
    ).toISOString();

    history.unshift({
      action: "RESUMED",
      timestamp: nowIso,
      reason: input.reason,
      pausedDurationMinutes: elapsedMinutes,
      triggeredBy: actor.userId,
    });

    await db
      .update(scmSlaInstances)
      .set({
        status: "ON_TRACK",
        pausedAt: null,
        pauseReason: null,
        accumulatedPausedMinutes: newAccumulated,
        effectiveDeadlineAt: newEffectiveDeadline,
        stopClockHistoryJson: JSON.stringify(history),
        updatedAt: new Date(),
      })
      .where(eq(scmSlaInstances.id, sla.id));

    await outboxBus.enqueueEvents([
      {
        eventId: `evt_${uuidv4()}`,
        eventType: "sla_mgmt.SLAResumed.v1",
        schemaVersion: 1,
        producerContext: "sla_mgmt",
        aggregateType: "SLAInstance",
        aggregateId: sla.id,
        aggregateVersion: 3,
        correlationId: uuidv4(),
        causationId: uuidv4(),
        actor,
        occurredAt: nowIso,
        payload: {
          slaId: sla.id,
          shipmentId: input.shipmentId,
          slaCode: input.slaCode,
          slaName: sla.slaName,
          status: "ON_TRACK",
          addedMinutes: elapsedMinutes,
          accumulatedPausedMinutes: newAccumulated,
          effectiveDeadlineAt: newEffectiveDeadline,
        },
      },
    ]);

    return {
      ...sla,
      status: "ON_TRACK",
      pausedAt: null,
      pauseReason: null,
      accumulatedPausedMinutes: newAccumulated,
      effectiveDeadlineAt: newEffectiveDeadline,
      stopClockHistory: history,
    };
  }

  return sla;
}

/**
 * 13. EXCEPTION MANAGEMENT + 12. WORK MANAGEMENT:
 * Deduplicates exceptions by (shipmentId + category + milestoneCode).
 * Automatically creates or elevates the corresponding item in `My Work` (`scmCockpitWorkItems`).
 */
export async function raiseOrDeduplicateException(
  input: {
    shipmentId: string;
    referenceNumber: string;
    customerName: string;
    routeSummary: string;
    transportMode: "SEA" | "AIR" | "ROAD" | "RAIL" | "MULTIMODAL";
    category:
      | "ETA_DELAY"
      | "CUTOFF_AT_RISK"
      | "CUSTOMS_HOLD"
      | "TEMPERATURE_EXCURSION"
      | "DATA_QUALITY_BLOCK";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    summary: string;
    milestoneCode: string;
    locationLocode: string;
    actionCommandName: string;
    actionLabel: string;
    defaultResolutionValue: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureScmFoundationTables();

  const dedupKey = `${input.shipmentId}:${input.category}:${input.milestoneCode}`;
  const nowIso = new Date().toISOString();

  const existingRows = await db
    .select()
    .from(scmOperationalExceptions)
    .where(eq(scmOperationalExceptions.dedupKey, dedupKey))
    .limit(1);

  const severityRank: Record<string, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };

  if (existingRows.length > 0 && existingRows[0].status !== "RESOLVED") {
    const prev = existingRows[0];
    const newCount = prev.occurrenceCount + 1;
    const upgradedSeverity =
      severityRank[input.severity] > severityRank[prev.severity]
        ? input.severity
        : prev.severity;

    const evidence: any[] = JSON.parse(prev.evidenceLogJson);
    evidence.unshift({
      occurredAt: nowIso,
      summary: input.summary,
      severity: input.severity,
    });

    await db
      .update(scmOperationalExceptions)
      .set({
        severity: upgradedSeverity,
        summary: input.summary,
        occurrenceCount: newCount,
        evidenceLogJson: JSON.stringify(evidence),
        lastOccurredAt: nowIso,
      })
      .where(eq(scmOperationalExceptions.id, prev.id));

    await outboxBus.enqueueEvents([
      {
        eventId: `evt_${uuidv4()}`,
        eventType: "exception_mgmt.ExceptionEscalated.v1",
        schemaVersion: 1,
        producerContext: "exception_mgmt",
        aggregateType: "Exception",
        aggregateId: prev.id,
        aggregateVersion: newCount,
        correlationId: uuidv4(),
        causationId: uuidv4(),
        actor,
        occurredAt: nowIso,
        payload: {
          exceptionId: prev.id,
          dedupKey,
          shipmentId: input.shipmentId,
          category: input.category,
          severity: upgradedSeverity,
          occurrenceCount: newCount,
          summary: input.summary,
          milestoneCode: input.milestoneCode,
          locationLocode: input.locationLocode,
        },
      },
    ]);

    return {
      exceptionId: prev.id,
      deduplicated: true,
      occurrenceCount: newCount,
      severity: upgradedSeverity,
      linkedWorkItemId: prev.linkedWorkItemId,
    };
  }

  // Create new deduplicated Exception + linked Smart Work Queue item
  const exceptionId = `exc_${uuidv4().substring(0, 12)}`;
  const workItemId = `wrk_exc_${uuidv4().substring(0, 10)}`;

  const evidence = [
    {
      occurredAt: nowIso,
      summary: input.summary,
      severity: input.severity,
    },
  ];

  await db.insert(scmOperationalExceptions).values({
    id: exceptionId,
    dedupKey,
    shipmentId: input.shipmentId,
    referenceNumber: input.referenceNumber,
    category: input.category,
    severity: input.severity,
    status: "OPEN",
    title: input.title,
    summary: input.summary,
    milestoneCode: input.milestoneCode,
    locationLocode: input.locationLocode,
    occurrenceCount: 1,
    linkedWorkItemId: workItemId,
    evidenceLogJson: JSON.stringify(evidence),
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    firstDetectedAt: nowIso,
    lastOccurredAt: nowIso,
  });

  // Synchronize into Smart Work Queue (`scmCockpitWorkItems`)
  const scoreBreakdown = calculateAttentionScore({
    slaScore: input.severity === "CRITICAL" ? 96 : 84,
    healthScore: input.severity === "CRITICAL" ? 92 : 80,
    severityScore: input.severity === "CRITICAL" ? 98 : 85,
    commercialTierScore: 95,
    workflowGateScore: 90,
  });

  const cockpitItem = {
    workItemId,
    workItemType: "ACTIVE_EXCEPTION" as const,
    title: input.title,
    description: input.summary,
    attentionScore: scoreBreakdown.totalAttentionScore,
    scoreBreakdown,
    urgencyBucket:
      input.severity === "CRITICAL"
        ? ("IMMEDIATE_ACTION" as const)
        : ("DUE_TODAY" as const),
    status: "OPEN" as const,
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    teamId: "team_control_tower",
    assigneeUserId: actor.userId,
    assigneeName: "Coordinator Desk (Tú)",
    subject: {
      entityType: "SHIPMENT" as const,
      entityId: input.shipmentId,
      referenceNumber: input.referenceNumber,
      shipmentId: input.shipmentId,
      customerName: input.customerName,
      customerTier: "STRATEGIC_VIP" as const,
      routeSummary: input.routeSummary,
      transportMode: input.transportMode,
    },
    shipmentHealth:
      input.severity === "CRITICAL"
        ? ("CRITICAL" as const)
        : ("AT_RISK" as const),
    slaSnapshot: {
      slaInstanceId: `sla_${input.milestoneCode.toLowerCase()}`,
      slaName: `Mitigación ${input.category} (${input.locationLocode})`,
      status: "AT_RISK" as const,
      deadlineAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      remainingMinutes: 120,
    },
    dataQualityGate:
      input.category === "DATA_QUALITY_BLOCK"
        ? ("BLOCKED" as const)
        : ("PASSED" as const),
    primaryAction: {
      commandName: input.actionCommandName,
      actionLabel: input.actionLabel,
      inputPlaceholder: "Plan de mitigación / evidencia de resolución...",
      defaultResolutionValue: input.defaultResolutionValue,
    },
    updatedAt: nowIso,
  };

  await db
    .insert(scmCockpitWorkItems)
    .values({
      workItemId,
      workItemType: cockpitItem.workItemType,
      title: cockpitItem.title,
      description: cockpitItem.description,
      attentionScore: cockpitItem.attentionScore,
      urgencyBucket: cockpitItem.urgencyBucket,
      status: "OPEN",
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      teamId: cockpitItem.teamId,
      assigneeUserId: actor.userId,
      shipmentId: input.shipmentId,
      referenceNumber: input.referenceNumber,
      itemModelJson: JSON.stringify(cockpitItem),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "exception_mgmt.ExceptionDetected.v1",
      schemaVersion: 1,
      producerContext: "exception_mgmt",
      aggregateType: "Exception",
      aggregateId: exceptionId,
      aggregateVersion: 1,
      correlationId: uuidv4(),
      causationId: uuidv4(),
      actor,
      occurredAt: nowIso,
      payload: {
        exceptionId,
        dedupKey,
        shipmentId: input.shipmentId,
        referenceNumber: input.referenceNumber,
        category: input.category,
        severity: input.severity,
        title: input.title,
        summary: input.summary,
        milestoneCode: input.milestoneCode,
        locationLocode: input.locationLocode,
        occurrenceCount: 1,
        linkedWorkItemId: workItemId,
      },
    },
  ]);

  return {
    exceptionId,
    deduplicated: false,
    occurrenceCount: 1,
    severity: input.severity,
    linkedWorkItemId: workItemId,
  };
}

/**
 * 13. EXCEPTION MANAGEMENT: Links N exceptions across shipments into a macro Incident (N:1).
 */
export async function promoteExceptionsToMacroIncident(
  input: {
    incidentNumber?: string;
    title: string;
    category:
      | "PORT_CONGESTION"
      | "VESSEL_SCHEDULE_DISRUPTION"
      | "CUSTOMS_SYSTEM_OUTAGE"
      | "WEATHER_DISRUPTION";
    severity: "HIGH" | "CRITICAL";
    affectedLocode: string;
    affectedVesselOrFlight?: string;
    exceptionIds: string[];
    summary: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureScmFoundationTables();

  assertInvariant(
    input.exceptionIds && input.exceptionIds.length > 0,
    "exception_mgmt",
    "INCIDENT_REQUIRES_EXCEPTIONS",
    "At least one Exception ID is required to create or link a macro Incident",
  );

  const incidentId = `inc_${uuidv4().substring(0, 10)}`;
  const incidentNumber =
    input.incidentNumber || `INC-2026-${randomInt(1000, 10000)}`;
  const nowIso = new Date().toISOString();

  const impactedShipmentIds = new Set<string>();

  for (const excId of input.exceptionIds) {
    const rows = await db
      .select()
      .from(scmOperationalExceptions)
      .where(eq(scmOperationalExceptions.id, excId))
      .limit(1);

    if (rows.length > 0) {
      impactedShipmentIds.add(rows[0].shipmentId);
      await db
        .update(scmOperationalExceptions)
        .set({
          incidentId,
          incidentNumber,
        })
        .where(eq(scmOperationalExceptions.id, excId));
    }
  }

  const shipmentIdsArray = Array.from(impactedShipmentIds);

  await db.insert(scmOperationalIncidents).values({
    id: incidentId,
    incidentNumber,
    title: input.title,
    category: input.category,
    severity: input.severity,
    status: "ACTIVE",
    affectedLocode: input.affectedLocode,
    affectedVesselOrFlight: input.affectedVesselOrFlight || null,
    impactedShipmentIdsJson: JSON.stringify(shipmentIdsArray),
    summary: input.summary,
    organizationId: actor.organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "exception_mgmt.IncidentCreated.v1",
      schemaVersion: 1,
      producerContext: "exception_mgmt",
      aggregateType: "Incident",
      aggregateId: incidentId,
      aggregateVersion: 1,
      correlationId: uuidv4(),
      causationId: uuidv4(),
      actor,
      occurredAt: nowIso,
      payload: {
        incidentId,
        incidentNumber,
        title: input.title,
        category: input.category,
        severity: input.severity,
        affectedLocode: input.affectedLocode,
        affectedVesselOrFlight: input.affectedVesselOrFlight,
        exceptionIds: input.exceptionIds,
        impactedShipmentIds: shipmentIdsArray,
        summary: input.summary,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();

  return {
    incidentId,
    incidentNumber,
    title: input.title,
    category: input.category,
    severity: input.severity,
    affectedLocode: input.affectedLocode,
    impactedShipmentIds: shipmentIdsArray,
    linkedExceptionIds: input.exceptionIds,
  };
}

/**
 * 19. DATA QUALITY ENGINE: Contextual 4-Stage Gate Assessment
 * Stages: BOOKING -> PRE_DEPARTURE_EXPORT -> CUSTOMS_CLEARANCE -> BILLING_READY
 */
export async function evaluateShipmentDataQuality(
  shipmentId: string,
  targetStage: DataQualityStage = "PRE_DEPARTURE_EXPORT",
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureScmFoundationTables();

  const viewRows = await db
    .select()
    .from(scmShipment360Views)
    .where(eq(scmShipment360Views.shipmentId, shipmentId))
    .limit(1);

  assertInvariant(
    viewRows.length > 0,
    "data_quality",
    "SHIPMENT_NOT_FOUND_FOR_DQ",
    `Shipment '${shipmentId}' not found for Data Quality evaluation`,
  );

  const model = JSON.parse(viewRows[0].readModelJson);
  const findings: QualityFinding[] = [];

  // Stage 1: BOOKING rules
  if ((model.commercialContext?.linkedOrders || []).length === 0) {
    findings.push({
      findingCode: "DQ_BOOKING_MISSING_ORDER",
      stage: "BOOKING",
      severity: "BLOCKING",
      fieldPath: "commercialContext.linkedOrders",
      message: "El expediente no tiene ninguna CustomerOrder vinculada.",
      remediationHint: "Vincular al menos una orden confirmada del cliente.",
    });
  }
  if ((model.routing?.legs || []).length === 0) {
    findings.push({
      findingCode: "DQ_BOOKING_MISSING_ROUTE",
      stage: "BOOKING",
      severity: "BLOCKING",
      fieldPath: "routing.legs",
      message: "No existe un RoutePlan publicado con tramos de transporte.",
      remediationHint: "Publicar la versión inicial v1 del RoutePlan.",
    });
  }

  // Stage 2: PRE_DEPARTURE_EXPORT rules (evaluated if targetStage >= PRE_DEPARTURE_EXPORT)
  const stageOrder: Record<DataQualityStage, number> = {
    BOOKING: 1,
    PRE_DEPARTURE_EXPORT: 2,
    CUSTOMS_CLEARANCE: 3,
    BILLING_READY: 4,
  };

  if (stageOrder[targetStage] >= 2) {
    if ((model.cargoAndEquipment?.totals?.packagesCount || 0) <= 0) {
      findings.push({
        findingCode: "DQ_EXPORT_MISSING_CARGO",
        stage: "PRE_DEPARTURE_EXPORT",
        severity: "BLOCKING",
        fieldPath: "cargoAndEquipment.cargoItems",
        message: "No se ha declarado el manifiesto de carga (bultos y pesos).",
        remediationHint: "Declarar Cargo -> Packages -> Goods.",
      });
    }

    const equipList = model.cargoAndEquipment?.equipment || [];
    if (equipList.length === 0) {
      findings.push({
        findingCode: "DQ_EXPORT_MISSING_EQUIPMENT",
        stage: "PRE_DEPARTURE_EXPORT",
        severity: "BLOCKING",
        fieldPath: "cargoAndEquipment.equipment",
        message: "No hay unidades de equipamiento (contenedor/ULD) asignadas.",
        remediationHint: "Asignar contenedor o ULD con precintos.",
      });
    } else if (isSolasVgmApplicable(model.header?.serviceProduct?.mode)) {
      // SOLAS VGM applies only to packed sea containers (never ULD / trailers)
      const missingVgm = equipList.some(
        (eqItem: any) =>
          (!eqItem.equipmentCategory ||
            eqItem.equipmentCategory === "CONTAINER") &&
          (!eqItem.vgmWeightKg || eqItem.vgmWeightKg <= 0),
      );
      if (missingVgm) {
        findings.push({
          findingCode: "DQ_EXPORT_MISSING_SOLAS_VGM",
          stage: "PRE_DEPARTURE_EXPORT",
          severity: "BLOCKING",
          fieldPath: "cargoAndEquipment.equipment[*].vgmWeightKg",
          message:
            "Falta certificación de peso verificado SOLAS VGM en contenedor marítimo.",
          remediationHint: "Registrar VGM >= Tara + Payload antes del Cut-Off.",
        });
      }
    }
  }

  // Stage 3: CUSTOMS_CLEARANCE rules
  if (stageOrder[targetStage] >= 3) {
    const allGoods: any[] = [];
    for (const ci of model.cargoAndEquipment?.cargoItems || []) {
      for (const pkg of ci.packages || []) {
        for (const g of pkg.goods || []) {
          allGoods.push(g);
        }
      }
    }
    const invalidHs = allGoods.some(
      (g) => !g.hsCode || String(g.hsCode).replace(/\./g, "").length < 6,
    );
    if (invalidHs) {
      findings.push({
        findingCode: "DQ_CUSTOMS_INVALID_HS_CODE",
        stage: "CUSTOMS_CLEARANCE",
        severity: "BLOCKING",
        fieldPath: "cargoAndEquipment.cargoItems[*].goods[*].hsCode",
        message:
          "Alguna partida de mercancía carece de código arancelario HS (mínimo 6 dígitos).",
        remediationHint: "Completar código TARIC/HS de 6+ dígitos.",
      });
    }
  }

  // Stage 4: BILLING_READY rules
  if (stageOrder[targetStage] >= 4) {
    const dbExceptions = await db
      .select()
      .from(scmOperationalExceptions)
      .where(eq(scmOperationalExceptions.shipmentId, shipmentId));
    const openExceptions = dbExceptions.filter((e) => e.status !== "RESOLVED");
    if (openExceptions.length > 0) {
      findings.push({
        findingCode: "DQ_BILLING_OPEN_EXCEPTIONS",
        stage: "BILLING_READY",
        severity: "BLOCKING",
        fieldPath: "actionableItems.exceptions",
        message: `Existen ${openExceptions.length} excepciones operativas abiertas pendientes de cierre.`,
        remediationHint:
          "Resolver las excepciones activas antes del cierre financiero.",
      });
    }
  }

  const blockingCount = findings.filter(
    (f) => f.severity === "BLOCKING",
  ).length;
  const warningCount = findings.filter((f) => f.severity === "WARN").length;
  const score = Math.max(0, 100 - blockingCount * 25 - warningCount * 10);
  const gateStatus: "PASSED" | "WARN" | "BLOCKED" =
    blockingCount > 0 ? "BLOCKED" : warningCount > 0 ? "WARN" : "PASSED";

  const nowIso = new Date().toISOString();

  await db
    .insert(scmQualityAssessments)
    .values({
      id: `dqa_${uuidv4().substring(0, 10)}`,
      shipmentId,
      activeStage: targetStage,
      score,
      gateStatus,
      blockingFindingsCount: blockingCount,
      warningFindingsCount: warningCount,
      findingsJson: JSON.stringify(findings),
      organizationId: actor.organizationId,
      branchId: actor.branchId,
      evaluatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: scmQualityAssessments.shipmentId,
      set: {
        activeStage: targetStage,
        score,
        gateStatus,
        blockingFindingsCount: blockingCount,
        warningFindingsCount: warningCount,
        findingsJson: JSON.stringify(findings),
        evaluatedAt: new Date(),
      },
    });

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "data_quality.QualityAssessmentCompleted.v1",
      schemaVersion: 1,
      producerContext: "data_quality",
      aggregateType: "QualityAssessment",
      aggregateId: shipmentId,
      aggregateVersion: 1,
      correlationId: uuidv4(),
      causationId: uuidv4(),
      actor,
      occurredAt: nowIso,
      payload: {
        shipmentId,
        activeStage: targetStage,
        score,
        gateStatus,
        openFindingsCount: findings.length,
        findings,
      },
    },
  ]);

  if (gateStatus === "BLOCKED") {
    await raiseOrDeduplicateException(
      {
        shipmentId,
        referenceNumber: model.referenceNumber,
        customerName:
          model.commercialContext?.customerAccount?.name || "Customer",
        routeSummary: `${model.routing?.legs?.[0]?.originLocode || "POL"} → ${model.routing?.legs?.[model.routing?.legs?.length - 1]?.destinationLocode || "POD"}`,
        transportMode: (model.header?.serviceProduct?.mode as any) || "SEA",
        category: "DATA_QUALITY_BLOCK",
        severity: "HIGH",
        title: `Data Quality Gate Bloqueado en etapa ${targetStage} (${blockingCount} hallazgos)`,
        summary: findings.map((f) => f.message).join(" | "),
        milestoneCode: resolvePreDepartureCutoffMilestone(
          model.header?.serviceProduct?.mode,
        ).milestoneCode,
        locationLocode: model.routing?.legs?.[0]?.originLocode || "POL",
        actionCommandName: "data_quality.RemediateAndRevalidateGate",
        actionLabel: "Subsanar Hallazgos y Re-Evaluar Gate",
        defaultResolutionValue: `Subsanados ${blockingCount} hallazgos en etapa ${targetStage}.`,
      },
      actor,
    );
  }

  await outboxBus.relayPendingEvents();

  return {
    shipmentId,
    activeStage: targetStage,
    score,
    gateStatus,
    blockingFindingsCount: blockingCount,
    warningFindingsCount: warningCount,
    findings,
  };
}

/**
 * Registers reactive subscribers connecting Slice 2 (Tracking & Events)
 * to Slice 3 (SLA Stop-Clock, Exception Deduplication, Data Quality & Smart Work Queue).
 */
export function registerControlEnginesSubscribers(): void {
  if (controlSubscribersRegistered) return;

  // 1. On RouteVersionPublished -> Initialize SLA clocks
  outboxBus.subscribe(
    "transport_planning.RouteVersionPublished.v1",
    "sla_mgmt.OnRouteVersionPublished",
    async (event) => {
      await initializeSlaClocksForShipment(event.payload, event.actor);
    },
  );

  // 2. On TransportEventReceived -> Trigger automatic SLA Stop-Clock or Exceptions
  outboxBus.subscribe(
    "tracking_events.TransportEventReceived.v1",
    "control_engines.OnTransportEventReceived",
    async (event) => {
      const p = event.payload;
      const viewRows = await db
        .select()
        .from(scmShipment360Views)
        .where(eq(scmShipment360Views.shipmentId, p.shipmentId))
        .limit(1);

      const model =
        viewRows.length > 0 ? JSON.parse(viewRows[0].readModelJson) : null;
      const refNo = model?.referenceNumber || p.shipmentId;
      const custName =
        model?.commercialContext?.customerAccount?.name || "Customer";
      const mode = model?.header?.serviceProduct?.mode || "SEA";
      const routeSummary = `${p.locationLocode} (${p.milestoneCode})`;

      if (p.eventCode === "CUSTOMS_HOLD") {
        // Automatically pause SLA_CUSTOMS_RELEASE (Stop-Clock)
        await toggleSlaStopClock(
          {
            shipmentId: p.shipmentId,
            slaCode: "SLA_CUSTOMS_RELEASE",
            action: "PAUSE",
            reason: `Stop-Clock automático: ${p.summary}`,
          },
          event.actor,
        );

        await raiseOrDeduplicateException(
          {
            shipmentId: p.shipmentId,
            referenceNumber: refNo,
            customerName: custName,
            routeSummary,
            transportMode: mode,
            category: "CUSTOMS_HOLD",
            severity: "CRITICAL",
            title: `Retención Aduanera en ${p.locationLocode} (Stop-Clock SLA Activo)`,
            summary: p.summary,
            milestoneCode: p.milestoneCode,
            locationLocode: p.locationLocode,
            actionCommandName: "customs.SubmitInspectionClearanceDocs",
            actionLabel: "Aportar Documentación Aduanera y Liberar Hold",
            defaultResolutionValue:
              "Certificado EUR.1 y factura comercial verificados por AEAT. Levante autorizado.",
          },
          event.actor,
        );
      } else if (p.eventCode === "CUSTOMS_RELEASED") {
        // Automatically resume SLA_CUSTOMS_RELEASE and extend deadline
        await toggleSlaStopClock(
          {
            shipmentId: p.shipmentId,
            slaCode: "SLA_CUSTOMS_RELEASE",
            action: "RESUME",
            reason: `Levante aduanero confirmado: ${p.summary}`,
            simulatedPauseMinutes: 180,
          },
          event.actor,
        );
      } else if (p.eventCode === "TEMP_EXCURSION") {
        await raiseOrDeduplicateException(
          {
            shipmentId: p.shipmentId,
            referenceNumber: refNo,
            customerName: custName,
            routeSummary,
            transportMode: mode,
            category: "TEMPERATURE_EXCURSION",
            severity: "CRITICAL",
            title: `Excursión Térmica IoT en ${p.locationLocode}`,
            summary: p.summary,
            milestoneCode: p.milestoneCode,
            locationLocode: p.locationLocode,
            actionCommandName: "exception_mgmt.ResolveColdChainAlert",
            actionLabel: "Certificar Re-Estabilización Térmica GDP",
            defaultResolutionValue:
              "Set-point restablecido a +5.0°C dentro del margen de estabilidad MKT.",
          },
          event.actor,
        );
      }
    },
  );

  // 3. On ETAChanged -> Evaluate delay variance, mark SLA_TRANSIT_PUNCTUALITY AT_RISK, and raise/deduplicate ETA_DELAY exception
  outboxBus.subscribe(
    "tracking_events.ETAChanged.v1",
    "control_engines.OnETAChanged",
    async (event) => {
      const p = event.payload;
      if ((p.varianceMinutes ?? 0) <= 120) return;

      const slaRows = await db
        .select()
        .from(scmSlaInstances)
        .where(
          and(
            eq(scmSlaInstances.shipmentId, p.shipmentId),
            eq(scmSlaInstances.slaCode, "SLA_TRANSIT_PUNCTUALITY"),
          ),
        )
        .limit(1);

      const newSlaStatus = p.varianceMinutes >= 1440 ? "BREACHED" : "AT_RISK";

      if (slaRows.length > 0 && slaRows[0].status !== "PAUSED") {
        await db
          .update(scmSlaInstances)
          .set({
            status: newSlaStatus,
            updatedAt: new Date(),
          })
          .where(eq(scmSlaInstances.id, slaRows[0].id));

        await outboxBus.enqueueEvents([
          {
            eventId: `evt_${uuidv4()}`,
            eventType: "sla_mgmt.SLAAtRisk.v1",
            schemaVersion: 1,
            producerContext: "sla_mgmt",
            aggregateType: "SLAInstance",
            aggregateId: slaRows[0].id,
            aggregateVersion: 2,
            correlationId: uuidv4(),
            causationId: uuidv4(),
            actor: event.actor,
            occurredAt: new Date().toISOString(),
            payload: {
              slaId: slaRows[0].id,
              shipmentId: p.shipmentId,
              slaCode: "SLA_TRANSIT_PUNCTUALITY",
              status: newSlaStatus,
              varianceMinutes: p.varianceMinutes,
            },
          },
        ]);
      }

      const viewRows = await db
        .select()
        .from(scmShipment360Views)
        .where(eq(scmShipment360Views.shipmentId, p.shipmentId))
        .limit(1);
      const model =
        viewRows.length > 0 ? JSON.parse(viewRows[0].readModelJson) : null;

      await raiseOrDeduplicateException(
        {
          shipmentId: p.shipmentId,
          referenceNumber: model?.referenceNumber || p.shipmentId,
          customerName:
            model?.commercialContext?.customerAccount?.name || "Customer",
          routeSummary: `${p.locationLocode} (${p.milestoneCode})`,
          transportMode: model?.header?.serviceProduct?.mode || "SEA",
          category: "ETA_DELAY",
          severity: p.varianceMinutes >= 1440 ? "CRITICAL" : "HIGH",
          title: `Retraso de ETA (+${Math.round(p.varianceMinutes / 60)}h) en ${p.locationLocode}`,
          summary: p.summary,
          milestoneCode: p.milestoneCode,
          locationLocode: p.locationLocode,
          actionCommandName: "transport_planning.AcknowledgeAndMitigateDelay",
          actionLabel: "Notificar Cliente y Reprogramar Entrega Destino",
          defaultResolutionValue: `Ventana de descarga en destino reprogramada (+${Math.round(p.varianceMinutes / 60)}h) y cliente notificado.`,
        },
        event.actor,
      );
    },
  );

  controlSubscribersRegistered = true;
}
