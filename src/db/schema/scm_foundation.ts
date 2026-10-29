import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ============================================================================
// 25. PLATFORM GOVERNANCE SCHEMA (platform_gov_*)
// Transactional Outbox + Idempotent Consumer Inbox + Command Idempotency
// ============================================================================

export const scmOutboxMessages = sqliteTable("platform_gov_outbox_messages", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  producerContext: text("producer_context").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  aggregateVersion: integer("aggregate_version").notNull(),
  correlationId: text("correlation_id").notNull(),
  causationId: text("causation_id").notNull(),
  actorContextJson: text("actor_context_json").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING | PUBLISHED | FAILED
  retryCount: integer("retry_count").notNull().default(0),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  lastError: text("last_error"),
});

export const scmInboxProcessedMessages = sqliteTable(
  "platform_gov_inbox_processed",
  {
    id: text("id").primaryKey(), // `${consumerName}:${eventId}`
    consumerName: text("consumer_name").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    processedAt: integer("processed_at", { mode: "timestamp" }).notNull(),
  },
);

// ============================================================================
// 06. ORDERS BOUNDED CONTEXT SCHEMA (orders_*)
// Private ownership: No foreign keys to shipment_exec or other schemas
// ============================================================================

export const scmOrders = sqliteTable("orders_customer_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerPartyId: text("customer_party_id").notNull(),
  customerName: text("customer_name").notNull(),
  quotationId: text("quotation_id"),
  serviceMode: text("service_mode").notNull(), // FCL | LCL | AIR | ROAD | MULTIMODAL
  incoterm: text("incoterm").notNull(),
  movementScope: text("movement_scope").notNull().default("PORT_TO_PORT"),
  originLocationId: text("origin_location_id").notNull(),
  destinationLocationId: text("destination_location_id").notNull(),
  cargoReadyDate: text("cargo_ready_date").notNull(),
  requiredDeliveryDate: text("required_delivery_date"),
  status: text("status").notNull().default("DRAFT"), // DRAFT | CONFIRMED | READY_FOR_FULFILMENT | PARTIALLY_FULFILLED | FULFILLED | CANCELLED
  cargoRequirementsJson: text("cargo_requirements_json").notNull(),
  commercialRefsJson: text("commercial_refs_json").notNull().default("[]"),
  organizationId: text("organization_id").notNull(),
  branchId: text("branch_id").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const scmOrderAllocations = sqliteTable(
  "orders_fulfilment_allocations",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    shipmentId: text("shipment_id").notNull(), // ID reference only (no cross-context FK)
    shipmentReference: text("shipment_reference").notNull(),
    allocatedPackages: integer("allocated_packages").notNull(),
    allocatedWeightKg: real("allocated_weight_kg").notNull(),
    allocatedVolumeCbm: real("allocated_volume_cbm").notNull(),
    allocationType: text("allocation_type").notNull().default("FULL"), // FULL | SPLIT | COMBINED
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
);

// ============================================================================
// 07. SHIPMENT EXECUTION BOUNDED CONTEXT SCHEMA (shipment_exec_*)
// Lean Coordinator Aggregate — does NOT own legs, cargo, docs, or invoices
// ============================================================================

export const scmShipments = sqliteTable("shipment_exec_shipments", {
  id: text("id").primaryKey(),
  shipmentReference: text("shipment_reference").notNull().unique(),
  customerAccountId: text("customer_account_id").notNull(),
  customerName: text("customer_name").notNull(),
  serviceMode: text("service_mode").notNull(), // SEA | AIR | ROAD | RAIL | MULTIMODAL
  serviceType: text("service_type").notNull(), // FCL | LCL | AIR_STD | FTL | LTL
  incoterm: text("incoterm").notNull(),
  direction: text("direction").notNull().default("IMPORT"), // EXPORT | IMPORT | CROSS_TRADE
  originLocationId: text("origin_location_id").notNull(),
  destinationLocationId: text("destination_location_id").notNull(),
  lifecycleState: text("lifecycle_state").notNull().default("CREATED"), // CREATED | PLANNED | BOOKED | IN_EXECUTION | ARRIVED | DELIVERED | CLOSURE_REQUESTED | CLOSED | CANCELLED
  executionPhase: text("execution_phase")
    .notNull()
    .default("ORIGIN_PREPARATION"),
  closureState: text("closure_state").notNull().default("OPEN"), // OPEN | OPERATIONAL_READY | FINANCIAL_READY | CLOSED | REOPENED
  healthStatus: text("health_status").notNull().default("ON_TRACK"), // ON_TRACK | AT_RISK | CRITICAL | BLOCKED
  healthScore: integer("health_score").notNull().default(100),
  healthReasonsJson: text("health_reasons_json").notNull().default("[]"),
  organizationId: text("organization_id").notNull(),
  branchId: text("branch_id").notNull(),
  teamId: text("team_id").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  orderLinksJson: text("order_links_json").notNull().default("[]"),
  partyRolesJson: text("party_roles_json").notNull().default("[]"),
  externalRefsJson: text("external_refs_json").notNull().default("[]"),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// 08. TRANSPORT PLANNING BOUNDED CONTEXT SCHEMA (transport_plan_*)
// Immutable Route Versions, Stops & Multimodal Transport Legs
// ============================================================================

export const scmRoutePlans = sqliteTable("transport_plan_route_plans", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull().unique(), // ID reference to Shipment
  activeVersionNo: integer("active_version_no").notNull().default(1),
  status: text("status").notNull().default("PUBLISHED"),
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const scmRouteVersions = sqliteTable("transport_plan_route_versions", {
  id: text("id").primaryKey(),
  routePlanId: text("route_plan_id").notNull(),
  shipmentId: text("shipment_id").notNull(),
  versionNo: integer("version_no").notNull(),
  status: text("status").notNull().default("PUBLISHED"), // DRAFT | PUBLISHED | SUPERSEDED
  changeReason: text("change_reason"),
  stopsJson: text("stops_json").notNull(),
  legsJson: text("legs_json").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// 10. CARGO & EQUIPMENT BOUNDED CONTEXT SCHEMA (cargo_equip_*)
// 4-Tier Hierarchy: Cargo -> Packages -> Goods <-> EquipmentAssignment
// ============================================================================

export const scmCargos = sqliteTable("cargo_equip_cargos", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  totalPackages: integer("total_packages").notNull(),
  totalGrossWeightKg: real("total_gross_weight_kg").notNull(),
  totalVolumeCbm: real("total_volume_cbm").notNull(),
  chargeableWeightKg: real("chargeable_weight_kg").notNull(),
  hasDangerousGoods: integer("has_dangerous_goods", { mode: "boolean" })
    .notNull()
    .default(false),
  hasTemperatureControl: integer("has_temperature_control", { mode: "boolean" })
    .notNull()
    .default(false),
  packagesJson: text("packages_json").notNull(), // Package[] each containing Goods[]
  version: integer("version").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const scmEquipmentAssignments = sqliteTable(
  "cargo_equip_equipment_assignments",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id").notNull(),
    consolidationId: text("consolidation_id"),
    equipmentCategory: text("equipment_category").notNull(), // CONTAINER | TRAILER | ULD | SWAP_BODY
    isoTypeCode: text("iso_type_code").notNull(), // 20GP | 40HC | 40RF | AKE
    equipmentNumber: text("equipment_number").notNull(),
    sealsJson: text("seals_json").notNull().default("[]"),
    tareWeightKg: real("tare_weight_kg").notNull().default(3800),
    maxPayloadKg: real("max_payload_kg").notNull().default(28000),
    vgmWeightKg: real("vgm_weight_kg"),
    pickupPin: text("pickup_pin"),
    status: text("status").notNull().default("ASSIGNED"), // ASSIGNED | RELEASED | STUFFED | SEALED | GATED_IN
    cargoAllocationsJson: text("cargo_allocations_json")
      .notNull()
      .default("[]"),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
);

// ============================================================================
// 24. OPERATIONAL INTELLIGENCE BOUNDED CONTEXT SCHEMA (op_intelligence_*)
// Read Models / Projections (Shipment360ReadModel)
// ============================================================================

export const scmShipment360Views = sqliteTable(
  "op_intelligence_shipment_360_views",
  {
    shipmentId: text("shipment_id").primaryKey(),
    referenceNumber: text("reference_number").notNull(),
    organizationId: text("organization_id").notNull(),
    branchId: text("branch_id").notNull(),
    customerAccountId: text("customer_account_id").notNull(),
    lifecycleState: text("lifecycle_state").notNull(),
    healthStatus: text("health_status").notNull(),
    projectionVersion: integer("projection_version").notNull().default(1),
    readModelJson: text("read_model_json").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
);
