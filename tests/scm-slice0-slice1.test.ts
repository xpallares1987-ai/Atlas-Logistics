import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { outboxBus } from "../src/scm/kernel/outbox-bus.js";
import { DEFAULT_OPERATOR_ACTOR } from "../src/scm/kernel/primitives.js";

describe("SCM Architecture Blueprint v1 — Vertical Slice 0 & Slice 1", () => {
  let app: FastifyInstance;
  let orderId: string;
  let orderNumber: string;
  let shipment1Id: string;
  let shipment2Id: string;
  let cargoId: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(scmV1Routes, { prefix: "/api/scm/v1" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("Slice 0: guarantees Consumer Inbox idempotency (duplicate eventId is never processed twice)", async () => {
    let invocationCount = 0;
    const dummySub = {
      eventType: "test.DummyEvent.v1",
      consumerName: "test.IdempotentConsumer",
      handler: async () => {
        invocationCount += 1;
      },
    };

    const sampleEnvelope = {
      eventId: `evt_idemp_${Date.now()}`,
      eventType: "test.DummyEvent.v1",
      schemaVersion: 1,
      producerContext: "test",
      aggregateType: "Dummy",
      aggregateId: "dum_1",
      aggregateVersion: 1,
      correlationId: "corr_1",
      causationId: "corr_1",
      actor: DEFAULT_OPERATOR_ACTOR,
      occurredAt: new Date().toISOString(),
      payload: { hello: "world" },
    };

    const firstDelivery = await outboxBus.deliverIdempotently(
      dummySub,
      sampleEnvelope,
    );
    const secondDelivery = await outboxBus.deliverIdempotently(
      dummySub,
      sampleEnvelope,
    );

    expect(firstDelivery).toBe(true);
    expect(secondDelivery).toBe(false);
    expect(invocationCount).toBe(1);
  });

  it("Slice 1 (Orders): creates and confirms a CustomerOrder enforcing domain invariants", async () => {
    const createRes = await app.inject({
      method: "POST",
      url: "/api/scm/v1/orders",
      payload: {
        customerPartyId: "pty_cust_iberian_motors",
        customerName: "Iberian Motors Manufacturing S.A.",
        serviceMode: "FCL",
        incoterm: "FOB",
        movementScope: "PORT_TO_DOOR",
        originLocationId: "CNSHA",
        destinationLocationId: "ESBCN",
        cargoReadyDate: "2026-11-10",
        cargoRequirements: [
          {
            commodityDescription: "Lithium-Ion Battery Modules & Inverters",
            hsCode: "8507.60",
            packageCount: 100,
            grossWeightKg: 20000,
            volumeCbm: 55,
            requestedEquipmentType: "40HC",
            isDangerousGoods: true,
          },
        ],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created.status).toBe("DRAFT");
    orderId = created.id;
    orderNumber = created.orderNumber;

    // Confirm order
    const confirmRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/orders/${orderId}/confirm`,
    });
    expect(confirmRes.statusCode).toBe(200);
    expect(confirmRes.json().status).toBe("READY_FOR_FULFILMENT");
  });

  it("Slice 1 (Orders <-> Shipment Execution): supports 1 Order -> N Shipments (Split Fulfilment) and blocks cancelling active orders", async () => {
    // Shipment #1 takes 60% of the Order (60 packages, 12,000 kg)
    const shp1Res = await app.inject({
      method: "POST",
      url: "/api/scm/v1/shipments",
      payload: {
        customerAccountId: "pty_cust_iberian_motors",
        customerName: "Iberian Motors Manufacturing S.A.",
        serviceMode: "SEA",
        serviceType: "FCL",
        incoterm: "FOB",
        direction: "IMPORT",
        originLocationId: "CNSHA",
        destinationLocationId: "ESBCN",
        orderAllocations: [
          {
            orderId,
            orderNumber,
            allocatedPackages: 60,
            allocatedWeightKg: 12000,
            allocatedVolumeCbm: 33,
          },
        ],
      },
    });

    expect(shp1Res.statusCode).toBe(201);
    const shp1 = shp1Res.json();
    shipment1Id = shp1.id;
    expect(shp1.shipmentReference).toMatch(/^ATLS-\d{4}-\d{5}$/);

    // Verify Order is now PARTIALLY_FULFILLED
    const ordAfterSplit1 = await app.inject({
      method: "GET",
      url: `/api/scm/v1/orders/${orderId}`,
    });
    expect(ordAfterSplit1.json().status).toBe("PARTIALLY_FULFILLED");

    // Attempting to cancel an Order with active Shipments must fail with 422 DomainInvariantError
    const cancelRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/orders/${orderId}/cancel`,
      payload: { reason: "Try to cancel active order" },
    });
    expect(cancelRes.statusCode).toBe(422);
    expect(cancelRes.json().code).toBe(
      "ORDER_CANNOT_CANCEL_WITH_ACTIVE_SHIPMENTS",
    );

    // Shipment #2 takes the remaining 40% of the Order (40 packages, 8,000 kg)
    const shp2Res = await app.inject({
      method: "POST",
      url: "/api/scm/v1/shipments",
      payload: {
        customerAccountId: "pty_cust_iberian_motors",
        customerName: "Iberian Motors Manufacturing S.A.",
        serviceMode: "SEA",
        serviceType: "FCL",
        incoterm: "FOB",
        direction: "IMPORT",
        originLocationId: "CNSHA",
        destinationLocationId: "ESBCN",
        orderAllocations: [
          {
            orderId,
            orderNumber,
            allocatedPackages: 40,
            allocatedWeightKg: 8000,
            allocatedVolumeCbm: 22,
          },
        ],
      },
    });
    expect(shp2Res.statusCode).toBe(201);
    shipment2Id = shp2Res.json().id;

    // Verify Order is now 100% FULFILLED
    const ordAfterSplit2 = await app.inject({
      method: "GET",
      url: `/api/scm/v1/orders/${orderId}`,
    });
    expect(ordAfterSplit2.json().status).toBe("FULFILLED");
    expect(ordAfterSplit2.json().allocations.length).toBe(2);
  });

  it("Slice 1 (Transport Planning): enforces topological continuity and versions RoutePlans immutably", async () => {
    // 1. Disconnected route (Leg 1 ends at SGSIN, Leg 2 starts at NLRTM) -> must fail with 422
    const invalidRouteRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/route-plan`,
      payload: {
        stops: [
          {
            stopId: "st_1",
            sequenceNo: 1,
            locationId: "CNSHA",
            stopRole: "POL",
          },
          {
            stopId: "st_2",
            sequenceNo: 2,
            locationId: "SGSIN",
            stopRole: "TRANSSHIPMENT",
          },
          {
            stopId: "st_3",
            sequenceNo: 3,
            locationId: "ESBCN",
            stopRole: "POD",
          },
        ],
        legs: [
          {
            sequenceNo: 1,
            originStopId: "st_1",
            destinationStopId: "st_2",
            originLocode: "CNSHA",
            destinationLocode: "SGSIN",
            mode: "SEA",
            legCategory: "MAIN_CARRIAGE",
            carrierName: "Maersk",
            plannedDepartureAt: "2026-11-12T10:00:00Z",
            plannedArrivalAt: "2026-11-18T08:00:00Z",
          },
          {
            sequenceNo: 2,
            originStopId: "st_wrong",
            destinationStopId: "st_3",
            originLocode: "NLRTM",
            destinationLocode: "ESBCN",
            mode: "SEA",
            legCategory: "MAIN_CARRIAGE",
            carrierName: "Maersk",
            plannedDepartureAt: "2026-11-19T10:00:00Z",
            plannedArrivalAt: "2026-11-28T08:00:00Z",
          },
        ],
      },
    });
    expect(invalidRouteRes.statusCode).toBe(422);
    expect(invalidRouteRes.json().code).toBe("ROUTE_DISCONNECTED_TOPOLOGY");

    // 2. Publish valid RouteVersion v1 (CNSHA -> SGSIN -> ESBCN)
    const v1Res = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/route-plan`,
      payload: {
        changeReason: "Initial booking route via Singapore",
        stops: [
          {
            stopId: "st_1",
            sequenceNo: 1,
            locationId: "CNSHA",
            stopRole: "POL",
          },
          {
            stopId: "st_2",
            sequenceNo: 2,
            locationId: "SGSIN",
            stopRole: "TRANSSHIPMENT",
          },
          {
            stopId: "st_3",
            sequenceNo: 3,
            locationId: "ESBCN",
            stopRole: "POD",
          },
        ],
        legs: [
          {
            sequenceNo: 1,
            originStopId: "st_1",
            destinationStopId: "st_2",
            originLocode: "CNSHA",
            destinationLocode: "SGSIN",
            mode: "SEA",
            legCategory: "MAIN_CARRIAGE",
            carrierName: "Maersk",
            vesselOrFlight: "MAERSK EMMA",
            voyageNumber: "412W",
            plannedDepartureAt: "2026-11-12T10:00:00Z",
            plannedArrivalAt: "2026-11-18T08:00:00Z",
          },
          {
            sequenceNo: 2,
            originStopId: "st_2",
            destinationStopId: "st_3",
            originLocode: "SGSIN",
            destinationLocode: "ESBCN",
            mode: "SEA",
            legCategory: "MAIN_CARRIAGE",
            carrierName: "Maersk",
            vesselOrFlight: "MAERSK TITAN",
            voyageNumber: "415W",
            plannedDepartureAt: "2026-11-19T14:00:00Z",
            plannedArrivalAt: "2026-12-02T06:00:00Z",
          },
        ],
      },
    });
    expect(v1Res.statusCode).toBe(200);
    expect(v1Res.json().activeVersionNo).toBe(1);

    // 3. Replan route -> publishes RouteVersion v2 while keeping v1 as SUPERSEDED
    const v2Res = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/route-plan`,
      payload: {
        changeReason: "Rerouted via Tanger Med hub to avoid congestion",
        stops: [
          {
            stopId: "st_1",
            sequenceNo: 1,
            locationId: "CNSHA",
            stopRole: "POL",
          },
          {
            stopId: "st_tng",
            sequenceNo: 2,
            locationId: "MAPTM",
            stopRole: "TRANSSHIPMENT",
          },
          {
            stopId: "st_3",
            sequenceNo: 3,
            locationId: "ESBCN",
            stopRole: "POD",
          },
        ],
        legs: [
          {
            sequenceNo: 1,
            originStopId: "st_1",
            destinationStopId: "st_tng",
            originLocode: "CNSHA",
            destinationLocode: "MAPTM",
            mode: "SEA",
            legCategory: "MAIN_CARRIAGE",
            carrierName: "Maersk",
            vesselOrFlight: "MAERSK MC-KINNEY",
            voyageNumber: "501W",
            plannedDepartureAt: "2026-11-12T10:00:00Z",
            plannedArrivalAt: "2026-11-29T08:00:00Z",
          },
          {
            sequenceNo: 2,
            originStopId: "st_tng",
            destinationStopId: "st_3",
            originLocode: "MAPTM",
            destinationLocode: "ESBCN",
            mode: "SEA",
            legCategory: "ON_CARRIAGE",
            carrierName: "Maersk Feeder",
            vesselOrFlight: "ALBORAN EXPRESS",
            voyageNumber: "092N",
            plannedDepartureAt: "2026-11-30T12:00:00Z",
            plannedArrivalAt: "2026-12-02T08:00:00Z",
          },
        ],
      },
    });
    expect(v2Res.statusCode).toBe(200);
    const planV2 = v2Res.json();
    expect(planV2.activeVersionNo).toBe(2);
    expect(planV2.versions.length).toBe(2);
    expect(planV2.versions.find((v: any) => v.versionNo === 1).status).toBe(
      "SUPERSEDED",
    );
    expect(planV2.versions.find((v: any) => v.versionNo === 2).status).toBe(
      "PUBLISHED",
    );
  });

  it("Slice 1 (Cargo & Equipment): models Cargo -> Packages -> Goods, emits DangerousGoodsDeclared, and enforces SOLAS VGM invariants", async () => {
    const cargoRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/cargo`,
      payload: {
        packages: [
          {
            packageType: "PALLET",
            quantity: 40,
            dimensionsCm: { length: 120, width: 80, height: 140 },
            grossWeightKg: 8500,
            volumeCbm: 22,
            stackable: true,
            goods: [
              {
                description: "High-Voltage Lithium-Ion Battery Packs",
                hsCode: "8507.60",
                countryOfOrigin: "CN",
                dangerousGoods: {
                  unNumber: "UN3480",
                  imoClass: "9",
                  packingGroup: "II",
                },
              },
            ],
          },
          {
            packageType: "CARTON",
            quantity: 20,
            dimensionsCm: { length: 60, width: 40, height: 50 },
            grossWeightKg: 3500,
            volumeCbm: 11,
            stackable: true,
            goods: [
              {
                description: "Power Inverter Control Units",
                hsCode: "8504.40",
                countryOfOrigin: "CN",
              },
            ],
          },
        ],
      },
    });

    expect(cargoRes.statusCode).toBe(201);
    const cargo = cargoRes.json();
    cargoId = cargo.id;
    expect(cargo.totalPackages).toBe(60);
    expect(cargo.totalGrossWeightKg).toBe(12000);
    expect(cargo.totalVolumeCbm).toBe(33);
    expect(cargo.hasDangerousGoods).toBe(true);

    // Attempt Equipment assignment with invalid SOLAS VGM (less than Tare 3800 + Cargo 12000 = 15800 kg)
    const badVgmRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/equipment`,
      payload: {
        equipmentCategory: "CONTAINER",
        isoTypeCode: "40HC",
        equipmentNumber: "MSKU9018273",
        seals: ["SL-MAEU-77812"],
        tareWeightKg: 3800,
        vgmWeightKg: 14000, // Invalid! < 15800
        status: "SEALED",
        cargoAllocations: [
          {
            cargoId,
            allocatedPackages: 60,
            allocatedWeightKg: 12000,
            allocatedVolumeCbm: 33,
          },
        ],
      },
    });
    expect(badVgmRes.statusCode).toBe(422);
    expect(badVgmRes.json().code).toBe("EQUIPMENT_INVALID_SOLAS_VGM");

    // Valid Equipment assignment with certified VGM = 15800 kg
    const goodEquipRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/equipment`,
      payload: {
        equipmentCategory: "CONTAINER",
        isoTypeCode: "40HC",
        equipmentNumber: "MSKU9018273",
        seals: ["SL-MAEU-77812"],
        tareWeightKg: 3800,
        vgmWeightKg: 15800,
        pickupPin: "7491",
        status: "SEALED",
        cargoAllocations: [
          {
            cargoId,
            allocatedPackages: 60,
            allocatedWeightKg: 12000,
            allocatedVolumeCbm: 33,
          },
        ],
      },
    });
    expect(goodEquipRes.statusCode).toBe(201);
    expect(goodEquipRes.json().equipmentNumber).toBe("MSKU9018273");
  });

  it("Slice 1 (Operational Intelligence CQRS + RBAC/ABAC): hydrates Shipment360ReadModel in a single read and enforces ABAC tenant isolation", async () => {
    // 1. Authorized actor fetches Shipment360ReadModel
    const res360 = await app.inject({
      method: "GET",
      url: `/api/scm/v1/shipments/${shipment1Id}/360`,
    });

    expect(res360.statusCode).toBe(200);
    const view = res360.json();

    expect(view.shipmentId).toBe(shipment1Id);
    expect(view.header.lifecycleState).toBe("PLANNED");
    expect(view.commercialContext.linkedOrders.length).toBe(1);
    expect(view.commercialContext.linkedOrders[0].orderNumber).toBe(
      orderNumber,
    );

    // Routing section hydrated from RouteVersion v2
    expect(view.routing.activeVersionNumber).toBe(2);
    expect(view.routing.versionHistoryCount).toBe(2);
    expect(view.routing.legs[0].destinationLocode).toBe("MAPTM");

    // Cargo & Equipment section hydrated from CargoDeclared + EquipmentAssigned
    expect(view.cargoAndEquipment.totals.packagesCount).toBe(60);
    expect(view.cargoAndEquipment.totals.grossWeightKg).toBe(12000);
    expect(view.cargoAndEquipment.totals.hasDG).toBe(true);
    expect(view.cargoAndEquipment.equipment.length).toBe(1);
    expect(view.cargoAndEquipment.equipment[0].unitNumber).toBe("MSKU9018273");
    expect(view.controlSummary.health.drivers).toContain(
      "DANGEROUS_GOODS_IMO_DECLARED",
    );

    // 2. Unauthorized actor from another organization is blocked by ABAC (403 Forbidden)
    const crossOrgRes = await app.inject({
      method: "GET",
      url: `/api/scm/v1/shipments/${shipment1Id}/360`,
      headers: {
        "x-org-id": "org_rival_competitor",
        "x-branch-id": "br_other",
        "x-roles": "OPERATIONS_COORDINATOR",
      },
    });
    expect(crossOrgRes.statusCode).toBe(403);
    expect(crossOrgRes.json().error).toBe("ABAC_AUTHORIZATION_DENIED");
  });

  it("Slice 1 (Shipment Closure & Reopen): enforces closure state invariants and audit reason on reopen", async () => {
    const closeRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/close`,
    });
    expect(closeRes.statusCode).toBe(200);
    expect(closeRes.json().lifecycleState).toBe("CLOSED");

    // Reopening without a valid audit reason fails with 422
    const badReopenRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/reopen`,
      payload: { reason: "abc" },
    });
    expect(badReopenRes.statusCode).toBe(422);
    expect(badReopenRes.json().code).toBe("SHIPMENT_REOPEN_REASON_REQUIRED");

    // Reopening with audit reason succeeds and updates Shipment360ReadModel via Outbox
    const goodReopenRes = await app.inject({
      method: "POST",
      url: `/api/scm/v1/shipments/${shipment1Id}/reopen`,
      payload: { reason: "Late port storage surcharge adjustment required" },
    });
    expect(goodReopenRes.statusCode).toBe(200);
    expect(goodReopenRes.json().closureState).toBe("REOPENED");

    const updated360 = await app.inject({
      method: "GET",
      url: `/api/scm/v1/shipments/${shipment1Id}/360`,
    });
    expect(updated360.json().header.closureState).toBe("REOPENED");
    expect(updated360.json().projectionVersion).toBeGreaterThanOrEqual(8);
  });
});
