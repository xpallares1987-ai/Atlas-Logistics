import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { scmShipment360Views } from "../../../db/schema/scm_foundation.js";
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
      score: number;
      gateStatus: "PASSED" | "WARN" | "BLOCKED";
      openFindingsCount: number;
    };
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
            score: 100,
            gateStatus: "PASSED",
            openFindingsCount: 0,
          },
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

  // 3. On RouteVersionPublished -> Update routing section in projection
  outboxBus.subscribe(
    "transport_planning.RouteVersionPublished.v1",
    "op_intelligence.Shipment360Projector.OnRouteVersionPublished",
    async (event) => {
      const p = event.payload;
      await updateProjectionForShipment(p.shipmentId, event, (model) => {
        model.routing.routePlanId = p.routePlanId;
        model.routing.activeVersionNumber = p.versionNo;
        model.routing.versionHistoryCount += 1;
        model.routing.stops = p.stops;
        model.routing.legs = p.legs;
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

  projectorsRegistered = true;
}

// Auto-register projectors on module load
registerShipment360Projectors();

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

  return JSON.parse(row.readModelJson) as Shipment360ReadModel;
}
