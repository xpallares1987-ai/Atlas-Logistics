import { randomInt } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmOrders,
  scmOrderAllocations,
} from "../../../db/schema/scm_foundation.js";
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

export interface OrderCargoRequirement {
  requirementId: string;
  commodityDescription: string;
  hsCode?: string;
  packageCount: number;
  grossWeightKg: number;
  volumeCbm: number;
  requestedEquipmentType?: string;
  isDangerousGoods?: boolean;
  isTemperatureControlled?: boolean;
}

export interface OrderFulfilmentAllocation {
  allocationId: string;
  shipmentId: string;
  shipmentReference: string;
  allocatedPackages: number;
  allocatedWeightKg: number;
  allocatedVolumeCbm: number;
  allocationType: "FULL" | "SPLIT" | "COMBINED";
}

export class OrderAggregate extends AggregateRoot<string> {
  public orderNumber: string;
  public customerPartyId: string;
  public customerName: string;
  public quotationId?: string;
  public serviceMode: string;
  public incoterm: string;
  public movementScope: string;
  public originLocationId: string;
  public destinationLocationId: string;
  public cargoReadyDate: string;
  public requiredDeliveryDate?: string;
  public status:
    | "DRAFT"
    | "CONFIRMED"
    | "READY_FOR_FULFILMENT"
    | "PARTIALLY_FULFILLED"
    | "FULFILLED"
    | "CANCELLED";
  public cargoRequirements: OrderCargoRequirement[];
  public allocations: OrderFulfilmentAllocation[];
  public commercialRefs: Array<{ type: string; value: string }>;
  public organizationId: string;
  public branchId: string;

  constructor(params: {
    id: string;
    orderNumber: string;
    customerPartyId: string;
    customerName: string;
    quotationId?: string;
    serviceMode: string;
    incoterm: string;
    movementScope?: string;
    originLocationId: string;
    destinationLocationId: string;
    cargoReadyDate: string;
    requiredDeliveryDate?: string;
    status?: OrderAggregate["status"];
    cargoRequirements: OrderCargoRequirement[];
    allocations?: OrderFulfilmentAllocation[];
    commercialRefs?: Array<{ type: string; value: string }>;
    organizationId: string;
    branchId: string;
    version?: number;
  }) {
    super(params.id, params.version ?? 1);
    this.orderNumber = params.orderNumber;
    this.customerPartyId = params.customerPartyId;
    this.customerName = params.customerName;
    this.quotationId = params.quotationId;
    this.serviceMode = params.serviceMode;
    this.incoterm = params.incoterm;
    this.movementScope = params.movementScope || "PORT_TO_PORT";
    this.originLocationId = params.originLocationId;
    this.destinationLocationId = params.destinationLocationId;
    this.cargoReadyDate = params.cargoReadyDate;
    this.requiredDeliveryDate = params.requiredDeliveryDate;
    this.status = params.status || "DRAFT";
    this.cargoRequirements = params.cargoRequirements;
    this.allocations = params.allocations || [];
    this.commercialRefs = params.commercialRefs || [];
    this.organizationId = params.organizationId;
    this.branchId = params.branchId;
  }

  public get totalRequestedPackages(): number {
    return this.cargoRequirements.reduce(
      (sum, r) => sum + Number(r.packageCount || 0),
      0,
    );
  }

  public get totalRequestedWeightKg(): number {
    return this.cargoRequirements.reduce(
      (sum, r) => sum + Number(r.grossWeightKg || 0),
      0,
    );
  }

  public get totalRequestedVolumeCbm(): number {
    return this.cargoRequirements.reduce(
      (sum, r) => sum + Number(r.volumeCbm || 0),
      0,
    );
  }

