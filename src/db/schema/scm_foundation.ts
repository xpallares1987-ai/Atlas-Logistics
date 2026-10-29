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
// 11. TRACKING & EVENTS BOUNDED CONTEXT SCHEMA (tracking_events_*)
// Append-only Event Stream + MilestonePlan (Planned / Estimated / Actual)
// ============================================================================

export const scmTrackingEventsStream = sqliteTable("tracking_events_stream", {
  eventId: text("event_id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  eventCode: text("event_code").notNull(), // GATE_IN | VGM_VERIFIED | VESSEL_DEPARTED | ETA_UPDATED | CUSTOMS_HOLD | CUSTOMS_RELEASED | TEMP_EXCURSION | DELIVERED
  milestoneCode: text("milestone_code").notNull(), // VGM_CUTOFF | ETD_POL | TRANSSHIPMENT | ETA_POD | CUSTOMS_CLEARANCE | POD_DELIVERY
  locationLocode: text("location_locode").notNull(),
  sourceType: text("source_type").notNull(), // TERMINAL_PORT_CUSTOMS | CARRIER_DCSA_EDI | IOT_AIS_TELEMETRY | MANUAL_OPERATOR
  sourceTrustRank: integer("source_trust_rank").notNull().default(1), // 4 = Authority/Terminal, 3 = Carrier EDI, 2 = IoT/AIS, 1 = Manual
  timestampKind: text("timestamp_kind").notNull(), // PLANNED | ESTIMATED | ACTUAL
  eventTimestamp: text("event_timestamp").notNull(),
  summary: text("summary").notNull(),
  payloadJson: text("payload_json").notNull().default("{}"),
  organizationId: text("organization_id").notNull(),
  branchId: text("branch_id").notNull(),
  recordedAt: integer("recorded_at", { mode: "timestamp" }).notNull(),
});

export const scmMilestonePlans = sqliteTable(
  "tracking_events_milestone_plans",
  {
    id: text("id").primaryKey(),
    shipmentId: text("shipment_id").notNull().unique(),
    routeVersionNo: integer("route_version_no").notNull().default(1),
    milestonesJson: text("milestones_json").notNull(), // MilestoneItem[] with Planned/Estimated/Actual + estimationHistory
    version: integer("version").notNull().default(1),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
);

// ============================================================================
// 13. EXCEPTION MANAGEMENT BOUNDED CONTEXT SCHEMA (exception_mgmt_*)
// Active Deduplication (shipmentId + category + milestoneCode) + N:1 Incidents
// ============================================================================

export const scmOperationalExceptions = sqliteTable(
  "exception_mgmt_exceptions",
  {
    id: text("id").primaryKey(),
    dedupKey: text("dedup_key").notNull().unique(), // `${shipmentId}:${category}:${milestoneCode}`
    shipmentId: text("shipment_id").notNull(),
    referenceNumber: text("reference_number").notNull(),
    category: text("category").notNull(), // ETA_DELAY | CUTOFF_AT_RISK | CUSTOMS_HOLD | TEMPERATURE_EXCURSION | DATA_QUALITY_BLOCK
    severity: text("severity").notNull(), // LOW | MEDIUM | HIGH | CRITICAL
    status: text("status").notNull().default("OPEN"), // OPEN | IN_MITIGATION | RESOLVED
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    milestoneCode: text("milestone_code").notNull(),
    locationLocode: text("location_locode").notNull(),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    incidentId: text("incident_id"),
    incidentNumber: text("incident_number"),
    linkedWorkItemId: text("linked_work_item_id"),
    evidenceLogJson: text("evidence_log_json").notNull().default("[]"),
    organizationId: text("organization_id").notNull(),
    branchId: text("branch_id").notNull(),
    firstDetectedAt: text("first_detected_at").notNull(),
    lastOccurredAt: text("last_occurred_at").notNull(),
    resolvedAt: text("resolved_at"),
  },
);

export const scmOperationalIncidents = sqliteTable("exception_mgmt_incidents", {
  id: text("id").primaryKey(),
  incidentNumber: text("incident_number").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(), // PORT_CONGESTION | VESSEL_SCHEDULE_DISRUPTION | CUSTOMS_SYSTEM_OUTAGE | WEATHER_DISRUPTION
  severity: text("severity").notNull(), // HIGH | CRITICAL
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | MITIGATED | CLOSED
  affectedLocode: text("affected_locode").notNull(),
  affectedVesselOrFlight: text("affected_vessel_or_flight"),
  impactedShipmentIdsJson: text("impacted_shipment_ids_json")
    .notNull()
    .default("[]"),
  summary: text("summary").notNull(),
  organizationId: text("organization_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// 18. SLA MANAGEMENT BOUNDED CONTEXT SCHEMA (sla_mgmt_*)
// Reactive Clocks + Automatic & Manual Stop-Clock (PAUSE / RESUME)
// ============================================================================

export const scmSlaInstances = sqliteTable("sla_mgmt_instances", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  slaCode: text("sla_code").notNull(), // SLA_BOOKING_TO_VGM | SLA_TRANSIT_PUNCTUALITY | SLA_CUSTOMS_RELEASE | SLA_COLD_CHAIN_STABILITY
  slaName: text("sla_name").notNull(),
  status: text("status").notNull().default("ON_TRACK"), // ON_TRACK | AT_RISK | BREACHED | PAUSED | MET
  startedAt: text("started_at").notNull(),
  originalDeadlineAt: text("original_deadline_at").notNull(),
  effectiveDeadlineAt: text("effective_deadline_at").notNull(),
  pausedAt: text("paused_at"),
  pauseReason: text("pause_reason"),
  accumulatedPausedMinutes: integer("accumulated_paused_minutes")
    .notNull()
    .default(0),
  stopClockHistoryJson: text("stop_clock_history_json").notNull().default("[]"),
  organizationId: text("organization_id").notNull(),
  branchId: text("branch_id").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// 19. DATA QUALITY BOUNDED CONTEXT SCHEMA (data_quality_*)
// Contextual 4-Stage Gate (BOOKING -> PRE_DEPARTURE_EXPORT -> CUSTOMS_CLEARANCE -> BILLING_READY)
// ============================================================================

export const scmQualityAssessments = sqliteTable("data_quality_assessments", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull().unique(),
  activeStage: text("active_stage").notNull().default("PRE_DEPARTURE_EXPORT"), // BOOKING | PRE_DEPARTURE_EXPORT | CUSTOMS_CLEARANCE | BILLING_READY
  score: integer("score").notNull().default(100),
  gateStatus: text("gate_status").notNull().default("PASSED"), // PASSED | WARN | BLOCKED
  blockingFindingsCount: integer("blocking_findings_count")
    .notNull()
    .default(0),
  warningFindingsCount: integer("warning_findings_count").notNull().default(0),
  findingsJson: text("findings_json").notNull().default("[]"),
  organizationId: text("organization_id").notNull(),
  branchId: text("branch_id").notNull(),
  evaluatedAt: integer("evaluated_at", { mode: "timestamp" }).notNull(),
});

// ============================================================================
// 20. WORKFLOW RUNTIME BOUNDED CONTEXT SCHEMA (workflow_rt_*)
// Domain-Agnostic BPMN-like Process Definitions, Instances & Active Tokens
// ============================================================================

export const scmWorkflowDefinitions = sqliteTable(
  "workflow_rt_process_definitions",
  {
    id: text("id").primaryKey(),
    processKey: text("process_key").notNull(),
    versionNumber: integer("version_number").notNull().default(1),
    name: text("name").notNull(),
    status: text("status").notNull().default("ACTIVE"), // DRAFT | ACTIVE | SUPERSEDED
    nodesJson: text("nodes_json").notNull(), // ActivityNodeDef[]
    sequenceFlowsJson: text("sequence_flows_json").notNull(), // SequenceFlowDef[]
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
);

export const scmWorkflowInstances = sqliteTable(
  "workflow_rt_process_instances",
  {
    id: text("id").primaryKey(),
    processDefinitionId: text("process_definition_id").notNull(),
    processKey: text("process_key").notNull(),
    versionNumber: integer("version_number").notNull().default(1),
    shipmentId: text("shipment_id").notNull().unique(),
    referenceNumber: text("reference_number").notNull(),
    state: text("state").notNull().default("RUNNING"), // RUNNING | SUSPENDED | BLOCKED_AT_GATEWAY | COMPLETED | TERMINATED
    currentNodeId: text("current_node_id").notNull(),
    activeTokensJson: text("active_tokens_json").notNull().default("[]"),
    completedNodeIdsJson: text("completed_node_ids_json")
      .notNull()
      .default("[]"),
    variablesSnapshotJson: text("variables_snapshot_json")
      .notNull()
      .default("{}"),
    blockingReason: text("blocking_reason"),
    organizationId: text("organization_id").notNull(),
    branchId: text("branch_id").notNull(),
    version: integer("version").notNull().default(1),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
  },
);

// ============================================================================
// 21. RULES & DECISIONS BOUNDED CONTEXT SCHEMA (rules_decisions_*)
// Versioned Decision Tables + Immutable Audit Explainability Records
// ============================================================================

export const scmDecisionDefinitions = sqliteTable(
  "rules_decisions_definitions",
  {
    id: text("id").primaryKey(),
    decisionKey: text("decision_key").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    versionNumber: integer("version_number").notNull().default(1),
    status: text("status").notNull().default("ACTIVE"), // DRAFT | ACTIVE | RETIRED
    hitPolicy: text("hit_policy").notNull().default("FIRST"), // UNIQUE | FIRST | PRIORITY | COLLECT
    inputColumnsJson: text("input_columns_json").notNull(),
    outputColumnsJson: text("output_columns_json").notNull(),
    rulesRowsJson: text("rules_rows_json").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
);

export const scmDecisionEvaluationLogs = sqliteTable(
  "rules_decisions_evaluation_logs",
  {
    evaluationId: text("evaluation_id").primaryKey(),
    decisionKey: text("decision_key").notNull(),
    versionNumber: integer("version_number").notNull(),
    shipmentId: text("shipment_id").notNull(),
    inputsSnapshotJson: text("inputs_snapshot_json").notNull(),
    matchedRowIdsJson: text("matched_row_ids_json").notNull(),
    ruleAnnotationsJson: text("rule_annotations_json").notNull(),
    outputSnapshotJson: text("output_snapshot_json").notNull(),
    callerContext: text("caller_context").notNull(),
    correlationId: text("correlation_id").notNull(),
    evaluatedAt: text("evaluated_at").notNull(),
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

export const scmCockpitWorkItems = sqliteTable(
  "op_intelligence_cockpit_items",
  {
    workItemId: text("work_item_id").primaryKey(),
    workItemType: text("work_item_type").notNull(), // HUMAN_TASK | APPROVAL | REVIEW | FOLLOW_UP | ACTIVE_EXCEPTION
    title: text("title").notNull(),
    description: text("description").notNull(),
    attentionScore: integer("attention_score").notNull(),
    urgencyBucket: text("urgency_bucket").notNull(), // IMMEDIATE_ACTION | DUE_TODAY | AT_RISK | UPCOMING
    status: text("status").notNull().default("OPEN"), // OPEN | COMPLETED
    organizationId: text("organization_id").notNull(),
    branchId: text("branch_id").notNull(),
    teamId: text("team_id").notNull(),
    assigneeUserId: text("assignee_user_id"),
    shipmentId: text("shipment_id"),
    referenceNumber: text("reference_number").notNull(),
    itemModelJson: text("item_model_json").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
);
