import { randomUUID } from "node:crypto";
import { eq, and, desc, like, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmOperationalShipment360ViewsV2,
  scmOperationalCockpitWorkItemsV2,
} from "../../../db/schema/scm_operational_bff_sqlite.js";
import { scmOperationalExceptionsV2 } from "../../../db/schema/scm_operational_intelligence_sqlite.js";
import {
  scmLogicalShipments,
  scmLogicalRoutePlans,
  scmLogicalRouteVersions,
  scmLogicalRouteStops,
  scmLogicalTransportLegs,
  scmLogicalMilestonePlans,
  scmLogicalMilestones,
  scmLogicalTasks,
  scmLogicalOperationalEvents,
} from "../../../db/schema/scm_entities_sqlite.js";
import {
  scmWorkflowEngineInstancesV2,
  scmWorkflowEngineDefinitionsV2,
  scmWorkflowEngineDefinitionVersionsV2,
} from "../../../db/schema/scm_workflow_engine_sqlite.js";
import { scmOutboxMessages } from "../../../db/schema/scm_foundation.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import { ensureOperationalBffTables } from "../../kernel/operational-bff-tables.js";
import { outboxBus } from "../../kernel/outbox-bus.js";
import {
  resolveStandardWorkflowDefinitionKey,
  resolveTransportModeFamily,
} from "../../kernel/transport-mode.js";
import {
  getOperationalShipmentById,
  OperationalShipmentRecord,
  OperationalRoutePlanRecord,
} from "../operational-core/operational-core.context.js";
import {
  completeTask,
  getTasksForSubject,
} from "../work-management/work-management.context.js";
import {
  listOperationalExceptionsForShipment,
  resolveOperationalException,
  OperationalExceptionRecord,
} from "./operational-exceptions.context.js";

// ============================================================================
// READ MODEL TYPES (CQRS Projections for UI / BFF)
// ============================================================================

export interface TaskActionMetadata {
  command: string;
  actionLabel: string;
  inputFields: Array<{
    name: string;
    label: string;
    type: "string" | "number" | "boolean";
    required: boolean;
  }>;
}

export interface OperationalSignal {
  signalId: string;
  signalType:
    | "BLOCKING_EXCEPTION"
    | "SLA_RISK"
    | "TASK_BLOCKED"
    | "ROUTE_DEVIATION"
    | "WORKFLOW_HALTED";
  severity: "CRITICAL" | "MAJOR" | "WARNING" | "INFO";
  title: string;
  explanation: string;
  source: string;
  createdAt: string;
}

export interface ExplainabilityModel {
  isBlocked: boolean;
  blockReasons: string[];
  slaStatus: "ON_TRACK" | "AT_RISK" | "BREACHED";
  slaRiskExplanation?: string;
  activeWorkflowKey?: string;
  recommendedAction: {
    actionKey: string;
    title: string;
    description: string;
    actionType: "COMPLETE_TASK" | "RESOLVE_EXCEPTION" | "INSPECT_ROUTE";
    targetId: string;
    isBlocking: boolean;
  };
  attentionScoreBreakdown: Array<{
    factor: string;
    points: number;
    explanation: string;
  }>;
}

export interface OperationalShipment360View {
  shipmentId: string;
  shipmentReference: string;
  serviceType: string;
  lifecycle: string;
  closureStatus: string;
  customerPartyId: string | null;

  // Backward compatibility top-level properties for existing tests
  shipment: OperationalShipmentRecord;
  routePlan: OperationalRoutePlanRecord | null;
  milestonePlan: {
    milestonePlanId: string;
    status: string;
    milestones: any[];
  } | null;

  workflow: {
    instanceId: string;
    definitionCode: string;
    versionNumber: number;
    status: string;
    progressPercentage: number;
  } | null;

  tasks: Array<{
    taskId: string;
    taskType: string;
    title: string;
    priority: string;
    status: string;
    isBlocked: boolean;
    dependencies: Array<{
      predecessorTaskId: string;
      status: string;
    }>;
    primaryAction?: TaskActionMetadata;
  }>;

  exceptions: OperationalExceptionRecord[];
  signals: OperationalSignal[];

  health: {
    status: "ON_TRACK" | "AT_RISK" | "CRITICAL";
    score: number;
    blockers: string[];
  };

  explainability: ExplainabilityModel;

  metrics: {
    totalTasks: number;
    openTasks: number;
    blockedTasks: number;
    completedTasks: number;
    progressPercentage: number;
    activeExceptionsCount?: number;
  };

  projectionVersion: number;
  lastUpdatedAt: string;
}

export interface OperationalCockpitWorkItem {
  workItemId: string;
  taskId: string;
  shipmentId: string;
  shipmentReference: string;
  serviceType: string;
  taskTypeCode: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "BLOCKED" | "COMPLETED" | "IN_REVIEW";
  isBlocked: boolean;
  blockedByTasks: string[];
  urgencyBucket: "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" | "BLOCKED";
  attentionScore: number;
  scoreBreakdown?: Array<{
    factor: string;
    points: number;
    explanation: string;
  }>;
  itemType?: "TASK" | "EXCEPTION";
  workflowInfo?: {
    instanceId: string;
    definitionCode: string;
    versionNumber: number;
    status: string;
  };
  primaryAction: TaskActionMetadata;
  updatedAt: string;
}

export interface CockpitSummaryMetrics {
  totalTasks: number;
  openActionableCount: number;
  blockedCount: number;
  completedCount: number;
  criticalUrgencyCount: number;
  dueTodayCount: number;
  activeWorkflowsCount: number;
  completedWorkflowsCount: number;
  activeExceptionsCount?: number;
}

export interface OperationalTimelineEvent {
  timelineId: string;
  timestamp: string;
  eventType: string;
  source: "OUTBOX" | "EXCEPTION" | "TELEMETRY" | "WORKFLOW";
  category:
    "LIFECYCLE" | "PLANNING" | "WORKFLOW" | "TASK" | "EXCEPTION" | "TELEMETRY";
  title: string;
  description: string;
  actor: string;
  payload: Record<string, any>;
}

export interface ProjectionsHealthReport {
  status: "HEALTHY" | "DEGRADED" | "OUT_OF_SYNC";
  outboxMetrics: {
    pendingCount: number;
    processingCount: number;
    processedCount: number;
    failedCount: number;
    dlqCount: number;
  };
  projectionMetrics: {
    shipment360Count: number;
    cockpitItemsCount: number;
    exceptionsCount: number;
  };
  projectorLagMs: number;
  lastProcessedEventTimestamp: string | null;
  lastOutboxEventTimestamp: string | null;
}

// ============================================================================
// TASK METADATA HELPER
// ============================================================================

/**
 * Legacy rows created before the mode-aware workflow catalog may carry Ocean
 * task types (SOLAS VGM / B/L) on Air or Ground shipments. Remap them to the
 * mode-appropriate equivalents so SOLAS VGM is never presented outside Ocean.
 */
export function remapTaskTypeForMode(
  taskTypeCode: string,
  serviceType?: string | null,
): string {
  const family = resolveTransportModeFamily(serviceType);
  if (family === "AIR") {
    if (taskTypeCode === "VERIFY_VGM_CUTOFF")
      return "VERIFY_AWB_SECURITY_WEIGHT";
    if (taskTypeCode === "ISSUE_BILL_OF_LADING") return "ISSUE_AIR_WAYBILL";
  } else if (family === "ROAD") {
    if (taskTypeCode === "VERIFY_VGM_CUTOFF")
      return "VERIFY_VEHICLE_AXLE_WEIGHT";
    if (taskTypeCode === "ISSUE_BILL_OF_LADING") return "ISSUE_ECMR_WAYBILL";
  }
  return taskTypeCode;
}

