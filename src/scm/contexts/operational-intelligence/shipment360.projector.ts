import { eq, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmShipment360Views,
  scmMilestonePlans,
  scmTrackingEventsStream,
  scmSlaInstances,
  scmQualityAssessments,
  scmOperationalExceptions,
  scmOperationalIncidents,
} from "../../../db/schema/scm_foundation.js";
import {
  DomainEventEnvelope,
  SecurityActorContext,
  assertAbacScope,
  assertInvariant,
  DEFAULT_OPERATOR_ACTOR,
} from "../../kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";
import {
  MilestoneItem,
  syncMilestonePlanFromRouteVersion,
} from "../tracking-events/tracking-events.context.js";
import {
  QualityFinding,
  initializeSlaClocksForShipment,
  registerControlEnginesSubscribers,
} from "../control-engines/control-engines.context.js";
import {
  WorkflowStateReadModel,
  DecisionEvaluationRecord,
  registerAutomationSubscribers,
  getWorkflowStateForShipment,
  getDecisionEvaluationsForShipment,
} from "../automation/workflow-rules.context.js";
import {
  ConsolidationReadModel,
  DocumentReadModel,
  CustomsCaseReadModel,
  getConsolidationsForShipment,
  getDocumentsForShipment,
  getCustomsCasesForShipment,
} from "../trade-consolidation/trade-consolidation.context.js";

export interface Shipment360ReadModel {
  shipmentId: string;
  referenceNumber: string;
  projectionVersion: number;
  lastUpdatedAt: string;

  header: {
    lifecycleState: string;
    executionPhase: string;
    closureState: string;
    serviceProduct: {
      mode: string;
      serviceType: string;
      incoterm: string;
      direction: string;
    };
    ownership: {
      organizationId: string;
      branchId: string;
      teamId: string;
      ownerUserId: string;
    };
    externalReferences: Array<{
      type: string;
      value: string;
      isPrimary: boolean;
    }>;
  };

  controlSummary: {
    health: {
      status: "ON_TRACK" | "AT_RISK" | "CRITICAL" | "BLOCKED";
      score: number;
      drivers: string[];
    };
    dataQuality: {
      activeStage?: string;
      score: number;
      gateStatus: "PASSED" | "WARN" | "BLOCKED";
      openFindingsCount: number;
      findings?: QualityFinding[];
    };
    sla?: Array<{
      slaId: string;
      slaCode: string;
      slaName: string;
      status: "ON_TRACK" | "AT_RISK" | "BREACHED" | "PAUSED" | "MET";
      originalDeadlineAt: string;
      effectiveDeadlineAt: string;
      pausedAt?: string | null;
      pauseReason?: string | null;
      accumulatedPausedMinutes: number;
      stopClockHistory: any[];
    }>;
  };

  commercialContext: {
    customerAccount: { partyId: string; name: string };
    parties: Array<{
      role: string;
      partyId: string;
      partyName: string;
      locationCode?: string;
    }>;
    linkedOrders: Array<{
      orderId: string;
      orderNumber: string;
      relationType: string;
      allocatedPackages: number;
      allocatedWeightKg: number;
      allocatedVolumeCbm: number;
      orderStatus?: string;
    }>;
  };

  routing: {
    routePlanId: string | null;
    activeVersionNumber: number;
    versionHistoryCount: number;
    stops: any[];
    legs: any[];
  };

  cargoAndEquipment: {
    totals: {
      packagesCount: number;
      grossWeightKg: number;
      volumeCbm: number;
      chargeableWeightKg: number;
      hasDG: boolean;
      hasTemperatureControl: boolean;
    };
    cargoItems: any[];
    equipment: any[];
  };

  tracking?: {
    milestones: MilestoneItem[];
    recentEvents: Array<{
      eventId: string;
      eventCode: string;
      milestoneCode: string;
      locationLocode: string;
      sourceType: string;
      sourceTrustRank: number;
      timestampKind: string;
      eventTimestamp: string;
      summary: string;
    }>;
  };

  actionableItems?: {
    exceptions: Array<{
      exceptionId: string;
      dedupKey: string;
      category: string;
      severity: string;
      status: string;
      title: string;
      summary: string;
      milestoneCode: string;
      locationLocode: string;
      occurrenceCount: number;
      incidentId?: string | null;
      incidentNumber?: string | null;
      linkedWorkItemId?: string | null;
      lastOccurredAt: string;
    }>;
    incidents: Array<{
      incidentId: string;
      incidentNumber: string;
      title: string;
      category: string;
      severity: string;
      status: string;
      affectedLocode: string;
      affectedVesselOrFlight?: string | null;
      summary: string;
    }>;
  };

