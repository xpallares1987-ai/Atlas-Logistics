import { v4 as uuidv4 } from "uuid";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmLogicalShipments,
  scmShipmentReferences,
  scmShipmentPartyRoles,
  scmShipmentAssignments,
  scmLogicalRoutePlans,
  scmLogicalRouteVersions,
  scmLogicalRouteStops,
  scmLogicalTransportLegs,
  scmLogicalMilestonePlans,
  scmLogicalMilestones,
} from "../../../db/schema/scm_logical_slice1_sqlite.js";
import { scmOutboxMessages } from "../../../db/schema/scm_foundation.js";
import {
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
  DomainInvariantError,
} from "../../kernel/primitives.js";
import { ensureScmLogicalSlice1Tables } from "../../kernel/logical-slice1-tables.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";
import {
  createTask,
  addTaskDependency,
  getTasksForSubject,
} from "../work-management/work-management.context.js";

// ============================================================================
// OPERATIONAL CORE CONTEXT (Vertical Slice 1 Operational Flow)
// Command -> Aggregate -> Transaction -> Outbox -> Event -> Projection -> UI
// ============================================================================

export interface OperationalShipmentRecord {
  shipmentId: string;
  shipmentReference: string;
  serviceType: string;
  owningOrganizationId: string;
  lifecycle: string;
  closureStatus: string;
  references: Array<{
    referenceId: string;
    type: string;
    value: string;
    source: string;
    isPrimary: boolean;
  }>;
  partyRoles: Array<{
    shipmentPartyRoleId: string;
    partyId: string;
    role: string;
  }>;
  assignments: Array<{
    assignmentId: string;
    assignmentType: string;
    teamId?: string | null;
    userId?: string | null;
  }>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationalRoutePlanRecord {
  routePlanId: string;
  shipmentId: string;
  versionNumber: number;
  status: string;
  changeReason: string;
  stops: Array<{
    stopId: string;
    sequence: number;
    locationId: string;
    stopType: string;
    plannedArrival?: string | null;
    plannedDeparture?: string | null;
  }>;
  legs: Array<{
    legId: string;
    sequence: number;
    originLocationId: string;
    destinationLocationId: string;
    transportMode: string;
    plannedDeparture: string;
    plannedArrival: string;
  }>;
}

export interface Shipment360OperationalModel {
  shipment: OperationalShipmentRecord;
  routePlan?: OperationalRoutePlanRecord | null;
  milestonePlan?: {
    milestonePlanId: string;
    status: string;
    milestones: Array<{
      milestoneId: string;
      milestoneType: string;
      sequence: number;
      locationId?: string | null;
      plannedAt?: string | null;
      status: string;
    }>;
  } | null;
  tasks: Array<{
    taskId: string;
    taskType: string;
    priority: string;
    status: string;
    isBlocked: boolean;
    dependencies: Array<{
      predecessorTaskId: string;
      status: string;
    }>;
  }>;
}

// ============================================================================
// 1. APPLICATION COMMAND: createOperationalShipment
// ============================================================================
export async function createOperationalShipment(
  input: {
    shipmentId?: string;
    shipmentReference: string;
    serviceType: string;
    customerPartyId: string;
    bookingReference?: string;
    teamId?: string;
    userId?: string;
    idempotencyKey?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<OperationalShipmentRecord> {
  await ensureScmLogicalSlice1Tables();

  // Command Idempotency Check: By shipmentReference
  const existing = await db
    .select()
    .from(scmLogicalShipments)
    .where(eq(scmLogicalShipments.shipmentReference, input.shipmentReference))
    .limit(1);

  if (existing.length > 0) {
    return getOperationalShipmentById(existing[0].shipmentId);
  }

  const shipmentId = input.shipmentId || `shp_${uuidv4()}`;
  const now = new Date();
  const correlationId = `corr_${uuidv4()}`;
  const causationId = input.idempotencyKey || `cmd_create_shipment`;

  // Atomic Transaction Boundary: Aggregate Mutation + Outbox Event in the SAME transaction
  await db.transaction(async (tx) => {
    // 1. Persist Aggregate Root
    await tx.insert(scmLogicalShipments).values({
      shipmentId,
      shipmentReference: input.shipmentReference,
      serviceType: input.serviceType,
      owningOrganizationId: actor.organizationId,
      lifecycle: "CREATED",
      closureStatus: "OPEN",
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    // 2. Persist Composition Entities
    const referenceId = `sref_${uuidv4()}`;
    await tx.insert(scmShipmentReferences).values({
      referenceId,
      shipmentId,
      type: "BOOKING_REFERENCE",
      value: input.bookingReference || `BK-${input.shipmentReference}`,
      source: "INITIAL_DISPATCH",
      isPrimary: true,
    });

    const shipmentPartyRoleId = `spr_${uuidv4()}`;
    await tx.insert(scmShipmentPartyRoles).values({
      shipmentPartyRoleId,
      shipmentId,
      partyId: input.customerPartyId,
      role: "CUSTOMER",
    });

    const assignmentId = `sasg_${uuidv4()}`;
    await tx.insert(scmShipmentAssignments).values({
      assignmentId,
      shipmentId,
      assignmentType: "OPERATIONS_OWNER",
      organizationId: actor.organizationId,
      teamId: input.teamId || "TEAM-DEFAULT-OPS",
      userId: input.userId || actor.userId,
      activeFrom: now.toISOString(),
    });

    // 3. Atomically enqueue Domain Event in Transactional Outbox within TX
    await outboxBus.enqueueEvents(
      [
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "shipment_execution.ShipmentCreated.v2",
          schemaVersion: 2,
          producerContext: "shipment_exec",
          aggregateType: "Shipment",
          aggregateId: shipmentId,
          aggregateVersion: 1,
          correlationId,
          causationId,
          actor,
          occurredAt: now.toISOString(),
          payload: {
            shipmentId,
            shipmentReference: input.shipmentReference,
            serviceType: input.serviceType,
            customerPartyId: input.customerPartyId,
          },
        },
      ],
      tx,
    );
  });

  await outboxBus.relayPendingEvents();

  return getOperationalShipmentById(shipmentId);
}

// ============================================================================
// 2. OPTIMISTIC LOCKING: updateOperationalShipment
// ============================================================================
export async function updateOperationalShipment(
  input: {
    shipmentId: string;
    expectedVersion: number;
    lifecycle?: string;
    serviceType?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<OperationalShipmentRecord> {
  await ensureScmLogicalSlice1Tables();

  const existing = await db
    .select()
    .from(scmLogicalShipments)
    .where(eq(scmLogicalShipments.shipmentId, input.shipmentId))
    .limit(1);

  assertInvariant(
    existing.length > 0,
    "shipment_exec",
    "SHIPMENT_NOT_FOUND",
    `Shipment '${input.shipmentId}' not found`,
  );

  const current = existing[0];

  // Optimistic concurrency control invariant
  if (current.version !== input.expectedVersion) {
    throw new DomainInvariantError(
      "shipment_exec",
      "CONCURRENCY_CONFLICT",
      `Optimistic locking conflict on Shipment '${input.shipmentId}': expected version ${input.expectedVersion}, but current database version is ${current.version}.`,
    );
  }

  const now = new Date();
  const nextVersion = current.version + 1;

  await db
    .update(scmLogicalShipments)
    .set({
      lifecycle: input.lifecycle || current.lifecycle,
      serviceType: input.serviceType || current.serviceType,
      version: nextVersion,
      updatedAt: now,
    })
    .where(
      and(
        eq(scmLogicalShipments.shipmentId, input.shipmentId),
        eq(scmLogicalShipments.version, input.expectedVersion),
      ),
    );

  await outboxBus.enqueueEvents([
    {
      eventId: `evt_${uuidv4()}`,
      eventType: "shipment_execution.ShipmentUpdated.v2",
      schemaVersion: 2,
      producerContext: "shipment_exec",
      aggregateType: "Shipment",
      aggregateId: input.shipmentId,
      aggregateVersion: nextVersion,
      correlationId: `corr_${uuidv4()}`,
      causationId: `cmd_update_shipment`,
      actor,
      occurredAt: now.toISOString(),
      payload: {
        shipmentId: input.shipmentId,
        version: nextVersion,
      },
    },
  ]);

  await outboxBus.relayPendingEvents();

  return getOperationalShipmentById(input.shipmentId);
}

// ============================================================================
// 3. APPLICATION COMMAND: createInitialRoutePlan
// ============================================================================
export async function createInitialRoutePlan(
  input: {
    shipmentId: string;
    stops: Array<{
      sequence: number;
      locationId: string;
      stopType: string;
      plannedArrival?: string;
      plannedDeparture?: string;
    }>;
    legs: Array<{
      sequence: number;
      originLocationId: string;
      destinationLocationId: string;
      transportMode: string;
      plannedDeparture: string;
      plannedArrival: string;
    }>;
    idempotencyKey?: string;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<OperationalRoutePlanRecord> {
  await ensureScmLogicalSlice1Tables();

  // Command Idempotency Check: if route plan already exists for shipment
  const existing = await db
    .select()
    .from(scmLogicalRoutePlans)
    .where(eq(scmLogicalRoutePlans.shipmentId, input.shipmentId))
    .limit(1);

  if (existing.length > 0) {
    const plan = existing[0];
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
      return {
        routePlanId: plan.routePlanId,
        shipmentId: input.shipmentId,
        versionNumber: ver.versionNumber,
        status: ver.status,
        changeReason: ver.changeReason,
        stops,
        legs,
      };
    }
  }

  const routePlanId = `rpl_${uuidv4()}`;
  const routeVersionId = `rver_${uuidv4()}`;
  const now = new Date();
  const correlationId = `corr_${uuidv4()}`;
  const causationId = input.idempotencyKey || `cmd_plan_route`;

  // Atomic Transaction Boundary: RoutePlan + Stops + Legs + Shipment state + Outbox Event in the SAME transaction
  await db.transaction(async (tx) => {
    // 1. Create RoutePlan Root
    await tx.insert(scmLogicalRoutePlans).values({
      routePlanId,
      shipmentId: input.shipmentId,
      currentVersionId: routeVersionId,
      status: "ACTIVE",
      createdAt: now,
      version: 1,
    });

    // 2. Create Published RouteVersion (inmutable)
    await tx.insert(scmLogicalRouteVersions).values({
      routeVersionId,
      routePlanId,
      versionNumber: 1,
      status: "PUBLISHED",
      changeReason: "Initial published corridor plan",
      createdBy: actor.userId,
      createdAt: now,
      publishedAt: now.toISOString(),
    });

    // 3. Create RouteStops
    for (const stop of input.stops) {
      await tx.insert(scmLogicalRouteStops).values({
        stopId: `stp_${uuidv4()}`,
        routeVersionId,
        sequence: stop.sequence,
        locationId: stop.locationId,
        stopType: stop.stopType,
        plannedArrival: stop.plannedArrival || null,
        plannedDeparture: stop.plannedDeparture || null,
      });
    }

    // 4. Create TransportLegs
    for (const leg of input.legs) {
      await tx.insert(scmLogicalTransportLegs).values({
        legId: `leg_${uuidv4()}`,
        routeVersionId,
        sequence: leg.sequence,
        originLocationId: leg.originLocationId,
        destinationLocationId: leg.destinationLocationId,
        transportMode: leg.transportMode,
        plannedDeparture: leg.plannedDeparture,
        plannedArrival: leg.plannedArrival,
      });
    }

    // 5. Update shipment lifecycle to PLANNED
    await tx
      .update(scmLogicalShipments)
      .set({ lifecycle: "PLANNED", updatedAt: now })
      .where(eq(scmLogicalShipments.shipmentId, input.shipmentId));

    // 6. Enqueue RoutePlanned.v2 event in Transactional Outbox within TX
    await outboxBus.enqueueEvents(
      [
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "transport_planning.RoutePlanned.v2",
          schemaVersion: 2,
          producerContext: "transport_plan",
          aggregateType: "RoutePlan",
          aggregateId: routePlanId,
          aggregateVersion: 1,
          correlationId,
          causationId,
          actor,
          occurredAt: now.toISOString(),
          payload: {
            routePlanId,
            shipmentId: input.shipmentId,
            versionNumber: 1,
            stops: input.stops,
            legs: input.legs,
          },
        },
      ],
      tx,
    );
  });

  await outboxBus.relayPendingEvents();

  return {
    routePlanId,
    shipmentId: input.shipmentId,
    versionNumber: 1,
    status: "PUBLISHED",
    changeReason: "Initial published corridor plan",
    stops: input.stops.map((s, idx) => ({ ...s, stopId: `stp_${idx + 1}` })),
    legs: input.legs.map((l, idx) => ({ ...l, legId: `leg_${idx + 1}` })),
  };
}

// ============================================================================
// 4. REACTIVE SUBSCRIBERS: MilestonePlan & Task DAG Generation
// ============================================================================
let operationalSubscribersRegistered = false;

export function registerOperationalSubscribers(): void {
  if (operationalSubscribersRegistered) return;

  // Subscriber 1: On RoutePlanned.v2 -> Initialize MilestonePlan & Milestones
  outboxBus.subscribe(
    "transport_planning.RoutePlanned.v2",
    "tracking.MilestonePlanGenerator.OnRoutePlanned",
    async (event) => {
      await ensureScmLogicalSlice1Tables();
      const p = event.payload;
      const milestonePlanId = `mpl_${uuidv4()}`;
      const now = new Date();

      await db.insert(scmLogicalMilestonePlans).values({
        milestonePlanId,
        subjectType: "SHIPMENT",
        subjectId: p.shipmentId,
        planType: "END_TO_END_SHIPMENT",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      // Generate initial milestones based on planned stops
      const milestoneTypes = [
        "GATE_IN",
        "VGM_CUTOFF",
        "POL_DEPARTURE",
        "ETA_POD",
        "POD_DELIVERY",
      ];

      for (let i = 0; i < milestoneTypes.length; i++) {
        await db.insert(scmLogicalMilestones).values({
          milestoneId: `ms_${uuidv4()}`,
          milestonePlanId,
          milestoneType: milestoneTypes[i],
          sequence: i + 1,
          locationId: p.stops?.[0]?.locationId || "ESBCN",
          status: "PLANNED",
        });
      }

      await outboxBus.enqueueEvents([
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "tracking.MilestonePlanCreated.v2",
          schemaVersion: 2,
          producerContext: "tracking",
          aggregateType: "MilestonePlan",
          aggregateId: milestonePlanId,
          aggregateVersion: 1,
          correlationId: event.correlationId,
          causationId: event.eventId,
          actor: event.actor,
          occurredAt: now.toISOString(),
          payload: {
            milestonePlanId,
            shipmentId: p.shipmentId,
            milestoneCount: milestoneTypes.length,
          },
        },
      ]);
    },
  );

  // Subscriber 2: On MilestonePlanCreated.v2 -> Generate Initial Tasks with DAG dependencies
  outboxBus.subscribe(
    "tracking.MilestonePlanCreated.v2",
    "work_mgmt.InitialTasksGenerator.OnMilestonePlanCreated",
    async (event) => {
      await ensureScmLogicalSlice1Tables();
      const p = event.payload;

      // 1. Task A: Confirm Carrier Booking
      const taskA = await createTask(
        {
          taskType: "CONFIRM_CARRIER_BOOKING",
          subjectType: "SHIPMENT",
          subjectId: p.shipmentId,
          priority: "HIGH",
        },
        event.actor,
      );

      // 2. Task B: Verify SOLAS VGM & Cut-off
      const taskB = await createTask(
        {
          taskType: "VERIFY_VGM_CUTOFF",
          subjectType: "SHIPMENT",
          subjectId: p.shipmentId,
          priority: "HIGH",
        },
        event.actor,
      );

      // 3. Task C: Issue Bill of Lading (Transport Document)
      const taskC = await createTask(
        {
          taskType: "ISSUE_BILL_OF_LADING",
          subjectType: "SHIPMENT",
          subjectId: p.shipmentId,
          priority: "MEDIUM",
        },
        event.actor,
      );

      // Add dependencies: Task A -> Task B -> Task C (Strict cycle-free DAG)
      await addTaskDependency(
        {
          predecessorTaskId: taskA.taskId,
          successorTaskId: taskB.taskId,
          dependencyType: "FINISH_TO_START",
          status: "BLOCKING",
        },
        event.actor,
      );

      await addTaskDependency(
        {
          predecessorTaskId: taskB.taskId,
          successorTaskId: taskC.taskId,
          dependencyType: "FINISH_TO_START",
          status: "BLOCKING",
        },
        event.actor,
      );

      // Enqueue TasksGenerated.v2 event in Transactional Outbox
      await outboxBus.enqueueEvents([
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "work_mgmt.TasksGenerated.v2",
          schemaVersion: 2,
          producerContext: "work_mgmt",
          aggregateType: "TaskDAG",
          aggregateId: p.shipmentId,
          aggregateVersion: 1,
          correlationId: event.correlationId,
          causationId: event.eventId,
          actor: event.actor,
          occurredAt: new Date().toISOString(),
          payload: {
            shipmentId: p.shipmentId,
            taskIds: [taskA.taskId, taskB.taskId, taskC.taskId],
            pipeline: [
              "CONFIRM_CARRIER_BOOKING",
              "VERIFY_VGM_CUTOFF",
              "ISSUE_BILL_OF_LADING",
            ],
          },
        },
      ]);
    },
  );

  operationalSubscribersRegistered = true;
}

// Auto-register on load
registerOperationalSubscribers();

// ============================================================================
// 5. CQRS PROJECTION: Shipment360OperationalModel
// ============================================================================
export async function getOperationalShipmentById(
  shipmentId: string,
): Promise<OperationalShipmentRecord> {
  await ensureScmLogicalSlice1Tables();

  const shp = await db
    .select()
    .from(scmLogicalShipments)
    .where(eq(scmLogicalShipments.shipmentId, shipmentId))
    .limit(1);

  assertInvariant(
    shp.length > 0,
    "shipment_exec",
    "SHIPMENT_NOT_FOUND",
    `Shipment '${shipmentId}' not found`,
  );

  const [refs, partyRoles, assignments] = await Promise.all([
    db
      .select()
      .from(scmShipmentReferences)
      .where(eq(scmShipmentReferences.shipmentId, shipmentId)),
    db
      .select()
      .from(scmShipmentPartyRoles)
      .where(eq(scmShipmentPartyRoles.shipmentId, shipmentId)),
    db
      .select()
      .from(scmShipmentAssignments)
      .where(eq(scmShipmentAssignments.shipmentId, shipmentId)),
  ]);

  return {
    ...shp[0],
    createdAt: new Date(shp[0].createdAt),
    updatedAt: new Date(shp[0].updatedAt),
    references: refs.map((r) => ({
      ...r,
      isPrimary: Boolean(r.isPrimary),
    })),
    partyRoles,
    assignments,
  };
}

export async function getShipment360OperationalModel(
  shipmentId: string,
): Promise<Shipment360OperationalModel> {
  await ensureScmLogicalSlice1Tables();

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

  let milestonePlan: Shipment360OperationalModel["milestonePlan"] = null;
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
  const tasks = await getTasksForSubject("SHIPMENT", shipmentId);

  return {
    shipment,
    routePlan,
    milestonePlan,
    tasks: tasks.map((t) => ({
      taskId: t.taskId,
      taskType: t.taskType,
      priority: t.priority,
      status: t.status,
      isBlocked: t.isBlocked,
      dependencies: t.dependencies.map((d) => ({
        predecessorTaskId: d.predecessorTaskId,
        status: d.status,
      })),
    })),
  };
}

// ============================================================================
// 6. OPERATIONAL AUDIT TRAIL RECONSTRUCTION
// Reconstructs: Shipment Created → Route Planned → Milestones Generated →
//               Tasks Generated → Task Completed → Successor Unblocked
// ============================================================================

export interface OperationalAuditStep {
  stepIndex: number;
  stage:
    | "SHIPMENT_CREATED"
    | "ROUTE_PLANNED"
    | "MILESTONES_GENERATED"
    | "TASKS_GENERATED"
    | "TASK_COMPLETED"
    | "TASK_UNBLOCKED";
  eventType: string;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  causationId: string;
  actor: SecurityActorContext;
  occurredAt: string;
  description: string;
  details: Record<string, unknown>;
}

export async function getOperationalAuditTrail(
  shipmentId: string,
): Promise<OperationalAuditStep[]> {
  await ensureScmFoundationTables();

  const allMessages = await db
    .select()
    .from(scmOutboxMessages)
    .orderBy(scmOutboxMessages.occurredAt);

  const shipmentEvents = allMessages.filter((m) => {
    try {
      const p = JSON.parse(m.payloadJson);
      return (
        m.aggregateId === shipmentId ||
        p.shipmentId === shipmentId ||
        p.subjectId === shipmentId
      );
    } catch {
      return false;
    }
  });

  const steps: OperationalAuditStep[] = [];
  let index = 1;

  for (const row of shipmentEvents) {
    const payload = JSON.parse(row.payloadJson);
    const actor = JSON.parse(row.actorContextJson);
    let stage: OperationalAuditStep["stage"] | null = null;
    let description = "";

    switch (row.eventType) {
      case "shipment_execution.ShipmentCreated.v2":
        stage = "SHIPMENT_CREATED";
        description = `Shipment '${payload.shipmentReference}' created with service type '${payload.serviceType}'`;
        break;
      case "transport_planning.RoutePlanned.v2":
        stage = "ROUTE_PLANNED";
        description = `Corridor route plan published (${payload.stops?.length || 0} stops, ${payload.legs?.length || 0} transport legs)`;
        break;
      case "tracking.MilestonePlanCreated.v2":
        stage = "MILESTONES_GENERATED";
        description = `Milestone tracking plan initialized with ${payload.milestoneCount || 5} operational milestones`;
        break;
      case "work_mgmt.TasksGenerated.v2":
        stage = "TASKS_GENERATED";
        description = `Operational task pipeline generated: ${(payload.pipeline || []).join(" -> ")}`;
        break;
      case "work_mgmt.TaskCompleted.v2":
        stage = "TASK_COMPLETED";
        description = `Task '${payload.taskType}' (${payload.taskId}) marked COMPLETED`;
        break;
      case "work_mgmt.TaskUnblocked.v2":
        stage = "TASK_UNBLOCKED";
        description = `Task '${payload.unblockedTaskId}' unblocked and transitioned to OPEN (predecessor '${payload.predecessorTaskId}' resolved)`;
        break;
    }

    if (stage) {
      steps.push({
        stepIndex: index++,
        stage,
        eventType: row.eventType,
        eventId: row.eventId,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        correlationId: row.correlationId,
        causationId: row.causationId,
        actor,
        occurredAt: row.occurredAt.toISOString(),
        description,
        details: payload,
      });
    }
  }

  return steps;
}