/** Remaps a legacy Ocean workflow definition key for non-ocean shipments. */
export function remapWorkflowDefinitionKeyForMode(
  definitionKey: string,
  serviceType?: string | null,
): string {
  if (definitionKey !== "OCEAN_EXPORT_STANDARD") return definitionKey;
  return resolveStandardWorkflowDefinitionKey(serviceType);
}

export function resolveTaskMetadata(
  rawTaskTypeCode: string,
  serviceType?: string | null,
): {
  title: string;
  description: string;
  primaryAction: TaskActionMetadata;
} {
  const taskTypeCode = remapTaskTypeForMode(rawTaskTypeCode, serviceType);
  switch (taskTypeCode) {
    case "VERIFY_AWB_SECURITY_WEIGHT":
      return {
        title: "Verify Chargeable Weight & Security Screening",
        description:
          "Confirm IATA chargeable weight (actual vs. volumetric 1:6000) and Known Consignor / SPX security screening before airline lodge-in cut-off.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Verify Weight & Screening",
          inputFields: [
            {
              name: "chargeableWeightKg",
              label: "Chargeable Weight (kg)",
              type: "number",
              required: true,
            },
          ],
        },
      };
    case "ISSUE_AIR_WAYBILL":
      return {
        title: "Issue Air Waybill (MAWB/HAWB)",
        description:
          "Draft, approve and transmit the IATA e-AWB (FWB/FHL) for the master and house air waybills.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Issue Air Waybill",
          inputFields: [
            {
              name: "awbNumber",
              label: "MAWB Number",
              type: "string",
              required: true,
            },
          ],
        },
      };
    case "VERIFY_VEHICLE_AXLE_WEIGHT":
      return {
        title: "Verify Gross Vehicle & Axle Weight",
        description:
          "Confirm gross vehicle weight and per-axle load are within legal limits and the loading plan is secured before departure.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Verify Vehicle Weight",
          inputFields: [
            {
              name: "grossVehicleWeightKg",
              label: "Gross Vehicle Weight (kg)",
              type: "number",
              required: true,
            },
          ],
        },
      };
    case "ISSUE_ECMR_WAYBILL":
      return {
        title: "Issue e-CMR Consignment Note",
        description:
          "Issue the electronic CMR consignment note signed by shipper, haulier and consignee.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Issue e-CMR",
          inputFields: [
            {
              name: "cmrNumber",
              label: "e-CMR Number",
              type: "string",
              required: true,
            },
          ],
        },
      };
    case "CONFIRM_CARRIER_BOOKING":
      return {
        title: "Confirm Carrier Booking",
        description:
          "Verify space allocation and confirm booking number with maritime or air carrier.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Confirm Carrier Booking",
          inputFields: [
            {
              name: "bookingRef",
              label: "Carrier Booking Reference",
              type: "string",
              required: true,
            },
          ],
        },
      };
    case "VERIFY_VGM_CUTOFF":
      return {
        title: "Verify VGM & Weight Cutoff",
        description:
          "Submit and verify SOLAS Verified Gross Mass (VGM) before terminal cutoff time.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Verify VGM & Cutoff",
          inputFields: [
            {
              name: "vgmWeightKg",
              label: "Verified Gross Mass (kg)",
              type: "number",
              required: true,
            },
          ],
        },
      };
    case "ISSUE_BILL_OF_LADING":
      return {
        title: "Issue House Bill of Lading (HBL)",
        description:
          "Draft, approve and issue final Bill of Lading documentation to the shipper.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Issue Bill of Lading (HBL)",
          inputFields: [
            {
              name: "blNumber",
              label: "HBL Number",
              type: "string",
              required: true,
            },
          ],
        },
      };
    case "CUSTOMS_DOCUMENT_PREP":
      return {
        title: "Prepare Customs Documentation",
        description:
          "Compile invoice, packing list, and certificates for export declaration.",
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Submit Customs Docs",
          inputFields: [
            {
              name: "duaRef",
              label: "DUA Export Reference",
              type: "string",
              required: true,
            },
          ],
        },
      };
    default:
      return {
        title: taskTypeCode
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        description: `Execute operational action for task ${taskTypeCode}.`,
        primaryAction: {
          command: "COMPLETE_TASK",
          actionLabel: "Complete Task",
          inputFields: [
            {
              name: "notes",
              label: "Resolution Notes",
              type: "string",
              required: false,
            },
          ],
        },
      };
  }
}

// ============================================================================
// ATTENTION SCORE & URGENCY COMPUTATION (TRANSPARENT EXPLAINABILITY)
// ============================================================================

export function computeAttentionScoreAndUrgency(
  target: {
    itemType?: "TASK" | "EXCEPTION";
    status: string;
    isBlocked: boolean;
    priority: string;
    deadline?: string | null;
    hasBlockingException?: boolean;
  },
  serviceType: string,
): {
  attentionScore: number;
  urgencyBucket: "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" | "BLOCKED";
  scoreBreakdown: Array<{
    factor: string;
    points: number;
    explanation: string;
  }>;
} {
  const scoreBreakdown: Array<{
    factor: string;
    points: number;
    explanation: string;
  }> = [];

  if (
    target.status === "COMPLETED" ||
    target.status === "RESOLVED" ||
    target.status === "WAIVED"
  ) {
    scoreBreakdown.push({
      factor: "ITEM_COMPLETED",
      points: 0,
      explanation: "Item has been successfully completed or resolved",
    });
    return { attentionScore: 0, urgencyBucket: "UPCOMING", scoreBreakdown };
  }

  if (target.isBlocked || target.status === "BLOCKED") {
    scoreBreakdown.push({
      factor: "BLOCKED_PREREQUISITE",
      points: 15,
      explanation:
        "Execution blocked pending completion of prerequisite dependencies",
    });
    return { attentionScore: 15, urgencyBucket: "BLOCKED", scoreBreakdown };
  }

  let totalScore = 40;
  scoreBreakdown.push({
    factor: "BASE_WEIGHT",
    points: 40,
    explanation: "Base operational attention allocation",
  });

  // Priority weight
  if (target.priority === "CRITICAL") {
    totalScore += 45;
    scoreBreakdown.push({
      factor: "PRIORITY_CRITICAL",
      points: 45,
      explanation: "Item priority designated as CRITICAL",
    });
  } else if (target.priority === "HIGH" || target.priority === "MAJOR") {
    totalScore += 30;
    scoreBreakdown.push({
      factor: target.priority === "MAJOR" ? "PRIORITY_MAJOR" : "PRIORITY_HIGH",
      points: 30,
      explanation: `Item priority designated as ${target.priority}`,
    });
  } else if (target.priority === "MEDIUM" || target.priority === "MINOR") {
    totalScore += 15;
    scoreBreakdown.push({
      factor:
        target.priority === "MINOR" ? "PRIORITY_MINOR" : "PRIORITY_MEDIUM",
      points: 15,
      explanation: `Item priority designated as ${target.priority}`,
    });
  } else if (target.priority === "LOW" || target.priority === "INFO") {
    scoreBreakdown.push({
      factor: target.priority === "INFO" ? "PRIORITY_INFO" : "PRIORITY_LOW",
      points: 0,
      explanation: `Item priority designated as ${target.priority}`,
    });
  }

  // Service Type
  if (serviceType === "AIR_EXPEDITE") {
    totalScore += 10;
    scoreBreakdown.push({
      factor: "SERVICE_AIR_EXPEDITE",
      points: 10,
      explanation: "Time-critical air freight transit",
    });
  } else if (serviceType === "OCEAN_FCL") {
    totalScore += 5;
    scoreBreakdown.push({
      factor: "SERVICE_OCEAN_FCL",
      points: 5,
      explanation: "Maritime container tracking milestones",
    });
  }

  // Active blocking exception on shipment
  if (target.hasBlockingException) {
    totalScore += 20;
    scoreBreakdown.push({
      factor: "BLOCKING_EXCEPTION_IMPACT",
      points: 20,
      explanation:
        "Shipment has active operational blocking exception requiring resolution",
    });
  }

  if (target.itemType === "EXCEPTION") {
    totalScore += 15;
    scoreBreakdown.push({
      factor: "EXCEPTION_WORK_ITEM",
      points: 15,
      explanation:
        "Direct operational exception work item requiring immediate clearance",
    });
  }

  const finalScore = Math.min(100, Math.max(0, totalScore));

  let urgency: "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" = "UPCOMING";
  if (target.priority === "CRITICAL" || finalScore >= 80) {
    urgency = "IMMEDIATE_ACTION";
  } else if (target.priority === "HIGH" || finalScore >= 65) {
    urgency = "DUE_TODAY";
  }

  return {
    attentionScore: finalScore,
    urgencyBucket: urgency,
    scoreBreakdown,
  };
}

