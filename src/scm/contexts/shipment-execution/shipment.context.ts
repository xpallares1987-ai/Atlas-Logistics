import { randomInt } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { scmShipments } from "../../../db/schema/scm_foundation.js";
import {
  AggregateRoot,
  SecurityActorContext,
  assertInvariant,
  assertAbacScope,
  DEFAULT_OPERATOR_ACTOR,
} from "../../kernel/primitives.js";
import {
  ensureScmFoundationTables,
  outboxBus,
} from "../../kernel/outbox-bus.js";
import { recordOrderShipmentAllocation } from "../orders/order.context.js";

export interface ShipmentOrderLink {
  orderId: string;
  orderNumber: string;
  relationType: "SINGLE" | "SPLIT" | "COMBINED";
  allocatedPackages: number;
  allocatedWeightKg: number;
  allocatedVolumeCbm: number;
}

export interface ShipmentPartyRole {
  role:
    | "CUSTOMER_ACCOUNT"
    | "SHIPPER"
    | "CONSIGNEE"
    | "NOTIFY_PARTY"
    | "ORIGIN_AGENT"
    | "DEST_AGENT"
    | "CUSTOMS_BROKER";
  partyId: string;
  partyName: string;
  locationCode?: string;
}

export class ShipmentAggregate extends AggregateRoot<string> {
  public shipmentReference: string;
  public customerAccountId: string;
  public customerName: string;
  public serviceMode: string;
  public serviceType: string;
  public incoterm: string;
  public direction: string;
  public originLocationId: string;
  public destinationLocationId: string;
  public lifecycleState:
    | "CREATED"
    | "PLANNED"
    | "BOOKED"
    | "IN_EXECUTION"
    | "ARRIVED"
    | "DELIVERED"
    | "CLOSURE_REQUESTED"
    | "CLOSED"
    | "CANCELLED";
  public executionPhase: string;
  public closureState:
    "OPEN" | "OPERATIONAL_READY" | "FINANCIAL_READY" | "CLOSED" | "REOPENED";
  public healthStatus: "ON_TRACK" | "AT_RISK" | "CRITICAL" | "BLOCKED";
  public healthScore: number;
  public healthReasons: string[];
  public organizationId: string;
  public branchId: string;
  public teamId: string;
  public ownerUserId: string;
  public orderLinks: ShipmentOrderLink[];
  public partyRoles: ShipmentPartyRole[];
  public externalRefs: Array<{
    type: string;
    value: string;
    isPrimary: boolean;
  }>;

  constructor(params: {
    id: string;
    shipmentReference: string;
    customerAccountId: string;
    customerName: string;
    serviceMode: string;
    serviceType: string;
    incoterm: string;
    direction?: string;
    originLocationId: string;
    destinationLocationId: string;
    lifecycleState?: ShipmentAggregate["lifecycleState"];
    executionPhase?: string;
    closureState?: ShipmentAggregate["closureState"];
    healthStatus?: ShipmentAggregate["healthStatus"];
    healthScore?: number;
    healthReasons?: string[];
    organizationId: string;
    branchId: string;
    teamId: string;
    ownerUserId: string;
    orderLinks?: ShipmentOrderLink[];
    partyRoles?: ShipmentPartyRole[];
    externalRefs?: Array<{ type: string; value: string; isPrimary: boolean }>;
    version?: number;
  }) {
    super(params.id, params.version ?? 1);
    assertInvariant(
      Boolean(params.customerAccountId && params.customerAccountId.trim()),
      "shipment_execution",
      "SHIPMENT_MISSING_CUSTOMER_ACCOUNT",
      "Shipment requires a valid customerAccountId",
    );
    assertInvariant(
      Boolean(params.organizationId && params.branchId && params.teamId),
      "shipment_execution",
      "SHIPMENT_MISSING_OWNERSHIP",
      "Shipment requires responsible organizationId, branchId, and teamId",
    );

    this.shipmentReference = params.shipmentReference;
    this.customerAccountId = params.customerAccountId;
    this.customerName = params.customerName;
    this.serviceMode = params.serviceMode;
    this.serviceType = params.serviceType;
    this.incoterm = params.incoterm;
    this.direction = params.direction || "IMPORT";
    this.originLocationId = params.originLocationId;
    this.destinationLocationId = params.destinationLocationId;
    this.lifecycleState = params.lifecycleState || "CREATED";
    this.executionPhase = params.executionPhase || "ORIGIN_PREPARATION";
    this.closureState = params.closureState || "OPEN";
    this.healthStatus = params.healthStatus || "ON_TRACK";
    this.healthScore = params.healthScore ?? 100;
    this.healthReasons = params.healthReasons || [];
    this.organizationId = params.organizationId;
    this.branchId = params.branchId;
    this.teamId = params.teamId;
    this.ownerUserId = params.ownerUserId;
    this.orderLinks = params.orderLinks || [];
    this.partyRoles = params.partyRoles || [];
    this.externalRefs = params.externalRefs || [];
  }

