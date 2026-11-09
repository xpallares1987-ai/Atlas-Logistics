import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmTrackingEventsStream,
  scmMilestonePlans,
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
  resolveModeFromLegs,
  resolvePreDepartureCutoffMilestone,
} from "../../kernel/transport-mode.js";

export type TrackingSourceType =
  | "TERMINAL_PORT_CUSTOMS"
  | "CARRIER_DCSA_EDI"
  | "IOT_AIS_TELEMETRY"
  | "MANUAL_OPERATOR";

export const SOURCE_TRUST_RANK: Record<TrackingSourceType, number> = {
  TERMINAL_PORT_CUSTOMS: 4,
  CARRIER_DCSA_EDI: 3,
  IOT_AIS_TELEMETRY: 2,
  MANUAL_OPERATOR: 1,
};

export interface MilestoneItem {
  milestoneCode: string;
  label: string;
  locationLocode: string;
  plannedAt?: string;
  estimatedAt?: string;
  actualAt?: string;
  actualConfirmedBySource?: TrackingSourceType;
  actualConfirmedRank?: number;
  varianceMinutes?: number;
  status: "PLANNED" | "ESTIMATED" | "DELAYED" | "COMPLETED";
  estimationHistory: Array<{
    timestampKind: "PLANNED" | "ESTIMATED" | "ACTUAL";
    timestamp: string;
    sourceType: TrackingSourceType;
    recordedAt: string;
    summary: string;
  }>;
}

export interface IngestTrackingEventInput {
  shipmentId: string;
  eventCode:
    | "GATE_IN"
    | "VGM_VERIFIED"
    | "VESSEL_DEPARTED"
    | "ETA_UPDATED"
    | "CUSTOMS_HOLD"
    | "CUSTOMS_RELEASED"
    | "TEMP_EXCURSION"
    | "DELIVERED";
  milestoneCode:
    | "VGM_CUTOFF"
    | "AWB_SECURITY_CUTOFF"
    | "CMR_LOADING_CHECK"
    | "ETD_POL"
    | "TRANSSHIPMENT"
    | "ETA_POD"
    | "CUSTOMS_CLEARANCE"
    | "POD_DELIVERY";
  locationLocode: string;
  sourceType: TrackingSourceType;
  timestampKind: "PLANNED" | "ESTIMATED" | "ACTUAL";
  eventTimestamp: string;
  summary: string;
  metadata?: Record<string, any>;
}

function computeVarianceMinutes(
  plannedIso?: string,
  comparisonIso?: string,
): number | undefined {
  if (!plannedIso || !comparisonIso) return undefined;
  const p = new Date(plannedIso).getTime();
  const c = new Date(comparisonIso).getTime();
  if (Number.isNaN(p) || Number.isNaN(c)) return undefined;
  return Math.round((c - p) / 60000);
}

/**
 * Generates or updates a Shipment's MilestonePlan reactively when a RoutePlan version is published.
 * Preserves any ACTUAL timestamps and estimation history from previous route versions.
 */