// ============================================================================
// PROJECTION BUILDER (CQRS READ MODEL GENERATION)
// ============================================================================

export async function computeShipment360View(
  shipmentId: string,
): Promise<OperationalShipment360View> {
  await ensureOperationalBffTables();

  const shipment = await getOperationalShipmentById(shipmentId);

  // Fetch RoutePlan & RouteVersion
  const rplRows = await db
    .select()
    .from(scmLogicalRoutePlans)
    .where(eq(scmLogicalRoutePlans.shipmentId, shipmentId))
    .limit(1);

  let routePlan: OperationalRoutePlanRecord | null = null;
  if (rplRows.length > 0) {
    const plan = rplRows[0];
    const verRows = await db
      .select()
      .from(scmLogicalRouteVersions)
      .where(eq(scmLogicalRouteVersions.routePlanId, plan.routePlanId))
      .limit(1);

    if (verRows.length > 0) {
      const ver = verRows[0];
      const [stops, legs] = await Promise.all([
        db
          .select()
          .from(scmLogicalRouteStops)
          .where(eq(scmLogicalRouteStops.routeVersionId, ver.routeVersionId)),
        db
          .select()
          .from(scmLogicalTransportLegs)
          .where(
            eq(scmLogicalTransportLegs.routeVersionId, ver.routeVersionId),
          ),
      ]);

      routePlan = {
        routePlanId: plan.routePlanId,
        shipmentId,
        versionNumber: ver.versionNumber,
        status: ver.status,
        changeReason: ver.changeReason,
        stops,
        legs,
      };
    }
  }

  // Fetch MilestonePlan
  const mplRows = await db
    .select()
    .from(scmLogicalMilestonePlans)
    .where(eq(scmLogicalMilestonePlans.subjectId, shipmentId))
    .limit(1);

  let milestonePlan: OperationalShipment360View["milestonePlan"] = null;
  if (mplRows.length > 0) {
    const mpl = mplRows[0];
    const msRows = await db
      .select()
      .from(scmLogicalMilestones)
      .where(eq(scmLogicalMilestones.milestonePlanId, mpl.milestonePlanId));

    milestonePlan = {
      milestonePlanId: mpl.milestonePlanId,
      status: mpl.status,
      milestones: msRows,
    };
  }

  // Fetch Tasks for this Shipment
  const rawTasks = await getTasksForSubject("SHIPMENT", shipmentId);

  // Fetch WorkflowInstance if any
  const wfInstRows = await db
    .select()
    .from(scmWorkflowEngineInstancesV2)
    .where(eq(scmWorkflowEngineInstancesV2.subjectId, shipmentId))
    .limit(1);

  let workflow: OperationalShipment360View["workflow"] = null;
  if (wfInstRows.length > 0) {
    const wf = wfInstRows[0];
    const defRows = await db
      .select()
      .from(scmWorkflowEngineDefinitionsV2)
      .where(
        eq(
          scmWorkflowEngineDefinitionsV2.workflowDefinitionId,
          wf.workflowDefinitionId,
        ),
      )
      .limit(1);

    const verRows = await db
      .select()
      .from(scmWorkflowEngineDefinitionVersionsV2)
      .where(
        eq(
          scmWorkflowEngineDefinitionVersionsV2.workflowVersionId,
          wf.workflowVersionId,
        ),
      )
      .limit(1);

    const totalTasksCount = rawTasks.length;
    const completedTasksCount = rawTasks.filter(
      (t) => t.status === "COMPLETED",
    ).length;
    const progressPercentage =
      totalTasksCount > 0
        ? Math.round((completedTasksCount / totalTasksCount) * 100)
        : 0;

    workflow = {
      instanceId: wf.instanceId,
      definitionCode: remapWorkflowDefinitionKeyForMode(
        defRows[0]?.definitionKey || "WORKFLOW",
        shipment.serviceType,
      ),
      versionNumber: verRows[0]?.versionNumber || 1,
      status: wf.status,
      progressPercentage,
    };
  }

  const enrichedTasks = rawTasks.map((t) => {
    const meta = resolveTaskMetadata(t.taskType, shipment.serviceType);
    return {
      taskId: t.taskId,
      taskType: remapTaskTypeForMode(t.taskType, shipment.serviceType),
      title: meta.title,
      priority: t.priority,
      status: t.status,
      isBlocked: t.isBlocked,
      dependencies: t.dependencies.map((d) => ({
        predecessorTaskId: d.predecessorTaskId,
        status: d.status,
      })),
      primaryAction: meta.primaryAction,
    };
  });

  const totalTasks = enrichedTasks.length;
  const completedTasks = enrichedTasks.filter(
    (t) => t.status === "COMPLETED",
  ).length;
  const blockedTasks = enrichedTasks.filter(
    (t) => t.isBlocked && t.status !== "COMPLETED",
  ).length;
  const openTasks = enrichedTasks.filter(
    (t) => !t.isBlocked && t.status === "OPEN",
  ).length;
  const progressPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Fetch Exceptions for this Shipment
  const exceptions = await listOperationalExceptionsForShipment(shipmentId);
  const activeExceptions = exceptions.filter(
    (e) => e.status !== "RESOLVED" && e.status !== "WAIVED",
  );
  const blockingExceptions = activeExceptions.filter((e) => e.isBlocking);

  let healthStatus: "ON_TRACK" | "AT_RISK" | "CRITICAL" = "ON_TRACK";
  let healthScore = 100;
  const blockers: string[] = [];

  if (blockedTasks > 0) {
    healthScore -= blockedTasks * 15;
    blockers.push(`${blockedTasks} task(s) currently blocked by dependencies`);
  }

  // Exception impacts on health
  for (const exc of blockingExceptions) {
    if (exc.severity === "CRITICAL") {
      healthScore -= 40;
      healthStatus = "CRITICAL";
    } else if (exc.severity === "MAJOR") {
      healthScore -= 25;
      if (healthStatus !== "CRITICAL") healthStatus = "AT_RISK";
    } else {
      healthScore -= 10;
    }
    blockers.push(
      `[${exc.severity}] Exception (${exc.category}): ${exc.title}`,
    );
  }

  if (healthScore < 50) {
    healthStatus = "CRITICAL";
  } else if (healthScore < 80 && healthStatus !== "CRITICAL") {
    healthStatus = "AT_RISK";
  }

  // Synthesize Operational Signals
  const signals: OperationalSignal[] = [];
  for (const exc of activeExceptions) {
    signals.push({
      signalId: `sig_${exc.exceptionId}`,
      signalType: exc.isBlocking ? "BLOCKING_EXCEPTION" : "ROUTE_DEVIATION",
      severity:
        exc.severity === "CRITICAL"
          ? "CRITICAL"
          : exc.severity === "MAJOR"
            ? "MAJOR"
            : "WARNING",
      title: exc.title,
      explanation: exc.description,
      source: "EXCEPTION_ENGINE",
      createdAt: exc.createdAt,
    });
  }
  if (blockedTasks > 0) {
    signals.push({
      signalId: `sig_blocked_tasks_${shipmentId}`,
      signalType: "TASK_BLOCKED",
      severity: "WARNING",
      title: `${blockedTasks} Task(s) Blocked`,
      explanation:
        "Operational tasks are awaiting upstream dependency resolution",
      source: "WORK_MANAGEMENT",
      createdAt: new Date().toISOString(),
    });
  }

  // Explainability & Recommended Action
  let recommendedAction: ExplainabilityModel["recommendedAction"];
  if (blockingExceptions.length > 0) {
    const topExc = blockingExceptions[0];
    recommendedAction = {
      actionKey: "RESOLVE_EXCEPTION",
      title: `Resolve ${topExc.category}`,
      description: topExc.description,
      actionType: "RESOLVE_EXCEPTION",
      targetId: topExc.exceptionId,
      isBlocking: true,
    };
  } else if (openTasks > 0) {
    const firstOpen =
      enrichedTasks.find((t) => !t.isBlocked && t.status === "OPEN") ||
      enrichedTasks[0];
    recommendedAction = {
      actionKey: "COMPLETE_TASK",
      title: firstOpen.title,
      description: `Execute operational action: ${firstOpen.title}`,
      actionType: "COMPLETE_TASK",
      targetId: firstOpen.taskId,
      isBlocking: false,
    };
  } else {
    recommendedAction = {
      actionKey: "INSPECT_ROUTE",
      title: "Monitor Tracking Milestones",
      description: "All immediate operational tasks are up to date",
      actionType: "INSPECT_ROUTE",
      targetId: shipmentId,
      isBlocking: false,
    };
  }

  const attentionBreakdown = [
    {
      factor: "BASE_WEIGHT",
      points: 40,
      explanation: "Standard shipment operational monitoring",
    },
    ...(blockingExceptions.length > 0
      ? [
          {
            factor: "ACTIVE_BLOCKING_EXCEPTIONS",
            points: 40,
            explanation: `${blockingExceptions.length} active blocking exception(s) require intervention`,
          },
        ]
      : []),
    ...(blockedTasks > 0
      ? [
          {
            factor: "BLOCKED_DEPENDENCIES",
            points: 15,
            explanation: `${blockedTasks} task(s) currently blocked by dependencies`,
          },
        ]
      : []),
  ];

  const explainability: ExplainabilityModel = {
    isBlocked: blockers.length > 0,
    blockReasons: blockers,
    slaStatus:
      healthStatus === "CRITICAL"
        ? "BREACHED"
        : healthStatus === "AT_RISK"
          ? "AT_RISK"
          : "ON_TRACK",
    slaRiskExplanation:
      blockers.length > 0
        ? blockers.join("; ")
        : "Operations progressing according to planned schedule",
    activeWorkflowKey: workflow?.definitionCode,
    recommendedAction,
    attentionScoreBreakdown: attentionBreakdown,
  };

  const customerRole = shipment.partyRoles.find((r) => r.role === "CUSTOMER");

  return {
    shipmentId,
    shipmentReference: shipment.shipmentReference,
    serviceType: shipment.serviceType,
    lifecycle: shipment.lifecycle,
    closureStatus: shipment.closureStatus,
    customerPartyId: customerRole?.partyId || null,
    shipment,
    routePlan,
    milestonePlan,
    workflow,
    tasks: enrichedTasks,
    exceptions,
    signals,
    health: {
      status: healthStatus,
      score: Math.max(0, healthScore),
      blockers,
    },
    explainability,
    metrics: {
      totalTasks,
      openTasks,
      blockedTasks,
      completedTasks,
      progressPercentage,
      activeExceptionsCount: activeExceptions.length,
    },
    projectionVersion: 1,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export async function refreshShipmentProjections(
  shipmentId: string,
): Promise<OperationalShipment360View> {
  await ensureOperationalBffTables();

  const view = await computeShipment360View(shipmentId);
  const now = new Date();

  // 1. Upsert scmOperationalShipment360ViewsV2
  const existingView = await db
    .select()
    .from(scmOperationalShipment360ViewsV2)
    .where(eq(scmOperationalShipment360ViewsV2.shipmentId, shipmentId))
    .limit(1);

  if (existingView.length === 0) {
    await db.insert(scmOperationalShipment360ViewsV2).values({
      shipmentId,
      shipmentReference: view.shipmentReference,
      serviceType: view.serviceType,
      lifecycle: view.lifecycle,
      closureStatus: view.closureStatus,
      customerPartyId: view.customerPartyId,
      activeRouteVersion: view.routePlan?.versionNumber || null,
      workflowInstanceId: view.workflow?.instanceId || null,
      workflowStatus: view.workflow?.status || null,
      healthStatus: view.health.status,
      openTasksCount: view.metrics.openTasks,
      blockedTasksCount: view.metrics.blockedTasks,
      completedTasksCount: view.metrics.completedTasks,
      projectionVersion: 1,
      viewJson: JSON.stringify(view),
      updatedAt: now,
    });
  } else {
    await db
      .update(scmOperationalShipment360ViewsV2)
      .set({
        shipmentReference: view.shipmentReference,
        serviceType: view.serviceType,
        lifecycle: view.lifecycle,
        closureStatus: view.closureStatus,
        customerPartyId: view.customerPartyId,
        activeRouteVersion: view.routePlan?.versionNumber || null,
        workflowInstanceId: view.workflow?.instanceId || null,
        workflowStatus: view.workflow?.status || null,
        healthStatus: view.health.status,
        openTasksCount: view.metrics.openTasks,
        blockedTasksCount: view.metrics.blockedTasks,
        completedTasksCount: view.metrics.completedTasks,
        projectionVersion: existingView[0].projectionVersion + 1,
        viewJson: JSON.stringify(view),
        updatedAt: now,
      })
      .where(eq(scmOperationalShipment360ViewsV2.shipmentId, shipmentId));
  }

  // 2. Upsert Cockpit Items for each task
  const hasActiveBlockingExc = view.exceptions.some(
    (e) => e.isBlocking && e.status !== "RESOLVED" && e.status !== "WAIVED",
  );

  for (const task of view.tasks) {
    const meta = resolveTaskMetadata(task.taskType, view.serviceType);
    const scoreUrgency = computeAttentionScoreAndUrgency(
      {
        itemType: "TASK",
        status: task.status,
        isBlocked: task.isBlocked,
        priority: task.priority,
        hasBlockingException: hasActiveBlockingExc,
      },
      view.serviceType,
    );

    const blockedBy = task.dependencies
      .filter((d) => d.status === "BLOCKING")
      .map((d) => d.predecessorTaskId);

    const cockpitItem: OperationalCockpitWorkItem = {
      workItemId: task.taskId,
      taskId: task.taskId,
      shipmentId,
      shipmentReference: view.shipmentReference,
      serviceType: view.serviceType,
      taskTypeCode: task.taskType,
      title: meta.title,
      description: meta.description,
      priority: task.priority as any,
      status: task.status as any,
      isBlocked: task.isBlocked,
      blockedByTasks: blockedBy,
      urgencyBucket: scoreUrgency.urgencyBucket,
      attentionScore: scoreUrgency.attentionScore,
      scoreBreakdown: scoreUrgency.scoreBreakdown,
      itemType: "TASK",
      workflowInfo: view.workflow
        ? {
            instanceId: view.workflow.instanceId,
            definitionCode: view.workflow.definitionCode,
            versionNumber: view.workflow.versionNumber,
            status: view.workflow.status,
          }
        : undefined,
      primaryAction: meta.primaryAction,
      updatedAt: now.toISOString(),
    };

    const existingItem = await db
      .select()
      .from(scmOperationalCockpitWorkItemsV2)
      .where(eq(scmOperationalCockpitWorkItemsV2.workItemId, task.taskId))
      .limit(1);

    if (existingItem.length === 0) {
      await db.insert(scmOperationalCockpitWorkItemsV2).values({
        workItemId: task.taskId,
        taskId: task.taskId,
        shipmentId,
        shipmentReference: view.shipmentReference,
        serviceType: view.serviceType,
        taskTypeCode: task.taskType,
        title: meta.title,
        priority: task.priority,
        status: task.status,
        isBlocked: task.isBlocked ? 1 : 0,
        urgencyBucket: scoreUrgency.urgencyBucket,
        attentionScore: scoreUrgency.attentionScore,
        workflowInstanceId: view.workflow?.instanceId || null,
        itemJson: JSON.stringify(cockpitItem),
        updatedAt: now,
      });
    } else {
      await db
        .update(scmOperationalCockpitWorkItemsV2)
        .set({
          shipmentReference: view.shipmentReference,
          serviceType: view.serviceType,
          taskTypeCode: task.taskType,
          title: meta.title,
          priority: task.priority,
          status: task.status,
          isBlocked: task.isBlocked ? 1 : 0,
          urgencyBucket: scoreUrgency.urgencyBucket,
          attentionScore: scoreUrgency.attentionScore,
          workflowInstanceId: view.workflow?.instanceId || null,
          itemJson: JSON.stringify(cockpitItem),
          updatedAt: now,
        })
        .where(eq(scmOperationalCockpitWorkItemsV2.workItemId, task.taskId));
    }
  }

  // 3. Upsert Cockpit Items for each active exception
  const activeExceptions = view.exceptions.filter(
    (e) => e.status !== "RESOLVED" && e.status !== "WAIVED",
  );

  for (const exc of activeExceptions) {
    const scoreUrgency = computeAttentionScoreAndUrgency(
      {
        itemType: "EXCEPTION",
        status: exc.status,
        isBlocked: false,
        priority: exc.severity,
        hasBlockingException: exc.isBlocking,
      },
      view.serviceType,
    );

    const excWorkItem: OperationalCockpitWorkItem = {
      workItemId: exc.exceptionId,
      taskId: exc.exceptionId,
      shipmentId,
      shipmentReference: view.shipmentReference,
      serviceType: view.serviceType,
      taskTypeCode: exc.category,
      title: `[Exception] ${exc.title}`,
      description: exc.description,
      priority: exc.severity as any,
      status: exc.status === "OPEN" ? "OPEN" : "IN_REVIEW",
      isBlocked: false,
      blockedByTasks: [],
      urgencyBucket: scoreUrgency.urgencyBucket,
      attentionScore: scoreUrgency.attentionScore,
      scoreBreakdown: scoreUrgency.scoreBreakdown,
      itemType: "EXCEPTION",
      primaryAction: {
        command: "RESOLVE_EXCEPTION",
        actionLabel: "Resolve Exception",
        inputFields: [
          {
            name: "resolutionNotes",
            label: "Resolution Notes",
            type: "string",
            required: true,
          },
        ],
      },
      updatedAt: now.toISOString(),
    };

    const existingExcItem = await db
      .select()
      .from(scmOperationalCockpitWorkItemsV2)
      .where(eq(scmOperationalCockpitWorkItemsV2.workItemId, exc.exceptionId))
      .limit(1);

    if (existingExcItem.length === 0) {
      await db.insert(scmOperationalCockpitWorkItemsV2).values({
        workItemId: exc.exceptionId,
        taskId: exc.exceptionId,
        shipmentId,
        shipmentReference: view.shipmentReference,
        serviceType: view.serviceType,
        taskTypeCode: exc.category,
        title: `[Exception] ${exc.title}`,
        priority: exc.severity,
        status: exc.status === "OPEN" ? "OPEN" : "IN_REVIEW",
        isBlocked: 0,
        urgencyBucket: scoreUrgency.urgencyBucket,
        attentionScore: scoreUrgency.attentionScore,
        workflowInstanceId: view.workflow?.instanceId || null,
        itemJson: JSON.stringify(excWorkItem),
        updatedAt: now,
      });
    } else {
      await db
        .update(scmOperationalCockpitWorkItemsV2)
        .set({
          shipmentReference: view.shipmentReference,
          serviceType: view.serviceType,
          taskTypeCode: exc.category,
          title: `[Exception] ${exc.title}`,
          priority: exc.severity,
          status: exc.status === "OPEN" ? "OPEN" : "IN_REVIEW",
          isBlocked: 0,
          urgencyBucket: scoreUrgency.urgencyBucket,
          attentionScore: scoreUrgency.attentionScore,
          workflowInstanceId: view.workflow?.instanceId || null,
          itemJson: JSON.stringify(excWorkItem),
          updatedAt: now,
        })
        .where(
          eq(scmOperationalCockpitWorkItemsV2.workItemId, exc.exceptionId),
        );
    }
  }

  // 4. Update resolved exceptions in Cockpit to COMPLETED
  const resolvedExceptions = view.exceptions.filter(
    (e) => e.status === "RESOLVED" || e.status === "WAIVED",
  );
  for (const exc of resolvedExceptions) {
    await db
      .update(scmOperationalCockpitWorkItemsV2)
      .set({
        status: "COMPLETED",
        attentionScore: 0,
        urgencyBucket: "UPCOMING",
        updatedAt: now,
      })
      .where(eq(scmOperationalCockpitWorkItemsV2.workItemId, exc.exceptionId));
  }

  return view;
}

// ============================================================================
// EVENT SUBSCRIBERS FOR REACTIVE CQRS PROJECTIONS
// ============================================================================

let subscribersRegistered = false;

export function registerOperationalBffSubscribers(): void {
  if (subscribersRegistered) return;

  const eventsToWatch = [
    "shipment_execution.ShipmentCreated.v2",
    "transport_planning.RoutePlanned.v2",
    "milestone_plan.Created.v2",
    "workflow_engine.WorkflowInstanceStarted.v2",
    "work_mgmt.TasksGenerated.v2",
    "work_mgmt.TaskCompleted.v2",
    "work_mgmt.TaskUnblocked.v2",
    "workflow_engine.WorkflowInstanceCompleted.v2",
    "shipment_execution.ShipmentStatusUpdated.v2",
    "op_intelligence.OperationalExceptionRaised.v2",
    "op_intelligence.OperationalExceptionAssigned.v2",
    "op_intelligence.OperationalExceptionResolved.v2",
  ];

  for (const eventType of eventsToWatch) {
    outboxBus.subscribe(
      eventType,
      `op_intelligence.BffProjector.${eventType.replace(/\./g, "_")}`,
      async (envelope) => {
        const payload = envelope.payload as any;
        const shipmentId =
          payload.shipmentId ||
          (payload.subjectType === "SHIPMENT" ? payload.subjectId : null) ||
          payload.aggregateId;

        if (shipmentId && typeof shipmentId === "string") {
          await refreshShipmentProjections(shipmentId);
        }
      },
    );
  }

  subscribersRegistered = true;
}

// ============================================================================
// BFF QUERY APIS (EXPOSING PROJECTED READ MODELS)
// ============================================================================

export async function getShipment360View(
  shipmentId: string,
): Promise<OperationalShipment360View> {
  await ensureOperationalBffTables();
  registerOperationalBffSubscribers();

  let rows = await db
    .select()
    .from(scmOperationalShipment360ViewsV2)
    .where(eq(scmOperationalShipment360ViewsV2.shipmentId, shipmentId))
    .limit(1);

  if (rows.length === 0) {
    rows = await db
      .select()
      .from(scmOperationalShipment360ViewsV2)
      .where(eq(scmOperationalShipment360ViewsV2.shipmentReference, shipmentId))
      .limit(1);
  }

  if (rows.length === 0 && !shipmentId.startsWith("shp_")) {
    rows = await db
      .select()
      .from(scmOperationalShipment360ViewsV2)
      .where(
        eq(scmOperationalShipment360ViewsV2.shipmentId, `shp_${shipmentId}`),
      )
      .limit(1);
  }

  if (rows.length > 0) {
    return JSON.parse(rows[0].viewJson) as OperationalShipment360View;
  }

  // Resilient read-through fallback if not yet projected
  return refreshShipmentProjections(shipmentId);
}

export async function listShipment360Views(params?: {
  lifecycle?: string;
  serviceType?: string;
  healthStatus?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; items: OperationalShipment360View[] }> {
  await ensureOperationalBffTables();
  registerOperationalBffSubscribers();

  const query = db.select().from(scmOperationalShipment360ViewsV2);
  const conditions = [];

  if (params?.lifecycle) {
    conditions.push(
      eq(scmOperationalShipment360ViewsV2.lifecycle, params.lifecycle),
    );
  }
  if (params?.serviceType) {
    conditions.push(
      eq(scmOperationalShipment360ViewsV2.serviceType, params.serviceType),
    );
  }
  if (params?.healthStatus) {
    conditions.push(
      eq(scmOperationalShipment360ViewsV2.healthStatus, params.healthStatus),
    );
  }
  if (params?.search) {
    conditions.push(
      like(
        scmOperationalShipment360ViewsV2.shipmentReference,
        `%${params.search}%`,
      ),
    );
  }

  const rows =
    conditions.length > 0
      ? await query
          .where(and(...conditions))
          .orderBy(desc(scmOperationalShipment360ViewsV2.updatedAt))
      : await query.orderBy(desc(scmOperationalShipment360ViewsV2.updatedAt));

  const items = rows.map(
    (r) => JSON.parse(r.viewJson) as OperationalShipment360View,
  );
  return {
    total: items.length,
    items,
  };
}

export async function listOperationsCockpitItems(params?: {
  status?: "OPEN" | "BLOCKED" | "COMPLETED" | "IN_REVIEW" | "ALL";
  urgencyBucket?: string;
  priority?: string;
  shipmentId?: string;
  search?: string;
}): Promise<{ total: number; items: OperationalCockpitWorkItem[] }> {
  await ensureOperationalBffTables();
  registerOperationalBffSubscribers();

  const query = db.select().from(scmOperationalCockpitWorkItemsV2);
  const conditions = [];

  if (params?.status && params.status !== "ALL") {
    conditions.push(eq(scmOperationalCockpitWorkItemsV2.status, params.status));
  } else if (!params?.status) {
    // Default to OPEN & non-completed items
    conditions.push(
      sql`${scmOperationalCockpitWorkItemsV2.status} IN ('OPEN', 'IN_REVIEW')`,
    );
  }

  if (params?.urgencyBucket) {
    conditions.push(
      eq(scmOperationalCockpitWorkItemsV2.urgencyBucket, params.urgencyBucket),
    );
  }
  if (params?.priority) {
    conditions.push(
      eq(scmOperationalCockpitWorkItemsV2.priority, params.priority),
    );
  }
  if (params?.shipmentId) {
    conditions.push(
      eq(scmOperationalCockpitWorkItemsV2.shipmentId, params.shipmentId),
    );
  }
  if (params?.search) {
    conditions.push(
      sql`(${scmOperationalCockpitWorkItemsV2.shipmentReference} LIKE ${`%${params.search}%`} OR ${scmOperationalCockpitWorkItemsV2.taskTypeCode} LIKE ${`%${params.search}%`} OR ${scmOperationalCockpitWorkItemsV2.title} LIKE ${`%${params.search}%`})`,
    );
  }

  const rows =
    conditions.length > 0
      ? await query
          .where(and(...conditions))
          .orderBy(
            desc(scmOperationalCockpitWorkItemsV2.attentionScore),
            desc(scmOperationalCockpitWorkItemsV2.priority),
            scmOperationalCockpitWorkItemsV2.updatedAt,
          )
      : await query.orderBy(
          desc(scmOperationalCockpitWorkItemsV2.attentionScore),
          desc(scmOperationalCockpitWorkItemsV2.priority),
          scmOperationalCockpitWorkItemsV2.updatedAt,
        );

  const items = rows.map(
    (r) => JSON.parse(r.itemJson) as OperationalCockpitWorkItem,
  );
  return {
    total: items.length,
    items,
  };
}

export async function getCockpitSummary(): Promise<CockpitSummaryMetrics> {
  await ensureOperationalBffTables();

  const allItems = await db.select().from(scmOperationalCockpitWorkItemsV2);

  const totalTasks = allItems.length;
  const openActionableCount = allItems.filter(
    (i) =>
      (i.status === "OPEN" || i.status === "IN_REVIEW") && i.isBlocked === 0,
  ).length;
  const blockedCount = allItems.filter(
    (i) => i.isBlocked === 1 && i.status !== "COMPLETED",
  ).length;
  const completedCount = allItems.filter(
    (i) => i.status === "COMPLETED",
  ).length;
  const criticalUrgencyCount = allItems.filter(
    (i) => i.urgencyBucket === "IMMEDIATE_ACTION",
  ).length;
  const dueTodayCount = allItems.filter(
    (i) => i.urgencyBucket === "DUE_TODAY",
  ).length;

  const wfInstances = await db.select().from(scmWorkflowEngineInstancesV2);
  const activeWorkflowsCount = wfInstances.filter(
    (w) => w.status === "RUNNING",
  ).length;
  const completedWorkflowsCount = wfInstances.filter(
    (w) => w.status === "COMPLETED",
  ).length;

  const allExceptions = await db.select().from(scmOperationalExceptionsV2);
  const activeExceptionsCount = allExceptions.filter(
    (e) => e.status !== "RESOLVED" && e.status !== "WAIVED",
  ).length;

  return {
    totalTasks,
    openActionableCount,
    blockedCount,
    completedCount,
    criticalUrgencyCount,
    dueTodayCount,
    activeWorkflowsCount,
    completedWorkflowsCount,
    activeExceptionsCount,
  };
}

// ============================================================================
// IN-SITU COCKPIT EXECUTION (TASKS & OPERATIONAL EXCEPTIONS)
// ============================================================================

export async function executeCockpitWorkItem(
  workItemId: string,
  input: {
    result?: Record<string, any>;
    notes?: string;
    resolutionNotes?: string;
    resolutionStatus?: "RESOLVED" | "WAIVED";
    [key: string]: any;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<{
  success: boolean;
  executedWorkItemId: string;
  completedTask: any;
  resolvedException?: OperationalExceptionRecord;
  unlockedWorkItems: OperationalCockpitWorkItem[];
  workflowStatus?: string;
  shipment360: OperationalShipment360View;
}> {
  await ensureOperationalBffTables();

  // 1. Check if the work item is an Operational Exception
  const excRows = await db
    .select()
    .from(scmOperationalExceptionsV2)
    .where(eq(scmOperationalExceptionsV2.exceptionId, workItemId))
    .limit(1);

  if (excRows.length > 0) {
    const targetShipmentId = excRows[0].shipmentId;
    const resolutionNotes =
      input.resolutionNotes ||
      input.notes ||
      "Resolved in-situ via Operations Cockpit";

    const resolvedException = await resolveOperationalException(
      workItemId,
      {
        resolutionNotes,
        resolutionStatus: input.resolutionStatus || "RESOLVED",
      },
      actor,
    );

    // Relay pending outbox events (cascades reactive projections)
    await outboxBus.relayPendingEvents();

    // Refresh projections for this shipment
    const freshView = await refreshShipmentProjections(targetShipmentId);

    // Find any newly unblocked work items
    const unlockedWorkItems: OperationalCockpitWorkItem[] = freshView.tasks
      .filter((t) => t.status === "OPEN" && !t.isBlocked)
      .map((t) => {
        const meta = resolveTaskMetadata(t.taskType, freshView.serviceType);
        const scoreUrgency = computeAttentionScoreAndUrgency(
          { status: t.status, isBlocked: t.isBlocked, priority: t.priority },
          freshView.serviceType,
        );
        return {
          workItemId: t.taskId,
          taskId: t.taskId,
          shipmentId: targetShipmentId,
          shipmentReference: freshView.shipmentReference,
          serviceType: freshView.serviceType,
          taskTypeCode: t.taskType,
          title: meta.title,
          description: meta.description,
          priority: t.priority as any,
          status: t.status as any,
          isBlocked: false,
          blockedByTasks: [],
          urgencyBucket: scoreUrgency.urgencyBucket,
          attentionScore: scoreUrgency.attentionScore,
          primaryAction: meta.primaryAction,
          updatedAt: freshView.lastUpdatedAt,
        };
      });

    return {
      success: true,
      executedWorkItemId: workItemId,
      completedTask: null,
      resolvedException,
      unlockedWorkItems,
      workflowStatus: freshView.workflow?.status,
      shipment360: freshView,
    };
  }

  // 2. Otherwise handle as a regular Operational Task
  const itemRows = await db
    .select()
    .from(scmOperationalCockpitWorkItemsV2)
    .where(eq(scmOperationalCockpitWorkItemsV2.workItemId, workItemId))
    .limit(1);

  let targetShipmentId: string;
  if (itemRows.length > 0) {
    targetShipmentId = itemRows[0].shipmentId;
  } else {
    const taskRows = await db
      .select()
      .from(scmLogicalTasks)
      .where(eq(scmLogicalTasks.taskId, workItemId))
      .limit(1);

    assertInvariant(
      taskRows.length > 0,
      "work_management",
      "WORK_ITEM_NOT_FOUND",
      `Cockpit work item '${workItemId}' not found`,
    );
    targetShipmentId = taskRows[0].subjectId;
  }

  const resultPayload = input.result || input;
  const completedTask = await completeTask(workItemId, resultPayload, actor);

  // Relay pending outbox events (cascades unblocking and workflow completion)
  await outboxBus.relayPendingEvents();

  // Refresh projections for this shipment
  const freshView = await refreshShipmentProjections(targetShipmentId);

  // Detect newly unblocked items for this shipment
  const unlockedWorkItems: OperationalCockpitWorkItem[] = freshView.tasks
    .filter(
      (t) => t.status === "OPEN" && !t.isBlocked && t.taskId !== workItemId,
    )
    .map((t) => {
      const meta = resolveTaskMetadata(t.taskType, freshView.serviceType);
      const scoreUrgency = computeAttentionScoreAndUrgency(
        { status: t.status, isBlocked: t.isBlocked, priority: t.priority },
        freshView.serviceType,
      );
      return {
        workItemId: t.taskId,
        taskId: t.taskId,
        shipmentId: targetShipmentId,
        shipmentReference: freshView.shipmentReference,
        serviceType: freshView.serviceType,
        taskTypeCode: t.taskType,
        title: meta.title,
        description: meta.description,
        priority: t.priority as any,
        status: t.status as any,
        isBlocked: false,
        blockedByTasks: [],
        urgencyBucket: scoreUrgency.urgencyBucket,
        attentionScore: scoreUrgency.attentionScore,
        workflowInfo: freshView.workflow
          ? {
              instanceId: freshView.workflow.instanceId,
              definitionCode: freshView.workflow.definitionCode,
              versionNumber: freshView.workflow.versionNumber,
              status: freshView.workflow.status,
            }
          : undefined,
        primaryAction: meta.primaryAction,
        updatedAt: freshView.lastUpdatedAt,
      };
    });

  return {
    success: true,
    executedWorkItemId: workItemId,
    completedTask,
    unlockedWorkItems,
    workflowStatus: freshView.workflow?.status,
    shipment360: freshView,
  };
}

// ============================================================================
// OPERATIONAL TIMELINE SYNTHESIS (CHRONOLOGICAL EVENT-SOURCING AUDIT)
// ============================================================================

export async function getShipmentOperationalTimeline(
  shipmentId: string,
): Promise<OperationalTimelineEvent[]> {
  await ensureOperationalBffTables();

  const timeline: OperationalTimelineEvent[] = [];

  // 1. Fetch Outbox messages for this shipment
  const outboxRows = await db
    .select()
    .from(scmOutboxMessages)
    .where(
      sql`${scmOutboxMessages.aggregateId} = ${shipmentId} OR ${scmOutboxMessages.payloadJson} LIKE ${`%"shipmentId":"${shipmentId}"%`} OR ${scmOutboxMessages.payloadJson} LIKE ${`%"subjectId":"${shipmentId}"%`}`,
    )
    .orderBy(scmOutboxMessages.occurredAt);

  for (const msg of outboxRows) {
    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(msg.payloadJson);
    } catch {
      payload = {};
    }

    let category: OperationalTimelineEvent["category"] = "LIFECYCLE";
    let title = msg.eventType;
    let description = `Event ${msg.eventType} recorded for shipment`;

    if (msg.eventType.includes("ShipmentCreated")) {
      category = "LIFECYCLE";
      title = "Shipment Created";
      description = `Shipment initialized with service ${payload.serviceType || "STANDARD"}`;
    } else if (msg.eventType.includes("RoutePlanned")) {
      category = "PLANNING";
      title = "Route Plan Established";
      description = `Route version ${payload.versionNumber || 1} planned with ${payload.stopsCount || "multiple"} stops`;
    } else if (
      msg.eventType.includes("MilestonePlanCreated") ||
      msg.eventType.includes("Created.v2")
    ) {
      category = "PLANNING";
      title = "Milestone Plan Generated";
      description = `Operational milestone schedule generated`;
    } else if (msg.eventType.includes("WorkflowInstanceStarted")) {
      category = "WORKFLOW";
      title = "Operational Workflow Started";
      description = `Workflow instance initiated for shipment`;
    } else if (msg.eventType.includes("TasksGenerated")) {
      category = "TASK";
      title = "Tasks Generated";
      description = `${payload.tasksCount || "Operational"} tasks materialized into DAG`;
    } else if (msg.eventType.includes("TaskCompleted")) {
      category = "TASK";
      title = `Task Completed: ${payload.taskType || payload.taskId}`;
      description = `Task marked completed successfully`;
    } else if (msg.eventType.includes("TaskUnblocked")) {
      category = "TASK";
      title = `Task Unblocked: ${payload.taskType || payload.taskId}`;
      description = `Predecessor finished; task is now actionable`;
    } else if (msg.eventType.includes("WorkflowInstanceCompleted")) {
      category = "WORKFLOW";
      title = "Workflow Completed";
      description = `All operational workflow tasks fulfilled`;
    } else if (msg.eventType.includes("OperationalExceptionRaised")) {
      category = "EXCEPTION";
      title = `[${payload.severity || "EXCEPTION"}] ${payload.title || "Exception Raised"}`;
      description = payload.description || `Category: ${payload.category}`;
    } else if (msg.eventType.includes("OperationalExceptionAssigned")) {
      category = "EXCEPTION";
      title = `Exception Assigned: ${payload.exceptionId}`;
      description = `Assigned to ${payload.assignedTeam || payload.assignedToUserId}`;
    } else if (msg.eventType.includes("OperationalExceptionResolved")) {
      category = "EXCEPTION";
      title = `Exception Resolved: ${payload.category || payload.exceptionId}`;
      description = payload.resolutionNotes || "Exception marked resolved";
    }

    let actorId = "system";
    try {
      const actorCtx = JSON.parse(msg.actorContextJson);
      actorId = actorCtx.userId || "system";
    } catch {
      actorId = "system";
    }

    timeline.push({
      timelineId: `tl_outbox_${msg.eventId}`,
      timestamp: new Date(msg.occurredAt).toISOString(),
      eventType: msg.eventType,
      source: "OUTBOX",
      category,
      title,
      description,
      actor: actorId,
      payload,
    });
  }

  // 2. Fetch tracking telemetry events if any
  const trackingRows = await db
    .select()
    .from(scmLogicalOperationalEvents)
    .where(eq(scmLogicalOperationalEvents.subjectId, shipmentId))
    .orderBy(scmLogicalOperationalEvents.occurredAt);

  for (const trk of trackingRows) {
    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(trk.payloadJson);
    } catch {
      payload = {};
    }

    timeline.push({
      timelineId: `tl_trk_${trk.eventId}`,
      timestamp: trk.occurredAt,
      eventType: trk.eventType,
      source: "TELEMETRY",
      category: "TELEMETRY",
      title: `Telemetry: ${trk.eventType}`,
      description: `Source: ${trk.source} at location ${trk.locationId || "In-Transit"}`,
      actor: trk.source,
      payload,
    });
  }

  // Sort timeline chronologically
  timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return timeline;
}

// ============================================================================
// PROJECTION HEALTH & FULL REBUILD
// ============================================================================

export async function getProjectionsHealth(): Promise<ProjectionsHealthReport> {
  await ensureOperationalBffTables();

  const outboxRows = await db.select().from(scmOutboxMessages);
  const dlq = await outboxBus.getDeadLetterQueue();

  const pendingCount = outboxRows.filter((r) => r.status === "PENDING").length;
  const processingCount = outboxRows.filter(
    (r) => r.status === "PROCESSING",
  ).length;
  const processedCount = outboxRows.filter(
    (r) => r.status === "PROCESSED",
  ).length;
  const failedCount = outboxRows.filter((r) => r.status === "FAILED").length;

  const [shp360Rows, cockpitRows, excRows] = await Promise.all([
    db.select().from(scmOperationalShipment360ViewsV2),
    db.select().from(scmOperationalCockpitWorkItemsV2),
    db.select().from(scmOperationalExceptionsV2),
  ]);

  // Compute lag
  let latestOutboxMs = 0;
  let lastOutboxTimestamp: string | null = null;
  for (const r of outboxRows) {
    const t = new Date(r.occurredAt).getTime();
    if (t > latestOutboxMs) {
      latestOutboxMs = t;
      lastOutboxTimestamp = new Date(r.occurredAt).toISOString();
    }
  }

  let latestProjMs = 0;
  let lastProcessedTimestamp: string | null = null;
  for (const p of shp360Rows) {
    const t = new Date(p.updatedAt).getTime();
    if (t > latestProjMs) {
      latestProjMs = t;
      lastProcessedTimestamp = new Date(p.updatedAt).toISOString();
    }
  }

  const lagMs =
    pendingCount > 0 && latestOutboxMs > latestProjMs
      ? latestOutboxMs - latestProjMs
      : 0;

  let healthStatus: ProjectionsHealthReport["status"] = "HEALTHY";
  if (dlq.length > 0 || failedCount > 0) {
    healthStatus = "DEGRADED";
  } else if (pendingCount > 25 || lagMs > 30000) {
    healthStatus = "OUT_OF_SYNC";
  }

  return {
    status: healthStatus,
    outboxMetrics: {
      pendingCount,
      processingCount,
      processedCount,
      failedCount,
      dlqCount: dlq.length,
    },
    projectionMetrics: {
      shipment360Count: shp360Rows.length,
      cockpitItemsCount: cockpitRows.length,
      exceptionsCount: excRows.length,
    },
    projectorLagMs: lagMs,
    lastProcessedEventTimestamp: lastProcessedTimestamp,
    lastOutboxEventTimestamp: lastOutboxTimestamp,
  };
}

export async function rebuildAllOperationalProjections(): Promise<{
  success: boolean;
  shipmentsRebuiltCount: number;
  cockpitItemsRebuiltCount: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  await ensureOperationalBffTables();

  const shipments = await db.select().from(scmLogicalShipments);
  let cockpitItemsCount = 0;

  for (const shp of shipments) {
    const view = await refreshShipmentProjections(shp.shipmentId);
    cockpitItemsCount += view.tasks.length;
  }

  const durationMs = Date.now() - startTime;
  return {
    success: true,
    shipmentsRebuiltCount: shipments.length,
    cockpitItemsRebuiltCount: cockpitItemsCount,
    durationMs,
  };
}

// Automatically register subscribers on module load
registerOperationalBffSubscribers();