  public confirmOrder(
    actor: SecurityActorContext,
    correlationId: string,
  ): void {
    assertInvariant(
      this.status === "DRAFT",
      "orders",
      "ORDER_INVALID_STATE_FOR_CONFIRM",
      `Order '${this.orderNumber}' cannot be confirmed from state '${this.status}'`,
    );
    assertInvariant(
      Boolean(this.customerPartyId && this.customerPartyId.trim()),
      "orders",
      "ORDER_MISSING_CUSTOMER",
      "Order confirmation requires a valid customerPartyId",
    );
    assertInvariant(
      Boolean(this.originLocationId && this.destinationLocationId),
      "orders",
      "ORDER_MISSING_ENDPOINTS",
      "Order confirmation requires both originLocationId and destinationLocationId",
    );
    assertInvariant(
      Boolean(this.incoterm && this.cargoReadyDate),
      "orders",
      "ORDER_MISSING_TERMS",
      "Order confirmation requires incoterm and cargoReadyDate",
    );
    assertInvariant(
      this.cargoRequirements.length > 0 &&
        this.totalRequestedPackages > 0 &&
        this.totalRequestedWeightKg > 0,
      "orders",
      "ORDER_EMPTY_CARGO_REQUIREMENTS",
      "Order confirmation requires at least one cargo requirement with positive packages and grossWeightKg",
    );

    this.status = "READY_FOR_FULFILMENT";
    this.incrementVersion();

    this.recordDomainEvent({
      eventType: "orders.OrderConfirmed.v1",
      producerContext: "orders",
      aggregateType: "Order",
      correlationId,
      actor,
      payload: {
        orderId: this.id,
        orderNumber: this.orderNumber,
        customerPartyId: this.customerPartyId,
        customerName: this.customerName,
        serviceMode: this.serviceMode,
        incoterm: this.incoterm,
        originLocationId: this.originLocationId,
        destinationLocationId: this.destinationLocationId,
        totalRequestedPackages: this.totalRequestedPackages,
        totalRequestedWeightKg: this.totalRequestedWeightKg,
        status: this.status,
      },
    });
  }

  public allocateToShipment(
    params: {
      shipmentId: string;
      shipmentReference: string;
      allocatedPackages: number;
      allocatedWeightKg: number;
      allocatedVolumeCbm: number;
    },
    actor: SecurityActorContext,
    correlationId: string,
  ): OrderFulfilmentAllocation {
    assertInvariant(
      this.status !== "DRAFT" && this.status !== "CANCELLED",
      "orders",
      "ORDER_NOT_CONFIRMED_FOR_ALLOCATION",
      `Order '${this.orderNumber}' must be confirmed before allocating to a shipment (current: ${this.status})`,
    );

    const currentAllocatedWeight = this.allocations.reduce(
      (sum, a) => sum + a.allocatedWeightKg,
      0,
    );
    const newTotalWeight = currentAllocatedWeight + params.allocatedWeightKg;
    const maxAllowedWeight = this.totalRequestedWeightKg * 1.05; // 5% commercial tolerance

    assertInvariant(
      newTotalWeight <= maxAllowedWeight,
      "orders",
      "ORDER_ALLOCATION_EXCEEDS_TOLERANCE",
      `Allocated weight (${newTotalWeight} kg) exceeds ordered weight tolerance (${maxAllowedWeight} kg)`,
    );

    const isFullSingle =
      this.allocations.length === 0 &&
      params.allocatedWeightKg >= this.totalRequestedWeightKg * 0.99;

    const allocation: OrderFulfilmentAllocation = {
      allocationId: `alloc_${uuidv4().substring(0, 8)}`,
      shipmentId: params.shipmentId,
      shipmentReference: params.shipmentReference,
      allocatedPackages: params.allocatedPackages,
      allocatedWeightKg: params.allocatedWeightKg,
      allocatedVolumeCbm: params.allocatedVolumeCbm,
      allocationType: isFullSingle ? "FULL" : "SPLIT",
    };

    this.allocations.push(allocation);

    const totalAllocatedPackages = this.allocations.reduce(
      (sum, a) => sum + a.allocatedPackages,
      0,
    );

    if (
      newTotalWeight >= this.totalRequestedWeightKg &&
      totalAllocatedPackages >= this.totalRequestedPackages
    ) {
      this.status = "FULFILLED";
    } else {
      this.status = "PARTIALLY_FULFILLED";
    }

    this.incrementVersion();

    this.recordDomainEvent({
      eventType:
        this.status === "FULFILLED"
          ? "orders.OrderFulfilled.v1"
          : "orders.OrderPartiallyFulfilled.v1",
      producerContext: "orders",
      aggregateType: "Order",
      correlationId,
      actor,
      payload: {
        orderId: this.id,
        orderNumber: this.orderNumber,
        shipmentId: params.shipmentId,
        shipmentReference: params.shipmentReference,
        allocationType: allocation.allocationType,
        allocatedPackages: params.allocatedPackages,
        allocatedWeightKg: params.allocatedWeightKg,
        orderStatus: this.status,
      },
    });

    return allocation;
  }