export async function syncMilestonePlanFromRouteVersion(
  payload: {
    shipmentId: string;
    versionNo: number;
    stops: any[];
    legs: any[];
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<MilestoneItem[]> {
  await ensureScmFoundationTables();

  const existingRows = await db
    .select()
    .from(scmMilestonePlans)
    .where(eq(scmMilestonePlans.shipmentId, payload.shipmentId))
    .limit(1);

  const previousMilestones: MilestoneItem[] =
    existingRows.length > 0 ? JSON.parse(existingRows[0].milestonesJson) : [];

  const firstStop = payload.stops[0];
  const firstLeg = payload.legs[0];
  const lastLeg = payload.legs[payload.legs.length - 1];
  const lastStop = payload.stops[payload.stops.length - 1];

  const nowIso = new Date().toISOString();
  const generated: MilestoneItem[] = [];

  // 1. Pre-departure Cargo Cut-Off at POL (mode-aware: SOLAS VGM only for Ocean;
  //    Air -> e-AWB & security lodge-in; Road/Rail -> vehicle loading & e-CMR)
  const cutoff = resolvePreDepartureCutoffMilestone(
    resolveModeFromLegs(payload.legs),
  );
  const vgmPlanned =
    (cutoff.milestoneCode === "VGM_CUTOFF"
      ? firstStop?.cutOffs?.vgmCutOffAt
      : firstStop?.cutOffs?.gateInCutOffAt) ||
    (firstLeg?.plannedDepartureAt
      ? new Date(
          new Date(firstLeg.plannedDepartureAt).getTime() - 48 * 3600 * 1000,
        ).toISOString()
      : undefined);

  generated.push({
    milestoneCode: cutoff.milestoneCode,
    label: `${cutoff.label} (${firstStop?.locationId || firstLeg?.originLocode || "POL"})`,
    locationLocode: firstStop?.locationId || firstLeg?.originLocode || "POL",
    plannedAt: vgmPlanned,
    status: "PLANNED",
    estimationHistory: vgmPlanned
      ? [
          {
            timestampKind: "PLANNED",
            timestamp: vgmPlanned,
            sourceType: "CARRIER_DCSA_EDI",
            recordedAt: nowIso,
            summary: `Cut-off planificado en RoutePlan v${payload.versionNo}`,
          },
        ]
      : [],
  });

  // 2. ETD Main Carriage at POL
  generated.push({
    milestoneCode: "ETD_POL",
    label: `Salida Principal (${firstLeg?.originLocode || "POL"} · ${firstLeg?.vesselOrFlight || "Carrier"})`,
    locationLocode: firstLeg?.originLocode || "POL",
    plannedAt: firstLeg?.plannedDepartureAt,
    estimatedAt: firstLeg?.plannedDepartureAt,
    status: "PLANNED",
    estimationHistory: firstLeg?.plannedDepartureAt
      ? [
          {
            timestampKind: "PLANNED",
            timestamp: firstLeg.plannedDepartureAt,
            sourceType: "CARRIER_DCSA_EDI",
            recordedAt: nowIso,
            summary: `ETD planificado en RoutePlan v${payload.versionNo}`,
          },
        ]
      : [],
  });

  // 3. Intermediate Transshipment (if > 1 leg)
  if (payload.legs.length > 1) {
    const transStop = payload.stops[1];
    generated.push({
      milestoneCode: "TRANSSHIPMENT",
      label: `Escala / Transbordo (${transStop?.locationId || firstLeg?.destinationLocode})`,
      locationLocode:
        transStop?.locationId || firstLeg?.destinationLocode || "HUB",
      plannedAt: firstLeg?.plannedArrivalAt,
      estimatedAt: firstLeg?.plannedArrivalAt,
      status: "PLANNED",
      estimationHistory: firstLeg?.plannedArrivalAt
        ? [
            {
              timestampKind: "PLANNED",
              timestamp: firstLeg.plannedArrivalAt,
              sourceType: "CARRIER_DCSA_EDI",
              recordedAt: nowIso,
              summary: `Llegada a hub planificada en RoutePlan v${payload.versionNo}`,
            },
          ]
        : [],
    });
  }

  // 4. ETA at Destination POD
  generated.push({
    milestoneCode: "ETA_POD",
    label: `Llegada a Destino (${lastLeg?.destinationLocode || lastStop?.locationId || "POD"})`,
    locationLocode: lastLeg?.destinationLocode || lastStop?.locationId || "POD",
    plannedAt: lastLeg?.plannedArrivalAt,
    estimatedAt: lastLeg?.plannedArrivalAt,
    status: "PLANNED",
    estimationHistory: lastLeg?.plannedArrivalAt
      ? [
          {
            timestampKind: "PLANNED",
            timestamp: lastLeg.plannedArrivalAt,
            sourceType: "CARRIER_DCSA_EDI",
            recordedAt: nowIso,
            summary: `ETA planificado en RoutePlan v${payload.versionNo}`,
          },
        ]
      : [],
  });

  // 5. Customs Clearance at Destination
  const customsPlanned = lastLeg?.plannedArrivalAt
    ? new Date(
        new Date(lastLeg.plannedArrivalAt).getTime() + 12 * 3600 * 1000,
      ).toISOString()
    : undefined;
  generated.push({
    milestoneCode: "CUSTOMS_CLEARANCE",
    label: `Despacho Aduanero & Levante (${lastLeg?.destinationLocode || "POD"})`,
    locationLocode: lastLeg?.destinationLocode || "POD",
    plannedAt: customsPlanned,
    status: "PLANNED",
    estimationHistory: [],
  });

  // 6. Final Delivery (POD_DELIVERY)
  const deliveryPlanned = lastLeg?.plannedArrivalAt
    ? new Date(
        new Date(lastLeg.plannedArrivalAt).getTime() + 36 * 3600 * 1000,
      ).toISOString()
    : undefined;
  generated.push({
    milestoneCode: "POD_DELIVERY",
    label: `Entrega Final POD (${lastLeg?.destinationLocode || "DEST"})`,
    locationLocode: lastLeg?.destinationLocode || "DEST",
    plannedAt: deliveryPlanned,
    status: "PLANNED",
    estimationHistory: [],
  });

  // Merge preserved ACTUALs and estimation history from previous version
  const merged = generated.map((item) => {
    const prev = previousMilestones.find(
      (p) => p.milestoneCode === item.milestoneCode,
    );
    if (!prev) return item;
    return {
      ...item,
      estimatedAt: prev.estimatedAt || item.estimatedAt,
      actualAt: prev.actualAt,
      actualConfirmedBySource: prev.actualConfirmedBySource,
      actualConfirmedRank: prev.actualConfirmedRank,
      varianceMinutes: computeVarianceMinutes(
        item.plannedAt,
        prev.actualAt || prev.estimatedAt,
      ),
      status: prev.actualAt ? "COMPLETED" : prev.status,
      estimationHistory: [
        ...(prev.estimationHistory || []),
        ...item.estimationHistory,
      ],
    };
  });

  if (existingRows.length === 0) {
    await db.insert(scmMilestonePlans).values({
      id: `mlp_${uuidv4()}`,
      shipmentId: payload.shipmentId,
      routeVersionNo: payload.versionNo,
      milestonesJson: JSON.stringify(merged),
      version: 1,
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(scmMilestonePlans)
      .set({
        routeVersionNo: payload.versionNo,
        milestonesJson: JSON.stringify(merged),
        version: existingRows[0].version + 1,
        updatedAt: new Date(),
      })
      .where(eq(scmMilestonePlans.shipmentId, payload.shipmentId));
  }

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "tracking_events.MilestonePlanSynced.v1",
      schemaVersion: 1,
      producerContext: "tracking_events",
      aggregateType: "MilestonePlan",
      aggregateId: payload.shipmentId,
      aggregateVersion: payload.versionNo,
      correlationId: uuidv4(),
      causationId: uuidv4(),
      actor,
      occurredAt: nowIso,
      payload: {
        shipmentId: payload.shipmentId,
        routeVersionNo: payload.versionNo,
        milestones: merged,
      },
    },
  ]);

  return merged;
}

/**
 * Ingests an immutable operational event into `tracking_events_stream`,
 * reconciles `Planned / Estimated / Actual` on the `MilestonePlan` enforcing
 * source trust rank precedence (Terminal [4] > Carrier EDI [3] > IoT/AIS [2] > Manual [1]),
 * and emits Domain Events via Transactional Outbox.
 */
export async function ingestOperationalTrackingEvent(
  input: IngestTrackingEventInput,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
) {
  await ensureScmFoundationTables();

  const incomingRank = SOURCE_TRUST_RANK[input.sourceType] ?? 1;
  const nowIso = new Date().toISOString();
  const streamEventId = `tev_${uuidv4()}`;

  const planRows = await db
    .select()
    .from(scmMilestonePlans)
    .where(eq(scmMilestonePlans.shipmentId, input.shipmentId))
    .limit(1);

  assertInvariant(
    planRows.length > 0,
    "tracking_events",
    "MILESTONE_PLAN_NOT_FOUND",
    `MilestonePlan for shipment '${input.shipmentId}' not found`,
  );

  const planRow = planRows[0];
  const milestones: MilestoneItem[] = JSON.parse(planRow.milestonesJson);

  let targetMilestone = milestones.find(
    (m) => m.milestoneCode === input.milestoneCode,
  );
  if (!targetMilestone) {
    targetMilestone = {
      milestoneCode: input.milestoneCode,
      label: input.milestoneCode,
      locationLocode: input.locationLocode,
      plannedAt: input.eventTimestamp,
      status: "PLANNED",
      estimationHistory: [],
    };
    milestones.push(targetMilestone);
  }

  // Source Precedence Guard: A lower-trust source cannot overwrite an ACTUAL confirmed by a higher-trust source
  if (
    input.timestampKind === "ACTUAL" &&
    targetMilestone.actualAt &&
    (targetMilestone.actualConfirmedRank ?? 0) > incomingRank
  ) {
    assertInvariant(
      false,
      "tracking_events",
      "MILESTONE_HIGHER_TRUST_ACTUAL_LOCKED",
      `Cannot overwrite ACTUAL milestone '${input.milestoneCode}' confirmed by '${targetMilestone.actualConfirmedBySource}' (rank ${targetMilestone.actualConfirmedRank}) with lower-trust source '${input.sourceType}' (rank ${incomingRank}).`,
    );
  }

  // Record in append-only event stream
  await db.insert(scmTrackingEventsStream).values({
    eventId: streamEventId,
    shipmentId: input.shipmentId,
    eventCode: input.eventCode,
    milestoneCode: input.milestoneCode,
    locationLocode: input.locationLocode,
    sourceType: input.sourceType,
    sourceTrustRank: incomingRank,
    timestampKind: input.timestampKind,
    eventTimestamp: input.eventTimestamp,
    summary: input.summary,
    payloadJson: JSON.stringify(input.metadata || {}),
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    recordedAt: new Date(),
  });

  // Reconcile Milestone timestamps & status
  targetMilestone.estimationHistory = targetMilestone.estimationHistory || [];
  targetMilestone.estimationHistory.unshift({
    timestampKind: input.timestampKind,
    timestamp: input.eventTimestamp,
    sourceType: input.sourceType,
    recordedAt: nowIso,
    summary: input.summary,
  });

  if (input.timestampKind === "PLANNED") {
    targetMilestone.plannedAt = input.eventTimestamp;
  } else if (input.timestampKind === "ESTIMATED") {
    // Only update estimatedAt if milestone is not already COMPLETED
    if (!targetMilestone.actualAt) {
      targetMilestone.estimatedAt = input.eventTimestamp;
    }
  } else if (input.timestampKind === "ACTUAL") {
    targetMilestone.actualAt = input.eventTimestamp;
    targetMilestone.actualConfirmedBySource = input.sourceType;
    targetMilestone.actualConfirmedRank = incomingRank;
    targetMilestone.status = "COMPLETED";
  }

  const varianceMinutes = computeVarianceMinutes(
    targetMilestone.plannedAt,
    targetMilestone.actualAt || targetMilestone.estimatedAt,
  );
  targetMilestone.varianceMinutes = varianceMinutes;

  if (!targetMilestone.actualAt) {
    if (varianceMinutes !== undefined && varianceMinutes > 120) {
      targetMilestone.status = "DELAYED";
    } else if (targetMilestone.estimatedAt) {
      targetMilestone.status = "ESTIMATED";
    }
  }

  await db
    .update(scmMilestonePlans)
    .set({
      milestonesJson: JSON.stringify(milestones),
      version: planRow.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(scmMilestonePlans.shipmentId, input.shipmentId));

  const corrId = uuidv4();
  const domainEvents: any[] = [
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "tracking_events.TransportEventReceived.v1",
      schemaVersion: 1,
      producerContext: "tracking_events",
      aggregateType: "EventStream",
      aggregateId: input.shipmentId,
      aggregateVersion: planRow.version + 1,
      correlationId: corrId,
      causationId: corrId,
      actor,
      occurredAt: nowIso,
      payload: {
        streamEventId,
        shipmentId: input.shipmentId,
        eventCode: input.eventCode,
        milestoneCode: input.milestoneCode,
        locationLocode: input.locationLocode,
        sourceType: input.sourceType,
        sourceTrustRank: incomingRank,
        timestampKind: input.timestampKind,
        eventTimestamp: input.eventTimestamp,
        varianceMinutes,
        summary: input.summary,
        metadata: input.metadata || {},
        milestones,
      },
    },
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "tracking_events.MilestoneUpdated.v1",
      schemaVersion: 1,
      producerContext: "tracking_events",
      aggregateType: "MilestonePlan",
      aggregateId: input.shipmentId,
      aggregateVersion: planRow.version + 1,
      correlationId: corrId,
      causationId: corrId,
      actor,
      occurredAt: nowIso,
      payload: {
        shipmentId: input.shipmentId,
        milestone: targetMilestone,
        milestones,
      },
    },
  ];

  if (input.eventCode === "ETA_UPDATED") {
    domainEvents.push({
      eventId: `evt_${uuidv4()}`,
      eventType: "tracking_events.ETAChanged.v1",
      schemaVersion: 1,
      producerContext: "tracking_events",
      aggregateType: "MilestonePlan",
      aggregateId: input.shipmentId,
      aggregateVersion: planRow.version + 1,
      correlationId: corrId,
      causationId: corrId,
      actor,
      occurredAt: nowIso,
      payload: {
        shipmentId: input.shipmentId,
        milestoneCode: input.milestoneCode,
        locationLocode: input.locationLocode,
        plannedAt: targetMilestone.plannedAt,
        newEstimatedOrActualAt:
          targetMilestone.actualAt || targetMilestone.estimatedAt,
        varianceMinutes: varianceMinutes ?? 0,
        sourceType: input.sourceType,
        summary: input.summary,
      },
    });
  }

  await outboxBus.enqueueEvents(domainEvents);
  await outboxBus.relayPendingEvents();

  const recentEvents = await db
    .select()
    .from(scmTrackingEventsStream)
    .where(eq(scmTrackingEventsStream.shipmentId, input.shipmentId))
    .orderBy(desc(scmTrackingEventsStream.recordedAt))
    .limit(20);

  return {
    streamEventId,
    updatedMilestone: targetMilestone,
    milestones,
    recentEvents,
  };
}
