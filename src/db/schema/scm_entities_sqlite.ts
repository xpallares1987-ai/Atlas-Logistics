import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  check,
  AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// ============================================================================
// LOGICAL VALUE OBJECT: SubjectRef (Section 35)
// Controlled polymorphic reference across transversal bounded contexts
// (Tracking, MilestonePlan, Work Management, Exceptions, SLA, DQ, Workflow)
// ============================================================================
export const SUBJECT_TYPES = [
  "SHIPMENT",
  "ORDER",
  "ROUTE_PLAN",
  "TRANSPORT_LEG",
  "EQUIPMENT",
  "CARGO",
  "DOCUMENT",
  "CUSTOMS_CASE",
  "INVOICE",
  "EXCEPTION",
] as const;

export type SubjectType = (typeof SUBJECT_TYPES)[number];

export interface SubjectRef {
  type: SubjectType;
  id: string;
}

// ============================================================================
// 1. PARTY & CRM BOUNDED CONTEXT (Prefix: party_crm_*) — Section 3
// Aggregate Root: Party
// Owned Entities: PartyAddress, Contact, PartyRole, PartyRelationship, ExternalIdentifier
// ============================================================================

export const scmParties = sqliteTable(
  "party_crm_parties_v2",
  {
    partyId: text("party_id").primaryKey(), // Canonical UUID/ULID
    partyType: text("party_type").notNull(), // ORGANIZATION | PERSON
    displayName: text("display_name").notNull(),
    legalName: text("legal_name"),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | INACTIVE | SUSPENDED | RETIRED
    primaryAddressId: text("primary_address_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_party_crm_parties_status").on(t.status),
    index("idx_party_crm_parties_display_name").on(t.displayName),
    check(
      "chk_party_crm_parties_type",
      sql`${t.partyType} IN ('ORGANIZATION', 'PERSON')`,
    ),
    check(
      "chk_party_crm_parties_status",
      sql`${t.status} IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'RETIRED')`,
    ),
  ],
);

export const scmPartyAddresses = sqliteTable(
  "party_crm_addresses_v2",
  {
    addressId: text("address_id").primaryKey(),
    // Intra-Aggregate Composition FK -> party_crm_parties_v2
    partyId: text("party_id")
      .notNull()
      .references(() => scmParties.partyId, { onDelete: "cascade" }),
    type: text("type").notNull(), // REGISTERED | OPERATIONAL | BILLING | WAREHOUSE | DELIVERY
    street: text("street").notNull(),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    countryCode: text("country_code").notNull(), // ISO 3166-1 alpha-2
    // Cross-Context Reference to Master Data Location (NO physical FK)
    locationId: text("location_id"),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
    validFrom: text("valid_from"), // ISO-8601 UTC
    validUntil: text("valid_until"), // ISO-8601 UTC
  },
  (t) => [
    index("idx_party_crm_addresses_party_id").on(t.partyId),
    index("idx_party_crm_addresses_location_id").on(t.locationId),
  ],
);