  workflowState?: WorkflowStateReadModel | null;
  decisionExplainability?: DecisionEvaluationRecord[];

  tradeAndConsolidation?: {
    consolidations: ConsolidationReadModel[];
    documents: DocumentReadModel[];
    customsCases: CustomsCaseReadModel[];
  };

  activityTrail: Array<{
    eventId: string;
    eventType: string;
    occurredAt: string;
    producerContext: string;
  }>;
}

async function updateProjectionForShipment(
  shipmentId: string,
  event: DomainEventEnvelope,
  mutator: (current: Shipment360ReadModel) => void,
): Promise<void> {
  await ensureScmFoundationTables();

  const existing = await db
    .select()
    .from(scmShipment360Views)
    .where(eq(scmShipment360Views.shipmentId, shipmentId))
    .limit(1);

  if (existing.length === 0) return;

  const row = existing[0];
  const model: Shipment360ReadModel = JSON.parse(row.readModelJson);

  mutator(model);

  model.projectionVersion = row.projectionVersion + 1;
  model.lastUpdatedAt = new Date().toISOString();
  model.activityTrail.unshift({
    eventId: event.eventId,
    eventType: event.eventType,
    occurredAt: event.occurredAt,
    producerContext: event.producerContext,
  });

  await db
    .update(scmShipment360Views)
    .set({
      lifecycleState: model.header.lifecycleState,
      healthStatus: model.controlSummary.health.status,
      projectionVersion: model.projectionVersion,
      readModelJson: JSON.stringify(model),
      updatedAt: new Date(),
    })
    .where(eq(scmShipment360Views.shipmentId, shipmentId));
}

let projectorsRegistered = false;