  public cancelOrder(
    reason: string,
    actor: SecurityActorContext,
    correlationId: string,
  ): void {
    assertInvariant(
      this.allocations.length === 0,
      "orders",
      "ORDER_CANNOT_CANCEL_WITH_ACTIVE_SHIPMENTS",
      `Order '${this.orderNumber}' cannot be cancelled because it has ${this.allocations.length} active shipment allocation(s)`,
    );

    this.status = "CANCELLED";
    this.incrementVersion();

    this.recordDomainEvent({
      eventType: "orders.OrderCancelled.v1",
      producerContext: "orders",
      aggregateType: "Order",
      correlationId,
      actor,
      payload: {
        orderId: this.id,
        orderNumber: this.orderNumber,
        reason,
      },
    });
  }
}

// ============================================================================
// ORDERS APPLICATION SERVICE / COMMAND & QUERY HANDLERS
// ============================================================================

export async function createCustomerOrder(
  input: {
    orderNumber?: string;
    customerPartyId: string;
    customerName: string;
    quotationId?: string;
    serviceMode: string;
    incoterm: string;
    movementScope?: string;
    originLocationId: string;
    destinationLocationId: string;
    cargoReadyDate: string;
    requiredDeliveryDate?: string;
    cargoRequirements: Array<
      Omit<OrderCargoRequirement, "requirementId"> & { requirementId?: string }
    >;
    commercialRefs?: Array<{ type: string; value: string }>;
    autoConfirm?: boolean;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<OrderAggregate> {
  await ensureScmFoundationTables();

  const id = `ord_${uuidv4().substring(0, 8)}`;
  const orderNumber =
    input.orderNumber ||
    `ORD-${new Date().getFullYear()}-${randomInt(10000, 100000)}`;

  const requirements: OrderCargoRequirement[] = (
    input.cargoRequirements || []
  ).map((r) => ({
    requirementId: r.requirementId || `req_${uuidv4().substring(0, 6)}`,
    commodityDescription: r.commodityDescription,
    hsCode: r.hsCode,
    packageCount: Number(r.packageCount),
    grossWeightKg: Number(r.grossWeightKg),
    volumeCbm: Number(r.volumeCbm || 0),
    requestedEquipmentType: r.requestedEquipmentType,
    isDangerousGoods: Boolean(r.isDangerousGoods),
    isTemperatureControlled: Boolean(r.isTemperatureControlled),
  }));

  const order = new OrderAggregate({
    id,
    orderNumber,
    customerPartyId: input.customerPartyId,
    customerName: input.customerName,
    quotationId: input.quotationId,
    serviceMode: input.serviceMode,
    incoterm: input.incoterm,
    movementScope: input.movementScope,
    originLocationId: input.originLocationId,
    destinationLocationId: input.destinationLocationId,
    cargoReadyDate: input.cargoReadyDate,
    requiredDeliveryDate: input.requiredDeliveryDate,
    status: "DRAFT",
    cargoRequirements: requirements,
    commercialRefs: input.commercialRefs || [],
    organizationId: actor.organizationId,
    branchId: actor.branchId,
    version: 1,
  });

  order["recordDomainEvent"]({
    eventType: "orders.OrderCreated.v1",
    producerContext: "orders",
    aggregateType: "Order",
    correlationId,
    actor,
    payload: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerPartyId: order.customerPartyId,
      customerName: order.customerName,
      originLocationId: order.originLocationId,
      destinationLocationId: order.destinationLocationId,
      status: order.status,
    },
  });

  if (input.autoConfirm) {
    order.confirmOrder(actor, correlationId);
  }

  const now = new Date();
  await db.insert(scmOrders).values({
    id: order.id,
    orderNumber: order.orderNumber,
    customerPartyId: order.customerPartyId,
    customerName: order.customerName,
    quotationId: order.quotationId || null,
    serviceMode: order.serviceMode,
    incoterm: order.incoterm,
    movementScope: order.movementScope,
    originLocationId: order.originLocationId,
    destinationLocationId: order.destinationLocationId,
    cargoReadyDate: order.cargoReadyDate,
    requiredDeliveryDate: order.requiredDeliveryDate || null,
    status: order.status,
    cargoRequirementsJson: JSON.stringify(order.cargoRequirements),
    commercialRefsJson: JSON.stringify(order.commercialRefs),
    organizationId: order.organizationId,
    branchId: order.branchId,
    version: order.version,
    createdAt: now,
    updatedAt: now,
  });

  await outboxBus.enqueueEvents(order.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return order;
}

export async function loadOrderAggregate(
  orderId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<OrderAggregate> {
  await ensureScmFoundationTables();

  const rows = await db
    .select()
    .from(scmOrders)
    .where(eq(scmOrders.id, orderId))
    .limit(1);

  assertInvariant(
    rows.length > 0,
    "orders",
    "ORDER_NOT_FOUND",
    `Order '${orderId}' not found`,
  );

  const row = rows[0];
  assertAbacScope(actor, row.organizationId, row.branchId);

  const allocRows = await db
    .select()
    .from(scmOrderAllocations)
    .where(eq(scmOrderAllocations.orderId, orderId));

  return new OrderAggregate({
    id: row.id,
    orderNumber: row.orderNumber,
    customerPartyId: row.customerPartyId,
    customerName: row.customerName,
    quotationId: row.quotationId || undefined,
    serviceMode: row.serviceMode,
    incoterm: row.incoterm,
    movementScope: row.movementScope,
    originLocationId: row.originLocationId,
    destinationLocationId: row.destinationLocationId,
    cargoReadyDate: row.cargoReadyDate,
    requiredDeliveryDate: row.requiredDeliveryDate || undefined,
    status: row.status as OrderAggregate["status"],
    cargoRequirements: JSON.parse(row.cargoRequirementsJson),
    allocations: allocRows.map((a) => ({
      allocationId: a.id,
      shipmentId: a.shipmentId,
      shipmentReference: a.shipmentReference,
      allocatedPackages: a.allocatedPackages,
      allocatedWeightKg: a.allocatedWeightKg,
      allocatedVolumeCbm: a.allocatedVolumeCbm,
      allocationType:
        a.allocationType as OrderFulfilmentAllocation["allocationType"],
    })),
    commercialRefs: JSON.parse(row.commercialRefsJson),
    organizationId: row.organizationId,
    branchId: row.branchId,
    version: row.version,
  });
}

export async function confirmCustomerOrder(
  orderId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<OrderAggregate> {
  const order = await loadOrderAggregate(orderId, actor);
  order.confirmOrder(actor, correlationId);

  await db
    .update(scmOrders)
    .set({
      status: order.status,
      version: order.version,
      updatedAt: new Date(),
    })
    .where(eq(scmOrders.id, order.id));

  await outboxBus.enqueueEvents(order.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return order;
}

export async function recordOrderShipmentAllocation(
  params: {
    orderId: string;
    shipmentId: string;
    shipmentReference: string;
    allocatedPackages: number;
    allocatedWeightKg: number;
    allocatedVolumeCbm: number;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<OrderAggregate> {
  const order = await loadOrderAggregate(params.orderId, actor);
  const allocation = order.allocateToShipment(params, actor, correlationId);

  await db.insert(scmOrderAllocations).values({
    id: allocation.allocationId,
    orderId: order.id,
    shipmentId: allocation.shipmentId,
    shipmentReference: allocation.shipmentReference,
    allocatedPackages: allocation.allocatedPackages,
    allocatedWeightKg: allocation.allocatedWeightKg,
    allocatedVolumeCbm: allocation.allocatedVolumeCbm,
    allocationType: allocation.allocationType,
    createdAt: new Date(),
  });

  await db
    .update(scmOrders)
    .set({
      status: order.status,
      version: order.version,
      updatedAt: new Date(),
    })
    .where(eq(scmOrders.id, order.id));

  await outboxBus.enqueueEvents(order.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return order;
}

export async function cancelCustomerOrder(
  orderId: string,
  reason: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
  correlationId: string = uuidv4(),
): Promise<OrderAggregate> {
  const order = await loadOrderAggregate(orderId, actor);
  order.cancelOrder(reason, actor, correlationId);

  await db
    .update(scmOrders)
    .set({
      status: order.status,
      version: order.version,
      updatedAt: new Date(),
    })
    .where(eq(scmOrders.id, order.id));

  await outboxBus.enqueueEvents(order.pullDomainEvents());
  await outboxBus.relayPendingEvents();

  return order;
}