  private assertNotClosed(): void {
    assertInvariant(
      this.lifecycleState !== "CLOSED",
      "shipment_execution",
      "SHIPMENT_IS_CLOSED_IMMUTABLE",
      `Shipment '${this.shipmentReference}' is CLOSED and rejects mutations unless reopened first`,
    );
  }

  public markDelivered(
    actor: SecurityActorContext,
    correlationId: string,
  ): void {
    this.assertNotClosed();
    this.lifecycleState = "DELIVERED";
    this.executionPhase = "DELIVERED";
    this.closureState = "OPERATIONAL_READY";
    this.incrementVersion();

    this.recordDomainEvent({
      eventType: "shipment_execution.ShipmentDelivered.v1",
      producerContext: "shipment_execution",
      aggregateType: "Shipment",
      correlationId,
      actor,
      payload: {
        shipmentId: this.id,
        shipmentReference: this.shipmentReference,
        lifecycleState: this.lifecycleState,
        executionPhase: this.executionPhase,
        closureState: this.closureState,
      },
    });
  }

  public closeShipment(
    actor: SecurityActorContext,
    correlationId: string,
  ): void {
    assertInvariant(
      this.executionPhase === "DELIVERED",
      "shipment_execution",
      "SHIPMENT_CLOSE_REQUIRES_DELIVERED_PHASE",
      `Shipment '${this.shipmentReference}' cannot be closed before reaching DELIVERED phase (current: ${this.executionPhase})`,
    );
    assertInvariant(
      this.healthStatus !== "BLOCKED",
      "shipment_execution",
      "SHIPMENT_CLOSE_BLOCKED_BY_HEALTH",
      `Shipment '${this.shipmentReference}' has critical health blocks and cannot be closed`,
    );

    this.lifecycleState = "CLOSED";
    this.closureState = "CLOSED";
    this.incrementVersion();

    this.recordDomainEvent({
      eventType: "shipment_execution.ShipmentClosed.v1",
      producerContext: "shipment_execution",
      aggregateType: "Shipment",
      correlationId,
      actor,
      payload: {
        shipmentId: this.id,
        shipmentReference: this.shipmentReference,
        lifecycleState: this.lifecycleState,
        closureState: this.closureState,
      },
    });
  }

  public reopenShipment(
    reason: string,
    actor: SecurityActorContext,
    correlationId: string,
  ): void {
    assertInvariant(
      this.lifecycleState === "CLOSED",
      "shipment_execution",
      "SHIPMENT_NOT_CLOSED",
      `Shipment '${this.shipmentReference}' is not CLOSED`,
    );
    assertInvariant(
      Boolean(reason && reason.trim().length >= 5),
      "shipment_execution",
      "SHIPMENT_REOPEN_REASON_REQUIRED",
      "Reopening a closed shipment requires an audit reason of at least 5 characters",
    );

    this.lifecycleState = "DELIVERED";
    this.closureState = "REOPENED";
    this.incrementVersion();

    this.recordDomainEvent({
      eventType: "shipment_execution.ShipmentReopened.v1",
      producerContext: "shipment_execution",
      aggregateType: "Shipment",
      correlationId,
      actor,
      payload: {
        shipmentId: this.id,
        shipmentReference: this.shipmentReference,
        reason,
        lifecycleState: this.lifecycleState,
        closureState: this.closureState,
      },
    });
  }
}