export function registerShipment360Projectors(): void {
  if (projectorsRegistered) return;

  registerControlEnginesSubscribers();
  registerAutomationSubscribers();

  // 1. On ShipmentCreated -> Initialize the Shipment360ReadModel projection
  outboxBus.subscribe(
    "shipment_execution.ShipmentCreated.v1",
    "op_intelligence.Shipment360Projector.OnShipmentCreated",
    async (event) => {
      await ensureScmFoundationTables();
      const p = event.payload;
      const nowIso = new Date().toISOString();

      const initialModel: Shipment360ReadModel = {
        shipmentId: p.shipmentId,
        referenceNumber: p.shipmentReference,
        projectionVersion: 1,
        lastUpdatedAt: nowIso,
        header: {
          lifecycleState: p.lifecycleState,
          executionPhase: p.executionPhase,
          closureState: p.closureState,
          serviceProduct: {
            mode: p.serviceMode,
            serviceType: p.serviceType,
            incoterm: p.incoterm,
            direction: p.direction,
          },
          ownership: {
            organizationId: p.organizationId,
            branchId: p.branchId,
            teamId: p.teamId,
            ownerUserId: p.ownerUserId,
          },
          externalReferences: p.externalRefs || [],
        },
        controlSummary: {
          health: {
            status: p.healthStatus || "ON_TRACK",
            score: p.healthScore ?? 100,
            drivers: [],
          },
          dataQuality: {
            activeStage: "BOOKING",
            score: 100,
            gateStatus: "PASSED",
            openFindingsCount: 0,
            findings: [],
          },
          sla: [],
        },
        commercialContext: {
          customerAccount: {
            partyId: p.customerAccountId,
            name: p.customerName,
          },
          parties: p.partyRoles || [],
          linkedOrders: p.orderLinks || [],
        },
        routing: {
          routePlanId: null,
          activeVersionNumber: 0,
          versionHistoryCount: 0,
          stops: [],
          legs: [],
        },
        cargoAndEquipment: {
          totals: {
            packagesCount: 0,
            grossWeightKg: 0,
            volumeCbm: 0,
            chargeableWeightKg: 0,
            hasDG: false,
            hasTemperatureControl: false,
          },
          cargoItems: [],
          equipment: [],
        },
        tracking: {
          milestones: [],
          recentEvents: [],
        },
        actionableItems: {
          exceptions: [],
          incidents: [],
        },
        activityTrail: [
          {
            eventId: event.eventId,
            eventType: event.eventType,
            occurredAt: event.occurredAt,
            producerContext: event.producerContext,
          },
        ],
      };

      await db
        .insert(scmShipment360Views)
        .values({
          shipmentId: p.shipmentId,
          referenceNumber: p.shipmentReference,
          organizationId: p.organizationId,
          branchId: p.branchId,
          customerAccountId: p.customerAccountId,
          lifecycleState: p.lifecycleState,
          healthStatus: p.healthStatus || "ON_TRACK",
          projectionVersion: 1,
          readModelJson: JSON.stringify(initialModel),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    },
  );

  // 2. On OrderPartiallyFulfilled / OrderFulfilled -> Update linked order status in projection
  const handleOrderFulfilmentEvent = async (event: DomainEventEnvelope) => {
    const p = event.payload;
    if (!p.shipmentId) return;
    await updateProjectionForShipment(p.shipmentId, event, (model) => {
      const existingOrder = model.commercialContext.linkedOrders.find(
        (o) => o.orderId === p.orderId,
      );
      if (existingOrder) {
        existingOrder.orderStatus = p.orderStatus;
      } else {
        model.commercialContext.linkedOrders.push({
          orderId: p.orderId,
          orderNumber: p.orderNumber,
          relationType: p.allocationType,
          allocatedPackages: p.allocatedPackages,
          allocatedWeightKg: p.allocatedWeightKg,
          allocatedVolumeCbm: 0,
          orderStatus: p.orderStatus,
        });
      }
    });
  };

  outboxBus.subscribe(
    "orders.OrderPartiallyFulfilled.v1",
    "op_intelligence.Shipment360Projector.OnOrderPartiallyFulfilled",
    handleOrderFulfilmentEvent,
  );
  outboxBus.subscribe(
    "orders.OrderFulfilled.v1",
    "op_intelligence.Shipment360Projector.OnOrderFulfilled",
    handleOrderFulfilmentEvent,
  );

  // 3. On RouteVersionPublished -> Update routing section + sync MilestonePlan + init SLA clocks
  outboxBus.subscribe(
    "transport_planning.RouteVersionPublished.v1",
    "op_intelligence.Shipment360Projector.OnRouteVersionPublished",
    async (event) => {
      const p = event.payload;
      const milestones = await syncMilestonePlanFromRouteVersion(
        {
          shipmentId: p.shipmentId,
          versionNo: p.versionNo,
          stops: p.stops,
          legs: p.legs,
        },
        event.actor,
      );
      await initializeSlaClocksForShipment(
        {
          shipmentId: p.shipmentId,
          stops: p.stops,
          legs: p.legs,
        },
        event.actor,
      );

      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.routing.routePlanId = p.routePlanId;
        model.routing.activeVersionNumber = p.versionNo;
        model.routing.versionHistoryCount += 1;
        model.routing.stops = p.stops;
        model.routing.legs = p.legs;
        model.tracking = model.tracking || { milestones: [], recentEvents: [] };
        model.tracking.milestones = milestones;
        if (model.header.lifecycleState === "CREATED") {
          model.header.lifecycleState = "PLANNED";
        }
      });
    },
  );

  // 4. On CargoDeclared -> Update cargo hierarchy & totals in projection
  outboxBus.subscribe(
    "cargo_equipment.CargoDeclared.v1",
    "op_intelligence.Shipment360Projector.OnCargoDeclared",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.cargoAndEquipment.cargoItems.push({
          cargoId: p.cargoId,
          packages: p.packages,
        });
        model.cargoAndEquipment.totals.packagesCount += p.totalPackages;
        model.cargoAndEquipment.totals.grossWeightKg += p.totalGrossWeightKg;
        model.cargoAndEquipment.totals.volumeCbm += p.totalVolumeCbm;
        model.cargoAndEquipment.totals.chargeableWeightKg +=
          p.chargeableWeightKg;
        if (p.hasDangerousGoods) {
          model.cargoAndEquipment.totals.hasDG = true;
        }
        if (p.hasTemperatureControl) {
          model.cargoAndEquipment.totals.hasTemperatureControl = true;
        }
      });
    },
  );

  // 5. On DangerousGoodsDeclared -> Flag risk driver in controlSummary
  outboxBus.subscribe(
    "cargo_equipment.DangerousGoodsDeclared.v1",
    "op_intelligence.Shipment360Projector.OnDangerousGoodsDeclared",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        if (
          !model.controlSummary.health.drivers.includes(
            "DANGEROUS_GOODS_IMO_DECLARED",
          )
        ) {
          model.controlSummary.health.drivers.push(
            "DANGEROUS_GOODS_IMO_DECLARED",
          );
        }
      });
    },
  );

  // 6. On EquipmentAssigned -> Update equipment list in projection
  outboxBus.subscribe(
    "cargo_equipment.EquipmentAssigned.v1",
    "op_intelligence.Shipment360Projector.OnEquipmentAssigned",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.cargoAndEquipment.equipment.push({
          equipmentAssignmentId: p.equipmentAssignmentId,
          unitNumber: p.equipmentNumber,
          isoType: p.isoTypeCode,
          category: p.equipmentCategory,
          seals: p.seals,
          vgmWeightKg: p.vgmWeightKg,
          pickupPin: p.pickupPin,
          status: p.status,
          cargoAllocations: p.cargoAllocations,
        });
      });
    },
  );

  // 7. On ShipmentDelivered / ShipmentClosed / ShipmentReopened
  outboxBus.subscribe(
    "shipment_execution.ShipmentDelivered.v1",
    "op_intelligence.Shipment360Projector.OnShipmentDelivered",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.header.lifecycleState = p.lifecycleState;
        model.header.executionPhase = p.executionPhase;
        model.header.closureState = p.closureState;
      });
    },
  );

  outboxBus.subscribe(
    "shipment_execution.ShipmentClosed.v1",
    "op_intelligence.Shipment360Projector.OnShipmentClosed",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.header.lifecycleState = p.lifecycleState;
        model.header.closureState = p.closureState;
      });
    },
  );

  outboxBus.subscribe(
    "shipment_execution.ShipmentReopened.v1",
    "op_intelligence.Shipment360Projector.OnShipmentReopened",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.header.lifecycleState = p.lifecycleState;
        model.header.closureState = p.closureState;
      });
    },
  );

  // 8. Slice 2 & 3 Projectors: Tracking Events, SLA Stop-Clock, Data Quality & Exceptions
  outboxBus.subscribe(
    "tracking_events.TransportEventReceived.v1",
    "op_intelligence.Shipment360Projector.OnTransportEventReceived",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.tracking = model.tracking || { milestones: [], recentEvents: [] };
        model.tracking.milestones = p.milestones || model.tracking.milestones;
        model.tracking.recentEvents.unshift({
          eventId: p.streamEventId,
          eventCode: p.eventCode,
          milestoneCode: p.milestoneCode,
          locationLocode: p.locationLocode,
          sourceType: p.sourceType,
          sourceTrustRank: p.sourceTrustRank,
          timestampKind: p.timestampKind,
          eventTimestamp: p.eventTimestamp,
          summary: p.summary,
        });
      });
    },
  );

  outboxBus.subscribe(
    "exception_mgmt.ExceptionDetected.v1",
    "op_intelligence.Shipment360Projector.OnExceptionDetected",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.controlSummary.health.status =
          p.severity === "CRITICAL" ? "CRITICAL" : "AT_RISK";
        model.controlSummary.health.score = Math.max(
          25,
          model.controlSummary.health.score - 25,
        );
        const driverTag = `EXCEPTION_${p.category}_${p.milestoneCode}`;
        if (!model.controlSummary.health.drivers.includes(driverTag)) {
          model.controlSummary.health.drivers.push(driverTag);
        }
      });
    },
  );

  outboxBus.subscribe(
    "data_quality.QualityAssessmentCompleted.v1",
    "op_intelligence.Shipment360Projector.OnQualityAssessmentCompleted",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.controlSummary.dataQuality = {
          activeStage: p.activeStage,
          score: p.score,
          gateStatus: p.gateStatus,
          openFindingsCount: p.openFindingsCount,
          findings: p.findings,
        };
      });
    },
  );

  // 9. Slice 4 Projectors: Decision Table Explainability & Workflow Runtime State
  outboxBus.subscribe(
    "rules_decisions.DecisionEvaluated.v1",
    "op_intelligence.Shipment360Projector.OnDecisionEvaluated",
    async (event) => {
      const p = event.payload as DecisionEvaluationRecord;
      if (!p.shipmentId) return;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        if (
          p.decisionKey === "DECISION_OPERATIONAL_ASSIGNMENT" &&
          p.outputSnapshot?.assignedTeamId
        ) {
          model.header.ownership.teamId = p.outputSnapshot.assignedTeamId;
        }
      });
    },
  );

  outboxBus.subscribe(
    "workflow_runtime.WorkflowTokenAdvanced.v1",
    "op_intelligence.Shipment360Projector.OnWorkflowTokenAdvanced",
    async (event) => {
      const p = event.payload;
      if (!p.shipmentId) return;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        if (p.state === "BLOCKED_AT_GATEWAY") {
          model.controlSummary.health.status = "BLOCKED";
        }
      });
    },
  );

  outboxBus.subscribe(
    "workflow_runtime.ProcessStateChanged.v1",
    "op_intelligence.Shipment360Projector.OnProcessStateChanged",
    async (event) => {
      const p = event.payload;
      if (!p.shipmentId) return;
      await updateProjectionForShipment(p.shipmentId, event, () => {
        // Records event in activityTrail and increments projectionVersion
      });
    },
  );

  // 10. Slice 5 Projectors: Consolidation (House/Master), Versioned Documents & Multi-Procedure Customs
  outboxBus.subscribe(
    "consolidation.ShipmentAddedToConsolidation.v1",
    "op_intelligence.Shipment360Projector.OnShipmentAddedToConsolidation",
    async (event) => {
      const p = event.payload;
      if (!p.shipmentId) return;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        const targetLeg = model.routing.legs.find(
          (l: any) => l.sequenceNo === p.transportLegSequenceNo,
        );
        if (targetLeg) {
          targetLeg.consolidation = {
            consolidationId: p.consolidationId,
            consolidationReference: p.consolidationReference,
            masterDocumentNumber: p.masterDocumentNumber,
            houseDocumentNumber: p.houseDocumentNumber,
            consolidationType: p.consolidationType,
          };
        }
      });
    },
  );

  const handleSlice5ShipmentEvent = async (event: DomainEventEnvelope) => {
    const p = event.payload;
    if (!p?.shipmentId) return;
    await updateProjectionForShipment(p.shipmentId, event, () => {
      // Appends event to activityTrail and bumps projectionVersion
    });
  };

  outboxBus.subscribe(
    "document_mgmt.DocumentGenerated.v1",
    "op_intelligence.Shipment360Projector.OnDocumentGenerated",
    handleSlice5ShipmentEvent,
  );
  outboxBus.subscribe(
    "document_mgmt.DocumentApproved.v1",
    "op_intelligence.Shipment360Projector.OnDocumentApproved",
    handleSlice5ShipmentEvent,
  );
  outboxBus.subscribe(
    "document_mgmt.DocumentIssued.v1",
    "op_intelligence.Shipment360Projector.OnDocumentIssued",
    handleSlice5ShipmentEvent,
  );
  outboxBus.subscribe(
    "customs.CustomsCaseCreated.v1",
    "op_intelligence.Shipment360Projector.OnCustomsCaseCreated",
    handleSlice5ShipmentEvent,
  );
  outboxBus.subscribe(
    "customs.CustomsBlocked.v1",
    "op_intelligence.Shipment360Projector.OnCustomsBlocked",
    handleSlice5ShipmentEvent,
  );
  outboxBus.subscribe(
    "customs.CustomsReleased.v1",
    "op_intelligence.Shipment360Projector.OnCustomsReleased",
    handleSlice5ShipmentEvent,
  );

  projectorsRegistered = true;
}

