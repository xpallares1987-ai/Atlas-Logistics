-- Migration for SCM Logical Model V2 & DCSA tables
CREATE TABLE IF NOT EXISTS shipment_exec_shipments_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS transport_plan_route_plans_v2 (
    route_plan_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL,
    current_version_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_transport_plan_route_plans_status CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'CANCELLED'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS transport_plan_route_versions_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cargo_equip_cargos_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS party_crm_parties_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS party_crm_addresses_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS party_crm_contacts_v2 (
    contact_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    position TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS party_crm_roles_v2 (
    party_role_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    UNIQUE(party_id, role),
    CONSTRAINT chk_party_crm_roles_role CHECK (role IN ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'AGENT', 'SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMS_BROKER'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS party_crm_relationships_v2 (
    relationship_id TEXT PRIMARY KEY NOT NULL,
    from_party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    to_party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE RESTRICT,
    relationship_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    valid_from TEXT,
    valid_until TEXT,
    CONSTRAINT chk_party_crm_rel_no_self_loop CHECK (from_party_id <> to_party_id)
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS party_crm_external_identifiers_v2 (
    external_identifier_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    external_id TEXT NOT NULL,
    context_scope TEXT NOT NULL DEFAULT 'GLOBAL',
    created_at INTEGER NOT NULL,
    UNIQUE(source_system, external_id, context_scope)
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS shipment_exec_references_v2 (
    reference_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'INTERNAL',
    is_primary INTEGER NOT NULL DEFAULT 0
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS shipment_exec_party_roles_v2 (
    shipment_party_role_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    party_id TEXT NOT NULL,
    role TEXT NOT NULL,
    valid_from TEXT,
    valid_until TEXT,
    CONSTRAINT chk_shipment_exec_party_roles_role CHECK (role IN ('SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMER', 'AGENT_ORIGIN', 'AGENT_DESTINATION'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS shipment_exec_assignments_v2 (
    assignment_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    team_id TEXT,
    user_id TEXT,
    active_from TEXT NOT NULL,
    active_until TEXT,
    CONSTRAINT chk_shipment_exec_assignments_type CHECK (assignment_type IN ('GLOBAL_OWNER', 'OPERATIONS_OWNER', 'DOCUMENTATION_OWNER', 'FINANCE_OWNER'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS transport_plan_route_stops_v2 (
    stop_id TEXT PRIMARY KEY NOT NULL,
    route_version_id TEXT NOT NULL REFERENCES transport_plan_route_versions_v2(route_version_id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    location_id TEXT NOT NULL,
    stop_type TEXT NOT NULL,
    planned_arrival TEXT,
    planned_departure TEXT,
    UNIQUE(route_version_id, sequence),
    CONSTRAINT chk_transport_plan_route_stops_type CHECK (stop_type IN ('ORIGIN', 'PICKUP', 'PORT', 'AIRPORT', 'RAIL_TERMINAL', 'TRANSSHIPMENT', 'DELIVERY', 'DESTINATION'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS transport_plan_transport_legs_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cargo_equip_packages_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cargo_equip_goods_items_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cargo_equip_equipments_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cargo_equip_equipment_seals_v2 (
    seal_id TEXT PRIMARY KEY NOT NULL,
    equipment_id TEXT NOT NULL REFERENCES cargo_equip_equipments_v2(equipment_id) ON DELETE CASCADE,
    seal_number TEXT NOT NULL,
    seal_type TEXT NOT NULL,
    applied_at TEXT,
    removed_at TEXT,
    status TEXT NOT NULL DEFAULT 'INTACT',
    CONSTRAINT chk_cargo_equip_seals_status CHECK (status IN ('INTACT', 'BROKEN', 'REPLACED'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS cargo_equip_equipment_allocations_v2 (
    allocation_id TEXT PRIMARY KEY NOT NULL,
    cargo_id TEXT NOT NULL REFERENCES cargo_equip_cargos_v2(cargo_id) ON DELETE RESTRICT,
    equipment_id TEXT NOT NULL REFERENCES cargo_equip_equipments_v2(equipment_id) ON DELETE RESTRICT,
    quantity INTEGER,
    weight_kg REAL,
    sequence INTEGER,
    valid_from TEXT NOT NULL,
    valid_until TEXT
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS tracking_milestone_plans_v2 (
    milestone_plan_id TEXT PRIMARY KEY NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    plan_type TEXT NOT NULL DEFAULT 'END_TO_END_SHIPMENT',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_tracking_milestone_plans_subject_type CHECK (subject_type IN ('SHIPMENT', 'ROUTE_PLAN', 'TRANSPORT_LEG'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS tracking_milestones_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS tracking_estimate_revisions_v2 (
    revision_id TEXT PRIMARY KEY NOT NULL,
    milestone_id TEXT NOT NULL REFERENCES tracking_milestones_v2(milestone_id) ON DELETE CASCADE,
    estimated_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    source TEXT NOT NULL,
    reason TEXT,
    triggering_event_id TEXT
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS tracking_operational_events_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS work_mgmt_tasks_v2 (
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
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS work_mgmt_task_dependencies_v2 (
    dependency_id TEXT PRIMARY KEY NOT NULL,
    predecessor_task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
    successor_task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BLOCKING',
    UNIQUE(predecessor_task_id, successor_task_id),
    CONSTRAINT chk_work_mgmt_task_dep_no_self_cycle CHECK (predecessor_task_id <> successor_task_id),
    CONSTRAINT chk_work_mgmt_task_dep_type CHECK (dependency_type IN ('FINISH_TO_START', 'EVENT_REQUIRED', 'APPROVAL_REQUIRED'))
  );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS wf_engine_definitions_v2 (
      workflow_definition_id TEXT PRIMARY KEY NOT NULL,
      definition_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      service_mode TEXT NOT NULL DEFAULT 'ALL',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      active_version_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS wf_engine_definition_versions_v2 (
      workflow_version_id TEXT PRIMARY KEY NOT NULL,
      workflow_definition_id TEXT NOT NULL REFERENCES wf_engine_definitions_v2(workflow_definition_id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      trigger_event_type TEXT NOT NULL DEFAULT 'transport_planning.RoutePlanned.v2',
      match_condition_json TEXT NOT NULL DEFAULT '{}',
      published_at TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(workflow_definition_id, version_number),
      CONSTRAINT chk_wf_engine_def_ver_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED'))
    );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS wf_engine_task_definitions_v2 (
      task_definition_id TEXT PRIMARY KEY NOT NULL,
      workflow_version_id TEXT NOT NULL REFERENCES wf_engine_definition_versions_v2(workflow_version_id) ON DELETE CASCADE,
      task_type_code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      default_priority TEXT NOT NULL DEFAULT 'MEDIUM',
      default_candidate_role TEXT,
      default_candidate_team TEXT,
      sla_duration_minutes INTEGER DEFAULT 480,
      required_input_keys_json TEXT NOT NULL DEFAULT '[]',
      is_milestone_trigger INTEGER NOT NULL DEFAULT 0,
      sequence_hint INTEGER NOT NULL DEFAULT 1,
      UNIQUE(workflow_version_id, task_type_code),
      CONSTRAINT chk_wf_engine_task_def_priority CHECK (default_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
    );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS wf_engine_dependency_definitions_v2 (
      dependency_definition_id TEXT PRIMARY KEY NOT NULL,
      workflow_version_id TEXT NOT NULL REFERENCES wf_engine_definition_versions_v2(workflow_version_id) ON DELETE CASCADE,
      predecessor_task_type_code TEXT NOT NULL,
      successor_task_type_code TEXT NOT NULL,
      dependency_type TEXT NOT NULL DEFAULT 'FINISH_TO_START',
      condition_json TEXT,
      UNIQUE(workflow_version_id, predecessor_task_type_code, successor_task_type_code),
      CONSTRAINT chk_wf_engine_dep_def_no_self_loop CHECK (predecessor_task_type_code <> successor_task_type_code)
    );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS wf_engine_instances_v2 (
      instance_id TEXT PRIMARY KEY NOT NULL,
      workflow_definition_id TEXT NOT NULL REFERENCES wf_engine_definitions_v2(workflow_definition_id),
      workflow_version_id TEXT NOT NULL REFERENCES wf_engine_definition_versions_v2(workflow_version_id),
      subject_type TEXT NOT NULL DEFAULT 'SHIPMENT',
      subject_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      variables_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      CONSTRAINT chk_wf_engine_inst_status CHECK (status IN ('PENDING', 'RUNNING', 'SUSPENDED', 'COMPLETED', 'CANCELLED'))
    );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS wf_engine_task_instances_v2 (
      task_instance_id TEXT PRIMARY KEY NOT NULL,
      workflow_instance_id TEXT NOT NULL REFERENCES wf_engine_instances_v2(instance_id) ON DELETE CASCADE,
      task_definition_id TEXT NOT NULL REFERENCES wf_engine_task_definitions_v2(task_definition_id),
      task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
      task_type_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      execution_result_json TEXT,
      started_at TEXT,
      completed_at TEXT,
      UNIQUE(workflow_instance_id, task_type_code)
    );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS op_intelligence_shipment_360_views_v2 (
      shipment_id TEXT PRIMARY KEY NOT NULL,
      shipment_reference TEXT NOT NULL,
      service_type TEXT NOT NULL,
      lifecycle TEXT NOT NULL,
      closure_status TEXT NOT NULL DEFAULT 'OPEN',
      customer_party_id TEXT,
      active_route_version INTEGER,
      workflow_instance_id TEXT,
      workflow_status TEXT,
      health_status TEXT NOT NULL DEFAULT 'ON_TRACK',
      open_tasks_count INTEGER NOT NULL DEFAULT 0,
      blocked_tasks_count INTEGER NOT NULL DEFAULT 0,
      completed_tasks_count INTEGER NOT NULL DEFAULT 0,
      projection_version INTEGER NOT NULL DEFAULT 1,
      view_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_ref ON op_intelligence_shipment_360_views_v2(shipment_reference);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_lifecycle ON op_intelligence_shipment_360_views_v2(lifecycle);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_service_type ON op_intelligence_shipment_360_views_v2(service_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_health ON op_intelligence_shipment_360_views_v2(health_status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_wf_inst ON op_intelligence_shipment_360_views_v2(workflow_instance_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS op_intelligence_cockpit_items_v2 (
      work_item_id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      shipment_id TEXT NOT NULL,
      shipment_reference TEXT NOT NULL,
      service_type TEXT NOT NULL,
      task_type_code TEXT NOT NULL,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'OPEN',
      is_blocked INTEGER NOT NULL DEFAULT 0,
      urgency_bucket TEXT NOT NULL DEFAULT 'UPCOMING',
      attention_score INTEGER NOT NULL DEFAULT 50,
      workflow_instance_id TEXT,
      item_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_task_id ON op_intelligence_cockpit_items_v2(task_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_shipment_id ON op_intelligence_cockpit_items_v2(shipment_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_status_priority ON op_intelligence_cockpit_items_v2(status, is_blocked, priority, attention_score);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_urgency ON op_intelligence_cockpit_items_v2(urgency_bucket);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS op_intelligence_exceptions_v2 (
      exception_id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      is_blocking INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      root_cause TEXT,
      assigned_to_user_id TEXT,
      assigned_team TEXT,
      resolution_notes TEXT,
      resolved_by_user_id TEXT,
      resolved_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_exc_v2_shipment ON op_intelligence_exceptions_v2(shipment_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_exc_v2_status_sev ON op_intelligence_exceptions_v2(status, severity, is_blocking);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_op_intel_exc_v2_team ON op_intelligence_exceptions_v2(assigned_team);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS dcsa_event_subscriptions (
          subscription_id TEXT PRIMARY KEY NOT NULL,
          carrier_code TEXT NOT NULL,
          callback_url TEXT NOT NULL,
          secret_token TEXT NOT NULL,
          event_type_filters_json TEXT NOT NULL DEFAULT '[]',
          booking_reference TEXT,
          equipment_reference TEXT,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          delivery_count INTEGER NOT NULL DEFAULT 0,
          last_delivered_at INTEGER,
          last_error TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        , is_deleted INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, metadata TEXT, tags TEXT);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_dcsa_subs_carrier ON dcsa_event_subscriptions(carrier_code);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS dcsa_events_log (
          event_id TEXT PRIMARY KEY NOT NULL,
          event_type TEXT NOT NULL,
          event_classifier_code TEXT NOT NULL DEFAULT 'ACT',
          event_date_time TEXT NOT NULL,
          carrier_booking_reference TEXT,
          transport_document_reference TEXT,
          equipment_reference TEXT,
          event_type_code TEXT NOT NULL,
          location_locode TEXT NOT NULL,
          vessel_imo_number TEXT,
          vessel_name TEXT,
          voyage_number TEXT,
          payload_json TEXT NOT NULL,
          signature_verified INTEGER NOT NULL DEFAULT 1,
          scm_linked_shipment_id TEXT,
          processed_status TEXT NOT NULL DEFAULT 'PROCESSED',
          exception_triggered INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        , is_deleted INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, metadata TEXT, tags TEXT);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_dcsa_events_type ON dcsa_events_log(event_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_dcsa_events_bkg ON dcsa_events_log(carrier_booking_reference);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_dcsa_events_eq ON dcsa_events_log(equipment_reference);
--> statement-breakpoint
