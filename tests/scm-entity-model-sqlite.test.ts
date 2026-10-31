import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { ensureScmEntityTables } from "../src/scm/kernel/operational-core-tables.js";
import {
  scmParties,
  scmPartyAddresses,
  scmPartyContacts,
  scmPartyRoles,
  scmPartyRelationships,
  scmPartyExternalIdentifiers,
  scmLogicalShipments,
  scmShipmentReferences,
  scmShipmentPartyRoles,
  scmShipmentAssignments,
  scmLogicalRoutePlans,
  scmLogicalRouteVersions,
  scmLogicalRouteStops,
  scmLogicalTransportLegs,
  scmLogicalCargos,
  scmLogicalPackages,
  scmLogicalGoodsItems,
  scmLogicalEquipments,
  scmLogicalEquipmentSeals,
  scmLogicalEquipmentAllocations,
  scmLogicalMilestonePlans,
  scmLogicalMilestones,
  scmLogicalEstimateRevisions,
  scmLogicalOperationalEvents,
  scmLogicalTasks,
  scmLogicalTaskDependencies,
} from "../src/db/schema/scm_entities_sqlite.js";

describe("SCM Logical Entity Model v1 — Physical SQLite Schema & Invariants", () => {
  const suffix = Date.now().toString();

  beforeAll(async () => {
    await ensureScmEntityTables();
  });

  it("1. Party & CRM: persists Party Aggregate Root with owned Addresses, Contacts, Roles, Relationships & ExternalIdentifiers", async () => {
    const now = Date.now();
    const partyId = `pty_cust_${suffix}`;
    const carrierPartyId = `pty_carr_${suffix}`;

    await db.insert(scmParties).values([
      {
        partyId,
        partyType: "ORGANIZATION",
        displayName: "Iberian Motors S.A.",
        legalName: "Iberian Motors Sociedad Anónima",
        status: "ACTIVE",
        createdAt: new Date(now),
        updatedAt: new Date(now),
        version: 1,
      },
      {
        partyId: carrierPartyId,
        partyType: "ORGANIZATION",
        displayName: "Maersk Line A/S",
        legalName: "A.P. Møller - Mærsk A/S",
        status: "ACTIVE",
        createdAt: new Date(now),
        updatedAt: new Date(now),
        version: 1,
      },
    ]);

    await db.insert(scmPartyAddresses).values({
      addressId: `addr_${suffix}`,
      partyId,
      type: "OPERATIONAL",
      street: "Zona Franca Sector B, Calle 4",
      city: "Barcelona",
      postalCode: "08040",
      countryCode: "ES",
      locationId: "ESBCN",
      isPrimary: true,
    });

    await db.insert(scmPartyContacts).values({
      contactId: `cnt_${suffix}`,
      partyId,
      name: "Elena Vance",
      email: "elena.vance@iberian-motors.example",
      position: "Head of Global Supply Chain",
      status: "ACTIVE",
    });

    await db.insert(scmPartyRoles).values([
      {
        partyRoleId: `prole_1_${suffix}`,
        partyId,
        role: "CUSTOMER",
        status: "ACTIVE",
        createdAt: new Date(now),
      },
      {
        partyRoleId: `prole_2_${suffix}`,
        partyId,
        role: "CONSIGNEE",
        status: "ACTIVE",
        createdAt: new Date(now),
      },
    ]);

    await db.insert(scmPartyRelationships).values({
      relationshipId: `prel_${suffix}`,
      fromPartyId: partyId,
      toPartyId: carrierPartyId,
      relationshipType: "COMMERCIAL_RELATIONSHIP",
      status: "ACTIVE",
    });

    await db.insert(scmPartyExternalIdentifiers).values({
      externalIdentifierId: `pext_${suffix}`,
      partyId,
      sourceSystem: "ERP_SAP",
      externalId: `SAP-CUST-${suffix}`,
      contextScope: "IBERIA_BRANCH",
      createdAt: new Date(now),
    });

    // Self-loop relationship must be rejected by SQLite CHECK constraint (chk_party_crm_rel_no_self_loop)
    await expect(
      db.insert(scmPartyRelationships).values({
        relationshipId: `prel_bad_${suffix}`,
        fromPartyId: partyId,
        toPartyId: partyId,
        relationshipType: "SUBSIDIARY",
        status: "ACTIVE",
      }),
    ).rejects.toThrow();

    const roles = await db
      .select()
      .from(scmPartyRoles)
      .where(eq(scmPartyRoles.partyId, partyId));
    expect(roles.length).toBe(2);
  });

  it("2. Shipment, RoutePlan -> RouteVersion -> RouteStop & TransportLeg: enforces composition FKs and leg origin <> destination CHECK", async () => {
    const now = Date.now();
    const shipmentId = `shp_${suffix}`;
    const partyId = `pty_cust_${suffix}`;
    const routePlanId = `rpl_${suffix}`;
    const routeVersionId = `rver_${suffix}`;

    await db.insert(scmLogicalShipments).values({
      shipmentId,
      shipmentReference: `BCN-2026-${suffix.slice(-6)}`,
      serviceType: "MULTIMODAL_DOOR_TO_DOOR",
      owningOrganizationId: "ORG-ATLAS-ES",
      lifecycle: "PLANNED",
      closureStatus: "OPEN",
      createdAt: new Date(now),
      updatedAt: new Date(now),
      version: 1,
    });

    await db.insert(scmShipmentReferences).values({
      referenceId: `sref_${suffix}`,
      shipmentId,
      type: "BOOKING_REFERENCE",
      value: `BK-${suffix.slice(-6)}`,
      source: "CARRIER_EDI",
      isPrimary: true,
    });

    await db.insert(scmShipmentPartyRoles).values({
      shipmentPartyRoleId: `spr_${suffix}`,
      shipmentId,
      partyId, // Cross-context logical reference (no physical FK)
      role: "CUSTOMER",
    });

    await db.insert(scmShipmentAssignments).values({
      assignmentId: `sasg_${suffix}`,
      shipmentId,
      assignmentType: "OPERATIONS_OWNER",
      organizationId: "ORG-ATLAS-ES",
      teamId: "TEAM-MED-SEA",
      userId: "usr_ops_01",
      activeFrom: new Date(now).toISOString(),
    });

    // RoutePlan -> RouteVersion -> RouteStop & TransportLeg
    await db.insert(scmLogicalRoutePlans).values({
      routePlanId,
      shipmentId, // Cross-context logical reference
      currentVersionId: routeVersionId,
      status: "ACTIVE",
      createdAt: new Date(now),
      version: 1,
    });

    await db.insert(scmLogicalRouteVersions).values({
      routeVersionId,
      routePlanId,
      versionNumber: 1,
      status: "PUBLISHED",
      changeReason: "Initial multimodal routing",
      createdBy: "usr_ops_01",
      createdAt: new Date(now),
      publishedAt: new Date(now).toISOString(),
    });

    await db.insert(scmLogicalRouteStops).values([
      {
        stopId: `stp_1_${suffix}`,
        routeVersionId,
        sequence: 1,
        locationId: "ESBCN",
        stopType: "PORT",
      },
      {
        stopId: `stp_2_${suffix}`,
        routeVersionId,
        sequence: 2,
        locationId: "NLRTM",
        stopType: "PORT",
      },
    ]);

    await db.insert(scmLogicalTransportLegs).values({
      legId: `leg_1_${suffix}`,
      routeVersionId,
      sequence: 1,
      originLocationId: "ESBCN",
      destinationLocationId: "NLRTM",
      transportMode: "SEA",
      providerPartyId: `pty_carr_${suffix}`,
      plannedDeparture: "2026-11-01T10:00:00Z",
      plannedArrival: "2026-11-05T18:00:00Z",
    });

    // Section 8 Invariant: TransportLeg with origin == destination must be rejected by SQLite CHECK constraint
    await expect(
      db.insert(scmLogicalTransportLegs).values({
        legId: `leg_bad_${suffix}`,
        routeVersionId,
        sequence: 2,
        originLocationId: "NLRTM",
        destinationLocationId: "NLRTM",
        transportMode: "ROAD",
        plannedDeparture: "2026-11-06T08:00:00Z",
        plannedArrival: "2026-11-06T12:00:00Z",
      }),
    ).rejects.toThrow();
  });

  it("3. Cargo -> Package -> GoodsItem & EquipmentAllocation <-> Equipment: models composition and N:N domain association", async () => {
    const now = Date.now();
    const shipmentId = `shp_${suffix}`;
    const cargoId = `crg_${suffix}`;
    const packageId = `pkg_${suffix}`;
    const equipmentId = `eqp_${suffix}`;

    await db.insert(scmLogicalCargos).values({
      cargoId,
      shipmentId,
      description: "Automotive Lithium-Ion Battery Modules",
      totalWeightKg: 12400,
      totalVolumeCbm: 34.5,
      handlingRequirementJson: JSON.stringify({ hasDangerousGoods: true }),
      status: "DECLARED",
      createdAt: new Date(now),
      updatedAt: new Date(now),
      version: 1,
    });

    await db.insert(scmLogicalPackages).values({
      packageId,
      cargoId,
      packageType: "PALLET",
      quantity: 20,
      grossWeightKg: 12400,
      netWeightKg: 11800,
      volumeCbm: 34.5,
    });

    await db.insert(scmLogicalGoodsItems).values({
      goodsItemId: `gds_${suffix}`,
      packageId,
      description: "Li-Ion Traction Battery Pack",
      hsCode: "8507.60.00",
      quantity: 20,
      weightKg: 11800,
      dangerousGoodsClassificationJson: JSON.stringify({
        unNumber: "UN3480",
        imoClass: "9",
        packingGroup: "II",
      }),
      countryOfOrigin: "ES",
    });

    await db.insert(scmLogicalEquipments).values({
      equipmentId,
      equipmentTypeId: "40HC",
      equipmentCategory: "CONTAINER",
      equipmentNumber: `MSKU${suffix.slice(-7)}`,
      status: "STUFFED",
      createdAt: new Date(now),
      updatedAt: new Date(now),
      version: 1,
    });

    await db.insert(scmLogicalEquipmentSeals).values({
      sealId: `seal_${suffix}`,
      equipmentId,
      sealNumber: `SL-${suffix.slice(-6)}`,
      sealType: "CARRIER",
      status: "INTACT",
    });

    await db.insert(scmLogicalEquipmentAllocations).values({
      allocationId: `eqalloc_${suffix}`,
      cargoId,
      equipmentId,
      quantity: 20,
      weightKg: 12400,
      sequence: 1,
      validFrom: new Date(now).toISOString(),
    });

    const allocs = await db
      .select()
      .from(scmLogicalEquipmentAllocations)
      .where(eq(scmLogicalEquipmentAllocations.cargoId, cargoId));
    expect(allocs.length).toBe(1);
    expect(allocs[0].equipmentId).toBe(equipmentId);
  });

  it("4. MilestonePlan -> Milestone -> EstimateRevision, OperationalEvent & Task DAG: enforces SubjectRef and prevents self-cycles", async () => {
    const now = Date.now();
    const shipmentId = `shp_${suffix}`;
    const milestonePlanId = `mpl_${suffix}`;
    const milestoneId = `ms_${suffix}`;
    const task1Id = `tsk_1_${suffix}`;
    const task2Id = `tsk_2_${suffix}`;

    await db.insert(scmLogicalMilestonePlans).values({
      milestonePlanId,
      subjectType: "SHIPMENT",
      subjectId: shipmentId,
      planType: "END_TO_END_SHIPMENT",
      status: "ACTIVE",
      createdAt: new Date(now),
      updatedAt: new Date(now),
      version: 1,
    });

    await db.insert(scmLogicalMilestones).values({
      milestoneId,
      milestonePlanId,
      milestoneType: "ETA_POD",
      sequence: 1,
      locationId: "NLRTM",
      plannedAt: "2026-11-05T18:00:00Z",
      estimatedAt: "2026-11-06T06:00:00Z",
      status: "DELAYED",
    });

    const eventId = `oev_${suffix}`;
    await db.insert(scmLogicalOperationalEvents).values({
      eventId,
      eventType: "CARRIER_ETA_UPDATED",
      subjectType: "SHIPMENT",
      subjectId: shipmentId,
      occurredAt: "2026-11-03T10:00:00Z",
      receivedAt: "2026-11-03T10:01:00Z",
      locationId: "NLRTM",
      source: "CARRIER_DCSA_EDI",
      correlationId: `corr_${suffix}`,
      payloadJson: JSON.stringify({ newEta: "2026-11-06T06:00:00Z" }),
    });

    await db.insert(scmLogicalEstimateRevisions).values({
      revisionId: `rev_${suffix}`,
      milestoneId,
      estimatedAt: "2026-11-06T06:00:00Z",
      recordedAt: "2026-11-03T10:01:00Z",
      source: "CARRIER_DCSA_EDI",
      reason: "Port congestion in Rotterdam",
      triggeringEventId: eventId,
    });

    // Tasks & TaskDependency DAG
    await db.insert(scmLogicalTasks).values([
      {
        taskId: task1Id,
        taskType: "VERIFY_VGM",
        subjectType: "SHIPMENT",
        subjectId: shipmentId,
        priority: "HIGH",
        status: "OPEN",
        createdAt: new Date(now),
        version: 1,
      },
      {
        taskId: task2Id,
        taskType: "APPROVE_HBL",
        subjectType: "SHIPMENT",
        subjectId: shipmentId,
        priority: "MEDIUM",
        status: "BLOCKED",
        createdAt: new Date(now),
        version: 1,
      },
    ]);

    await db.insert(scmLogicalTaskDependencies).values({
      dependencyId: `tdep_${suffix}`,
      predecessorTaskId: task1Id,
      successorTaskId: task2Id,
      dependencyType: "FINISH_TO_START",
      status: "BLOCKING",
    });

    // Self-cycle dependency must be rejected by SQLite CHECK constraint (chk_work_mgmt_task_dep_no_self_cycle)
    await expect(
      db.insert(scmLogicalTaskDependencies).values({
        dependencyId: `tdep_bad_${suffix}`,
        predecessorTaskId: task1Id,
        successorTaskId: task1Id,
        dependencyType: "FINISH_TO_START",
        status: "BLOCKING",
      }),
    ).rejects.toThrow();

    // Arbitrary unmanaged SubjectType must be rejected by SQLite CHECK constraint
    await expect(
      db.insert(scmLogicalOperationalEvents).values({
        eventId: `oev_bad_${suffix}`,
        eventType: "UNKNOWN",
        subjectType: "UNMANAGED_ENTITY",
        subjectId: shipmentId,
        occurredAt: "2026-11-03T10:00:00Z",
        receivedAt: "2026-11-03T10:01:00Z",
        source: "MANUAL",
        correlationId: `corr_${suffix}`,
        payloadJson: "{}",
      }),
    ).rejects.toThrow();
  });
});