// Auto-register projectors on module load
registerShipment360Projectors();

export async function enrichShipment360Model(
  model: Shipment360ReadModel,
): Promise<Shipment360ReadModel> {
  const shipmentId = model.shipmentId;

  const [
    milestonePlanRows,
    eventRows,
    slaRows,
    dqRows,
    exceptionRows,
    incidentRows,
    workflowState,
    decisionExplainability,
    consolidations,
    documents,
    customsCases,
  ] = await Promise.all([
    db
      .select()
      .from(scmMilestonePlans)
      .where(eq(scmMilestonePlans.shipmentId, shipmentId))
      .limit(1),
    db
      .select()
      .from(scmTrackingEventsStream)
      .where(eq(scmTrackingEventsStream.shipmentId, shipmentId))
      .orderBy(desc(scmTrackingEventsStream.recordedAt))
      .limit(20),
    db
      .select()
      .from(scmSlaInstances)
      .where(eq(scmSlaInstances.shipmentId, shipmentId)),
    db
      .select()
      .from(scmQualityAssessments)
      .where(eq(scmQualityAssessments.shipmentId, shipmentId))
      .limit(1),
    db
      .select()
      .from(scmOperationalExceptions)
      .where(eq(scmOperationalExceptions.shipmentId, shipmentId)),
    db.select().from(scmOperationalIncidents),
    getWorkflowStateForShipment(shipmentId),
    getDecisionEvaluationsForShipment(shipmentId),
    getConsolidationsForShipment(shipmentId),
    getDocumentsForShipment(shipmentId),
    getCustomsCasesForShipment(shipmentId),
  ]);

  const milestones: MilestoneItem[] =
    milestonePlanRows.length > 0
      ? JSON.parse(milestonePlanRows[0].milestonesJson)
      : model.tracking?.milestones || [];

  model.tracking = {
    milestones,
    recentEvents: eventRows.map((r) => ({
      eventId: r.eventId,
      eventCode: r.eventCode,
      milestoneCode: r.milestoneCode,
      locationLocode: r.locationLocode,
      sourceType: r.sourceType,
      sourceTrustRank: r.sourceTrustRank,
      timestampKind: r.timestampKind,
      eventTimestamp: r.eventTimestamp,
      summary: r.summary,
    })),
  };

  model.controlSummary.sla = slaRows.map((s) => ({
    slaId: s.id,
    slaCode: s.slaCode,
    slaName: s.slaName,
    status: s.status as any,
    originalDeadlineAt: s.originalDeadlineAt,
    effectiveDeadlineAt: s.effectiveDeadlineAt,
    pausedAt: s.pausedAt,
    pauseReason: s.pauseReason,
    accumulatedPausedMinutes: s.accumulatedPausedMinutes,
    stopClockHistory: JSON.parse(s.stopClockHistoryJson),
  }));

  if (dqRows.length > 0) {
    const dq = dqRows[0];
    model.controlSummary.dataQuality = {
      activeStage: dq.activeStage,
      score: dq.score,
      gateStatus: dq.gateStatus as any,
      openFindingsCount: dq.blockingFindingsCount + dq.warningFindingsCount,
      findings: JSON.parse(dq.findingsJson),
    };
  }

  const matchingIncidents = incidentRows.filter((inc) => {
    const ids: string[] = JSON.parse(inc.impactedShipmentIdsJson);
    return ids.includes(shipmentId);
  });

  model.actionableItems = {
    exceptions: exceptionRows.map((e) => ({
      exceptionId: e.id,
      dedupKey: e.dedupKey,
      category: e.category,
      severity: e.severity,
      status: e.status,
      title: e.title,
      summary: e.summary,
      milestoneCode: e.milestoneCode,
      locationLocode: e.locationLocode,
      occurrenceCount: e.occurrenceCount,
      incidentId: e.incidentId,
      incidentNumber: e.incidentNumber,
      linkedWorkItemId: e.linkedWorkItemId,
      lastOccurredAt: e.lastOccurredAt,
    })),
    incidents: matchingIncidents.map((inc) => ({
      incidentId: inc.id,
      incidentNumber: inc.incidentNumber,
      title: inc.title,
      category: inc.category,
      severity: inc.severity,
      status: inc.status,
      affectedLocode: inc.affectedLocode,
      affectedVesselOrFlight: inc.affectedVesselOrFlight,
      summary: inc.summary,
    })),
  };

  model.workflowState = workflowState;
  model.decisionExplainability = decisionExplainability;
  if (workflowState?.variablesSnapshot?.assignedTeamId) {
    model.header.ownership.teamId =
      workflowState.variablesSnapshot.assignedTeamId;
  }

  model.tradeAndConsolidation = {
    consolidations,
    documents,
    customsCases,
  };

  return model;
}

export async function getShipment360ReadModel(
  shipmentId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<Shipment360ReadModel> {
  await ensureScmFoundationTables();
  registerShipment360Projectors();

  const rows = await db
    .select()
    .from(scmShipment360Views)
    .where(eq(scmShipment360Views.shipmentId, shipmentId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "operational_intelligence",
    "SHIPMENT_360_PROJECTION_NOT_FOUND",
    `Shipment360ReadModel for '${shipmentId}' not found`,
  );

  const row = rows[0];
  assertAbacScope(actor, row.organizationId, row.branchId);

  const parsed = JSON.parse(row.readModelJson) as Shipment360ReadModel;
  return enrichShipment360Model(parsed);
}