export async function createShipmentExecution(
  input: {
    shipmentReference?: string;
    customerAccountId: string;
    customerName: string;
    serviceMode: string;
    serviceType: string;
    incoterm: string;
    direction?: string;
    originLocationId: string;
    destinationLocationId: string;
    orderAllocations?: Array<{
      orderId: string;
      orderNumber: string;
      allocatedPackages: number;
      allocatedWeightKg: number;
      allocatedVolumeCbm: number;
    }>;
    partyRoles?: ShipmentPartyRole[];
    externalRefs?: Array<{ type: string; value: string; isPrimary: boolean }>;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<ShipmentAggregate> {
  await ensureScmFoundationTables();

  const id = `shp_${uuidv4().substring(0, 8)}`;
  const shipmentReference =
    input.shipmentReference ||
    `ATLS-${new Date().getFullYear()}-${randomInt(10000, 100000)}`;

  const allocs = input.orderAllocations || [];
  const relationType: ShipmentOrderLink["relationType"] =
    allocs.length > 1 ? "COMBINED" : "SINGLE";

  const orderLinks: ShipmentOrderLink[] = allocs.map((a) => ({
    orderId: a.orderId,
    orderNumber: a.orderNumber,
    relationType,
    allocatedPackages: a.allocatedPackages,
    allocatedWeightKg: a.allocatedWeightKg,
    allocatedVolumeCbm: a.allocatedVolumeCbm,
  }));

  const defaultParties: ShipmentPartyRole[] = input.partyRoles || [
    {
      role: "CUSTOMER_ACCOUNT",
      partyId: input.customerAccountId,
      partyName: input.customerName,
    },
    {
      role: "SHIPPER",
      partyId: `pty_shp_${input.originLocationId.toLowerCase()}`,
      partyName: `${input.customerName} Origin Exporter`,
      locationCode: input.originLocationId,
    },
    {
      role: "CONSIGNEE",
      partyId: `pty_cnee_${input.destinationLocationId.toLowerCase()}`,
      partyName: `${input.customerName} Destination Distribution`,
      locationCode: input.destinationLocationId,
    },
  ];

  const shipment = new ShipmentAggregate({
    id,
    shipmentReference,
    customerAccountId: input.customerAccountId,
    customerName: input.customerName,
    serviceMode: input.serviceMode,
    serviceType: input.serviceType,
    incoterm: input.incoterm,
    direction: input.direction || "IMPORT",
    originLocationId: input.originLocationId,
    destinationLocationId: input.destinationLocationId,
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    teamId: actor.teamIds[0] || "team_multimodal_ops",
    ownerUserId: actor.userId,
    orderLinks,
    partyRoles: defaultParties,
    externalRefs: input.externalRefs || [],
    version: 1,
  });

  shipment["recordDomainEvent"]({
    eventType: "shipment_execution.ShipmentCreated.v1",
    producerContext: "shipment_execution",
    aggregateType: "Shipment",
    correlationId,
    actor,
    payload: {
      shipmentId: shipment.id,
      shipmentReference: shipment.shipmentReference,
      customerAccountId: shipment.customerAccountId,
      customerName: shipment.customerName,
      serviceMode: shipment.serviceMode,
      serviceType: shipment.serviceType,
      incoterm: shipment.incoterm,
      direction: shipment.direction,
      originLocationId: shipment.originLocationId,
      destinationLocationId: shipment.destinationLocationId,
      lifecycleState: shipment.lifecycleState,
      executionPhase: shipment.executionPhase,
      closureState: shipment.closureState,
      healthStatus: shipment.healthStatus,
      healthScore: shipment.healthScore,
      organizationId: shipment.organizationId,
      branchId: shipment.branchId,
      teamId: shipment.teamId,
      ownerUserId: shipment.ownerUserId,
      orderLinks: shipment.orderLinks,
      partyRoles: shipment.partyRoles,
      externalRefs: shipment.externalRefs,
    },
  });

  const now = new Date();
  await db.insert(scmShipments).values({
    id: shipment.id,
    shipmentReference: shipment.shipmentReference,
    customerAccountId: shipment.customerAccountId,
    customerName: shipment.customerName,
    serviceMode: shipment.serviceMode,
    serviceType: shipment.serviceType,
    incoterm: shipment.incoterm,
    direction: shipment.direction,
    originLocationId: shipment.originLocationId,
    destinationLocationId: shipment.destinationLocationId,
    lifecycleState: shipment.lifecycleState,
    executionPhase: shipment.executionPhase,
    closureState: shipment.closureState,
    healthStatus: shipment.healthStatus,
    healthScore: shipment.healthScore,
    healthReasonsJson: JSON.stringify(shipment.healthReasons),
    organizationId: shipment.organizationId,
    branchId: shipment.branchId,
    teamId: shipment.teamId,
    ownerUserId: shipment.ownerUserId,
    orderLinksJson: JSON.stringify(shipment.orderLinks),
    partyRolesJson: JSON.stringify(shipment.partyRoles),
    externalRefsJson: JSON.stringify(shipment.externalRefs),
    version: shipment.version,
    createdAt: now,
    updatedAt: now,
  });

  await outboxBus.enqueueEvents(shipment.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  // Cross-context contract invocation to Orders context for each linked order
  for (const alloc of allocs) {
    await recordOrderShipmentAllocation(
      {
        orderId: alloc.orderId,
        shipmentId: shipment.id,
        shipmentReference: shipment.shipmentReference,
        allocatedPackages: alloc.allocatedPackages,
        allocatedWeightKg: alloc.allocatedWeightKg,
        allocatedVolumeCbm: alloc.allocatedVolumeCbm,
      },
      actor,
      correlationId,
    );
  }

  return shipment;
}

export async function loadShipmentAggregate(
  shipmentId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<ShipmentAggregate> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmShipments)
    .where(eq(scmShipments.id, shipmentId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "shipment_execution",
    "SHIPMENT_NOT_FOUND",
    `Shipment '${shipmentId}' not found`,
  );

  const row = rows[0];
  assertAbacScope(actor, row.organizationId, row.branchId);

  return new ShipmentAggregate({
    id: row.id,
    shipmentReference: row.shipmentReference,
    customerAccountId: row.customerAccountId,
    customerName: row.customerName,
    serviceMode: row.serviceMode,
    serviceType: row.serviceType,
    incoterm: row.incoterm,
    direction: row.direction,
    originLocationId: row.originLocationId,
    destinationLocationId: row.destinationLocationId,
    lifecycleState: row.lifecycleState as ShipmentAggregate["lifecycleState"],
    executionPhase: row.executionPhase,
    closureState: row.closureState as ShipmentAggregate["closureState"],
    healthStatus: row.healthStatus as ShipmentAggregate["healthStatus"],
    healthScore: row.healthScore,
    healthReasons: JSON.parse(row.healthReasonsJson),
    organizationId: row.organizationId,
    branchId: row.branchId,
    teamId: row.teamId,
    ownerUserId: row.ownerUserId,
    orderLinks: JSON.parse(row.orderLinksJson),
    partyRoles: JSON.parse(row.partyRolesJson),
    externalRefs: JSON.parse(row.externalRefsJson),
    version: row.version,
  });
}

export async function markShipmentDeliveredAndClose(
  shipmentId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<ShipmentAggregate> {
  const shipment = await loadShipmentAggregate(shipmentId, actor);
  if (shipment.executionPhase !== "DELIVERED") {
    shipment.markDelivered(actor, correlationId);
  }
  shipment.closeShipment(actor, correlationId);

  await db
    .update(scmShipments)
    .set({
      lifecycleState: shipment.lifecycleState,
      executionPhase: shipment.executionPhase,
      closureState: shipment.closureState,
      version: shipment.version,
      updatedAt: new Date(),
    })
    .where(eq(scmShipments.id, shipment.id));

  await outboxBus.enqueueEvents(shipment.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return shipment;
}

export async function reopenClosedShipment(
  shipmentId: string,
  reason: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<ShipmentAggregate> {
  const shipment = await loadShipmentAggregate(shipmentId, actor);
  shipment.reopenShipment(reason, actor, correlationId);

  await db
    .update(scmShipments)
    .set({
      lifecycleState: shipment.lifecycleState,
      closureState: shipment.closureState,
      version: shipment.version,
      updatedAt: new Date(),
    })
    .where(eq(scmShipments.id, shipment.id));

  await outboxBus.enqueueEvents(shipment.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return shipment;
}