export const scmPartyContacts = sqliteTable(
  "party_crm_contacts_v2",
  {
    contactId: text("contact_id").primaryKey(),
    // Intra-Aggregate Composition FK -> party_crm_parties_v2
    partyId: text("party_id")
      .notNull()
      .references(() => scmParties.partyId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    position: text("position"),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | INACTIVE
  },
  (t) => [index("idx_party_crm_contacts_party_id").on(t.partyId)],
);

export const scmPartyRoles = sqliteTable(
  "party_crm_roles_v2",
  {
    partyRoleId: text("party_role_id").primaryKey(),
    // Intra-Aggregate Composition FK -> party_crm_parties_v2
    partyId: text("party_id")
      .notNull()
      .references(() => scmParties.partyId, { onDelete: "cascade" }),
    role: text("role").notNull(), // CUSTOMER | SUPPLIER | CARRIER | AGENT | SHIPPER | CONSIGNEE | NOTIFY_PARTY | CUSTOMS_BROKER
    status: text("status").notNull().default("ACTIVE"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_party_crm_roles_party_role").on(t.partyId, t.role),
    check(
      "chk_party_crm_roles_role",
      sql`${t.role} IN ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'AGENT', 'SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMS_BROKER')`,
    ),
  ],
);

export const scmPartyRelationships = sqliteTable(
  "party_crm_relationships_v2",
  {
    relationshipId: text("relationship_id").primaryKey(),
    // Intra-Aggregate Composition FK -> source Party
    fromPartyId: text("from_party_id")
      .notNull()
      .references(() => scmParties.partyId, { onDelete: "cascade" }),
    // Intra-Context Association FK -> target Party
    toPartyId: text("to_party_id")
      .notNull()
      .references(() => scmParties.partyId, { onDelete: "restrict" }),
    relationshipType: text("relationship_type").notNull(), // PARENT_COMPANY | SUBSIDIARY | BRANCH | AGENT_RELATIONSHIP | COMMERCIAL_RELATIONSHIP
    status: text("status").notNull().default("ACTIVE"),
    validFrom: text("valid_from"),
    validUntil: text("valid_until"),
  },
  (t) => [
    index("idx_party_crm_rel_from_party").on(t.fromPartyId),
    index("idx_party_crm_rel_to_party").on(t.toPartyId),
    check(
      "chk_party_crm_rel_no_self_loop",
      sql`${t.fromPartyId} <> ${t.toPartyId}`,
    ),
  ],
);

export const scmPartyExternalIdentifiers = sqliteTable(
  "party_crm_external_identifiers_v2",
  {
    externalIdentifierId: text("external_identifier_id").primaryKey(),
    // Intra-Aggregate Composition FK -> party_crm_parties_v2
    partyId: text("party_id")
      .notNull()
      .references(() => scmParties.partyId, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(), // CRM | ERP | CARRIER | CUSTOMS_EORI
    externalId: text("external_id").notNull(),
    contextScope: text("context_scope").notNull().default("GLOBAL"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    // Section 3 Invariant: uniqueness must consider at minimum sourceSystem + externalId + context
    uniqueIndex("uq_party_crm_ext_id_source_ext_ctx").on(
      t.sourceSystem,
      t.externalId,
      t.contextScope,
    ),
    index("idx_party_crm_ext_id_party_id").on(t.partyId),
  ],
);

// ============================================================================
// 2. SHIPMENT EXECUTION BOUNDED CONTEXT (Prefix: shipment_exec_*) — Section 5
// Aggregate Root: Shipment
// Owned Entities: ShipmentReference, ShipmentPartyRole, ShipmentAssignment
// Note: Does NOT embed routePlan[], cargo[], events[], tasks[], documents[],
//       exceptions[], or financialLines[] (Sections 5 & 40).
// ============================================================================

export const scmLogicalShipments = sqliteTable(
  "shipment_exec_shipments_v2",
  {
    shipmentId: text("shipment_id").primaryKey(), // Canonical UUID/ULID
    shipmentReference: text("shipment_reference").notNull().unique(), // Business Reference e.g. BCN-2026-001352
    serviceType: text("service_type").notNull(), // FCL_DOOR_TO_PORT | LCL_CONSOL | AIR_EXPRESS | MULTIMODAL_DOOR_TO_DOOR
    owningOrganizationId: text("owning_organization_id").notNull(),
    lifecycle: text("lifecycle").notNull().default("CREATED"), // CREATED | PLANNED | IN_TRANSIT | AT_TRANSSHIPMENT | AT_CUSTOMS | DELIVERED | EXCEPTION | CANCELLED
    closureStatus: text("closure_status").notNull().default("OPEN"), // OPEN | OPERATIONAL_CLOSED | FINANCIALLY_CLOSED | ARCHIVED | REOPENED
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_shipment_exec_shipments_org_lifecycle").on(
      t.owningOrganizationId,
      t.lifecycle,
    ),
    check(
      "chk_shipment_exec_shipments_lifecycle",
      sql`${t.lifecycle} IN ('CREATED', 'PLANNED', 'IN_TRANSIT', 'AT_TRANSSHIPMENT', 'AT_CUSTOMS', 'DELIVERED', 'EXCEPTION', 'CANCELLED')`,
    ),
    check(
      "chk_shipment_exec_shipments_closure_status",
      sql`${t.closureStatus} IN ('OPEN', 'OPERATIONAL_CLOSED', 'FINANCIALLY_CLOSED', 'ARCHIVED', 'REOPENED')`,
    ),
  ],
);

export const scmShipmentReferences = sqliteTable(
  "shipment_exec_references_v2",
  {
    referenceId: text("reference_id").primaryKey(),
    // Intra-Aggregate Composition FK -> shipment_exec_shipments_v2
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => scmLogicalShipments.shipmentId, {
        onDelete: "cascade",
      }),
    type: text("type").notNull(), // CUSTOMER_REFERENCE | BOOKING_REFERENCE | INTERNAL_REFERENCE | CARRIER_REFERENCE | EXTERNAL_SYSTEM_REFERENCE
    value: text("value").notNull(),
    source: text("source").notNull().default("INTERNAL"),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (t) => [
    index("idx_shipment_exec_refs_shipment_id").on(t.shipmentId),
    index("idx_shipment_exec_refs_type_value").on(t.type, t.value),
  ],
);

export const scmShipmentPartyRoles = sqliteTable(
  "shipment_exec_party_roles_v2",
  {
    shipmentPartyRoleId: text("shipment_party_role_id").primaryKey(),
    // Intra-Aggregate Composition FK -> shipment_exec_shipments_v2
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => scmLogicalShipments.shipmentId, {
        onDelete: "cascade",
      }),
    // Cross-Context Logical Reference -> party_crm_parties_v2.party_id (NO physical FK)
    partyId: text("party_id").notNull(),
    role: text("role").notNull(), // SHIPPER | CONSIGNEE | NOTIFY_PARTY | CUSTOMER | AGENT_ORIGIN | AGENT_DESTINATION
    validFrom: text("valid_from"),
    validUntil: text("valid_until"),
  },
  (t) => [
    index("idx_shipment_exec_party_roles_shipment_id").on(t.shipmentId),
    index("idx_shipment_exec_party_roles_party_id").on(t.partyId),
    check(
      "chk_shipment_exec_party_roles_role",
      sql`${t.role} IN ('SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMER', 'AGENT_ORIGIN', 'AGENT_DESTINATION')`,
    ),
  ],
);

export const scmShipmentAssignments = sqliteTable(
  "shipment_exec_assignments_v2",
  {
    assignmentId: text("assignment_id").primaryKey(),
    // Intra-Aggregate Composition FK -> shipment_exec_shipments_v2
    shipmentId: text("shipment_id")
      .notNull()
      .references(() => scmLogicalShipments.shipmentId, {
        onDelete: "cascade",
      }),
    assignmentType: text("assignment_type").notNull(), // GLOBAL_OWNER | OPERATIONS_OWNER | DOCUMENTATION_OWNER | FINANCE_OWNER
    organizationId: text("organization_id").notNull(),
    teamId: text("team_id"),
    userId: text("user_id"),
    activeFrom: text("active_from").notNull(),
    activeUntil: text("active_until"),
  },
  (t) => [
    index("idx_shipment_exec_assignments_shipment_id").on(t.shipmentId),
    index("idx_shipment_exec_assignments_team_user").on(t.teamId, t.userId),
    check(
      "chk_shipment_exec_assignments_type",
      sql`${t.assignmentType} IN ('GLOBAL_OWNER', 'OPERATIONS_OWNER', 'DOCUMENTATION_OWNER', 'FINANCE_OWNER')`,
    ),
  ],
);

// ============================================================================
// 3. TRANSPORT PLANNING BOUNDED CONTEXT (Prefix: transport_plan_*) — Sections 6-9
// Aggregate Root: RoutePlan
// Owned Entities: RouteVersion -> RouteStop & TransportLeg
// Invariants:
// - Published RouteVersion is strictly immutable.
// - TransportLeg originLocationId <> destinationLocationId.
// ============================================================================

export const scmLogicalRoutePlans = sqliteTable(
  "transport_plan_route_plans_v2",
  {
    routePlanId: text("route_plan_id").primaryKey(),
    // Cross-Context Logical Reference -> shipment_exec_shipments_v2.shipment_id (NO physical FK)
    shipmentId: text("shipment_id").notNull(),
    currentVersionId: text("current_version_id"),
    status: text("status").notNull().default("ACTIVE"), // DRAFT | ACTIVE | SUPERSEDED | CANCELLED
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_transport_plan_route_plans_shipment_id").on(t.shipmentId),
    check(
      "chk_transport_plan_route_plans_status",
      sql`${t.status} IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'CANCELLED')`,
    ),
  ],
);

export const scmLogicalRouteVersions = sqliteTable(
  "transport_plan_route_versions_v2",
  {
    routeVersionId: text("route_version_id").primaryKey(),
    // Intra-Aggregate Composition FK -> transport_plan_route_plans_v2
    routePlanId: text("route_plan_id")
      .notNull()
      .references(() => scmLogicalRoutePlans.routePlanId, {
        onDelete: "restrict",
      }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("DRAFT"), // DRAFT | PUBLISHED | SUPERSEDED
    changeReason: text("change_reason").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    publishedAt: text("published_at"),
  },
  (t) => [
    uniqueIndex("uq_transport_plan_route_versions_plan_ver").on(
      t.routePlanId,
      t.versionNumber,
    ),
    check(
      "chk_transport_plan_route_versions_status",
      sql`${t.status} IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED')`,
    ),
  ],
);

function routeVersionRef(): AnySQLiteColumn {
  return scmLogicalRouteVersions.routeVersionId;
}

export const scmLogicalRouteStops = sqliteTable(
  "transport_plan_route_stops_v2",
  {
    stopId: text("stop_id").primaryKey(),
    // Intra-Aggregate Composition FK -> transport_plan_route_versions_v2
    routeVersionId: text("route_version_id")
      .notNull()
      .references(() => routeVersionRef(), { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    // Cross-Context Logical Reference -> Master Data Location / UN/LOCODE
    locationId: text("location_id").notNull(),
    stopType: text("stop_type").notNull(), // ORIGIN | PICKUP | PORT | AIRPORT | RAIL_TERMINAL | TRANSSHIPMENT | DELIVERY | DESTINATION
    plannedArrival: text("planned_arrival"),
    plannedDeparture: text("planned_departure"),
  },
  (t) => [
    uniqueIndex("uq_transport_plan_route_stops_ver_seq").on(
      t.routeVersionId,
      t.sequence,
    ),
    check(
      "chk_transport_plan_route_stops_type",
      sql`${t.stopType} IN ('ORIGIN', 'PICKUP', 'PORT', 'AIRPORT', 'RAIL_TERMINAL', 'TRANSSHIPMENT', 'DELIVERY', 'DESTINATION')`,
    ),
  ],
);

export const scmLogicalTransportLegs = sqliteTable(
  "transport_plan_transport_legs_v2",
  {
    legId: text("leg_id").primaryKey(),
    // Intra-Aggregate Composition FK -> transport_plan_route_versions_v2
    routeVersionId: text("route_version_id")
      .notNull()
      .references(() => scmLogicalRouteVersions.routeVersionId, {
        onDelete: "cascade",
      }),
    sequence: integer("sequence").notNull(),
    originLocationId: text("origin_location_id").notNull(),
    destinationLocationId: text("destination_location_id").notNull(),
    transportMode: text("transport_mode").notNull(), // SEA | AIR | ROAD | RAIL | MULTIMODAL
    // Cross-Context Logical Reference -> party_crm_parties_v2.party_id (NO physical FK)
    providerPartyId: text("provider_party_id"),
    serviceCode: text("service_code"),
    plannedDeparture: text("planned_departure").notNull(),
    plannedArrival: text("planned_arrival").notNull(),
    externalTransportReference: text("external_transport_reference"), // Vessel/Voyage, Flight No, Train ID
  },
  (t) => [
    uniqueIndex("uq_transport_plan_legs_ver_seq").on(
      t.routeVersionId,
      t.sequence,
    ),
    index("idx_transport_plan_legs_provider_party").on(t.providerPartyId),
    // Section 8 Invariant: origin != destination
    check(
      "chk_transport_plan_legs_origin_ne_dest",
      sql`${t.originLocationId} <> ${t.destinationLocationId}`,
    ),
  ],
);

// ============================================================================
// 4. CARGO & EQUIPMENT BOUNDED CONTEXT (Prefix: cargo_equip_*) — Sections 10-15
// Aggregate 1: Cargo -> Package -> GoodsItem (Composition)
// Aggregate 2: Equipment -> EquipmentSeal (Composition)
// Domain Association (N:N): EquipmentAllocation (Cargo <-> Equipment)
// ============================================================================

export const scmLogicalCargos = sqliteTable(
  "cargo_equip_cargos_v2",
  {
    cargoId: text("cargo_id").primaryKey(),
    // Cross-Context Logical Reference -> shipment_exec_shipments_v2.shipment_id (NO physical FK)
    shipmentId: text("shipment_id").notNull(),
    description: text("description").notNull(),
    totalWeightKg: real("total_weight_kg").notNull(),
    totalVolumeCbm: real("total_volume_cbm").notNull(),
    handlingRequirementJson: text("handling_requirement_json")
      .notNull()
      .default("{}"),
    status: text("status").notNull().default("DECLARED"), // DRAFT | DECLARED | VERIFIED | CANCELLED
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_cargo_equip_cargos_shipment_id").on(t.shipmentId),
    // Section 39 Invariant: non-negative measures
    check(
      "chk_cargo_equip_cargos_non_neg_weight",
      sql`${t.totalWeightKg} >= 0`,
    ),
    check(
      "chk_cargo_equip_cargos_non_neg_volume",
      sql`${t.totalVolumeCbm} >= 0`,
    ),
  ],
);

export const scmLogicalPackages = sqliteTable(
  "cargo_equip_packages_v2",
  {
    packageId: text("package_id").primaryKey(),
    // Intra-Aggregate Composition FK -> cargo_equip_cargos_v2
    cargoId: text("cargo_id")
      .notNull()
      .references(() => scmLogicalCargos.cargoId, { onDelete: "cascade" }),
    packageType: text("package_type").notNull(), // PALLET | CARTON | CRATE | DRUM | IBC | BULK_BAG
    quantity: integer("quantity").notNull(),
    grossWeightKg: real("gross_weight_kg").notNull(),
    netWeightKg: real("net_weight_kg"),
    volumeCbm: real("volume_cbm"),
    dimensionsJson: text("dimensions_json"), // { lengthCm, widthCm, heightCm }
    marksAndNumbers: text("marks_and_numbers"),
  },
  (t) => [
    index("idx_cargo_equip_packages_cargo_id").on(t.cargoId),
    check("chk_cargo_equip_packages_pos_qty", sql`${t.quantity} > 0`),
    check(
      "chk_cargo_equip_packages_non_neg_weight",
      sql`${t.grossWeightKg} >= 0`,
    ),
  ],
);

export const scmLogicalGoodsItems = sqliteTable(
  "cargo_equip_goods_items_v2",
  {
    goodsItemId: text("goods_item_id").primaryKey(),
    // Intra-Aggregate Composition FK -> cargo_equip_packages_v2
    packageId: text("package_id")
      .notNull()
      .references(() => scmLogicalPackages.packageId, { onDelete: "cascade" }),
    description: text("description").notNull(),
    commodityCode: text("commodity_code"),
    hsCode: text("hs_code"),
    quantity: real("quantity"),
    weightKg: real("weight_kg"),
    dangerousGoodsClassificationJson: text(
      "dangerous_goods_classification_json",
    ),
    temperatureRequirementJson: text("temperature_requirement_json"),
    countryOfOrigin: text("country_of_origin"), // ISO 3166-1 alpha-2
  },
  (t) => [
    index("idx_cargo_equip_goods_items_package_id").on(t.packageId),
    index("idx_cargo_equip_goods_items_hs_code").on(t.hsCode),
  ],
);

export const scmLogicalEquipments = sqliteTable(
  "cargo_equip_equipments_v2",
  {
    equipmentId: text("equipment_id").primaryKey(),
    equipmentTypeId: text("equipment_type_id").notNull(), // 20GP | 40HC | 40RF | TRAILER_136 | ULD_AKE | SWAP_BODY
    equipmentCategory: text("equipment_category").notNull(), // CONTAINER | TRAILER | ULD | SWAP_BODY
    equipmentNumber: text("equipment_number").unique(), // ISO 6346 e.g. MSKU9081726
    // Cross-Context Logical Reference -> party_crm_parties_v2.party_id (NO physical FK)
    ownerPartyId: text("owner_party_id"),
    status: text("status").notNull().default("ALLOCATED"), // EMPTY | ALLOCATED | STUFFED | GATED_IN | LOADED | DISCHARGED | RETURNED
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_cargo_equip_equipments_number").on(t.equipmentNumber),
    check(
      "chk_cargo_equip_equipments_category",
      sql`${t.equipmentCategory} IN ('CONTAINER', 'TRAILER', 'ULD', 'SWAP_BODY')`,
    ),
  ],
);

export const scmLogicalEquipmentSeals = sqliteTable(
  "cargo_equip_equipment_seals_v2",
  {
    sealId: text("seal_id").primaryKey(),
    // Intra-Aggregate Composition FK -> cargo_equip_equipments_v2
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => scmLogicalEquipments.equipmentId, {
        onDelete: "cascade",
      }),
    sealNumber: text("seal_number").notNull(),
    sealType: text("seal_type").notNull(), // CARRIER | CUSTOMS | SHIPPER | VETERINARY
    appliedAt: text("applied_at"),
    removedAt: text("removed_at"),
    status: text("status").notNull().default("INTACT"), // INTACT | BROKEN | REPLACED
  },
  (t) => [
    index("idx_cargo_equip_seals_equipment_id").on(t.equipmentId),
    check(
      "chk_cargo_equip_seals_status",
      sql`${t.status} IN ('INTACT', 'BROKEN', 'REPLACED')`,
    ),
  ],
);

// Section 14: Domain Association resolving Cargo N <-> N Equipment
export const scmLogicalEquipmentAllocations = sqliteTable(
  "cargo_equip_equipment_allocations_v2",
  {
    allocationId: text("allocation_id").primaryKey(),
    // Intra-Context Domain Association FK -> cargo_equip_cargos_v2
    cargoId: text("cargo_id")
      .notNull()
      .references(() => scmLogicalCargos.cargoId, { onDelete: "restrict" }),
    // Intra-Context Domain Association FK -> cargo_equip_equipments_v2
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => scmLogicalEquipments.equipmentId, {
        onDelete: "restrict",
      }),
    quantity: integer("quantity"),
    weightKg: real("weight_kg"),
    sequence: integer("sequence"),
    validFrom: text("valid_from").notNull(),
    validUntil: text("valid_until"),
  },
  (t) => [
    index("idx_cargo_equip_alloc_cargo_id").on(t.cargoId),
    index("idx_cargo_equip_alloc_equipment_id").on(t.equipmentId),
  ],
);

// ============================================================================
// 5. TRACKING & OPERATIONAL REALITY (Prefix: tracking_*) — Sections 17-20
// Aggregate 1: MilestonePlan -> Milestone -> EstimateRevision (Composition)
// Aggregate 2: OperationalEvent (Append-only stream via SubjectRef)
// ============================================================================

export const scmLogicalMilestonePlans = sqliteTable(
  "tracking_milestone_plans_v2",
  {
    milestonePlanId: text("milestone_plan_id").primaryKey(),
    // Polymorphic SubjectRef (Section 35: SHIPMENT | ROUTE_PLAN | TRANSPORT_LEG)
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    planType: text("plan_type").notNull().default("END_TO_END_SHIPMENT"),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | SUPERSEDED | COMPLETED | CANCELLED
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_tracking_milestone_plans_subject").on(
      t.subjectType,
      t.subjectId,
    ),
    check(
      "chk_tracking_milestone_plans_subject_type",
      sql`${t.subjectType} IN ('SHIPMENT', 'ROUTE_PLAN', 'TRANSPORT_LEG')`,
    ),
  ],
);

export const scmLogicalMilestones = sqliteTable(
  "tracking_milestones_v2",
  {
    milestoneId: text("milestone_id").primaryKey(),
    // Intra-Aggregate Composition FK -> tracking_milestone_plans_v2
    milestonePlanId: text("milestone_plan_id")
      .notNull()
      .references(() => scmLogicalMilestonePlans.milestonePlanId, {
        onDelete: "cascade",
      }),
    milestoneType: text("milestone_type").notNull(), // GATE_IN | VGM_CUTOFF | POL_DEPARTURE | TRANSSHIPMENT | ETA_POD | CUSTOMS_CLEARANCE | POD_DELIVERY
    sequence: integer("sequence").notNull(),
    locationId: text("location_id"),
    plannedAt: text("planned_at"),
    estimatedAt: text("estimated_at"),
    actualAt: text("actual_at"),
    status: text("status").notNull().default("PLANNED"), // PLANNED | EXPECTED | COMPLETED | DELAYED | MISSED
  },
  (t) => [
    uniqueIndex("uq_tracking_milestones_plan_seq").on(
      t.milestonePlanId,
      t.sequence,
    ),
    index("idx_tracking_milestones_plan_type").on(
      t.milestonePlanId,
      t.milestoneType,
    ),
    check(
      "chk_tracking_milestones_status",
      sql`${t.status} IN ('PLANNED', 'EXPECTED', 'COMPLETED', 'DELAYED', 'MISSED')`,
    ),
  ],
);

export const scmLogicalEstimateRevisions = sqliteTable(
  "tracking_estimate_revisions_v2",
  {
    revisionId: text("revision_id").primaryKey(),
    // Intra-Aggregate Composition FK -> tracking_milestones_v2
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => scmLogicalMilestones.milestoneId, {
        onDelete: "cascade",
      }),
    estimatedAt: text("estimated_at").notNull(),
    recordedAt: text("recorded_at").notNull(),
    source: text("source").notNull(), // TERMINAL_PORT_CUSTOMS | CARRIER_DCSA_EDI | IOT_AIS_TELEMETRY | MANUAL_OPERATOR
    reason: text("reason"),
    // Logical Reference to triggering OperationalEvent
    triggeringEventId: text("triggering_event_id"),
  },
  (t) => [index("idx_tracking_estimate_revisions_milestone").on(t.milestoneId)],
);

// Section 20: OperationalEvent (Append-Only Aggregate)
export const scmLogicalOperationalEvents = sqliteTable(
  "tracking_operational_events_v2",
  {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    // Polymorphic SubjectRef (Section 35)
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    occurredAt: text("occurred_at").notNull(),
    receivedAt: text("received_at").notNull(),
    locationId: text("location_id"),
    source: text("source").notNull(),
    sourceReference: text("source_reference"),
    correlationId: text("correlation_id").notNull(),
    causationId: text("causation_id"),
    payloadJson: text("payload_json").notNull().default("{}"),
  },
  (t) => [
    index("idx_tracking_op_events_subject").on(
      t.subjectType,
      t.subjectId,
      t.occurredAt,
    ),
    index("idx_tracking_op_events_correlation").on(t.correlationId),
    check(
      "chk_tracking_op_events_subject_type",
      sql`${t.subjectType} IN ('SHIPMENT', 'ORDER', 'ROUTE_PLAN', 'TRANSPORT_LEG', 'EQUIPMENT', 'CARGO', 'DOCUMENT', 'CUSTOMS_CASE', 'INVOICE', 'EXCEPTION')`,
    ),
  ],
);

// ============================================================================
// 6. WORK MANAGEMENT BOUNDED CONTEXT (Prefix: work_mgmt_*) — Sections 21-22
// Aggregate Root: Task
// Domain Association (DAG): TaskDependency (predecessorTaskId -> successorTaskId)
// ============================================================================

export const scmLogicalTasks = sqliteTable(
  "work_mgmt_tasks_v2",
  {
    taskId: text("task_id").primaryKey(),
    taskType: text("task_type").notNull(), // VERIFY_VGM | RESOLVE_CUSTOMS_HOLD | APPROVE_HBL | REVIEW_INVOICE_VARIANCE | CONFIRM_BOOKING
    // Polymorphic SubjectRef (Section 35)
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    priority: text("priority").notNull().default("MEDIUM"), // LOW | MEDIUM | HIGH | CRITICAL
    ownerUserId: text("owner_user_id"),
    ownerTeamId: text("owner_team_id"),
    deadline: text("deadline"),
    status: text("status").notNull().default("OPEN"), // OPEN | IN_PROGRESS | BLOCKED | COMPLETED | CANCELLED
    resultJson: text("result_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: text("completed_at"),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_work_mgmt_tasks_subject").on(t.subjectType, t.subjectId),
    index("idx_work_mgmt_tasks_status_priority").on(
      t.status,
      t.priority,
      t.deadline,
    ),
    index("idx_work_mgmt_tasks_owner").on(t.ownerTeamId, t.ownerUserId),
    check(
      "chk_work_mgmt_tasks_status",
      sql`${t.status} IN ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED')`,
    ),
    check(
      "chk_work_mgmt_tasks_subject_type",
      sql`${t.subjectType} IN ('SHIPMENT', 'ORDER', 'ROUTE_PLAN', 'TRANSPORT_LEG', 'EQUIPMENT', 'CARGO', 'DOCUMENT', 'CUSTOMS_CASE', 'INVOICE', 'EXCEPTION')`,
    ),
  ],
);

export const scmLogicalTaskDependencies = sqliteTable(
  "work_mgmt_task_dependencies_v2",
  {
    dependencyId: text("dependency_id").primaryKey(),
    predecessorTaskId: text("predecessor_task_id")
      .notNull()
      .references(() => scmLogicalTasks.taskId, { onDelete: "cascade" }),
    successorTaskId: text("successor_task_id")
      .notNull()
      .references(() => scmLogicalTasks.taskId, { onDelete: "cascade" }),
    dependencyType: text("dependency_type").notNull(), // FINISH_TO_START | EVENT_REQUIRED | APPROVAL_REQUIRED
    status: text("status").notNull().default("BLOCKING"), // BLOCKING | SATISFIED | WAIVED
  },
  (t) => [
    uniqueIndex("uq_work_mgmt_task_dep_pred_succ").on(
      t.predecessorTaskId,
      t.successorTaskId,
    ),
    // Section 22 Invariant: prevent direct self-cycle in DAG
    check(
      "chk_work_mgmt_task_dep_no_self_cycle",
      sql`${t.predecessorTaskId} <> ${t.successorTaskId}`,
    ),
    check(
      "chk_work_mgmt_task_dep_type",
      sql`${t.dependencyType} IN ('FINISH_TO_START', 'EVENT_REQUIRED', 'APPROVAL_REQUIRED')`,
    ),
  ],
);
