import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";

/**
 * Physical SQLite bootstrap for the SCM Logical Entity Model v1 — First Vertical Slice
 * (Party, Shipment, RoutePlan/RouteVersion/RouteStop/TransportLeg, Cargo/Package/GoodsItem,
 * Equipment/EquipmentSeal/EquipmentAllocation, MilestonePlan/Milestone/EstimateRevision,
 * OperationalEvent, Task/TaskDependency).
 *
 * Mirrors src/db/schema/scm_logical_slice1_sqlite.ts. Tables suffixed  coexist with the
 * JSON-blob tables of the same name used by Slices 0-6 (scm_foundation.ts) until those
 * contexts are migrated onto the normalized model.
 *
 * Conventions:
 * - Intra-aggregate composition -> physical FK (ON DELETE CASCADE for draft children).
 * - Intra-context aggregate association -> physical FK (ON DELETE RESTRICT).
 * - Cross-context references -> plain ID column, NO physical FK.
 * - SubjectRef -> (subject_type, subject_id) with CHECK on the controlled SubjectType list.
 */
export const SCM_LOGICAL_SLICE1_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS party_crm_parties_v2 (
    party_id TEXT PRIMARY KEY NOT NULL,
    party_type TEXT NOT NULL,
    display_name TEXT NOT NULL,
    legal_name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    primary_address_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_party_crm_parties_type CHECK (party_type IN ('ORGANIZATION', 'PERSON')),
    CONSTRAINT chk_party_crm_parties_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'RETIRED'))
  );`,
  `CREATE TABLE IF NOT EXISTS party_crm_addresses_v2 (
    address_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country_code TEXT NOT NULL,
    location_id TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    valid_from TEXT,
    valid_until TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS party_crm_contacts_v2 (
    contact_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    position TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  );`,
  `CREATE TABLE IF NOT EXISTS party_crm_roles_v2 (
    party_role_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    UNIQUE(party_id, role),
    CONSTRAINT chk_party_crm_roles_role CHECK (role IN ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'AGENT', 'SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMS_BROKER'))
  );`,
  `CREATE TABLE IF NOT EXISTS party_crm_relationships_v2 (
    relationship_id TEXT PRIMARY KEY NOT NULL,
    from_party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    to_party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE RESTRICT,
    relationship_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    valid_from TEXT,
    valid_until TEXT,
    CONSTRAINT chk_party_crm_rel_no_self_loop CHECK (from_party_id <> to_party_id)
  );`,
  `CREATE TABLE IF NOT EXISTS party_crm_external_identifiers_v2 (
    external_identifier_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    external_id TEXT NOT NULL,
    context_scope TEXT NOT NULL DEFAULT 'GLOBAL',
    created_at INTEGER NOT NULL,
    UNIQUE(source_system, external_id, context_scope)
  );`,
  `CREATE TABLE IF NOT EXISTS shipment_exec_shipments_v2 (
    shipment_id TEXT PRIMARY KEY NOT NULL,
    shipment_reference TEXT NOT NULL UNIQUE,
    service_type TEXT NOT NULL,
    owning_organization_id TEXT NOT NULL,
    lifecycle TEXT NOT NULL DEFAULT 'CREATED',
    closure_status TEXT NOT NULL DEFAULT 'OPEN',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_shipment_exec_shipments_lifecycle CHECK (lifecycle IN ('CREATED', 'PLANNED', 'IN_TRANSIT', 'AT_TRANSSHIPMENT', 'AT_CUSTOMS', 'DELIVERED', 'EXCEPTION', 'CANCELLED')),
    CONSTRAINT chk_shipment_exec_shipments_closure_status CHECK (closure_status IN ('OPEN', 'OPERATIONAL_CLOSED', 'FINANCIALLY_CLOSED', 'ARCHIVED', 'REOPENED'))
  );`,
  `CREATE TABLE IF NOT EXISTS shipment_exec_references_v2 (
    reference_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'INTERNAL',
    is_primary INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE TABLE IF NOT EXISTS shipment_exec_party_roles_v2 (
    shipment_party_role_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    party_id TEXT NOT NULL,
    role TEXT NOT NULL,
    valid_from TEXT,
    valid_until TEXT,
    CONSTRAINT chk_shipment_exec_party_roles_role CHECK (role IN ('SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMER', 'AGENT_ORIGIN', 'AGENT_DESTINATION'))
  );`,
  `CREATE TABLE IF NOT EXISTS shipment_exec_assignments_v2 (
    assignment_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    team_id TEXT,
    user_id TEXT,
    active_from TEXT NOT NULL,
    active_until TEXT,
    CONSTRAINT chk_shipment_exec_assignments_type CHECK (assignment_type IN ('GLOBAL_OWNER', 'OPERATIONS_OWNER', 'DOCUMENTATION_OWNER', 'FINANCE_OWNER'))
  );`,
  `CREATE TABLE IF NOT EXISTS transport_plan_route_plans_v2 (
    route_plan_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL,
    current_version_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_transport_plan_route_plans_status CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'CANCELLED'))
  );`,
  `CREATE TABLE IF NOT EXISTS transport_plan_route_versions_v2 (
    route_version_id TEXT PRIMARY KEY NOT NULL,
    route_plan_id TEXT NOT NULL REFERENCES transport_plan_route_plans_v2(route_plan_id) ON DELETE RESTRICT,
    version_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    change_reason TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    published_at TEXT,
    UNIQUE(route_plan_id, version_number),
    CONSTRAINT chk_transport_plan_route_versions_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED'))
  );`,
  `CREATE TABLE IF NOT EXISTS transport_plan_route_stops_v2 (
    stop_id TEXT PRIMARY KEY NOT NULL,
    route_version_id TEXT NOT NULL REFERENCES transport_plan_route_versions_v2(route_version_id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    location_id TEXT NOT NULL,
    stop_type TEXT NOT NULL,
    planned_arrival TEXT,
    planned_departure TEXT,
    UNIQUE(route_version_id, sequence),
    CONSTRAINT chk_transport_plan_route_stops_type CHECK (stop_type IN ('ORIGIN', 'PICKUP', 'PORT', 'AIRPORT', 'RAIL_TERMINAL', 'TRANSSHIPMENT', 'DELIVERY', 'DESTINATION'))
  );`,
  `CREATE TABLE IF NOT EXISTS transport_plan_transport_legs_v2 (
    leg_id TEXT PRIMARY KEY NOT NULL,
    route_version_id TEXT NOT NULL REFERENCES transport_plan_route_versions_v2(route_version_id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    origin_location_id TEXT NOT NULL,
    destination_location_id TEXT NOT NULL,
    transport_mode TEXT NOT NULL,
    provider_party_id TEXT,
    service_code TEXT,
    planned_departure TEXT NOT NULL,
    planned_arrival TEXT NOT NULL,
    external_transport_reference TEXT,
    UNIQUE(route_version_id, sequence),
    CONSTRAINT chk_transport_plan_legs_origin_ne_dest CHECK (origin_location_id <> destination_location_id)
  );`,
  `CREATE TABLE IF NOT EXISTS cargo_equip_cargos_v2 (
    cargo_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL,
    description TEXT NOT NULL,
    total_weight_kg REAL NOT NULL,
    total_volume_cbm REAL NOT NULL,
    handling_requirement_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'DECLARED',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_cargo_equip_cargos_non_neg_weight CHECK (total_weight_kg >= 0),
    CONSTRAINT chk_cargo_equip_cargos_non_neg_volume CHECK (total_volume_cbm >= 0)
  );`,
  `CREATE TABLE IF NOT EXISTS cargo_equip_packages_v2 (
    package_id TEXT PRIMARY KEY NOT NULL,
    cargo_id TEXT NOT NULL REFERENCES cargo_equip_cargos_v2(cargo_id) ON DELETE CASCADE,
    package_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    gross_weight_kg REAL NOT NULL,
    net_weight_kg REAL,
    volume_cbm REAL,
    dimensions_json TEXT,
    marks_and_numbers TEXT,
    CONSTRAINT chk_cargo_equip_packages_pos_qty CHECK (quantity > 0),
    CONSTRAINT chk_cargo_equip_packages_non_neg_weight CHECK (gross_weight_kg >= 0)
  );`,
  `CREATE TABLE IF NOT EXISTS cargo_equip_goods_items_v2 (
    goods_item_id TEXT PRIMARY KEY NOT NULL,
    package_id TEXT NOT NULL REFERENCES cargo_equip_packages_v2(package_id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    commodity_code TEXT,
    hs_code TEXT,
    quantity REAL,
    weight_kg REAL,
    dangerous_goods_classification_json TEXT,
    temperature_requirement_json TEXT,
    country_of_origin TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS cargo_equip_equipments_v2 (
    equipment_id TEXT PRIMARY KEY NOT NULL,
    equipment_type_id TEXT NOT NULL,
    equipment_category TEXT NOT NULL,
    equipment_number TEXT UNIQUE,
    owner_party_id TEXT,
    status TEXT NOT NULL DEFAULT 'ALLOCATED',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_cargo_equip_equipments_category CHECK (equipment_category IN ('CONTAINER', 'TRAILER', 'ULD', 'SWAP_BODY'))
  );`,
  `CREATE TABLE IF NOT EXISTS cargo_equip_equipment_seals_v2 (
    seal_id TEXT PRIMARY KEY NOT NULL,
    equipment_id TEXT NOT NULL REFERENCES cargo_equip_equipments_v2(equipment_id) ON DELETE CASCADE,
    seal_number TEXT NOT NULL,
    seal_type TEXT NOT NULL,
    applied_at TEXT,
    removed_at TEXT,
    status TEXT NOT NULL DEFAULT 'INTACT',
    CONSTRAINT chk_cargo_equip_seals_status CHECK (status IN ('INTACT', 'BROKEN', 'REPLACED'))
  );`,
  `CREATE TABLE IF NOT EXISTS cargo_equip_equipment_allocations_v2 (
    allocation_id TEXT PRIMARY KEY NOT NULL,
    cargo_id TEXT NOT NULL REFERENCES cargo_equip_cargos_v2(cargo_id) ON DELETE RESTRICT,
    equipment_id TEXT NOT NULL REFERENCES cargo_equip_equipments_v2(equipment_id) ON DELETE RESTRICT,
    quantity INTEGER,
    weight_kg REAL,
    sequence INTEGER,
    valid_from TEXT NOT NULL,
    valid_until TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS tracking_milestone_plans_v2 (
    milestone_plan_id TEXT PRIMARY KEY NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'END_TO_END_SHIPMENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_tracking_milestone_plans_subject_type CHECK (subject_type IN ('SHIPMENT', 'ROUTE_PLAN', 'TRANSPORT_LEG'))
  );`,
  `CREATE TABLE IF NOT EXISTS tracking_milestones_v2 (
    milestone_id TEXT PRIMARY KEY NOT NULL,
    milestone_plan_id TEXT NOT NULL REFERENCES tracking_milestone_plans_v2(milestone_plan_id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    location_id TEXT,
    planned_at TEXT,
    estimated_at TEXT,
    actual_at TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    UNIQUE(milestone_plan_id, sequence),
    CONSTRAINT chk_tracking_milestones_status CHECK (status IN ('PLANNED', 'EXPECTED', 'COMPLETED', 'DELAYED', 'MISSED'))
  );`,
  `CREATE TABLE IF NOT EXISTS tracking_estimate_revisions_v2 (
    revision_id TEXT PRIMARY KEY NOT NULL,
    milestone_id TEXT NOT NULL REFERENCES tracking_milestones_v2(milestone_id) ON DELETE CASCADE,
    estimated_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    source TEXT NOT NULL,
    reason TEXT,
    triggering_event_id TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS tracking_operational_events_v2 (
    event_id TEXT PRIMARY KEY NOT NULL,
    event_type TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    received_at TEXT NOT NULL,
    location_id TEXT,
    source TEXT NOT NULL,
    source_reference TEXT,
    correlation_id TEXT NOT NULL,
    causation_id TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT chk_tracking_op_events_subject_type CHECK (subject_type IN ('SHIPMENT', 'ORDER', 'ROUTE_PLAN', 'TRANSPORT_LEG', 'EQUIPMENT', 'CARGO', 'DOCUMENT', 'CUSTOMS_CASE', 'INVOICE', 'EXCEPTION'))
  );`,
  `CREATE TABLE IF NOT EXISTS work_mgmt_tasks_v2 (
    task_id TEXT PRIMARY KEY NOT NULL,
    task_type TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    owner_user_id TEXT,
    owner_team_id TEXT,
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    result_json TEXT,
    created_at INTEGER NOT NULL,
    completed_at TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_work_mgmt_tasks_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_work_mgmt_tasks_subject_type CHECK (subject_type IN ('SHIPMENT', 'ORDER', 'ROUTE_PLAN', 'TRANSPORT_LEG', 'EQUIPMENT', 'CARGO', 'DOCUMENT', 'CUSTOMS_CASE', 'INVOICE', 'EXCEPTION'))
  );`,
  `CREATE TABLE IF NOT EXISTS work_mgmt_task_dependencies_v2 (
    dependency_id TEXT PRIMARY KEY NOT NULL,
    predecessor_task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
    successor_task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BLOCKING',
    UNIQUE(predecessor_task_id, successor_task_id),
    CONSTRAINT chk_work_mgmt_task_dep_no_self_cycle CHECK (predecessor_task_id <> successor_task_id),
    CONSTRAINT chk_work_mgmt_task_dep_type CHECK (dependency_type IN ('FINISH_TO_START', 'EVENT_REQUIRED', 'APPROVAL_REQUIRED'))
  );`,
];

let ensured = false;

export async function ensureScmLogicalSlice1Tables(): Promise<void> {
  if (ensured) return;
  // SQLite enforces FKs per connection; required for composition FKs to be honoured.
  await db.run(sql.raw("PRAGMA foreign_keys = ON;"));
  for (const stmt of SCM_LOGICAL_SLICE1_DDL) {
    await db.run(sql.raw(stmt));
  }
  ensured = true;
}
