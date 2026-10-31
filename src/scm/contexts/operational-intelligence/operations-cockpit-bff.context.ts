import { eq, and, desc, like, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmOperationalShipment360ViewsV2,
  scmOperationalCockpitWorkItemsV2,
} from "../../../db/schema/scm_operational_bff_sqlite.js";
import {
  scmLogicalShipments,
  scmLogicalRoutePlans,
  scmLogicalRouteVersions,
  scmLogicalRouteStops,
  scmLogicalTransportLegs,
  scmLogicalMilestonePlans,
  scmLogicalMilestones,
  scmLogicalTasks,
  scmLogicalTaskDependencies,
} from "../../../db/schema/scm_entities_sqlite.js";
import {
  scmWorkflowEngineInstancesV2,
  scmWorkflowEngineDefinitionsV2,
  scmWorkflowEngineDefinitionVersionsV2,
} from "../../../db/schema/scm_workflow_engine_sqlite.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import { ensureOperationalBffTables } from "../../kernel/operational-bff-tables.js";
import { outboxBus } from "../../kernel/outbox-bus.js";
import {
  getOperationalShipmentById,
  OperationalShipmentRecord,
  OperationalRoutePlanRecord,
} from "../operational-core/operational-core.context.js";
import {
  completeTask,
  getTasksForSubject,
} from "../work-management/work-management.context.js";

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

  health: {
    status: "ON_TRACK" | "AT_RISK" | "CRITICAL";
    score: number;
    blockers: string[];
  };

  metrics: {
    totalTasks: number;
    openTasks: number;
    blockedTasks: number;
    completedTasks: number;
    progressPercentage: number;
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
  status: "OPEN" | "BLOCKED" | "COMPLETED";
  isBlocked: boolean;
  blockedByTasks: string[];
  urgencyBucket: "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" | "BLOCKED";
  attentionScore: number;
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
}

// ============================================================================
// TASK METADATA HELPER
// ============================================================================

export function resolveTaskMetadata(taskTypeCode: string): {
  title: string;
  description: string;
  primaryAction: TaskActionMetadata;
} {
  switch (taskTypeCode) {
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
// ATTENTION SCORE & URGENCY COMPUTATION
// ============================================================================

export function computeAttentionScoreAndUrgency(
  task: {
    status: string;
    isBlocked: boolean;
    priority: string;
    deadline?: string | null;
  },
  serviceType: string,
): {
  attentionScore: number;
  urgencyBucket: "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" | "BLOCKED";
} {
  if (task.status === "COMPLETED") {
    return { attentionScore: 0, urgencyBucket: "UPCOMING" };
  }

  if (task.isBlocked || task.status === "BLOCKED") {
    return { attentionScore: 15, urgencyBucket: "BLOCKED" };
  }

  let baseScore = 50;
  if (task.priority === "CRITICAL") baseScore = 90;
  else if (task.priority === "HIGH") baseScore = 75;
  else if (task.priority === "MEDIUM") baseScore = 55;
  else if (task.priority === "LOW") baseScore = 35;

  if (serviceType === "AIR_EXPEDITE") baseScore += 10;
  else if (serviceType === "OCEAN_FCL") baseScore += 5;

  let urgency: "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" = "UPCOMING";
  if (task.priority === "CRITICAL" || baseScore >= 85) {
    urgency = "IMMEDIATE_ACTION";
  } else if (task.priority === "HIGH" || baseScore >= 70) {
    urgency = "DUE_TODAY";
  }

  return {
    attentionScore: Math.min(100, Math.max(0, baseScore)),
    urgencyBucket: urgency,
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
      definitionCode: defRows[0]?.definitionKey || "WORKFLOW",
      versionNumber: verRows[0]?.versionNumber || 1,
      status: wf.status,
      progressPercentage,
    };
  }

  const enrichedTasks = rawTasks.map((t) => {
    const meta = resolveTaskMetadata(t.taskType);
    return {
      taskId: t.taskId,
      taskType: t.taskType,
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

  let healthStatus: "ON_TRACK" | "AT_RISK" | "CRITICAL" = "ON_TRACK";
  let healthScore = 100;
  const blockers: string[] = [];

  if (blockedTasks > 0) {
    healthScore -= blockedTasks * 15;
    blockers.push(`${blockedTasks} task(s) currently blocked by dependencies`);
  }
  if (healthScore < 50) {
    healthStatus = "CRITICAL";
  } else if (healthScore < 80) {
    healthStatus = "AT_RISK";
  }

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
    health: {
      status: healthStatus,
      score: Math.max(0, healthScore),
      blockers,
    },
    metrics: {
      totalTasks,
      openTasks,
      blockedTasks,
      completedTasks,
      progressPercentage,
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
  for (const task of view.tasks) {
    const meta = resolveTaskMetadata(task.taskType);
    const scoreUrgency = computeAttentionScoreAndUrgency(
      {
        status: task.status,
        isBlocked: task.isBlocked,
        priority: task.priority,
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

  const rows = await db
    .select()
    .from(scmOperationalShipment360ViewsV2)
    .where(eq(scmOperationalShipment360ViewsV2.shipmentId, shipmentId))
    .limit(1);

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
  status?: "OPEN" | "BLOCKED" | "COMPLETED" | "ALL";
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
    conditions.push(eq(scmOperationalCockpitWorkItemsV2.status, "OPEN"));
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
    (i) => i.status === "OPEN" && i.isBlocked === 0,
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

  return {
    totalTasks,
    openActionableCount,
    blockedCount,
    completedCount,
    criticalUrgencyCount,
    dueTodayCount,
    activeWorkflowsCount,
    completedWorkflowsCount,
  };
}

export async function executeCockpitWorkItem(
  workItemId: string,
  input: { result?: Record<string, any>; notes?: string; [key: string]: any },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<{
  success: boolean;
  executedWorkItemId: string;
  completedTask: any;
  unlockedWorkItems: OperationalCockpitWorkItem[];
  workflowStatus?: string;
  shipment360: OperationalShipment360View;
}> {
  await ensureOperationalBffTables();

  // 1. Find the target work item
  const itemRows = await db
    .select()
    .from(scmOperationalCockpitWorkItemsV2)
    .where(eq(scmOperationalCockpitWorkItemsV2.workItemId, workItemId))
    .limit(1);

  let targetShipmentId: string;
  if (itemRows.length > 0) {
    targetShipmentId = itemRows[0].shipmentId;
  } else {
    // Check if it exists in scmLogicalTasks
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

  // 2. Complete the task in-situ
  const resultPayload = input.result || input;
  const completedTask = await completeTask(workItemId, resultPayload, actor);

  // 3. Relay pending outbox events (cascades unblocking and workflow completion)
  await outboxBus.relayPendingEvents();

  // 4. Refresh projections for this shipment
  const freshView = await refreshShipmentProjections(targetShipmentId);

  // 5. Detect newly unblocked items for this shipment
  const unlockedWorkItems: OperationalCockpitWorkItem[] = freshView.tasks
    .filter(
      (t) => t.status === "OPEN" && !t.isBlocked && t.taskId !== workItemId,
    )
    .map((t) => {
      const meta = resolveTaskMetadata(t.taskType);
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

// Automatically register subscribers on module load
registerOperationalBffSubscribers();
