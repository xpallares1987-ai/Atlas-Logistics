-- ============================================================================
-- Atlas Logistics — Authoritative SQLite Schema DDL Export
-- Engine: LibSQL / SQLite (WAL mode, Foreign Keys Active)
-- Commit: 9728b97
-- Total Tables: 237 | Foreign Key Check: 0 Violations
-- Exported At: 2026-11-14T03:25:32.452Z
-- ============================================================================

CREATE VIEW `shipment_financial_summary` AS select "shipments"."id", "shipments"."vessel_name", SUM("invoice_items"."total") as "total_invoiced_amount", COUNT(DISTINCT "invoices"."id") as "invoice_count" from "shipments" left join "invoices" on "invoices"."shipment_id" = "shipments"."id" left join "invoice_items" on "invoice_items"."invoice_id" = "invoices"."id" group by "shipments"."id";

CREATE VIEW `warehouse_occupancy` AS select "locations"."id", "locations"."name", SUM("warehouse_inventory"."quantity") as "total_items", SUM("warehouse_inventory"."weight") as "total_weight", SUM("warehouse_inventory"."volume") as "total_volume" from "locations" left join "warehouse_inventory" on "warehouse_inventory"."location_id" = "locations"."id" where "locations"."type" = 'WAREHOUSE' group by "locations"."id";

CREATE TRIGGER trg_audit_shipment_status
    AFTER UPDATE OF status ON shipments
    WHEN OLD.status != NEW.status
    BEGIN
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data)
      VALUES (
        'shipments',
        NEW.id,
        'STATUS_CHANGE',
        OLD.status,
        NEW.status
      );
    END;

CREATE TRIGGER trg_auto_invoice_sequence
    AFTER INSERT ON invoices
    WHEN NEW.invoiceNumber IS NULL OR NEW.invoiceNumber = ''
    BEGIN
      INSERT INTO system_sequences (name, current_value, prefix)
      VALUES ('invoice_seq', 1, 'INV-')
      ON CONFLICT(name) DO UPDATE SET current_value = current_value + 1;
      
      UPDATE invoices
      SET invoiceNumber = (SELECT prefix || printf('%06d', current_value) FROM system_sequences WHERE name = 'invoice_seq')
      WHERE id = NEW.id;
    END;

CREATE TABLE "__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at numeric
		, "name" text, "applied_at" TEXT);

CREATE TABLE address_contacts (
    id TEXT PRIMARY KEY,
    address_id TEXT NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mobile TEXT,
    role_category TEXT DEFAULT 'OPERATIONS',
    job_title TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  , is_deleted INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, metadata TEXT, tags TEXT);

CREATE TABLE address_identifiers (
    id TEXT PRIMARY KEY,
    address_id TEXT NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    scheme TEXT NOT NULL,
    value TEXT NOT NULL,
    transport_mode TEXT,
    is_primary INTEGER DEFAULT 1,
    issued_by TEXT,
    valid_from TEXT,
    valid_to TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );

CREATE TABLE address_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );

CREATE TABLE addresses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id),
    address_type TEXT NOT NULL,
    company_name TEXT NOT NULL,
    trade_name TEXT,
    tax_id TEXT,
    street_1 TEXT NOT NULL,
    street_2 TEXT,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    federal_state TEXT,
    country TEXT NOT NULL,
    un_locode TEXT,
    is_default_shipper INTEGER DEFAULT 0,
    is_default_consignee INTEGER DEFAULT 0,
    is_default_notify INTEGER DEFAULT 0,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  , is_deleted INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, metadata TEXT, tags TEXT, lat REAL, lon REAL, formatted_address TEXT, verification_status TEXT DEFAULT 'NOT_CHECKED', verification_provider TEXT);

CREATE TABLE `aeo_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_reference` text NOT NULL,
	`company_id` text,
	`aeo_modality` text DEFAULT 'OEAF_FULL_COMBINED' NOT NULL,
	`target_standard` text DEFAULT 'EU_UCC_AEO' NOT NULL,
	`lead_auditor_name` text NOT NULL,
	`audit_date` text NOT NULL,
	`next_review_date` text NOT NULL,
	`overall_readiness_score` real DEFAULT 0 NOT NULL,
	`customs_compliance_score` real DEFAULT 0 NOT NULL,
	`financial_solvency_score` real DEFAULT 0 NOT NULL,
	`commercial_records_score` real DEFAULT 0 NOT NULL,
	`competence_score` real DEFAULT 0 NOT NULL,
	`security_safety_score` real DEFAULT 0 NOT NULL,
	`compliance_status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`aeo_official_certificate_number` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE "aeo_business_partners" (
          id TEXT PRIMARY KEY NOT NULL,
          partner_name TEXT NOT NULL,
          partner_vat_number TEXT NOT NULL UNIQUE,
          partner_type TEXT NOT NULL,
          country_code TEXT NOT NULL DEFAULT 'ES',
          has_aeo_certification INTEGER NOT NULL DEFAULT 0,
          aeo_certificate_number TEXT,
          has_ctpat_certification INTEGER NOT NULL DEFAULT 0,
          ctpat_svi_number TEXT,
          iso28000_certified INTEGER NOT NULL DEFAULT 0,
          security_questionnaire_score REAL NOT NULL DEFAULT 0.0,
          risk_level TEXT NOT NULL DEFAULT 'LOW_RISK',
          last_assessment_date TEXT NOT NULL,
          reassessment_due_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'APPROVED_PARTNER',
          remarks TEXT,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );

CREATE TABLE `aeo_cae_questionnaire_sections` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`block_number` integer NOT NULL,
	`block_code` text NOT NULL,
	`block_title` text NOT NULL,
	`total_questions` integer DEFAULT 10 NOT NULL,
	`compliant_count` integer DEFAULT 0 NOT NULL,
	`non_compliant_count` integer DEFAULT 0 NOT NULL,
	`waived_count` integer DEFAULT 0 NOT NULL,
	`block_score_percentage` real DEFAULT 0 NOT NULL,
	`block_status` text DEFAULT 'COMPLIANT' NOT NULL,
	`findings_summary` text,
	`action_plan_required` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `aeo_audits`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `aeo_security_seals` (
	`id` text PRIMARY KEY NOT NULL,
	`seal_number` text NOT NULL,
	`seal_type` text DEFAULT 'BOLT_SEAL_CLASS_H' NOT NULL,
	`iso17712_compliant` integer DEFAULT true NOT NULL,
	`manufacturer_name` text DEFAULT 'Mega Fortris / TydenBrooks' NOT NULL,
	`iso17712_test_certificate_ref` text DEFAULT 'CERT-ISO17712-2025-H',
	`associated_equipment_identifier` text,
	`associated_shipment_reference` text,
	`affixed_date` text,
	`affixed_by` text,
	`verified_at_port_of_entry` integer DEFAULT false NOT NULL,
	`verified_intact_date` text,
	`verified_by` text,
	`seal_status` text DEFAULT 'IN_STOCK' NOT NULL,
	`tamper_incident_report` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `aeo_seven_point_inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`inspection_reference` text NOT NULL,
	`equipment_type` text DEFAULT 'OCEAN_CONTAINER' NOT NULL,
	`equipment_identifier` text NOT NULL,
	`inspector_name` text NOT NULL,
	`inspection_date` text NOT NULL,
	`facility_location` text DEFAULT 'Terminal Muelle Prat BCN' NOT NULL,
	`p1_front_wall_passed` integer DEFAULT true NOT NULL,
	`p2_left_side_passed` integer DEFAULT true NOT NULL,
	`p3_right_side_passed` integer DEFAULT true NOT NULL,
	`p4_floor_passed` integer DEFAULT true NOT NULL,
	`p5_roof_ceiling_passed` integer DEFAULT true NOT NULL,
	`p6_doors_locks_passed` integer DEFAULT true NOT NULL,
	`p7_undercarriage_passed` integer DEFAULT true NOT NULL,
	`has_agricultural_contamination` integer DEFAULT false NOT NULL,
	`physical_tampering_detected` integer DEFAULT false NOT NULL,
	`overall_passed` integer DEFAULT true NOT NULL,
	`inspection_result` text DEFAULT 'PASSED_CLEAN' NOT NULL,
	`action_taken` text,
	`remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `agent_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`statement_number` text NOT NULL,
	`agent_id` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`net_balance` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`agent_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `airway_bills` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'DIRECT' NOT NULL,
	`awb_number` text NOT NULL,
	`airline_prefix` text,
	`airline_name` text,
	`parent_mawb_id` text,
	`origin_airport` text DEFAULT 'MAD' NOT NULL,
	`destination_airport` text DEFAULT 'JFK' NOT NULL,
	`flight_number` text,
	`flight_date` integer,
	`shipper_data` text,
	`consignee_data` text,
	`issuing_agent_data` text,
	`pieces` integer DEFAULT 1 NOT NULL,
	`gross_weight_kg` real DEFAULT 0 NOT NULL,
	`volume_cbm` real DEFAULT 0 NOT NULL,
	`volumetric_weight_kg` real DEFAULT 0 NOT NULL,
	`chargeable_weight_kg` real DEFAULT 0 NOT NULL,
	`rate_class` text DEFAULT 'N' NOT NULL,
	`rate_per_kg` real DEFAULT 0 NOT NULL,
	`freight_charge` real DEFAULT 0 NOT NULL,
	`other_charges` text,
	`total_prepaid` real DEFAULT 0 NOT NULL,
	`total_collect` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`nature_of_goods` text DEFAULT 'General Cargo' NOT NULL,
	`special_handling_codes` text,
	`dgr_details` text,
	`handling_info` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`e_awb_certified` integer DEFAULT true NOT NULL,
	`awb_data` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
, `one_record_json_ld` text);

CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`old_data` text,
	`new_data` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
, `user_id` text);

CREATE TABLE billing_purchase_invoices (
      id TEXT PRIMARY KEY NOT NULL,
      dedup_vendor_key TEXT NOT NULL UNIQUE,
      supplier_party_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      supplier_invoice_number TEXT NOT NULL,
      fiscal_year INTEGER NOT NULL,
      shipment_id TEXT NOT NULL,
      matched_financial_line_id TEXT NOT NULL,
      claimed_amount_eur REAL NOT NULL,
      expected_cost_amount_eur REAL NOT NULL,
      variance_amount_eur REAL NOT NULL,
      variance_percent REAL NOT NULL,
      tolerance_percent REAL NOT NULL DEFAULT 2,
      match_outcome TEXT NOT NULL,
      three_way_match_status TEXT NOT NULL,
      status TEXT NOT NULL,
      approval_notes TEXT,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE billing_sales_invoices (
      id TEXT PRIMARY KEY NOT NULL,
      invoice_number TEXT NOT NULL UNIQUE,
      shipment_id TEXT NOT NULL,
      bill_to_customer_party_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_tax_id TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      net_amount_eur REAL NOT NULL,
      tax_rate_percent REAL NOT NULL DEFAULT 21,
      tax_amount_eur REAL NOT NULL,
      gross_amount_eur REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      lines_json TEXT NOT NULL DEFAULT '[]',
      credit_note_number TEXT,
      credit_reason TEXT,
      issued_at TEXT,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE `blockchain_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`block_number` integer NOT NULL,
	`timestamp` text NOT NULL,
	`previous_hash` text NOT NULL,
	`block_hash` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_data_json` text NOT NULL,
	`signer` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `smart_escrow_contracts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference_number` text,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`origin` text,
	`destination` text,
	`service_type` text,
	`equipment` text,
	`vessel` text,
	`voyage` text,
	`cargo_details` text,
	`estimated_departure` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text, shipper_address_id TEXT REFERENCES addresses(id), consignee_address_id TEXT REFERENCES addresses(id), notify_address_id TEXT REFERENCES addresses(id), discharge_agent_address_id TEXT REFERENCES addresses(id), is_to_order INTEGER DEFAULT 0, order_of TEXT, bl_parties_snapshot TEXT,
	FOREIGN KEY (`customer_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `bpmn_diagrams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE `bpmn_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`diagram_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`xml_content` text NOT NULL,
	`author_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`diagram_id`) REFERENCES `bpmn_diagrams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `branch_offices` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`address_id` text NOT NULL,
	`station_code` text NOT NULL,
	`name` text NOT NULL,
	`station_type` text NOT NULL,
	`un_locode` text NOT NULL,
	`iata_code` text,
	`primary_currency` text DEFAULT 'EUR' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`manager_user_id` text,
	`fmc_oti_number` text,
	`iata_numeric_code` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `bulk_draft_surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`survey_type` text NOT NULL,
	`survey_date` text NOT NULL,
	`surveyor_name` text NOT NULL,
	`chief_officer_name` text NOT NULL,
	`forward_draft_port` real NOT NULL,
	`forward_draft_starboard` real NOT NULL,
	`aft_draft_port` real NOT NULL,
	`aft_draft_starboard` real NOT NULL,
	`mid_draft_port` real NOT NULL,
	`mid_draft_starboard` real NOT NULL,
	`forward_mean_draft` real NOT NULL,
	`aft_mean_draft` real NOT NULL,
	`mid_mean_draft` real NOT NULL,
	`apparent_trim` real NOT NULL,
	`quarter_mean_draft` real NOT NULL,
	`length_between_perpendiculars` real NOT NULL,
	`longitudinal_center_of_flotation` real NOT NULL,
	`tonnes_per_cm_immersion` real NOT NULL,
	`moment_to_change_trim_1cm` real NOT NULL,
	`measured_water_density` real NOT NULL,
	`hydrostatic_displacement` real NOT NULL,
	`first_trim_correction` real NOT NULL,
	`second_trim_correction` real NOT NULL,
	`corrected_displacement` real NOT NULL,
	`ballast_water_deductible` real DEFAULT 0 NOT NULL,
	`fuel_oil_deductible` real DEFAULT 0 NOT NULL,
	`diesel_oil_deductible` real DEFAULT 0 NOT NULL,
	`fresh_water_deductible` real DEFAULT 0 NOT NULL,
	`sludge_bilge_deductible` real DEFAULT 0 NOT NULL,
	`total_deductibles` real NOT NULL,
	`net_displacement` real NOT NULL,
	`calculated_cargo_tonnage` real,
	`status` text DEFAULT 'CERTIFIED_BY_SURVEYOR' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `bulk_grain_stability_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`plan_reference` text NOT NULL,
	`grain_type` text NOT NULL,
	`total_grain_tonnage` real NOT NULL,
	`stowage_factor_m3_per_tonne` real NOT NULL,
	`total_volumetric_heeling_moment` real NOT NULL,
	`departure_displacement` real NOT NULL,
	`departure_kg` real NOT NULL,
	`departure_gm0` real NOT NULL,
	`corrected_heeling_moment` real NOT NULL,
	`residual_heel_angle_degrees` real NOT NULL,
	`residual_dynamical_stability_area` real NOT NULL,
	`is_imo_grain_code_compliant` integer NOT NULL,
	`approved_by_master_name` text NOT NULL,
	`approval_date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `bulk_imsbc_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`declaration_reference` text NOT NULL,
	`bulk_cargo_shipping_name` text NOT NULL,
	`imsbc_group` text NOT NULL,
	`gross_weight_tonnes` real NOT NULL,
	`moisture_content_percentage` real NOT NULL,
	`flow_moisture_point_percentage` real,
	`transportable_moisture_limit` real,
	`is_liquefaction_compliant` integer NOT NULL,
	`angle_of_repose_degrees` real,
	`stowage_factor_m3_per_tonne` real NOT NULL,
	`shipper_name` text NOT NULL,
	`laboratory_test_date` text NOT NULL,
	`testing_laboratory_name` text NOT NULL,
	`declaration_status` text DEFAULT 'APPROVED_FOR_LOADING' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `bulk_ullage_surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`survey_reference` text NOT NULL,
	`product_name` text NOT NULL,
	`tank_count` integer NOT NULL,
	`observed_average_temperature_celsius` real NOT NULL,
	`density_at_15_celsius` real NOT NULL,
	`api_gravity_at_60_fahrenheit` real,
	`total_observed_volume_m3` real NOT NULL,
	`total_free_water_volume_m3` real NOT NULL,
	`gross_observed_volume_m3` real NOT NULL,
	`volume_correction_factor_astm_54` real NOT NULL,
	`gross_standard_volume_m3` real NOT NULL,
	`net_standard_volume_m3` real NOT NULL,
	`metric_tonnes_in_air` real NOT NULL,
	`metric_tonnes_in_vacuum` real NOT NULL,
	`survey_date` text NOT NULL,
	`surveyor_company` text NOT NULL,
	`status` text DEFAULT 'CERTIFIED_COMPLIANT' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `bulk_vessel_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`vessel_name` text NOT NULL,
	`imo_number` text NOT NULL,
	`call_sign` text,
	`vessel_type` text NOT NULL,
	`port_name` text NOT NULL,
	`terminal_name` text NOT NULL,
	`berth_number` text NOT NULL,
	`cargo_category` text NOT NULL,
	`operation_type` text NOT NULL,
	`target_cargo_tonnage` real NOT NULL,
	`eta_date` text NOT NULL,
	`etd_date` text,
	`actual_commenced_date` text,
	`actual_completed_date` text,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE carbon_calculation_legs (
      id TEXT PRIMARY KEY,
      calculation_id TEXT NOT NULL,
      leg_order INTEGER NOT NULL,
      origin_name TEXT NOT NULL,
      destination_name TEXT NOT NULL,
      mode TEXT NOT NULL,
      distance_km REAL NOT NULL,
      weight_tonnes REAL NOT NULL,
      emission_factor_wtw REAL NOT NULL,
      emission_factor_ttw REAL NOT NULL,
      emission_factor_wtt REAL NOT NULL,
      leg_tco2e_wtw REAL NOT NULL,
      leg_tco2e_ttw REAL NOT NULL,
      leg_tco2e_wtt REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculation_id) REFERENCES carbon_calculations(id) ON DELETE CASCADE
    );

CREATE TABLE carbon_calculations (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL DEFAULT 'SHIPMENT',
      entity_id TEXT,
      reference_code TEXT NOT NULL,
      origin_city TEXT NOT NULL,
      destination_city TEXT NOT NULL,
      total_weight_kg REAL NOT NULL,
      total_distance_km REAL NOT NULL,
      total_tco2e_wtw REAL NOT NULL,
      total_tco2e_ttw REAL NOT NULL,
      total_tco2e_wtt REAL NOT NULL,
      carbon_intensity_gco2e_per_tkm REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'CALCULATED',
      offset_project_id TEXT,
      offset_cost_eur REAL,
      certificate_number TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE carbon_certificates (
      id TEXT PRIMARY KEY,
      certificate_number TEXT NOT NULL UNIQUE,
      calculation_id TEXT NOT NULL,
      beneficiary_name TEXT NOT NULL,
      project_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      project_standard TEXT NOT NULL,
      offset_tco2e REAL NOT NULL,
      amount_paid_eur REAL NOT NULL,
      qr_validation_url TEXT NOT NULL,
      issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (calculation_id) REFERENCES carbon_calculations(id),
      FOREIGN KEY (project_id) REFERENCES carbon_offset_projects(id)
    );

CREATE TABLE `carbon_insetting_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`allocation_reference` text NOT NULL UNIQUE,
	`token_id` text NOT NULL,
	`shipment_id` text,
	`beneficiary_company_id` text,
	`beneficiary_name` text NOT NULL,
	`transport_mode` text DEFAULT 'MARITIME_OCEAN' NOT NULL,
	`allocated_energy_mj` real NOT NULL,
	`equivalent_fuel_volume_tonnes` real NOT NULL,
	`abated_ghg_tco2eq` real NOT NULL,
	`cost_eur` real NOT NULL,
	`certificate_code` text NOT NULL UNIQUE,
	`verification_qr_url` text NOT NULL,
	`previous_block_hash` text NOT NULL,
	`block_hash_sha256` text NOT NULL,
	`status` text DEFAULT 'CLAIMED_RETIRED' NOT NULL,
	`lead_auditor_verifier` text DEFAULT 'Bureau Veritas / DNV Maritime' NOT NULL,
	`allocated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`token_id`) REFERENCES `carbon_insetting_tokens`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`beneficiary_company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE `carbon_insetting_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token_reference` text NOT NULL UNIQUE,
	`fuel_id` text NOT NULL,
	`fuel_type` text NOT NULL,
	`bunker_port_locode` text NOT NULL,
	`bunker_location_name` text NOT NULL,
	`bdn_reference` text NOT NULL,
	`iscc_certificate_number` text NOT NULL,
	`sustainability_registry` text NOT NULL,
	`registry_url` text,
	`supplier_company_name` text NOT NULL,
	`total_volume_metric_tonnes` real NOT NULL,
	`total_energy_mj` real NOT NULL,
	`available_energy_mj` real NOT NULL,
	`baseline_ghg_intensity_gco2eq_per_mj` real DEFAULT 91.16 NOT NULL,
	`certified_ghg_intensity_gco2eq_per_mj` real NOT NULL,
	`ghg_saving_percent` real NOT NULL,
	`ghg_abatement_tco2eq_per_tonne` real NOT NULL,
	`unit_price_eur_per_mj` real NOT NULL,
	`status` text DEFAULT 'AVAILABLE' NOT NULL,
	`digital_seal_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`fuel_id`) REFERENCES `marine_fuels`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE carbon_offset_projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      standard TEXT NOT NULL,
      category TEXT NOT NULL,
      country TEXT NOT NULL,
      price_per_tco2e_eur REAL NOT NULL,
      available_credits_tco2e REAL NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      verification_registry_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE `cargo_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_number` text NOT NULL,
	`shipment_id` text,
	`transport_doc_number` text NOT NULL,
	`transport_mode` text NOT NULL,
	`governing_convention` text NOT NULL,
	`incident_type` text NOT NULL,
	`incident_date` integer NOT NULL,
	`notice_date` integer NOT NULL,
	`delivery_date` integer,
	`claimant_name` text NOT NULL,
	`carrier_name` text NOT NULL,
	`packages_damaged` integer DEFAULT 1 NOT NULL,
	`damaged_weight_kg` real NOT NULL,
	`claimed_amount` real NOT NULL,
	`claimed_currency` text DEFAULT 'EUR' NOT NULL,
	`statutory_sdr_rate` real NOT NULL,
	`statutory_limit_eur` real NOT NULL,
	`insurance_insured_value` real DEFAULT 0 NOT NULL,
	`insurance_policy_deductible` real DEFAULT 0 NOT NULL,
	`insurance_payout_amount` real DEFAULT 0 NOT NULL,
	`subrogation_recovered_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`protest_issued` integer DEFAULT false NOT NULL,
	`subrogation_signed` integer DEFAULT false NOT NULL,
	`incident_description` text NOT NULL,
	`surveyor_data` text,
	`recovery_notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE cargo_equip_cargos (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      total_packages INTEGER NOT NULL,
      total_gross_weight_kg REAL NOT NULL,
      total_volume_cbm REAL NOT NULL,
      chargeable_weight_kg REAL NOT NULL,
      has_dangerous_goods INTEGER NOT NULL DEFAULT 0,
      has_temperature_control INTEGER NOT NULL DEFAULT 0,
      packages_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE cargo_equip_cargos_v2 (
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

CREATE TABLE cargo_equip_equipment_allocations_v2 (
    allocation_id TEXT PRIMARY KEY NOT NULL,
    cargo_id TEXT NOT NULL REFERENCES cargo_equip_cargos_v2(cargo_id) ON DELETE RESTRICT,
    equipment_id TEXT NOT NULL REFERENCES cargo_equip_equipments_v2(equipment_id) ON DELETE RESTRICT,
    quantity INTEGER,
    weight_kg REAL,
    sequence INTEGER,
    valid_from TEXT NOT NULL,
    valid_until TEXT
  );

CREATE TABLE cargo_equip_equipment_assignments (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      consolidation_id TEXT,
      equipment_category TEXT NOT NULL,
      iso_type_code TEXT NOT NULL,
      equipment_number TEXT NOT NULL,
      seals_json TEXT NOT NULL DEFAULT '[]',
      tare_weight_kg REAL NOT NULL DEFAULT 3800,
      max_payload_kg REAL NOT NULL DEFAULT 28000,
      vgm_weight_kg REAL,
      pickup_pin TEXT,
      status TEXT NOT NULL DEFAULT 'ASSIGNED',
      cargo_allocations_json TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE cargo_equip_equipment_seals_v2 (
    seal_id TEXT PRIMARY KEY NOT NULL,
    equipment_id TEXT NOT NULL REFERENCES cargo_equip_equipments_v2(equipment_id) ON DELETE CASCADE,
    seal_number TEXT NOT NULL,
    seal_type TEXT NOT NULL,
    applied_at TEXT,
    removed_at TEXT,
    status TEXT NOT NULL DEFAULT 'INTACT',
    CONSTRAINT chk_cargo_equip_seals_status CHECK (status IN ('INTACT', 'BROKEN', 'REPLACED'))
  );

CREATE TABLE cargo_equip_equipments_v2 (
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

CREATE TABLE cargo_equip_goods_items_v2 (
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

CREATE TABLE cargo_equip_packages_v2 (
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

CREATE TABLE `cargo_iq_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`awb_number` text NOT NULL,
	`milestone_code` text NOT NULL,
	`milestone_name` text NOT NULL,
	`scheduled_time` integer NOT NULL,
	`actual_time` integer,
	`sla_deadline` integer NOT NULL,
	`sla_status` text DEFAULT 'ON_TIME' NOT NULL,
	`location_airport_code` text NOT NULL,
	`flight_number` text,
	`carrier_code` text,
	`event_remarks` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`awb_number`) REFERENCES `airway_bills`(`awb_number`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_airport_code`) REFERENCES `iata_airports`(`code`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `cargo_items` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`container_id` text,
	`label` text NOT NULL,
	`color` text NOT NULL,
	`width` real NOT NULL,
	`height` real NOT NULL,
	`depth` real NOT NULL,
	`weight` real NOT NULL,
	`x` real,
	`y` real,
	`z` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`container_id`) REFERENCES `shipment_containers`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `carrier_allocation_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`carrier_address_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`contract_reference` text NOT NULL,
	`trade_lane_name` text NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer NOT NULL,
	`monthly_teu_mqc` real NOT NULL,
	`committed_teu_tiers` text,
	`deadfreight_penalty_rate_per_teu` real DEFAULT 250,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`carrier_address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`branch_id`) REFERENCES `branch_offices`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `carrier_invoice_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`carrier_invoice_id` text NOT NULL,
	`shipment_id` text,
	`booking_number` text,
	`document_number` text NOT NULL,
	`charge_code` text NOT NULL,
	`description` text NOT NULL,
	`billed_quantity` real DEFAULT 1 NOT NULL,
	`billed_rate` real NOT NULL,
	`billed_amount` real NOT NULL,
	`expected_quantity` real DEFAULT 1 NOT NULL,
	`expected_rate` real NOT NULL,
	`expected_amount` real NOT NULL,
	`variance_amount` real DEFAULT 0 NOT NULL,
	`variance_percentage` real DEFAULT 0 NOT NULL,
	`is_within_tolerance` integer DEFAULT true NOT NULL,
	`dispute_reason` text,
	`dispute_status` text DEFAULT 'NONE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`carrier_invoice_id`) REFERENCES `carrier_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `carrier_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`carrier_id` text,
	`carrier_name` text NOT NULL,
	`carrier_vat` text,
	`mode` text NOT NULL,
	`invoice_date` text NOT NULL,
	`due_date` text NOT NULL,
	`billing_period` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`total_amount` real NOT NULL,
	`matched_amount` real DEFAULT 0 NOT NULL,
	`disputed_amount` real DEFAULT 0 NOT NULL,
	`reconciliation_status` text DEFAULT 'PENDING' NOT NULL,
	`cass_statement_number` text,
	`payment_terms` text DEFAULT '30_DAYS',
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`carrier_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `carta_porte_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`id_ccp` text NOT NULL,
	`transporte_tipo` text DEFAULT 'AUTOTRANSPORTE_FEDERAL' NOT NULL,
	`rfc_emisor` text NOT NULL,
	`rfc_receptor` text NOT NULL,
	`origen_json` text NOT NULL,
	`destino_json` text NOT NULL,
	`vehiculo_json` text NOT NULL,
	`operador_json` text NOT NULL,
	`mercancias_json` text NOT NULL,
	`xml_timbrado` text,
	`qr_code_data` text,
	`rvc_percentage` real,
	`immex_pedimento_tipo` text,
	`customs_dwell_hours_predicted` real,
	`status` text DEFAULT 'STAMPED' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `cbam_declaration_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`declaration_id` text NOT NULL,
	`shipment_id` text,
	`dua_number` text,
	`dua_box33_hs_code` text NOT NULL,
	`good_description` text NOT NULL,
	`origin_country` text NOT NULL,
	`installation_id` text,
	`net_weight_tonnes` real NOT NULL,
	`use_default_factors` integer DEFAULT false NOT NULL,
	`direct_emissions_tco2e` real NOT NULL,
	`indirect_emissions_tco2e` real NOT NULL,
	`precursor_emissions_tco2e` real DEFAULT 0,
	`total_line_emissions_tco2e` real NOT NULL,
	`foreign_carbon_price_per_tco2e` real DEFAULT 0,
	`effective_foreign_price_paid_eur` real DEFAULT 0,
	`line_gross_liability_eur` real NOT NULL,
	`line_net_liability_eur` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`declaration_id`) REFERENCES `cbam_declarations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`installation_id`) REFERENCES `cbam_installations`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `cbam_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`declaration_number` text NOT NULL,
	`reporting_period` text NOT NULL,
	`declarant_vat` text NOT NULL,
	`declarant_name` text NOT NULL,
	`importer_vat` text NOT NULL,
	`importer_name` text NOT NULL,
	`total_gross_mass_tonnes` real NOT NULL,
	`total_net_mass_tonnes` real NOT NULL,
	`total_direct_emissions_tco2e` real NOT NULL,
	`total_indirect_emissions_tco2e` real NOT NULL,
	`total_embedded_emissions_tco2e` real NOT NULL,
	`eu_ets_benchmark_price_eur` real DEFAULT 85.5 NOT NULL,
	`gross_carbon_liability_eur` real NOT NULL,
	`carbon_price_paid_foreign_eur` real DEFAULT 0 NOT NULL,
	`net_carbon_liability_eur` real NOT NULL,
	`status` text DEFAULT 'VALIDATED' NOT NULL,
	`responsible_declarant` text,
	`remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `cbam_goods_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`cn_code` text NOT NULL,
	`sector` text NOT NULL,
	`description` text NOT NULL,
	`is_complex_good` integer DEFAULT false NOT NULL,
	`default_direct_emission_factor` real NOT NULL,
	`default_indirect_emission_factor` real NOT NULL,
	`standard` text DEFAULT 'EU_REG_2023_956' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `cbam_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`installation_name` text NOT NULL,
	`operator_name` text NOT NULL,
	`country_code` text NOT NULL,
	`un_locode` text,
	`latitude` real,
	`longitude` real,
	`verified_direct_emission_factor` real,
	`verified_indirect_emission_factor` real,
	`grid_emission_factor_country` real,
	`verifier_name` text,
	`verification_certificate_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `charter_parties` (
	`id` text PRIMARY KEY NOT NULL,
	`fixture_reference` text NOT NULL,
	`charter_type` text DEFAULT 'VOYAGE_CHARTER' NOT NULL,
	`contract_form` text DEFAULT 'GENCON_2022' NOT NULL,
	`owner_name` text NOT NULL,
	`charterer_name` text NOT NULL,
	`broker_name` text,
	`vessel_name` text NOT NULL,
	`imo_number` text NOT NULL,
	`flag_state` text DEFAULT 'Malta' NOT NULL,
	`built_year` integer DEFAULT 2020,
	`summer_dwt_mt` real DEFAULT 45000,
	`gross_tonnage` real DEFAULT 28000,
	`cargo_description` text DEFAULT 'Trigo a Granel (Bulk Wheat)' NOT NULL,
	`cargo_quantity_mt` real DEFAULT 35000 NOT NULL,
	`quantity_margin_percentage` real DEFAULT 5 NOT NULL,
	`loading_port` text DEFAULT 'Puerto de Santander (ESSDR)' NOT NULL,
	`discharging_port` text DEFAULT 'Puerto de Alexandria (EGALY)' NOT NULL,
	`laycan_start` text NOT NULL,
	`laycan_end` text NOT NULL,
	`freight_rate_usd_per_mt` real DEFAULT 32.5,
	`daily_hire_rate_usd` real DEFAULT 18500,
	`demurrage_rate_usd_per_day` real DEFAULT 14000 NOT NULL,
	`despatch_rate_usd_per_day` real DEFAULT 7000 NOT NULL,
	`despatch_calculation_basis` text DEFAULT 'ATS_ALL_TIME_SAVED' NOT NULL,
	`laytime_terms` text DEFAULT 'SHEX_EIU' NOT NULL,
	`laytime_allowance_type` text DEFAULT 'LOADING_DISCHARGING_RATES' NOT NULL,
	`total_allowed_laytime_hours` real,
	`load_rate_mt_per_day` real DEFAULT 5000,
	`discharge_rate_mt_per_day` real DEFAULT 3500,
	`turn_time_hours` real DEFAULT 12 NOT NULL,
	`nor_office_hours_only` integer DEFAULT true NOT NULL,
	`nor_clauses_json` text DEFAULT '["WIPON","WIBON","WIFPON","WCCON"]' NOT NULL,
	`laytime_reversibility` text DEFAULT 'NON_REVERSIBLE' NOT NULL,
	`status` text DEFAULT 'FIXED_ACTIVE' NOT NULL,
	`remarks` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE `cold_chain_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`min_temp_celsius` real NOT NULL,
	`max_temp_celsius` real NOT NULL,
	`target_temp_celsius` real NOT NULL,
	`humidity_min_pct` real,
	`humidity_max_pct` real,
	`standard` text DEFAULT 'EU_GDP_2013_C_343' NOT NULL,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `cold_chain_shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`tracking_number` text NOT NULL,
	`shipment_id` text,
	`batch_number` text NOT NULL,
	`productDescription` text NOT NULL,
	`pharma_classification` text NOT NULL,
	`profile_id` text NOT NULL,
	`packaging_type` text NOT NULL,
	`setpoint_temp_celsius` real NOT NULL,
	`initial_dry_ice_weight_kg` real,
	`current_dry_ice_weight_kg` real,
	`dry_ice_sublimation_rate_kg_hr` real,
	`logger_serial_number` text NOT NULL,
	`logger_model` text DEFAULT 'TempTale GEO Ultra',
	`mkt_calculated_celsius` real,
	`excursion_duration_minutes` integer DEFAULT 0,
	`excursion_status` text DEFAULT 'COMPLIANT' NOT NULL,
	`gdp_release_verdict` text DEFAULT 'IN_TRANSIT' NOT NULL,
	`responsible_person_name` text,
	`quality_audit_notes` text,
	`origin_location` text NOT NULL,
	`destination_location` text NOT NULL,
	`departure_time` text NOT NULL,
	`estimated_arrival_time` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `cold_chain_profiles`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `commercial_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_number` text NOT NULL,
	`title` text NOT NULL,
	`seller_company_id` text,
	`buyer_company_id` text,
	`seller_data` text,
	`buyer_data` text,
	`forwarder_data` text,
	`incoterm_code` text NOT NULL,
	`named_place` text NOT NULL,
	`transport_mode` text DEFAULT 'MULTIMODAL' NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`goods_value` real NOT NULL,
	`freight_estimated_cost` real DEFAULT 0 NOT NULL,
	`insurance_estimated_cost` real DEFAULT 0 NOT NULL,
	`customs_estimated_duty` real DEFAULT 0 NOT NULL,
	`effective_date` integer NOT NULL,
	`expiry_date` integer,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`governing_law` text DEFAULT 'ICC / Spanish Commercial Code' NOT NULL,
	`dispute_jurisdiction` text DEFAULT 'Arbitration Tribunal Madrid' NOT NULL,
	`milestones_data` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tax_id` text,
	`credit_limit` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
, group_code TEXT, sector TEXT, headquarters_country TEXT);

CREATE TABLE consolidation_consolidations (
      id TEXT PRIMARY KEY NOT NULL,
      consolidation_reference TEXT NOT NULL UNIQUE,
      consolidation_type TEXT NOT NULL,
      mode TEXT NOT NULL,
      origin_locode TEXT NOT NULL,
      destination_locode TEXT NOT NULL,
      carrier_name TEXT NOT NULL,
      vessel_or_flight TEXT,
      voyage_number TEXT,
      master_document_number TEXT NOT NULL,
      max_capacity_weight_kg REAL NOT NULL DEFAULT 26000,
      max_capacity_volume_cbm REAL NOT NULL DEFAULT 68,
      allocated_weight_kg REAL NOT NULL DEFAULT 0,
      allocated_volume_cbm REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'OPEN_FOR_STUFFING',
      members_json TEXT NOT NULL DEFAULT '[]',
      equipment_ids_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE container_iso_types (
    iso_code TEXT PRIMARY KEY,
    industry_code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    nominal_length_ft REAL NOT NULL,
    nominal_height_ft REAL NOT NULL,
    nominal_width_ft REAL DEFAULT 8.0,
    external_length_mm INTEGER NOT NULL,
    external_width_mm INTEGER NOT NULL,
    external_height_mm INTEGER NOT NULL,
    internal_length_mm INTEGER NOT NULL,
    internal_width_mm INTEGER NOT NULL,
    internal_height_mm INTEGER NOT NULL,
    door_opening_width_mm INTEGER,
    door_opening_height_mm INTEGER,
    tare_weight_kg REAL NOT NULL,
    max_payload_kg REAL NOT NULL,
    max_gross_weight_kg REAL NOT NULL,
    cubic_capacity_cbm REAL NOT NULL,
    teu_factor REAL NOT NULL,
    is_reefer INTEGER DEFAULT 0,
    has_controlled_atmosphere INTEGER DEFAULT 0,
    is_ventilated INTEGER DEFAULT 0,
    description TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );

CREATE TABLE `container_stowage_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`container_id` text NOT NULL,
	`shipment_id` text NOT NULL,
	`total_cargo_weight_kg` real NOT NULL,
	`max_payload_kg` real NOT NULL,
	`tare_weight_kg` real NOT NULL,
	`volume_utilization_percent` real NOT NULL,
	`weight_utilization_percent` real NOT NULL,
	`center_of_gravity_json` text,
	`axle_load_distribution_json` text,
	`stability_certified` integer DEFAULT false NOT NULL,
	`certified_by` text,
	`certified_at` integer,
	`stowage_sequence_json` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`container_id`) REFERENCES `shipment_containers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`valid_from` integer,
	`valid_to` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE control_tower_incidents (
      id TEXT PRIMARY KEY,
      incident_number TEXT NOT NULL UNIQUE,
      shipment_id TEXT,
      asset_id TEXT,
      incident_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      location_name TEXT,
      location_lat REAL,
      location_lng REAL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      auto_resolved INTEGER NOT NULL DEFAULT 0,
      impact_amount_eur REAL NOT NULL DEFAULT 0,
      delay_hours REAL NOT NULL DEFAULT 0,
      sla_deadline TEXT,
      assigned_to TEXT,
      resolution_action TEXT,
      resolved_at TEXT,
      resolved_by TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

CREATE TABLE "costs" (
      id text PRIMARY KEY,
      shipment_id text NOT NULL REFERENCES shipments(id),
      vendor_id text REFERENCES addresses(id),
      amount real NOT NULL,
      currency text NOT NULL,
      description text,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text,
      CONSTRAINT costs_amount_check CHECK (amount >= 0)
    );

CREATE TABLE customs_cases (
      id TEXT PRIMARY KEY NOT NULL,
      case_number TEXT NOT NULL UNIQUE,
      shipment_id TEXT NOT NULL,
      procedure_type TEXT NOT NULL,
      jurisdiction_country TEXT NOT NULL,
      customs_office_locode TEXT NOT NULL,
      declarant_eori_or_tax_id TEXT NOT NULL,
      exporter_party_id TEXT NOT NULL,
      importer_of_record_party_id TEXT NOT NULL,
      customs_broker_name TEXT NOT NULL,
      mrn_number TEXT,
      channel_assigned TEXT,
      state TEXT NOT NULL DEFAULT 'CREATED',
      tariff_items_json TEXT NOT NULL DEFAULT '[]',
      holds_json TEXT NOT NULL DEFAULT '[]',
      total_calculated_duty_eur REAL NOT NULL DEFAULT 0,
      total_calculated_vat_eur REAL NOT NULL DEFAULT 0,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE "customs_declarations" (
      id text PRIMARY KEY,
      shipment_id text NOT NULL REFERENCES shipments(id),
      broker_id text REFERENCES addresses(id),
      hs_code_id text REFERENCES hs_codes(id),
      bl_number text,
      type text DEFAULT 'Import',
      duties_amount real,
      taxes_amount real,
      status text NOT NULL,
      ai_risk_score integer,
      ai_risk_flag text,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text,
      dua_number text,
      customs_value real,
      total_payable real,
      risk_score integer,
      risk_flags text,
      eori_number text,
      origin_country text,
      destination_country text,
      dua_data text
    );

CREATE TABLE `customs_discharge_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`discharge_declaration_number` text NOT NULL,
	`lot_id` text NOT NULL,
	`discharge_regime_code` text NOT NULL,
	`discharge_dua_mrn` text,
	`discharged_packages_count` integer NOT NULL,
	`discharged_gross_mass_kg` real NOT NULL,
	`discharged_customs_value_eur` real NOT NULL,
	`settled_duty_amount_eur` real DEFAULT 0 NOT NULL,
	`settled_vat_amount_eur` real DEFAULT 0 NOT NULL,
	`total_settled_taxes_eur` real DEFAULT 0 NOT NULL,
	`released_guarantee_credit_eur` real DEFAULT 0 NOT NULL,
	`destination_consignee_name` text NOT NULL,
	`destination_country_code` text NOT NULL,
	`discharge_date` text NOT NULL,
	`status` text DEFAULT 'AUTHORIZED_RELEASE' NOT NULL,
	`customs_clearance_officer` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `customs_inventory_lots`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `customs_event_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`event_type` text NOT NULL,
	`description` text NOT NULL,
	`recorded_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE `customs_facilities` (
	`id` text PRIMARY KEY NOT NULL,
	`facility_code` text NOT NULL,
	`name` text NOT NULL,
	`facility_type` text NOT NULL,
	`customs_authority_authorization_ref` text NOT NULL,
	`managing_operator_name` text NOT NULL,
	`location_address` text NOT NULL,
	`city` text NOT NULL,
	`country_code` text DEFAULT 'ES' NOT NULL,
	`total_pallet_capacity` integer NOT NULL,
	`occupied_pallets` integer DEFAULT 0 NOT NULL,
	`total_volume_m3` real NOT NULL,
	`max_stay_days_limit` integer,
	`is_reefer_certified` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
, address_id TEXT REFERENCES addresses(id));

CREATE TABLE `customs_guarantees` (
	`id` text PRIMARY KEY NOT NULL,
	`guarantee_reference_number` text NOT NULL,
	`customs_office_code` text NOT NULL,
	`guarantor_financial_institution` text NOT NULL,
	`total_guarantee_amount_eur` real NOT NULL,
	`committed_suspended_debt_eur` real DEFAULT 0 NOT NULL,
	`available_credit_eur` real NOT NULL,
	`valid_from_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`remarks` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE customs_ics2_declarations (
      id TEXT PRIMARY KEY,
      mrn TEXT NOT NULL UNIQUE,
      shipment_id TEXT,
      declaration_type TEXT NOT NULL DEFAULT 'ENS',
      filing_status TEXT NOT NULL DEFAULT 'SUBMITTED',
      risk_circuit TEXT NOT NULL DEFAULT 'GREEN',
      declarant_eori TEXT NOT NULL,
      customs_office_code TEXT NOT NULL,
      security_assessment_score INTEGER NOT NULL DEFAULT 98,
      submitted_at TEXT NOT NULL,
      cleared_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

CREATE TABLE `customs_inventory_lots` (
	`id` text PRIMARY KEY NOT NULL,
	`lot_number` text NOT NULL,
	`facility_id` text NOT NULL,
	`guarantee_id` text,
	`inclusion_dvd_number` text NOT NULL,
	`inclusion_dua_mrn` text,
	`customs_regime_code` text NOT NULL,
	`owner_company_name` text NOT NULL,
	`owner_tax_id_eori` text NOT NULL,
	`taric_commodity_code` text NOT NULL,
	`goods_description` text NOT NULL,
	`origin_country_code` text NOT NULL,
	`initial_package_count` integer NOT NULL,
	`current_package_count` integer NOT NULL,
	`initial_gross_mass_kg` real NOT NULL,
	`current_gross_mass_kg` real NOT NULL,
	`initial_net_mass_kg` real NOT NULL,
	`current_net_mass_kg` real NOT NULL,
	`customs_value_eur` real NOT NULL,
	`duty_tariff_rate_percent` real DEFAULT 0 NOT NULL,
	`import_vat_rate_percent` real DEFAULT 21 NOT NULL,
	`suspended_duty_amount_eur` real DEFAULT 0 NOT NULL,
	`suspended_vat_amount_eur` real DEFAULT 0 NOT NULL,
	`total_suspended_debt_eur` real DEFAULT 0 NOT NULL,
	`inclusion_date` text NOT NULL,
	`max_stay_deadline_date` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`warehouse_location_rack` text,
	`responsible_customs_agent` text NOT NULL,
	`remarks` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`facility_id`) REFERENCES `customs_facilities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`guarantee_id`) REFERENCES `customs_guarantees`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `customs_stock_ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_sequential_number` integer NOT NULL,
	`lot_id` text NOT NULL,
	`facility_id` text NOT NULL,
	`movement_type` text NOT NULL,
	`document_reference` text NOT NULL,
	`packages_delta` integer NOT NULL,
	`packages_balance_after` integer NOT NULL,
	`gross_mass_delta_kg` real NOT NULL,
	`gross_mass_balance_after_kg` real NOT NULL,
	`released_suspended_debt_eur` real DEFAULT 0 NOT NULL,
	`movement_timestamp` text NOT NULL,
	`authorized_officer_or_agent` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lot_id`) REFERENCES `customs_inventory_lots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`facility_id`) REFERENCES `customs_facilities`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE data_quality_assessments (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      active_stage TEXT NOT NULL DEFAULT 'PRE_DEPARTURE_EXPORT',
      score INTEGER NOT NULL DEFAULT 100,
      gate_status TEXT NOT NULL DEFAULT 'PASSED',
      blocking_findings_count INTEGER NOT NULL DEFAULT 0,
      warning_findings_count INTEGER NOT NULL DEFAULT 0,
      findings_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      evaluated_at INTEGER NOT NULL
    );

CREATE TABLE data_sources (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'OPEN_DATA',
    website_url TEXT,
    terms_url TEXT,
    description TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );

CREATE TABLE dcsa_event_subscriptions (
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

CREATE TABLE dcsa_events_log (
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

CREATE TABLE `demurrage_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`container_number` text NOT NULL,
	`alert_status` text DEFAULT 'active' NOT NULL,
	`last_notified` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `demurrage_disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`disputed_amount_usd` real NOT NULL,
	`revised_payable_usd` real NOT NULL,
	`fmc_rule_clause` text NOT NULL,
	`status` text DEFAULT 'SUBMITTED' NOT NULL,
	`formal_letter_payload` text,
	`submitted_at` integer,
	`resolved_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `demurrage_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `demurrage_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`container_number` text NOT NULL,
	`carrier_scac` text NOT NULL,
	`carrier_name` text NOT NULL,
	`bill_of_lading` text NOT NULL,
	`pod` text NOT NULL,
	`terminal_name` text NOT NULL,
	`vessel_discharge_date` text,
	`gate_in_date` text,
	`gate_out_date` text,
	`available_date` text,
	`free_time_start_date` text,
	`free_time_end_date` text,
	`free_days_granted` integer DEFAULT 4 NOT NULL,
	`daily_rate_usd` real DEFAULT 150 NOT NULL,
	`total_invoiced_usd` real NOT NULL,
	`status` text DEFAULT 'ISSUED' NOT NULL,
	`fmc_compliant` integer DEFAULT true NOT NULL,
	`tariff_tiers_json` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `demurrage_suspensions` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days_suspended` integer NOT NULL,
	`reason` text NOT NULL,
	`justification_text` text,
	`evidence_document_id` text,
	`approved` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `demurrage_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`cost_center` text NOT NULL,
	`parent_department_id` text,
	`manager_user_id` text,
	`email_alias` text,
	`phone` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch_offices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `dg_consignment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`un_number` text NOT NULL,
	`proper_shipping_name` text NOT NULL,
	`technical_chemical_name` text,
	`primary_hazard_class` text NOT NULL,
	`subsidiary_hazard_classes` text,
	`packing_group` text DEFAULT 'PG_II' NOT NULL,
	`flash_point_celsius` real,
	`is_marine_pollutant` integer DEFAULT false NOT NULL,
	`package_count` integer DEFAULT 1 NOT NULL,
	`package_type_description` text NOT NULL,
	`package_un_code` text DEFAULT '4G' NOT NULL,
	`net_quantity_per_package` real NOT NULL,
	`unit_of_measure` text DEFAULT 'LITERS' NOT NULL,
	`total_net_quantity` real NOT NULL,
	`total_gross_mass_kg` real NOT NULL,
	`net_explosive_mass_kg` real DEFAULT 0 NOT NULL,
	`is_limited_quantity_lq` integer DEFAULT false NOT NULL,
	`excepted_quantity_code` text DEFAULT 'E0' NOT NULL,
	`adr_transport_category` integer DEFAULT 2 NOT NULL,
	`adr_points_calculated` real DEFAULT 0 NOT NULL,
	`adr_tunnel_restriction_code` text DEFAULT 'D/E' NOT NULL,
	`kemler_hazard_id_number` text DEFAULT '33' NOT NULL,
	`ems_fire_code` text DEFAULT 'F-E' NOT NULL,
	`ems_spillage_code` text DEFAULT 'S-E' NOT NULL,
	`iata_packing_instruction` text,
	`lithium_battery_section` text DEFAULT 'NOT_APPLICABLE' NOT NULL,
	`lithium_state_of_charge_percentage` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `dg_emergency_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`card_reference` text NOT NULL,
	`un_numbers_summary` text NOT NULL,
	`primary_classes_summary` text NOT NULL,
	`emergency_phone_24h` text NOT NULL,
	`fire_intervention_protocol` text NOT NULL,
	`spillage_containment_protocol` text NOT NULL,
	`first_aid_protocol` text NOT NULL,
	`required_ppe_equipment` text NOT NULL,
	`special_environmental_hazards` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `dg_packing_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`certificate_reference` text NOT NULL,
	`container_or_vehicle_number` text NOT NULL,
	`seal_number_iso_17712` text NOT NULL,
	`packing_facility_name` text NOT NULL,
	`packing_facility_address` text NOT NULL,
	`declarant_name` text NOT NULL,
	`declarant_company` text NOT NULL,
	`declarant_position` text NOT NULL,
	`is_clean_dry_suitable` integer DEFAULT true NOT NULL,
	`is_segregation_compliant` integer DEFAULT true NOT NULL,
	`is_packages_sound_undamaged` integer DEFAULT true NOT NULL,
	`is_properly_secured_braced` integer DEFAULT true NOT NULL,
	`is_placarded_and_marked` integer DEFAULT true NOT NULL,
	`sign_date` text NOT NULL,
	`status` text DEFAULT 'CERTIFIED_COMPLIANT' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `dg_segregation_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`container_or_vehicle_number` text NOT NULL,
	`audit_date` text NOT NULL,
	`evaluated_item_ids_json` text NOT NULL,
	`segregation_compliance_status` text DEFAULT 'COMPLIANT_SEGREGATED' NOT NULL,
	`total_conflicts_detected` integer DEFAULT 0 NOT NULL,
	`conflict_details_json` text,
	`auditor_name` text NOT NULL,
	`audit_certificate_statement` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `dg_shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_reference` text NOT NULL,
	`transport_mode` text NOT NULL,
	`carrier_name` text NOT NULL,
	`vessel_or_flight_or_vehicle_plate` text NOT NULL,
	`voyage_or_flight_number` text,
	`origin_port_or_location` text NOT NULL,
	`destination_port_or_location` text NOT NULL,
	`shipper_name` text NOT NULL,
	`shipper_address` text NOT NULL,
	`consignee_name` text NOT NULL,
	`consignee_address` text NOT NULL,
	`emergency_contact_name` text NOT NULL,
	`emergency_contact_phone` text NOT NULL,
	`aircraft_type` text DEFAULT 'NOT_APPLICABLE' NOT NULL,
	`total_packages` integer DEFAULT 1 NOT NULL,
	`total_net_quantity_kg` real DEFAULT 0 NOT NULL,
	`total_gross_mass_kg` real DEFAULT 0 NOT NULL,
	`has_radioactive_materials` integer DEFAULT false NOT NULL,
	`has_marine_pollutants` integer DEFAULT false NOT NULL,
	`has_lithium_batteries` integer DEFAULT false NOT NULL,
	`segregation_status` text DEFAULT 'PENDING_AUDIT' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`declaration_remarks` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `dgr_registry` (
	`un_number` text PRIMARY KEY NOT NULL,
	`proper_shipping_name` text NOT NULL,
	`dgr_class` text NOT NULL,
	`sub_risks` text,
	`packing_group` text,
	`passenger_limit_kg` text DEFAULT 'FORBIDDEN' NOT NULL,
	`cargo_aircraft_limit_kg` text DEFAULT '35 kg' NOT NULL,
	`packing_instruction_pax` text,
	`packing_instruction_cao` text,
	`default_shc` text DEFAULT 'DGR' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE document_mgmt_documents (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      owner_entity_type TEXT NOT NULL DEFAULT 'SHIPMENT',
      owner_entity_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_reference TEXT NOT NULL,
      title TEXT NOT NULL,
      requires_approval INTEGER NOT NULL DEFAULT 1,
      current_version_no INTEGER NOT NULL DEFAULT 1,
      lifecycle_state TEXT NOT NULL DEFAULT 'DRAFT',
      versions_json TEXT NOT NULL DEFAULT '[]',
      approvals_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`uploaded_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text, document_reference TEXT, sha256_hash TEXT, status TEXT NOT NULL DEFAULT 'EMITTED', signed_by TEXT, signer_title TEXT, signer_certificate TEXT, signed_at INTEGER, payload_data TEXT, file_size INTEGER,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `drayage_transport_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`status` text DEFAULT 'DISPATCHED' NOT NULL,
	`shipment_id` text,
	`booking_reference` text,
	`container_number` text,
	`container_type` text DEFAULT '40HC' NOT NULL,
	`cargo_weight_kg` real DEFAULT 18500 NOT NULL,
	`is_dangerous_goods` integer DEFAULT false NOT NULL,
	`requires_genset` integer DEFAULT false NOT NULL,
	`haulier_address_id` text NOT NULL,
	`origin_address_id` text NOT NULL,
	`destination_address_id` text NOT NULL,
	`distance_km` real NOT NULL,
	`base_rate` real NOT NULL,
	`fuel_surcharge` real NOT NULL,
	`tolls_cost` real NOT NULL,
	`extra_surcharges` real DEFAULT 0 NOT NULL,
	`subtotal_cost` real NOT NULL,
	`profit_margin` real NOT NULL,
	`total_gross_cost` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`co2_wtw_kg` real NOT NULL,
	`co2_ttw_kg` real NOT NULL,
	`co2_wte_kg` real NOT NULL,
	`emissions_intensity_factor` real NOT NULL,
	`driver_pickup_pin` text NOT NULL,
	`qr_digest` text NOT NULL,
	`appointment_window_start` text NOT NULL,
	`appointment_window_end` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`haulier_address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`origin_address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `drivers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`license_type` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE edi_interchanges (
      id TEXT PRIMARY KEY,
      partner_id TEXT,
      control_number TEXT NOT NULL,
      direction TEXT NOT NULL,
      standard TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT NOT NULL,
      raw_payload TEXT NOT NULL,
      ack_payload TEXT,
      ack_status TEXT,
      error_message TEXT,
      processed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      tags TEXT
    );

CREATE TABLE edi_messages (
      id TEXT PRIMARY KEY,
      interchange_id TEXT NOT NULL,
      message_type TEXT NOT NULL,
      control_number TEXT NOT NULL,
      shipment_id TEXT,
      booking_reference TEXT,
      status TEXT NOT NULL,
      parsed_content TEXT,
      extracted_milestone TEXT,
      exception_triggered INTEGER NOT NULL DEFAULT 0,
      exception_details TEXT,
      processed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      tags TEXT
    );

CREATE TABLE edi_partners (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      name TEXT NOT NULL,
      standard TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_qualifier TEXT NOT NULL DEFAULT 'ZZ',
      receiver_id TEXT NOT NULL,
      receiver_qualifier TEXT NOT NULL DEFAULT 'ZZ',
      transport_protocol TEXT NOT NULL DEFAULT 'REST_WEBHOOK',
      endpoint_url TEXT,
      test_mode INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      tags TEXT
    );

CREATE TABLE `efirma_audit_stamps` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text,
	`document_id` text,
	`carta_porte_id` text,
	`document_type` text NOT NULL,
	`certificate_serial` text NOT NULL,
	`rfc_titular` text NOT NULL,
	`razon_social` text NOT NULL,
	`cadena_original` text NOT NULL,
	`cadena_original_sha256` text NOT NULL,
	`sello_digital_base64` text NOT NULL,
	`rfc3161_timestamp_token` text NOT NULL,
	`tamper_seal_hash` text NOT NULL,
	`status` text DEFAULT 'VALIDATED_AND_SEALED' NOT NULL,
	`verified_at` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`carta_porte_id`) REFERENCES `carta_porte_declarations`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE entity_source_links (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    source_record_id TEXT NOT NULL REFERENCES source_records(id),
    match_confidence REAL NOT NULL DEFAULT 1.0,
    match_method TEXT NOT NULL DEFAULT 'EXACT_CODE',
    verified_at INTEGER NOT NULL,
    verified_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );

CREATE TABLE `equipments` (
	`id` text PRIMARY KEY NOT NULL,
	`equipment_number` text NOT NULL,
	`type` text NOT NULL,
	`status` text NOT NULL,
	`current_location_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`current_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `erp_purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`po_number` text NOT NULL,
	`erp_system` text NOT NULL,
	`shipment_id` text,
	`vendor_name` text NOT NULL,
	`company_code` text NOT NULL,
	`purchasing_group` text NOT NULL,
	`total_amount` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`status` text DEFAULT 'RELEASED' NOT NULL,
	`line_items_json` text NOT NULL,
	`grn_number` text,
	`freight_accrual_doc_number` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE `erp_sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`po_id` text,
	`erp_system` text NOT NULL,
	`operation` text NOT NULL,
	`status` text NOT NULL,
	`request_payload_json` text,
	`response_payload_json` text,
	`latency_ms` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`po_id`) REFERENCES `erp_purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE exception_mgmt_exceptions (
      id TEXT PRIMARY KEY NOT NULL,
      dedup_key TEXT NOT NULL UNIQUE,
      shipment_id TEXT NOT NULL,
      reference_number TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      milestone_code TEXT NOT NULL,
      location_locode TEXT NOT NULL,
      occurrence_count INTEGER NOT NULL DEFAULT 1,
      incident_id TEXT,
      incident_number TEXT,
      linked_work_item_id TEXT,
      evidence_log_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      first_detected_at TEXT NOT NULL,
      last_occurred_at TEXT NOT NULL,
      resolved_at TEXT
    );

CREATE TABLE exception_mgmt_incidents (
      id TEXT PRIMARY KEY NOT NULL,
      incident_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      affected_locode TEXT NOT NULL,
      affected_vessel_or_flight TEXT,
      impacted_shipment_ids_json TEXT NOT NULL DEFAULT '[]',
      summary TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE `exchange_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency` text NOT NULL,
	`target_currency` text NOT NULL,
	`rate` real NOT NULL,
	`date` integer NOT NULL
);

CREATE TABLE `forwarding_agent_networks` (
	`id` text PRIMARY KEY NOT NULL,
	`network_code` text NOT NULL,
	`name` text NOT NULL,
	`secretarial_body` text,
	`financial_protection_coverage_usd` real DEFAULT 100000,
	`arbitration_jurisdiction` text DEFAULT 'Singapore / Geneva',
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE freight_audit_disputes (
      id TEXT PRIMARY KEY,
      dispute_code TEXT NOT NULL UNIQUE,
      invoice_line_id TEXT,
      carrier_invoice_id TEXT,
      shipment_id TEXT,
      claimed_amount REAL NOT NULL,
      expected_amount REAL NOT NULL,
      disputed_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      carrier_response_date TEXT,
      resolution_note TEXT,
      debit_note_number TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

CREATE TABLE `fuel_eu_compliance_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`vessel_id` text NOT NULL,
	`reporting_year` integer NOT NULL,
	`target_ghg_intensity_gco2eq_per_mj` real NOT NULL,
	`actual_attained_ghg_intensity_gco2eq_per_mj` real NOT NULL,
	`total_annual_energy_mj` real NOT NULL,
	`compliance_balance_gco2eq` real NOT NULL,
	`compliance_status` text DEFAULT 'SURPLUS' NOT NULL,
	`calculated_fuel_eu_penalty_eur` real DEFAULT 0 NOT NULL,
	`banked_surplus_transferred_next_year_gco2eq` real DEFAULT 0 NOT NULL,
	`borrowed_deficit_from_next_year_gco2eq` real DEFAULT 0 NOT NULL,
	`pool_id` text,
	`verifier_accreditation_number` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vessel_id`) REFERENCES `marine_vessels`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `fuel_eu_penalties_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_reference` text NOT NULL UNIQUE,
	`vessel_id` text NOT NULL,
	`reporting_year` integer NOT NULL,
	`compliance_deficit_gco2eq` real NOT NULL,
	`vlsfo_equivalent_energy_deficit_mj` real NOT NULL,
	`vlsfo_equivalent_deficit_tonnes` real NOT NULL,
	`statutory_penalty_rate_eur_per_tonne` real DEFAULT 2400 NOT NULL,
	`penalty_multiplier_consecutive_years` real DEFAULT 1 NOT NULL,
	`total_penalty_payable_eur` real NOT NULL,
	`pool_offset_id` text,
	`offset_amount_eur` real DEFAULT 0 NOT NULL,
	`net_payable_eur` real NOT NULL,
	`payment_status` text DEFAULT 'CALCULATED_PENDING' NOT NULL,
	`eu_fund_treasury_account` text DEFAULT 'EU-INNOVATION-FUND-FUELEU-ESCROW' NOT NULL,
	`settled_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vessel_id`) REFERENCES `marine_vessels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pool_offset_id`) REFERENCES `fuel_eu_pools`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE `fuel_eu_pools` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_code` text NOT NULL,
	`pool_name` text NOT NULL,
	`reporting_year` integer NOT NULL,
	`managing_operator_name` text NOT NULL,
	`total_enrolled_vessels_count` integer NOT NULL,
	`consolidated_net_compliance_balance_gco2eq` real NOT NULL,
	`is_pool_compliant_zero_penalty` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'REGISTERED_EMSA' NOT NULL,
	`remarks` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `fulfillment_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`status` text DEFAULT 'PICK' NOT NULL,
	`assigned_to` text,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`from_currency` text NOT NULL,
	`to_currency` text NOT NULL,
	`spot_rate` real NOT NULL,
	`effective_date` text NOT NULL,
	`source` text DEFAULT 'ECB' NOT NULL,
	`forward_30_rate` real,
	`forward_60_rate` real,
	`forward_90_rate` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `ga_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`ga_case_id` text NOT NULL,
	`adjustment_reference` text NOT NULL,
	`adjustment_date` text NOT NULL,
	`total_allowances_usd` real NOT NULL,
	`total_ship_allowances_usd` real DEFAULT 0 NOT NULL,
	`total_cargo_allowances_usd` real DEFAULT 0 NOT NULL,
	`total_refuge_expenses_usd` real DEFAULT 0 NOT NULL,
	`total_salvage_award_usd` real DEFAULT 0 NOT NULL,
	`total_commission_usd` real DEFAULT 0 NOT NULL,
	`cmi_interest_rate_percentage` real DEFAULT 6 NOT NULL,
	`total_cmi_interest_usd` real DEFAULT 0 NOT NULL,
	`total_contributory_value_usd` real NOT NULL,
	`vessel_contributory_value_usd` real DEFAULT 0 NOT NULL,
	`freight_contributory_value_usd` real DEFAULT 0 NOT NULL,
	`cargo_contributory_value_usd` real DEFAULT 0 NOT NULL,
	`containers_contributory_value_usd` real DEFAULT 0 NOT NULL,
	`final_rate_of_contribution_percentage` real NOT NULL,
	`total_debtor_contributions_usd` real DEFAULT 0 NOT NULL,
	`total_creditor_recoveries_usd` real DEFAULT 0 NOT NULL,
	`adjuster_certification_statement` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`ga_case_id`) REFERENCES `ga_cases`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `ga_allowances` (
	`id` text PRIMARY KEY NOT NULL,
	`ga_case_id` text NOT NULL,
	`allowance_category` text NOT NULL,
	`yar_rule_reference` text NOT NULL,
	`description` text NOT NULL,
	`credited_party_type` text NOT NULL,
	`credited_party_name` text NOT NULL,
	`original_currency_amount` real NOT NULL,
	`original_currency` text DEFAULT 'USD' NOT NULL,
	`exchange_rate_to_usd` real DEFAULT 1 NOT NULL,
	`amount_usd` real NOT NULL,
	`is_admissible` integer DEFAULT true NOT NULL,
	`remarks` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ga_case_id`) REFERENCES `ga_cases`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `ga_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`case_reference` text NOT NULL,
	`vessel_name` text NOT NULL,
	`imo_number` text NOT NULL,
	`flag_state` text NOT NULL,
	`built_year` integer NOT NULL,
	`gross_tonnage` integer NOT NULL,
	`summer_dwt_mt` real NOT NULL,
	`shipowner_name` text NOT NULL,
	`disponent_owner_or_charterer` text,
	`master_name` text NOT NULL,
	`casualty_type` text NOT NULL,
	`casualty_date` text NOT NULL,
	`casualty_location` text NOT NULL,
	`voyage_origin` text NOT NULL,
	`voyage_destination` text NOT NULL,
	`port_of_refuge` text NOT NULL,
	`date_arrival_port_of_refuge` text,
	`date_departure_port_of_refuge` text,
	`governing_rules` text DEFAULT 'YAR_2016' NOT NULL,
	`salvage_contract_type` text DEFAULT 'LOF_2024_SCOPIC' NOT NULL,
	`salvor_name` text,
	`average_adjuster_firm` text NOT NULL,
	`lead_adjuster_name` text NOT NULL,
	`estimated_loss_usd` real DEFAULT 0 NOT NULL,
	`estimated_contribution_percentage` real DEFAULT 7.5 NOT NULL,
	`declaration_narrative` text NOT NULL,
	`currency_code` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'DECLARED_ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `ga_contributory_interests` (
	`id` text PRIMARY KEY NOT NULL,
	`ga_case_id` text NOT NULL,
	`interest_category` text NOT NULL,
	`bl_reference` text,
	`container_number` text,
	`owner_or_receiver_name` text NOT NULL,
	`cargo_description` text,
	`weight_or_teu` real,
	`sound_value_destination_usd` real NOT NULL,
	`particular_damage_deduction_usd` real DEFAULT 0 NOT NULL,
	`made_good_allowance_usd` real DEFAULT 0 NOT NULL,
	`contributory_value_usd` real NOT NULL,
	`calculated_contribution_usd` real DEFAULT 0 NOT NULL,
	`net_financial_balance_usd` real DEFAULT 0 NOT NULL,
	`balance_type` text DEFAULT 'PAYABLE_DEBTOR' NOT NULL,
	`has_security_provided` integer DEFAULT false NOT NULL,
	`cargo_release_authorized` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ga_case_id`) REFERENCES `ga_cases`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `ga_securities` (
	`id` text PRIMARY KEY NOT NULL,
	`ga_case_id` text NOT NULL,
	`contributory_interest_id` text NOT NULL,
	`security_reference` text NOT NULL,
	`security_type` text DEFAULT 'AVERAGE_BOND_AND_GUARANTEE' NOT NULL,
	`cargo_consignee_name` text NOT NULL,
	`cargo_consignee_vat` text,
	`insurer_name` text,
	`insurer_policy_number` text,
	`insurer_contact_email` text,
	`security_amount_usd` real NOT NULL,
	`deposit_bank_name` text,
	`deposit_bank_account_number` text,
	`cash_deposit_receipt_number` text,
	`average_bond_signed` integer DEFAULT false NOT NULL,
	`average_bond_sign_date` text,
	`average_guarantee_signed` integer DEFAULT false NOT NULL,
	`average_guarantee_sign_date` text,
	`cargo_release_authorized` integer DEFAULT false NOT NULL,
	`release_authorized_by` text,
	`release_timestamp` text,
	`status` text DEFAULT 'SECURITY_PENDING' NOT NULL,
	`remarks` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ga_case_id`) REFERENCES `ga_cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contributory_interest_id`) REFERENCES `ga_contributory_interests`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `geofences` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`center_lat` real NOT NULL,
	`center_lng` real NOT NULL,
	`radius_meters` real NOT NULL,
	`polygon_coordinates_json` text,
	`trigger_on` text DEFAULT 'BOTH' NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `hs_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
, `chapter` text, `ad_valorem_duty` real DEFAULT 0, `specific_duty_per_kg` real DEFAULT 0, `vat_rate` real DEFAULT 0.21, `is_dual_use` integer DEFAULT 0);

CREATE TABLE `iata_airports` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`country_code` text NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE incident_reroute_options (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES control_tower_incidents(id) ON DELETE CASCADE,
      option_name TEXT NOT NULL,
      transport_mode TEXT NOT NULL,
      corridor_description TEXT NOT NULL,
      eta_delta_hours REAL NOT NULL,
      cost_delta_eur REAL NOT NULL,
      co2_delta_kg REAL NOT NULL,
      feasibility_score INTEGER NOT NULL DEFAULT 85,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      execution_status TEXT NOT NULL DEFAULT 'PROPOSED',
      legs_json TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );

CREATE TABLE `incoterm_rules` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`transport_category` text NOT NULL,
	`risk_transfer_point` text NOT NULL,
	`cost_transfer_point` text NOT NULL,
	`insurance_requirement` text NOT NULL,
	`seller_responsibilities` text,
	`buyer_responsibilities` text,
	`customs_export_by` text DEFAULT 'SELLER' NOT NULL,
	`customs_import_by` text DEFAULT 'BUYER' NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE `insurance_bordereau_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`bordereau_id` text NOT NULL,
	`certificate_id` text NOT NULL,
	`shipment_reference` text NOT NULL,
	`destination` text NOT NULL,
	`insured_value` real NOT NULL,
	`net_premium` real NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`bordereau_id`) REFERENCES `insurance_bordereaux`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`certificate_id`) REFERENCES `insurance_certificates`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `insurance_bordereaux` (
	`id` text PRIMARY KEY NOT NULL,
	`open_policy_id` text NOT NULL,
	`bordereau_reference` text NOT NULL,
	`period_month_year` text NOT NULL,
	`declaration_count` integer DEFAULT 0 NOT NULL,
	`total_insured_turnover_amount` real DEFAULT 0 NOT NULL,
	`total_net_premium_amount` real DEFAULT 0 NOT NULL,
	`total_ips_tax_amount` real DEFAULT 0 NOT NULL,
	`total_ccs_surcharge_amount` real DEFAULT 0 NOT NULL,
	`total_gross_premium_payable` real DEFAULT 0 NOT NULL,
	`submission_date` text NOT NULL,
	`status` text DEFAULT 'DECLARED_TO_INSURER' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`open_policy_id`) REFERENCES `insurance_open_policies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `insurance_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`open_policy_id` text,
	`certificate_number` text NOT NULL,
	`shipment_reference` text NOT NULL,
	`transport_mode` text DEFAULT 'MARITIME_OCEAN' NOT NULL,
	`carrier_name` text NOT NULL,
	`vessel_or_flight_or_vehicle_plate` text NOT NULL,
	`voyage_number` text,
	`origin_port_or_country` text NOT NULL,
	`destination_port_or_country` text NOT NULL,
	`departure_date` text NOT NULL,
	`estimated_arrival_date` text,
	`insured_party_name` text NOT NULL,
	`insured_party_address` text NOT NULL,
	`consignee_or_to_order_name` text NOT NULL,
	`claim_survey_agent_name_address` text NOT NULL,
	`claim_payable_at_city` text DEFAULT 'Madrid' NOT NULL,
	`goods_description` text NOT NULL,
	`package_count` integer DEFAULT 1 NOT NULL,
	`gross_weight_kg` real NOT NULL,
	`commercial_invoice_value` real NOT NULL,
	`commercial_currency` text DEFAULT 'EUR' NOT NULL,
	`freight_amount` real DEFAULT 0 NOT NULL,
	`estimated_insurance_amount` real DEFAULT 0 NOT NULL,
	`markup_percentage` real DEFAULT 10 NOT NULL,
	`total_insured_value` real NOT NULL,
	`coverage_clause` text DEFAULT 'ICC_A_ALL_RISKS_2009' NOT NULL,
	`has_war_strikes_cover` integer DEFAULT true NOT NULL,
	`has_cyber_exclusion_cl380` integer DEFAULT true NOT NULL,
	`has_sanctions_clause_jc2010` integer DEFAULT true NOT NULL,
	`applied_rate_percentage` real DEFAULT 0.24 NOT NULL,
	`net_premium_amount` real NOT NULL,
	`ips_tax_percentage` real DEFAULT 6 NOT NULL,
	`ccs_consorcio_surcharge_percentage` real DEFAULT 0.005 NOT NULL,
	`gross_premium_payable` real NOT NULL,
	`deductible_amount` real DEFAULT 500 NOT NULL,
	`issue_date` text NOT NULL,
	`status` text DEFAULT 'ISSUED_CERTIFIED' NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`open_policy_id`) REFERENCES `insurance_open_policies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `insurance_claims_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`certificate_id` text NOT NULL,
	`claim_reference` text NOT NULL,
	`casualty_date` text NOT NULL,
	`casualty_location` text NOT NULL,
	`peril_type` text DEFAULT 'WATER_DAMAGE_SEAWATER' NOT NULL,
	`sound_market_value_at_destination` real NOT NULL,
	`damaged_salvage_value_at_destination` real DEFAULT 0 NOT NULL,
	`depreciation_percentage` real NOT NULL,
	`gross_claim_assessment_amount` real NOT NULL,
	`deductible_applied_amount` real NOT NULL,
	`net_indemnity_payable_amount` real NOT NULL,
	`survey_report_reference` text NOT NULL,
	`adjuster_name` text NOT NULL,
	`settlement_status` text DEFAULT 'ADJUSTED_APPROVED' NOT NULL,
	`settlement_notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`certificate_id`) REFERENCES `insurance_certificates`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `insurance_open_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_number` text NOT NULL,
	`insurer_name` text NOT NULL,
	`broker_name` text NOT NULL,
	`policy_holder_name` text NOT NULL,
	`policy_holder_tax_id` text NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`conveyance_limit_amount` real DEFAULT 1000000 NOT NULL,
	`annual_estimated_turnover` real DEFAULT 10000000 NOT NULL,
	`base_rate_percentage` real DEFAULT 0.2 NOT NULL,
	`war_strike_rate_percentage` real DEFAULT 0.04 NOT NULL,
	`default_deductible_amount` real DEFAULT 500 NOT NULL,
	`deductible_type` text DEFAULT 'FIXED_AMOUNT' NOT NULL,
	`min_premium_per_shipment` real DEFAULT 50 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`terms_and_conditions_text` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);

CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`location` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE `invoice_event_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`previous_status` text,
	`new_status` text NOT NULL,
	`changed_by` text,
	`reason` text,
	`recorded_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`description` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`total` real NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invoice_items_qty_check" CHECK("invoice_items"."quantity" > 0),
	CONSTRAINT "invoice_items_price_check" CHECK("invoice_items"."unit_price" >= 0)
);

CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceNumber` text NOT NULL,
	`type` text DEFAULT 'AR' NOT NULL,
	`shipment_id` text,
	`company_id` text NOT NULL,
	`amount` real NOT NULL,
	`tax_amount` real DEFAULT 0,
	`tax_rate` real DEFAULT 0,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`due_date` integer,
	`paid_date` integer,
	`created_by` text,
	`updated_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invoices_amount_check" CHECK("invoices"."amount" >= 0),
	CONSTRAINT "invoices_tax_check" CHECK("invoices"."tax_amount" >= 0)
);

CREATE TABLE `iot_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code` text NOT NULL,
	`device_type` text NOT NULL,
	`battery_level_pct` integer DEFAULT 100 NOT NULL,
	`firmware_version` text DEFAULT 'v2.4.1' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`last_heartbeat_at` text NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `lanes` (
	`id` text PRIMARY KEY NOT NULL,
	`origin_location_id` text NOT NULL,
	`destination_location_id` text NOT NULL,
	`distance` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`origin_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `laytime_calculations` (
	`id` text PRIMARY KEY NOT NULL,
	`charter_party_id` text NOT NULL,
	`statement_of_facts_id` text NOT NULL,
	`calculation_reference` text NOT NULL,
	`port_operation` text DEFAULT 'LOADING' NOT NULL,
	`laytime_commenced_timestamp` text NOT NULL,
	`laytime_ceased_timestamp` text NOT NULL,
	`allowed_laytime_seconds` integer NOT NULL,
	`allowed_laytime_formatted` text NOT NULL,
	`gross_time_used_seconds` integer NOT NULL,
	`deductions_seconds` integer NOT NULL,
	`net_laytime_used_seconds` integer NOT NULL,
	`net_laytime_used_formatted` text NOT NULL,
	`time_difference_seconds` integer NOT NULL,
	`is_demurrage` integer NOT NULL,
	`demurrage_days_decimal` real DEFAULT 0 NOT NULL,
	`despatch_days_decimal` real DEFAULT 0 NOT NULL,
	`demurrage_rate_per_day_usd` real NOT NULL,
	`despatch_rate_per_day_usd` real NOT NULL,
	`total_demurrage_amount_usd` real DEFAULT 0 NOT NULL,
	`total_despatch_amount_usd` real DEFAULT 0 NOT NULL,
	`net_financial_payable_usd` real DEFAULT 0 NOT NULL,
	`calculation_method` text DEFAULT 'ATS_ALL_TIME_SAVED' NOT NULL,
	`settlement_status` text DEFAULT 'PENDING_AUDIT' NOT NULL,
	`auditor_notes` text,
	`calculated_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`charter_party_id`) REFERENCES `charter_parties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`statement_of_facts_id`) REFERENCES `statement_of_facts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE location_aliases (
      id text PRIMARY KEY NOT NULL,
      alias text NOT NULL,
      location_id text NOT NULL,
      learned_from text DEFAULT 'EXCEL_IMPORT',
      confidence real DEFAULT 1 NOT NULL,
      created_at integer NOT NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON UPDATE no action ON DELETE no action
    );

CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`address` text,
	`lat` real,
	`lng` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `marine_fuels` (
	`id` text PRIMARY KEY NOT NULL,
	`fuel_code` text NOT NULL,
	`fuel_name` text NOT NULL,
	`fuel_category` text NOT NULL,
	`lower_calorific_value_mj_per_gram` real NOT NULL,
	`wtt_factor_gco2eq_per_mj` real NOT NULL,
	`ttw_factor_gco2eq_per_mj` real NOT NULL,
	`total_wtw_factor_gco2eq_per_mj` real NOT NULL,
	`methane_slip_percent` real DEFAULT 0 NOT NULL,
	`average_market_price_usd_per_tonne` real NOT NULL,
	`is_rfnbo_compliant` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `marine_vessels` (
	`id` text PRIMARY KEY NOT NULL,
	`imo_number` text NOT NULL,
	`vessel_name` text NOT NULL,
	`vessel_type` text NOT NULL,
	`flag_state` text NOT NULL,
	`gross_tonnage_gt` integer NOT NULL,
	`deadweight_tonnage_dwt` real NOT NULL,
	`teu_capacity` integer,
	`main_engine_type` text NOT NULL,
	`has_ops_connection_installed` integer DEFAULT false NOT NULL,
	`operating_shipping_line` text NOT NULL,
	`doc_holder_company` text NOT NULL,
	`classification_society` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `marine_voyages` (
	`id` text PRIMARY KEY NOT NULL,
	`voyage_reference_number` text NOT NULL,
	`vessel_id` text NOT NULL,
	`departure_port_locode` text NOT NULL,
	`departure_port_name` text NOT NULL,
	`arrival_port_locode` text NOT NULL,
	`arrival_port_name` text NOT NULL,
	`geographic_scope` text NOT NULL,
	`distance_nautical_miles` real NOT NULL,
	`departure_date` text NOT NULL,
	`arrival_date` text NOT NULL,
	`navigation_hours` real NOT NULL,
	`berth_hours` real DEFAULT 0 NOT NULL,
	`fuel_id` text NOT NULL,
	`fuel_consumed_tonnes` real NOT NULL,
	`ops_electricity_consumed_kwh` real DEFAULT 0 NOT NULL,
	`total_energy_consumed_mj` real NOT NULL,
	`calculated_ghg_intensity_gco2eq_per_mj` real NOT NULL,
	`co2_emissions_tonnes` real NOT NULL,
	`ch4_emissions_tonnes` real DEFAULT 0 NOT NULL,
	`n2o_emissions_tonnes` real DEFAULT 0 NOT NULL,
	`total_ghg_emissions_scope_tco2eq` real NOT NULL,
	`ets_applicable_scope_emissions_tco2eq` real NOT NULL,
	`carried_teu_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'COMPLETED_VERIFIED' NOT NULL,
	`lead_auditor_verifier` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vessel_id`) REFERENCES `marine_vessels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fuel_id`) REFERENCES `marine_fuels`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE mletr_endorsements_ledger (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL REFERENCES mletr_transferable_records(id) ON DELETE CASCADE,
        block_number INTEGER NOT NULL,
        previous_hash TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        transfer_type TEXT NOT NULL,
        from_party TEXT NOT NULL,
        to_party TEXT NOT NULL,
        signer_name TEXT NOT NULL,
        signer_title TEXT,
        signer_certificate TEXT,
        signature TEXT NOT NULL,
        details TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

CREATE TABLE mletr_transferable_records (
        id TEXT PRIMARY KEY,
        document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
        shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
        registry_type TEXT NOT NULL DEFAULT 'ELECTRONIC_BILL_OF_LADING',
        document_reference TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ISSUED',
        current_holder TEXT NOT NULL,
        current_holder_role TEXT NOT NULL DEFAULT 'SHIPPER',
        issuer_name TEXT NOT NULL,
        consignee_name TEXT NOT NULL,
        total_endorsements INTEGER NOT NULL DEFAULT 1,
        genesis_hash TEXT NOT NULL,
        latest_tx_hash TEXT NOT NULL,
        is_surrendered INTEGER NOT NULL DEFAULT 0,
        surrendered_at INTEGER,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `ocean_booking_details` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`shipment_id` text NOT NULL,
	`carrier_scac` text NOT NULL,
	`service_contract_number` text,
	`cargo_cut_off` text,
	`vcs_cut_off` text,
	`doc_cut_off` text,
	`si_cut_off` text,
	`si_status` text DEFAULT 'DRAFT' NOT NULL,
	`draft_bl_status` text DEFAULT 'PENDING' NOT NULL,
	`hazardous_declaration` text,
	`special_instructions` text,
	`vgm_json` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE op_finance_shipment_finances (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      functional_currency TEXT NOT NULL DEFAULT 'EUR',
      financial_state TEXT NOT NULL DEFAULT 'OPEN',
      expected_cost_total_eur REAL NOT NULL DEFAULT 0,
      confirmed_cost_total_eur REAL NOT NULL DEFAULT 0,
      expected_revenue_total_eur REAL NOT NULL DEFAULT 0,
      confirmed_revenue_total_eur REAL NOT NULL DEFAULT 0,
      expected_gross_margin_eur REAL NOT NULL DEFAULT 0,
      actual_gross_margin_eur REAL NOT NULL DEFAULT 0,
      margin_percent REAL NOT NULL DEFAULT 0,
      open_accrual_amount_eur REAL NOT NULL DEFAULT 0,
      financially_ready INTEGER NOT NULL DEFAULT 0,
      lines_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE op_intelligence_cockpit_items (
      work_item_id TEXT PRIMARY KEY NOT NULL,
      work_item_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      attention_score INTEGER NOT NULL,
      urgency_bucket TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      assignee_user_id TEXT,
      shipment_id TEXT,
      reference_number TEXT NOT NULL,
      item_model_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE op_intelligence_cockpit_items_v2 (
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

CREATE TABLE op_intelligence_exceptions_v2 (
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

CREATE TABLE op_intelligence_shipment_360_views (
      shipment_id TEXT PRIMARY KEY NOT NULL,
      reference_number TEXT NOT NULL,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      customer_account_id TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL,
      health_status TEXT NOT NULL,
      projection_version INTEGER NOT NULL DEFAULT 1,
      read_model_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE op_intelligence_shipment_360_views_v2 (
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

CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`total_amount` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE orders_customer_orders (
      id TEXT PRIMARY KEY NOT NULL,
      order_number TEXT NOT NULL UNIQUE,
      customer_party_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      quotation_id TEXT,
      service_mode TEXT NOT NULL,
      incoterm TEXT NOT NULL,
      movement_scope TEXT NOT NULL DEFAULT 'PORT_TO_PORT',
      origin_location_id TEXT NOT NULL,
      destination_location_id TEXT NOT NULL,
      cargo_ready_date TEXT NOT NULL,
      required_delivery_date TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      cargo_requirements_json TEXT NOT NULL,
      commercial_refs_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE orders_fulfilment_allocations (
      id TEXT PRIMARY KEY NOT NULL,
      order_id TEXT NOT NULL,
      shipment_id TEXT NOT NULL,
      shipment_reference TEXT NOT NULL,
      allocated_packages INTEGER NOT NULL,
      allocated_weight_kg REAL NOT NULL,
      allocated_volume_cbm REAL NOT NULL,
      allocation_type TEXT NOT NULL DEFAULT 'FULL',
      created_at INTEGER NOT NULL
    );

CREATE TABLE party_crm_addresses_v2 (
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

CREATE TABLE party_crm_contacts_v2 (
    contact_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    position TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  );

CREATE TABLE party_crm_external_identifiers_v2 (
    external_identifier_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    source_system TEXT NOT NULL,
    external_id TEXT NOT NULL,
    context_scope TEXT NOT NULL DEFAULT 'GLOBAL',
    created_at INTEGER NOT NULL,
    UNIQUE(source_system, external_id, context_scope)
  );

CREATE TABLE party_crm_parties_v2 (
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

CREATE TABLE party_crm_relationships_v2 (
    relationship_id TEXT PRIMARY KEY NOT NULL,
    from_party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    to_party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE RESTRICT,
    relationship_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    valid_from TEXT,
    valid_until TEXT,
    CONSTRAINT chk_party_crm_rel_no_self_loop CHECK (from_party_id <> to_party_id)
  );

CREATE TABLE party_crm_roles_v2 (
    party_role_id TEXT PRIMARY KEY NOT NULL,
    party_id TEXT NOT NULL REFERENCES party_crm_parties_v2(party_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    UNIQUE(party_id, role),
    CONSTRAINT chk_party_crm_roles_role CHECK (role IN ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'AGENT', 'SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMS_BROKER'))
  );

CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`amount` real NOT NULL,
	`payment_date` integer NOT NULL,
	`reference` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payments_amount_check" CHECK("payments"."amount" >= 0)
);

CREATE TABLE `pending_ai_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text,
	`document_url` text,
	`status` text NOT NULL,
	`result` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE platform_gov_command_idempotency_v2 (
      command_key TEXT PRIMARY KEY NOT NULL,
      command_name TEXT NOT NULL,
      entity_id TEXT,
      result_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

CREATE TABLE platform_gov_inbox_processed (
      id TEXT PRIMARY KEY NOT NULL,
      consumer_name TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      processed_at INTEGER NOT NULL
    );

CREATE TABLE platform_gov_outbox_messages (
      event_id TEXT PRIMARY KEY NOT NULL,
      event_type TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      producer_context TEXT NOT NULL,
      aggregate_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      aggregate_version INTEGER NOT NULL,
      correlation_id TEXT NOT NULL,
      causation_id TEXT NOT NULL,
      actor_context_json TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      retry_count INTEGER NOT NULL DEFAULT 0,
      occurred_at INTEGER NOT NULL,
      published_at INTEGER,
      last_error TEXT
    );

CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_number` text NOT NULL,
	`customer_id` text NOT NULL,
	`origin_location_id` text,
	`destination_location_id` text,
	`equipment` text NOT NULL,
	`buy_rate_total` real NOT NULL,
	`sell_margin` real NOT NULL,
	`sell_rate_total` real NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`valid_to` integer NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`customer_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`origin_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "quotes_sell_amount_check" CHECK("quotes"."sell_rate_total" >= 0),
	CONSTRAINT "quotes_buy_amount_check" CHECK("quotes"."buy_rate_total" >= 0)
);

CREATE TABLE `rail_consignments` (
	`id` text PRIMARY KEY NOT NULL,
	`cim_number` text NOT NULL,
	`sender_name` text NOT NULL,
	`sender_address` text,
	`sender_vat` text,
	`consignee_name` text NOT NULL,
	`consignee_address` text,
	`consignee_vat` text,
	`origin_terminal_id` text NOT NULL,
	`destination_terminal_id` text NOT NULL,
	`gauge_transfer_terminal_id` text,
	`corridor_id` text NOT NULL,
	`railway_undertaking_ru` text NOT NULL,
	`declared_goods_description` text NOT NULL,
	`nhm_commodity_code` text NOT NULL,
	`rid_hazardous_class` text,
	`un_number` text,
	`total_gross_mass_tonnes` real NOT NULL,
	`total_teu` integer DEFAULT 2 NOT NULL,
	`commercial_contract_ref` text,
	`customs_status` text DEFAULT 'T1' NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`departure_date` text,
	`estimated_arrival_date` text,
	`actual_arrival_date` text,
	`responsible_railway_officer` text,
	`remarks` text,
	`created_at` text NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`origin_terminal_id`) REFERENCES `rail_terminals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_terminal_id`) REFERENCES `rail_terminals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gauge_transfer_terminal_id`) REFERENCES `rail_terminals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`corridor_id`) REFERENCES `rail_corridors`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `rail_corridors` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`origin_node` text NOT NULL,
	`destination_node` text NOT NULL,
	`max_train_length_meters` integer DEFAULT 750 NOT NULL,
	`max_axle_load_category` text DEFAULT 'D' NOT NULL,
	`gauge_profile` text DEFAULT 'P400_GA' NOT NULL,
	`electrification_kv` real DEFAULT 25 NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `rail_terminals` (
	`id` text PRIMARY KEY NOT NULL,
	`uic_station_code` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`country_code` text NOT NULL,
	`track_gauge` text NOT NULL,
	`is_gauge_transfer_node` integer DEFAULT false NOT NULL,
	`has_electrification` integer DEFAULT true NOT NULL,
	`max_track_capacity_meters` integer DEFAULT 750 NOT NULL,
	`storage_teu_capacity` integer DEFAULT 2500 NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `rail_train_consists` (
	`id` text PRIMARY KEY NOT NULL,
	`train_run_number` text NOT NULL,
	`locomotive_series` text NOT NULL,
	`locomotive_length_meters` real DEFAULT 23 NOT NULL,
	`locomotive_weight_tonnes` real DEFAULT 123 NOT NULL,
	`locomotive_braked_weight_tonnes` real DEFAULT 110 NOT NULL,
	`corridor_id` text NOT NULL,
	`origin_terminal_id` text NOT NULL,
	`destination_terminal_id` text NOT NULL,
	`max_allowed_length_meters` integer DEFAULT 750 NOT NULL,
	`total_train_length_meters` real NOT NULL,
	`total_gross_mass_tonnes` real NOT NULL,
	`total_braked_mass_tonnes` real NOT NULL,
	`calculated_brake_percentage` real NOT NULL,
	`required_brake_percentage` real DEFAULT 65 NOT NULL,
	`is_length_compliant` integer DEFAULT true NOT NULL,
	`is_brake_compliant` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'FORMED' NOT NULL,
	`driver_name` text,
	`traction_operator` text NOT NULL,
	`departure_timestamp` text,
	`arrival_timestamp` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`corridor_id`) REFERENCES `rail_corridors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`origin_terminal_id`) REFERENCES `rail_terminals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_terminal_id`) REFERENCES `rail_terminals`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `rail_train_wagon_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`train_consist_id` text NOT NULL,
	`consignment_id` text,
	`wagon_id` text NOT NULL,
	`position_in_train` integer NOT NULL,
	`uti_type` text NOT NULL,
	`uti_identification` text NOT NULL,
	`payload_mass_tonnes` real NOT NULL,
	`gross_wagon_mass_tonnes` real NOT NULL,
	`calculated_axle_load_tonnes` real NOT NULL,
	`max_allowed_axle_load_tonnes` real DEFAULT 22.5 NOT NULL,
	`is_axle_load_compliant` integer DEFAULT true NOT NULL,
	`seal_number` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`train_consist_id`) REFERENCES `rail_train_consists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consignment_id`) REFERENCES `rail_consignments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wagon_id`) REFERENCES `rail_wagons`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `rail_wagons` (
	`id` text PRIMARY KEY NOT NULL,
	`uic_wagon_number` text NOT NULL,
	`wagon_series` text NOT NULL,
	`wagon_type` text NOT NULL,
	`number_of_axles` integer NOT NULL,
	`tare_weight_tonnes` real NOT NULL,
	`length_over_buffers_meters` real NOT NULL,
	`max_braked_weight_tonnes` real NOT NULL,
	`max_payload_category_a` real NOT NULL,
	`max_payload_category_b` real NOT NULL,
	`max_payload_category_c` real NOT NULL,
	`max_payload_category_d` real NOT NULL,
	`is_p400_certified` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'AVAILABLE' NOT NULL,
	`created_at` text NOT NULL
);

CREATE TABLE `rate_change_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`rate_id` text NOT NULL,
	`previous_amount` real,
	`new_amount` real NOT NULL,
	`changed_by` text,
	`reason` text,
	`recorded_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`rate_id`) REFERENCES `rates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE "rate_import_batches" (
      id text PRIMARY KEY,
      file_name text NOT NULL,
      carrier_id text REFERENCES addresses(id),
      total_rows integer NOT NULL,
      inserted_count integer NOT NULL DEFAULT 0,
      updated_count integer NOT NULL DEFAULT 0,
      failed_count integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'COMPLETED',
      errors_json text,
      imported_by text REFERENCES users(id),
      created_at integer NOT NULL
    );

CREATE TABLE `rate_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`rate_id` text NOT NULL,
	`min_weight` real NOT NULL,
	`max_weight` real NOT NULL,
	`price_per_kg` real NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`rate_id`) REFERENCES `rates`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE "rates" (
      id text PRIMARY KEY,
      carrier_id text NOT NULL REFERENCES addresses(id),
      lane_id text NOT NULL REFERENCES lanes(id),
      containerType text NOT NULL,
      baseRate real NOT NULL,
      baf real NOT NULL DEFAULT 0,
      pss real NOT NULL DEFAULT 0,
      thc real NOT NULL DEFAULT 0,
      service_line text NOT NULL DEFAULT 'Standard',
      transitDays integer NOT NULL,
      valid_from integer,
      valid_to integer,
      company_id text REFERENCES companies(id),
      created_by text REFERENCES users(id),
      updated_by text REFERENCES users(id),
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text,
      CONSTRAINT rates_dates_check CHECK (valid_to > valid_from),
      CONSTRAINT rates_base_check CHECK (baseRate >= 0)
    );

CREATE TABLE `revenues` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "revenues_amount_check" CHECK("revenues"."amount" >= 0)
);

CREATE TABLE `road_consignments` (
	`id` text PRIMARY KEY NOT NULL,
	`consignment_number` text NOT NULL,
	`shipment_id` text,
	`consignment_type` text NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`sender_name` text NOT NULL,
	`sender_address` text NOT NULL,
	`sender_country` text NOT NULL,
	`consignee_name` text NOT NULL,
	`consignee_address` text NOT NULL,
	`consignee_country` text NOT NULL,
	`carrier_name` text NOT NULL,
	`carrier_vat` text NOT NULL,
	`tractor_plate` text NOT NULL,
	`trailer_plate` text NOT NULL,
	`driver_name` text NOT NULL,
	`driver_license` text NOT NULL,
	`driver_phone` text,
	`origin_city` text NOT NULL,
	`destination_city` text NOT NULL,
	`total_distance_km` real NOT NULL,
	`estimated_driving_hours` real NOT NULL,
	`required_rest_breaks_count` integer DEFAULT 0 NOT NULL,
	`pickup_date` integer NOT NULL,
	`delivery_date` integer,
	`total_pallets` integer DEFAULT 1 NOT NULL,
	`pallet_capacity_max` integer DEFAULT 33 NOT NULL,
	`total_gross_weight_kg` real NOT NULL,
	`payload_capacity_max_kg` real DEFAULT 24000 NOT NULL,
	`trailer_floor_utilization_pct` real NOT NULL,
	`is_adr_hazardous` integer DEFAULT false NOT NULL,
	`adr_total_points` real DEFAULT 0 NOT NULL,
	`adr_exemption_1136_applied` integer DEFAULT false NOT NULL,
	`orange_plates_required` integer DEFAULT false NOT NULL,
	`tunnel_restriction_code` text,
	`goods_description` text NOT NULL,
	`special_instructions` text,
	`cargo_items_data` text,
	`route_stops_data` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_system_role` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE `route_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`sequence_order` integer NOT NULL,
	`transport_mode` text NOT NULL,
	`origin_location_id` text,
	`destination_location_id` text,
	`departure_time` integer,
	`arrival_time` integer,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`origin_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`destination_location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE rules_decisions_definitions (
      id TEXT PRIMARY KEY NOT NULL,
      decision_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      hit_policy TEXT NOT NULL DEFAULT 'FIRST',
      input_columns_json TEXT NOT NULL,
      output_columns_json TEXT NOT NULL,
      rules_rows_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE rules_decisions_evaluation_logs (
      evaluation_id TEXT PRIMARY KEY NOT NULL,
      decision_key TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      shipment_id TEXT NOT NULL,
      inputs_snapshot_json TEXT NOT NULL,
      matched_row_ids_json TEXT NOT NULL,
      rule_annotations_json TEXT NOT NULL,
      output_snapshot_json TEXT NOT NULL,
      caller_context TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      evaluated_at TEXT NOT NULL
    );

CREATE TABLE "schedules" (
      id text PRIMARY KEY,
      lane_id text NOT NULL REFERENCES lanes(id),
      carrier_id text NOT NULL REFERENCES addresses(id),
      vessel_name text,
      voyage_number text,
      departure_date integer NOT NULL,
      arrival_date integer NOT NULL,
      created_at integer NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at integer,
      is_deleted integer NOT NULL DEFAULT false,
      is_active integer NOT NULL DEFAULT true,
      metadata text,
      tags text
    );

CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `shipment_containers` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`container_number` text NOT NULL,
	`container_type` text NOT NULL,
	`seal_number` text,
	`weight` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `shipment_event_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`status` text NOT NULL,
	`location` text NOT NULL,
	`recorded_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);

CREATE TABLE shipment_exec_assignments_v2 (
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

CREATE TABLE shipment_exec_party_roles_v2 (
    shipment_party_role_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    party_id TEXT NOT NULL,
    role TEXT NOT NULL,
    valid_from TEXT,
    valid_until TEXT,
    CONSTRAINT chk_shipment_exec_party_roles_role CHECK (role IN ('SHIPPER', 'CONSIGNEE', 'NOTIFY_PARTY', 'CUSTOMER', 'AGENT_ORIGIN', 'AGENT_DESTINATION'))
  );

CREATE TABLE shipment_exec_references_v2 (
    reference_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL REFERENCES shipment_exec_shipments_v2(shipment_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'INTERNAL',
    is_primary INTEGER NOT NULL DEFAULT 0
  );

CREATE TABLE shipment_exec_shipments (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_reference TEXT NOT NULL UNIQUE,
      customer_account_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      service_mode TEXT NOT NULL,
      service_type TEXT NOT NULL,
      incoterm TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'IMPORT',
      origin_location_id TEXT NOT NULL,
      destination_location_id TEXT NOT NULL,
      lifecycle_state TEXT NOT NULL DEFAULT 'CREATED',
      execution_phase TEXT NOT NULL DEFAULT 'ORIGIN_PREPARATION',
      closure_state TEXT NOT NULL DEFAULT 'OPEN',
      health_status TEXT NOT NULL DEFAULT 'ON_TRACK',
      health_score INTEGER NOT NULL DEFAULT 100,
      health_reasons_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      order_links_json TEXT NOT NULL DEFAULT '[]',
      party_roles_json TEXT NOT NULL DEFAULT '[]',
      external_refs_json TEXT NOT NULL DEFAULT '[]',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE shipment_exec_shipments_v2 (
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

CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`incoterm` text,
	`service_type` text,
	`lane_id` text,
	`schedule_id` text,
	`vessel_name` text,
	`voyage_number` text,
	`carbon_footprint` real,
	`tracking_number` text,
	`origin` text,
	`destination` text,
	`distance_km` real,
	`weight` real,
	`co2e_tonnes` real,
	`port_of_entry_id` text,
	`clearance_status` text,
	`currentLat` real,
	`currentLng` real,
	`company_id` text NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`lane_id`) REFERENCES `lanes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`schedule_id`) REFERENCES `schedules`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`port_of_entry_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE sla_mgmt_instances (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      sla_code TEXT NOT NULL,
      sla_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ON_TRACK',
      started_at TEXT NOT NULL,
      original_deadline_at TEXT NOT NULL,
      effective_deadline_at TEXT NOT NULL,
      paused_at TEXT,
      pause_reason TEXT,
      accumulated_paused_minutes INTEGER NOT NULL DEFAULT 0,
      stop_clock_history_json TEXT NOT NULL DEFAULT '[]',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE `smart_escrow_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`carrier_scac` text NOT NULL,
	`shipper_name` text NOT NULL,
	`consignee_name` text NOT NULL,
	`escrow_amount_eur` real NOT NULL,
	`escrow_status` text DEFAULT 'FUNDED' NOT NULL,
	`dispute_reason` text,
	`ebl_data_json` text NOT NULL,
	`milestones_data_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `sof_events` (
	`id` text PRIMARY KEY NOT NULL,
	`statement_of_facts_id` text NOT NULL,
	`event_start_timestamp` text NOT NULL,
	`event_end_timestamp` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`eventType` text DEFAULT 'WORKING_OPERATIONS' NOT NULL,
	`laytime_counting_percentage` real DEFAULT 100 NOT NULL,
	`is_counted_against_laytime` integer DEFAULT true NOT NULL,
	`affected_hatches_or_cranes` text DEFAULT 'Hold 1-4 / Shore Crane 2',
	`interruption_reason` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`statement_of_facts_id`) REFERENCES `statement_of_facts`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE source_records (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES data_sources(id),
    external_id TEXT NOT NULL,
    source_url TEXT,
    raw_payload TEXT NOT NULL,
    normalized_payload TEXT,
    sha256_hash TEXT NOT NULL,
    retrieved_at INTEGER NOT NULL,
    version_tag TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );

CREATE TABLE `statement_of_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`charter_party_id` text NOT NULL,
	`sof_reference` text NOT NULL,
	`port_operation` text DEFAULT 'LOADING' NOT NULL,
	`port_code` text DEFAULT 'ESSDR' NOT NULL,
	`port_name` text DEFAULT 'Santander Port' NOT NULL,
	`terminal_berth` text DEFAULT 'Muelle de Raos 4',
	`vessel_agent_name` text DEFAULT 'Bergé Marítima',
	`master_name` text DEFAULT 'Capt. Santiago Aranda',
	`eosp_timestamp` text,
	`anchorage_drop_timestamp` text,
	`nor_tendered_timestamp` text NOT NULL,
	`nor_accepted_timestamp` text NOT NULL,
	`turn_time_expiry_timestamp` text,
	`all_fast_berthing_timestamp` text,
	`gangway_down_timestamp` text,
	`customs_health_cleared_timestamp` text,
	`draft_survey_start_timestamp` text,
	`draft_survey_end_timestamp` text,
	`commenced_operations_timestamp` text NOT NULL,
	`completed_operations_timestamp` text NOT NULL,
	`hoses_disconnected_timestamp` text,
	`vessel_sailed_timestamp` text,
	`actual_cargo_handled_mt` real DEFAULT 35000 NOT NULL,
	`is_finalized` integer DEFAULT false NOT NULL,
	`agent_notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`charter_party_id`) REFERENCES `charter_parties`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `surcharges` (
	`id` text PRIMARY KEY NOT NULL,
	`rate_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text, currency text DEFAULT 'USD' NOT NULL, calc_basis text DEFAULT 'PER_CONTAINER' NOT NULL,
	FOREIGN KEY (`rate_id`) REFERENCES `rates`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `system_sequences` (
	`name` text PRIMARY KEY NOT NULL,
	`current_value` integer DEFAULT 0 NOT NULL,
	`prefix` text
);

CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`assigned_to` text,
	`status` text NOT NULL,
	`due_date` integer,
	`shipment_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `telemetry_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`severity` text NOT NULL,
	`alert_type` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`metric_value` text,
	`threshold_value` text,
	`created_at` text NOT NULL,
	`resolved_at` text,
	`resolved_by` text,
	FOREIGN KEY (`asset_id`) REFERENCES `tracked_assets`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `telemetry_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`device_id` text,
	`timestamp` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`speed_knots` real DEFAULT 0 NOT NULL,
	`heading_deg` real DEFAULT 0 NOT NULL,
	`altitude_meters` real DEFAULT 0 NOT NULL,
	`temperature_celsius` real,
	`humidity_pct` real,
	`shock_g_force` real DEFAULT 0 NOT NULL,
	`door_open` integer DEFAULT false NOT NULL,
	`seal_tampered` integer DEFAULT false NOT NULL,
	`battery_pct` integer DEFAULT 100 NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `tracked_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `iot_devices`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `temperature_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`cold_chain_shipment_id` text NOT NULL,
	`recorded_at` text NOT NULL,
	`probe_temperature_celsius` real NOT NULL,
	`ambient_temperature_celsius` real,
	`relative_humidity_pct` real,
	`is_excursion` integer DEFAULT false NOT NULL,
	`power_supply_mode` text DEFAULT 'BATTERY_PASSIVE',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`cold_chain_shipment_id`) REFERENCES `cold_chain_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `time_charter_off_hires` (
	`id` text PRIMARY KEY NOT NULL,
	`charter_party_id` text NOT NULL,
	`off_hire_reference` text NOT NULL,
	`off_hire_reason` text DEFAULT 'MAIN_ENGINE_BREAKDOWN' NOT NULL,
	`off_hire_start_timestamp` text NOT NULL,
	`off_hire_end_timestamp` text NOT NULL,
	`duration_hours` real NOT NULL,
	`duration_days_decimal` real NOT NULL,
	`daily_hire_rate_usd` real NOT NULL,
	`hire_deduction_usd` real NOT NULL,
	`bunker_vlsfo_consumed_mt` real DEFAULT 0,
	`bunker_mgo_consumed_mt` real DEFAULT 0,
	`vlsfo_price_usd_per_mt` real DEFAULT 580,
	`mgo_price_usd_per_mt` real DEFAULT 750,
	`bunker_compensation_usd` real DEFAULT 0 NOT NULL,
	`total_off_hire_claim_usd` real NOT NULL,
	`off_hire_status` text DEFAULT 'LOGGED' NOT NULL,
	`incident_description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`charter_party_id`) REFERENCES `charter_parties`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `tracked_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_code` text NOT NULL,
	`name` text NOT NULL,
	`asset_type` text NOT NULL,
	`device_id` text,
	`current_lat` real NOT NULL,
	`current_lng` real NOT NULL,
	`current_speed_knots` real DEFAULT 0 NOT NULL,
	`current_heading_deg` real DEFAULT 0 NOT NULL,
	`current_altitude_meters` real DEFAULT 0 NOT NULL,
	`origin_name` text NOT NULL,
	`destination_name` text NOT NULL,
	`cargo_description` text NOT NULL,
	`cargo_category` text DEFAULT 'GENERAL' NOT NULL,
	`min_temp_celsius` real,
	`max_temp_celsius` real,
	`planned_eta` text NOT NULL,
	`predicted_eta` text NOT NULL,
	`status` text DEFAULT 'IN_TRANSIT' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `iot_devices`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE tracking_estimate_revisions_v2 (
    revision_id TEXT PRIMARY KEY NOT NULL,
    milestone_id TEXT NOT NULL REFERENCES tracking_milestones_v2(milestone_id) ON DELETE CASCADE,
    estimated_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    source TEXT NOT NULL,
    reason TEXT,
    triggering_event_id TEXT
  );

CREATE TABLE tracking_events_milestone_plans (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      route_version_no INTEGER NOT NULL DEFAULT 1,
      milestones_json TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE tracking_events_stream (
      event_id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL,
      event_code TEXT NOT NULL,
      milestone_code TEXT NOT NULL,
      location_locode TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_trust_rank INTEGER NOT NULL DEFAULT 1,
      timestamp_kind TEXT NOT NULL,
      event_timestamp TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      recorded_at INTEGER NOT NULL
    );

CREATE TABLE tracking_milestone_plans_v2 (
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

CREATE TABLE tracking_milestones_v2 (
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

CREATE TABLE tracking_operational_events_v2 (
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

CREATE TABLE `trade_credit_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`document_type` text NOT NULL,
	`original_copies_required` integer DEFAULT 1 NOT NULL,
	`original_copies_presented` integer DEFAULT 1 NOT NULL,
	`document_reference_number` text NOT NULL,
	`document_date` text NOT NULL,
	`issuer_name` text NOT NULL,
	`shipped_on_board_date` text,
	`clean_on_board_status` integer DEFAULT true NOT NULL,
	`freight_payment_clause` text DEFAULT 'PREPAID',
	`invoice_amount` real,
	`invoice_currency` text,
	`goods_description_exact_match` integer DEFAULT true,
	`insured_amount` real,
	`insured_percentage_of_cif` real,
	`compliance_status` text DEFAULT 'PENDING' NOT NULL,
	`remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `trade_credit_instruments` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_reference` text NOT NULL,
	`instrument_type` text NOT NULL,
	`applicable_rules` text DEFAULT 'UCP600' NOT NULL,
	`applicant_company_id` text,
	`applicant_name` text NOT NULL,
	`beneficiary_name` text NOT NULL,
	`beneficiary_country` text DEFAULT 'ES' NOT NULL,
	`issuing_bank_bic` text NOT NULL,
	`issuing_bank_name` text NOT NULL,
	`confirming_bank_bic` text,
	`confirming_bank_name` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`credit_amount` real NOT NULL,
	`tolerance_percentage` real DEFAULT 5 NOT NULL,
	`issue_date` text NOT NULL,
	`latest_shipment_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`expiry_place` text DEFAULT 'Counters of Beneficiary Bank' NOT NULL,
	`port_of_loading` text NOT NULL,
	`port_of_discharge` text NOT NULL,
	`goods_description_summary` text NOT NULL,
	`partial_shipments_allowed` integer DEFAULT false NOT NULL,
	`transhipment_allowed` integer DEFAULT false NOT NULL,
	`presentation_period_days` integer DEFAULT 21 NOT NULL,
	`confirmation_instructions` text DEFAULT 'CONFIRM' NOT NULL,
	`payment_terms` text DEFAULT 'SIGHT' NOT NULL,
	`tenor_days` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ISSUED' NOT NULL,
	`remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`applicant_company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `trade_discrepancies` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`document_id` text,
	`discrepancy_rule_code` text NOT NULL,
	`article_reference` text NOT NULL,
	`severity` text NOT NULL,
	`description` text NOT NULL,
	`suggested_remedy` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `trade_credit_documents`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `trade_fee_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`opening_fee_rate_pct` real DEFAULT 0.25 NOT NULL,
	`confirmation_fee_rate_pct` real DEFAULT 0.5 NOT NULL,
	`discrepancy_fee_amount` real DEFAULT 75 NOT NULL,
	`amendment_fee_amount` real DEFAULT 50 NOT NULL,
	`payment_settlement_fee_amount` real DEFAULT 60 NOT NULL,
	`calculated_opening_fee_eur` real DEFAULT 0 NOT NULL,
	`calculated_confirmation_fee_eur` real DEFAULT 0 NOT NULL,
	`calculated_discrepancy_fee_eur` real DEFAULT 0 NOT NULL,
	`total_bank_fees_eur` real DEFAULT 0 NOT NULL,
	`fee_payer_party` text DEFAULT 'APPLICANT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `trade_sanctions` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`sanction_type` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE `trade_swift_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`message_type` text NOT NULL,
	`sender_bic` text NOT NULL,
	`receiver_bic` text NOT NULL,
	`raw_swift_message` text NOT NULL,
	`transmission_status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE transport_plan_route_plans (
      id TEXT PRIMARY KEY NOT NULL,
      shipment_id TEXT NOT NULL UNIQUE,
      active_version_no INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'PUBLISHED',
      version INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

CREATE TABLE transport_plan_route_plans_v2 (
    route_plan_id TEXT PRIMARY KEY NOT NULL,
    shipment_id TEXT NOT NULL,
    current_version_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at INTEGER NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT chk_transport_plan_route_plans_status CHECK (status IN ('DRAFT', 'ACTIVE', 'SUPERSEDED', 'CANCELLED'))
  );

CREATE TABLE transport_plan_route_stops_v2 (
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

CREATE TABLE transport_plan_route_versions (
      id TEXT PRIMARY KEY NOT NULL,
      route_plan_id TEXT NOT NULL,
      shipment_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PUBLISHED',
      change_reason TEXT,
      stops_json TEXT NOT NULL,
      legs_json TEXT NOT NULL,
      published_at INTEGER NOT NULL
    );

CREATE TABLE transport_plan_route_versions_v2 (
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

CREATE TABLE transport_plan_transport_legs_v2 (
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

CREATE TABLE `treasury_fx_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`currency` text NOT NULL,
	`receivables_amount` real DEFAULT 0 NOT NULL,
	`payables_amount` real DEFAULT 0 NOT NULL,
	`net_exposure` real DEFAULT 0 NOT NULL,
	`average_exchange_rate` real NOT NULL,
	`current_spot_rate` real NOT NULL,
	`unrealized_gain_loss_eur` real DEFAULT 0 NOT NULL,
	`hedged_amount` real DEFAULT 0 NOT NULL,
	`unhedged_amount` real DEFAULT 0 NOT NULL,
	`risk_level` text DEFAULT 'LOW' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE `trucks` (
	`id` text PRIMARY KEY NOT NULL,
	`plate_number` text NOT NULL,
	`capacity` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE TABLE unlocode_locations (
    un_locode TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    location_code TEXT NOT NULL,
    name TEXT NOT NULL,
    name_wo_diacritics TEXT,
    subdivision_code TEXT,
    function_classifier TEXT NOT NULL,
    is_port INTEGER DEFAULT 0,
    is_rail_terminal INTEGER DEFAULT 0,
    is_road_terminal INTEGER DEFAULT 0,
    is_airport INTEGER DEFAULT 0,
    is_postal_hub INTEGER DEFAULT 0,
    is_multimodal_icd INTEGER DEFAULT 0,
    is_border_crossing INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'RL',
    change_code TEXT,
    release_date_yymm TEXT,
    iata_code TEXT,
    raw_coordinates TEXT,
    latitude REAL,
    longitude REAL,
    remarks TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    tags TEXT
  );

CREATE TABLE `user_station_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`department_id` text,
	`role_id` text NOT NULL,
	`is_primary` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branch_offices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`email` text NOT NULL,
	`hashed_password` text,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `warehouse_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`ownership` text DEFAULT 'INTERNAL' NOT NULL,
	`customer` text,
	`buyer` text,
	`product_code` text,
	`item_description` text NOT NULL,
	`quantity` integer NOT NULL,
	`weight` real,
	`volume` real,
	`zone` text DEFAULT 'DRY' NOT NULL,
	`metadata` text,
	`status` text DEFAULT 'IN_STOCK' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tags` text,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `warehouse_traffic` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text,
	`driver_name` text,
	`device_number` text NOT NULL,
	`device_type` text NOT NULL,
	`status` text NOT NULL,
	`eta` text,
	`assigned_dock` text,
	`cargo_description` text,
	`total_weight_expected` real,
	`expected_quantity` integer,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE wf_engine_definition_versions_v2 (
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

CREATE TABLE wf_engine_definitions_v2 (
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

CREATE TABLE wf_engine_dependency_definitions_v2 (
      dependency_definition_id TEXT PRIMARY KEY NOT NULL,
      workflow_version_id TEXT NOT NULL REFERENCES wf_engine_definition_versions_v2(workflow_version_id) ON DELETE CASCADE,
      predecessor_task_type_code TEXT NOT NULL,
      successor_task_type_code TEXT NOT NULL,
      dependency_type TEXT NOT NULL DEFAULT 'FINISH_TO_START',
      condition_json TEXT,
      UNIQUE(workflow_version_id, predecessor_task_type_code, successor_task_type_code),
      CONSTRAINT chk_wf_engine_dep_def_no_self_loop CHECK (predecessor_task_type_code <> successor_task_type_code)
    );

CREATE TABLE wf_engine_instances_v2 (
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

CREATE TABLE wf_engine_task_definitions_v2 (
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

CREATE TABLE wf_engine_task_instances_v2 (
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

CREATE TABLE work_mgmt_task_dependencies_v2 (
    dependency_id TEXT PRIMARY KEY NOT NULL,
    predecessor_task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
    successor_task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
    dependency_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BLOCKING',
    UNIQUE(predecessor_task_id, successor_task_id),
    CONSTRAINT chk_work_mgmt_task_dep_no_self_cycle CHECK (predecessor_task_id <> successor_task_id),
    CONSTRAINT chk_work_mgmt_task_dep_type CHECK (dependency_type IN ('FINISH_TO_START', 'EVENT_REQUIRED', 'APPROVAL_REQUIRED'))
  );

CREATE TABLE work_mgmt_tasks_v2 (
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

CREATE TABLE workflow_rt_process_definitions (
      id TEXT PRIMARY KEY NOT NULL,
      process_key TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      nodes_json TEXT NOT NULL,
      sequence_flows_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

CREATE TABLE workflow_rt_process_instances (
      id TEXT PRIMARY KEY NOT NULL,
      process_definition_id TEXT NOT NULL,
      process_key TEXT NOT NULL,
      version_number INTEGER NOT NULL DEFAULT 1,
      shipment_id TEXT NOT NULL UNIQUE,
      reference_number TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'RUNNING',
      current_node_id TEXT NOT NULL,
      active_tokens_json TEXT NOT NULL DEFAULT '[]',
      completed_node_ids_json TEXT NOT NULL DEFAULT '[]',
      variables_snapshot_json TEXT NOT NULL DEFAULT '{}',
      blocking_reason TEXT,
      organization_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      started_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER
    );

CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`xml_data` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);

CREATE UNIQUE INDEX `aeo_audits_audit_reference_unique` ON `aeo_audits` (`audit_reference`);

CREATE UNIQUE INDEX `aeo_security_seals_seal_number_unique` ON `aeo_security_seals` (`seal_number`);

CREATE UNIQUE INDEX `aeo_seven_point_inspections_inspection_reference_unique` ON `aeo_seven_point_inspections` (`inspection_reference`);

CREATE UNIQUE INDEX `agent_settlements_statement_number_unique` ON `agent_settlements` (`statement_number`);

CREATE UNIQUE INDEX `airway_bills_awb_number_unique` ON `airway_bills` (`awb_number`);

CREATE INDEX `blk_contract_idx` ON `blockchain_blocks` (`contract_id`);

CREATE INDEX `blk_hash_idx` ON `blockchain_blocks` (`block_hash`);

CREATE INDEX `blk_num_idx` ON `blockchain_blocks` (`contract_id`,`block_number`);

CREATE UNIQUE INDEX `branch_offices_station_code_unique` ON `branch_offices` (`station_code`);

CREATE UNIQUE INDEX `bulk_grain_stability_plans_plan_reference_unique` ON `bulk_grain_stability_plans` (`plan_reference`);

CREATE UNIQUE INDEX `bulk_imsbc_declarations_declaration_reference_unique` ON `bulk_imsbc_declarations` (`declaration_reference`);

CREATE UNIQUE INDEX `bulk_ullage_surveys_survey_reference_unique` ON `bulk_ullage_surveys` (`survey_reference`);

CREATE UNIQUE INDEX `carbon_certificates_certificate_number_unique` ON `carbon_certificates` (`certificate_number`);

CREATE UNIQUE INDEX `cargo_claims_claim_number_unique` ON `cargo_claims` (`claim_number`);

CREATE UNIQUE INDEX `carrier_invoices_invoice_number_unique` ON `carrier_invoices` (`invoice_number`);

CREATE UNIQUE INDEX `carta_porte_declarations_id_ccp_unique` ON `carta_porte_declarations` (`id_ccp`);

CREATE UNIQUE INDEX `cbam_declarations_declaration_number_unique` ON `cbam_declarations` (`declaration_number`);

CREATE UNIQUE INDEX `cbam_goods_catalog_cn_code_unique` ON `cbam_goods_catalog` (`cn_code`);

CREATE UNIQUE INDEX `charter_parties_fixture_reference_unique` ON `charter_parties` (`fixture_reference`);

CREATE INDEX `ciq_awb_idx` ON `cargo_iq_milestones` (`awb_number`);

CREATE INDEX `ciq_code_idx` ON `cargo_iq_milestones` (`milestone_code`);

CREATE INDEX `ciq_sla_idx` ON `cargo_iq_milestones` (`sla_status`);

CREATE UNIQUE INDEX `cold_chain_profiles_code_unique` ON `cold_chain_profiles` (`code`);

CREATE UNIQUE INDEX `cold_chain_shipments_tracking_number_unique` ON `cold_chain_shipments` (`tracking_number`);

CREATE UNIQUE INDEX `commercial_contracts_contract_number_unique` ON `commercial_contracts` (`contract_number`);

CREATE INDEX `cp_id_ccp_idx` ON `carta_porte_declarations` (`id_ccp`);

CREATE INDEX `cp_shipment_idx` ON `carta_porte_declarations` (`shipment_id`);

CREATE INDEX customs_decl_shipment_created_idx ON customs_declarations (shipment_id, created_at);

CREATE UNIQUE INDEX `customs_discharge_declarations_discharge_declaration_number_unique` ON `customs_discharge_declarations` (`discharge_declaration_number`);

CREATE UNIQUE INDEX `customs_facilities_facility_code_unique` ON `customs_facilities` (`facility_code`);

CREATE UNIQUE INDEX `customs_guarantees_guarantee_reference_number_unique` ON `customs_guarantees` (`guarantee_reference_number`);

CREATE UNIQUE INDEX `customs_inventory_lots_lot_number_unique` ON `customs_inventory_lots` (`lot_number`);

CREATE UNIQUE INDEX `data_sources_code_idx` ON `data_sources` (`code`);

CREATE UNIQUE INDEX `data_sources_code_unique` ON `data_sources` (`code`);

CREATE INDEX `data_sources_type_idx` ON `data_sources` (`type`);

CREATE INDEX `demurrage_disp_invoice_idx` ON `demurrage_disputes` (`invoice_id`);

CREATE INDEX `demurrage_inv_bl_idx` ON `demurrage_invoices` (`bill_of_lading`);

CREATE INDEX `demurrage_inv_container_idx` ON `demurrage_invoices` (`container_number`);

CREATE INDEX `demurrage_inv_shipment_idx` ON `demurrage_invoices` (`shipment_id`);

CREATE INDEX `demurrage_susp_invoice_idx` ON `demurrage_suspensions` (`invoice_id`);

CREATE UNIQUE INDEX `dg_emergency_cards_card_reference_unique` ON `dg_emergency_cards` (`card_reference`);

CREATE UNIQUE INDEX `dg_packing_certificates_certificate_reference_unique` ON `dg_packing_certificates` (`certificate_reference`);

CREATE UNIQUE INDEX `dg_shipments_shipment_reference_unique` ON `dg_shipments` (`shipment_reference`);

CREATE UNIQUE INDEX `drayage_transport_orders_order_number_unique` ON `drayage_transport_orders` (`order_number`);

CREATE INDEX `efirma_doc_idx` ON `efirma_audit_stamps` (`document_id`);

CREATE INDEX `efirma_serial_idx` ON `efirma_audit_stamps` (`certificate_serial`);

CREATE INDEX `efirma_shipment_idx` ON `efirma_audit_stamps` (`shipment_id`);

CREATE INDEX entity_source_links_entity_idx ON entity_source_links(entity_type, entity_id);

CREATE INDEX `entity_source_links_record_idx` ON `entity_source_links` (`source_record_id`);

CREATE INDEX `erp_log_po_idx` ON `erp_sync_logs` (`po_id`);

CREATE INDEX `erp_log_status_idx` ON `erp_sync_logs` (`status`);

CREATE INDEX `erp_po_num_idx` ON `erp_purchase_orders` (`po_number`);

CREATE UNIQUE INDEX `erp_purchase_orders_po_number_unique` ON `erp_purchase_orders` (`po_number`);

CREATE INDEX `erp_shipment_idx` ON `erp_purchase_orders` (`shipment_id`);

CREATE INDEX `erp_system_idx` ON `erp_purchase_orders` (`erp_system`);

CREATE INDEX `escrow_shipment_idx` ON `smart_escrow_contracts` (`shipment_id`);

CREATE UNIQUE INDEX `forwarding_agent_networks_network_code_unique` ON `forwarding_agent_networks` (`network_code`);

CREATE UNIQUE INDEX `fuel_eu_pools_pool_code_unique` ON `fuel_eu_pools` (`pool_code`);

CREATE INDEX `fueleu_penalties_vessel_idx` ON `fuel_eu_penalties_ledger` (`vessel_id`);

CREATE INDEX `fueleu_penalties_year_idx` ON `fuel_eu_penalties_ledger` (`reporting_year`);

CREATE UNIQUE INDEX `ga_adjustments_adjustment_reference_unique` ON `ga_adjustments` (`adjustment_reference`);

CREATE UNIQUE INDEX `ga_cases_case_reference_unique` ON `ga_cases` (`case_reference`);

CREATE UNIQUE INDEX `ga_securities_security_reference_unique` ON `ga_securities` (`security_reference`);

CREATE UNIQUE INDEX `hs_codes_code_unique` ON `hs_codes` (`code`);

CREATE INDEX `idx_branch_offices_company` ON `branch_offices` (`company_id`);

CREATE INDEX `idx_branch_offices_un_locode` ON `branch_offices` (`un_locode`);

CREATE INDEX `idx_bulk_draft_op` ON `bulk_draft_surveys` (`operation_id`);

CREATE INDEX `idx_bulk_grain_ref` ON `bulk_grain_stability_plans` (`plan_reference`);

CREATE INDEX `idx_bulk_imsbc_ref` ON `bulk_imsbc_declarations` (`declaration_reference`);

CREATE INDEX `idx_bulk_ullage_ref` ON `bulk_ullage_surveys` (`survey_reference`);

CREATE INDEX `idx_bulk_vessel_imo` ON `bulk_vessel_operations` (`imo_number`);

CREATE INDEX `idx_bulk_vessel_port` ON `bulk_vessel_operations` (`port_name`);

CREATE INDEX `idx_container_iso_category` ON `container_iso_types` (`category`);

CREATE UNIQUE INDEX `idx_container_iso_industry_code` ON `container_iso_types` (`industry_code`);

CREATE INDEX `idx_container_iso_length` ON `container_iso_types` (`nominal_length_ft`);

CREATE INDEX idx_dcsa_events_bkg ON dcsa_events_log(carrier_booking_reference);

CREATE INDEX idx_dcsa_events_eq ON dcsa_events_log(equipment_reference);

CREATE INDEX idx_dcsa_events_type ON dcsa_events_log(event_type);

CREATE INDEX idx_dcsa_subs_carrier ON dcsa_event_subscriptions(carrier_code);

CREATE INDEX `idx_departments_branch` ON `departments` (`branch_id`);

CREATE INDEX `idx_departments_code` ON `departments` (`code`);

CREATE INDEX `idx_invoices_type_created_at` ON `invoices` (`type`, `created_at`);

CREATE INDEX idx_op_intel_cockpit_v2_shipment_id ON op_intelligence_cockpit_items_v2(shipment_id);

CREATE INDEX idx_op_intel_cockpit_v2_status_priority ON op_intelligence_cockpit_items_v2(status, is_blocked, priority, attention_score);

CREATE INDEX idx_op_intel_cockpit_v2_task_id ON op_intelligence_cockpit_items_v2(task_id);

CREATE INDEX idx_op_intel_cockpit_v2_urgency ON op_intelligence_cockpit_items_v2(urgency_bucket);

CREATE INDEX idx_op_intel_exc_v2_shipment ON op_intelligence_exceptions_v2(shipment_id);

CREATE INDEX idx_op_intel_exc_v2_status_sev ON op_intelligence_exceptions_v2(status, severity, is_blocking);

CREATE INDEX idx_op_intel_exc_v2_team ON op_intelligence_exceptions_v2(assigned_team);

CREATE INDEX idx_op_intel_shp360_v2_health ON op_intelligence_shipment_360_views_v2(health_status);

CREATE INDEX idx_op_intel_shp360_v2_lifecycle ON op_intelligence_shipment_360_views_v2(lifecycle);

CREATE INDEX idx_op_intel_shp360_v2_ref ON op_intelligence_shipment_360_views_v2(shipment_reference);

CREATE INDEX idx_op_intel_shp360_v2_service_type ON op_intelligence_shipment_360_views_v2(service_type);

CREATE INDEX idx_op_intel_shp360_v2_wf_inst ON op_intelligence_shipment_360_views_v2(workflow_instance_id);

CREATE UNIQUE INDEX `idx_role_permissions_unique` ON `role_permissions` (`role_id`,`permission_id`);

CREATE INDEX `idx_shipment_event_logs_shipment_id` ON `shipment_event_logs` (`shipment_id`);

CREATE INDEX `idx_shipments_status_created_at` ON `shipments` (`status`, `created_at`);

CREATE INDEX `idx_unlocode_country` ON `unlocode_locations` (`country_code`);

CREATE INDEX `idx_unlocode_iata` ON `unlocode_locations` (`iata_code`);

CREATE INDEX `idx_unlocode_is_airport` ON `unlocode_locations` (`is_airport`);

CREATE INDEX `idx_unlocode_is_multimodal` ON `unlocode_locations` (`is_multimodal_icd`);

CREATE INDEX `idx_unlocode_is_port` ON `unlocode_locations` (`is_port`);

CREATE INDEX `idx_unlocode_is_rail` ON `unlocode_locations` (`is_rail_terminal`);

CREATE INDEX `idx_unlocode_name_wo_diacritics` ON `unlocode_locations` (`name_wo_diacritics`);

CREATE INDEX `idx_user_station_assignments_user` ON `user_station_assignments` (`user_id`,`branch_id`);

CREATE INDEX `insetting_alloc_hash_idx` ON `carbon_insetting_allocations` (`block_hash_sha256`);

CREATE INDEX `insetting_alloc_shipment_idx` ON `carbon_insetting_allocations` (`shipment_id`);

CREATE INDEX `insetting_alloc_token_idx` ON `carbon_insetting_allocations` (`token_id`);

CREATE INDEX `insetting_tokens_fuel_idx` ON `carbon_insetting_tokens` (`fuel_id`);

CREATE INDEX `insetting_tokens_status_idx` ON `carbon_insetting_tokens` (`status`);

CREATE UNIQUE INDEX `insurance_bordereaux_bordereau_reference_unique` ON `insurance_bordereaux` (`bordereau_reference`);

CREATE UNIQUE INDEX `insurance_certificates_certificate_number_unique` ON `insurance_certificates` (`certificate_number`);

CREATE UNIQUE INDEX `insurance_claims_settlements_claim_reference_unique` ON `insurance_claims_settlements` (`claim_reference`);

CREATE UNIQUE INDEX `insurance_open_policies_policy_number_unique` ON `insurance_open_policies` (`policy_number`);

CREATE UNIQUE INDEX `inventory_items_sku_unique` ON `inventory_items` (`sku`);

CREATE UNIQUE INDEX `invoices_invoiceNumber_unique` ON `invoices` (`invoiceNumber`);

CREATE UNIQUE INDEX `iot_devices_device_code_unique` ON `iot_devices` (`device_code`);

CREATE UNIQUE INDEX `laytime_calculations_calculation_reference_unique` ON `laytime_calculations` (`calculation_reference`);

CREATE UNIQUE INDEX location_aliases_alias_unique ON location_aliases (alias);

CREATE UNIQUE INDEX `marine_fuels_fuel_code_unique` ON `marine_fuels` (`fuel_code`);

CREATE UNIQUE INDEX `marine_vessels_imo_number_unique` ON `marine_vessels` (`imo_number`);

CREATE UNIQUE INDEX `marine_voyages_voyage_reference_number_unique` ON `marine_voyages` (`voyage_reference_number`);

CREATE INDEX `mletr_doc_idx` ON `mletr_transferable_records` (`document_id`);

CREATE INDEX `mletr_ledger_hash_idx` ON `mletr_endorsements_ledger` (`tx_hash`);

CREATE INDEX `mletr_ledger_rec_idx` ON `mletr_endorsements_ledger` (`record_id`);

CREATE INDEX `mletr_ledger_seq_idx` ON `mletr_endorsements_ledger` (`record_id`,`block_number`);

CREATE INDEX `mletr_ref_idx` ON `mletr_transferable_records` (`document_reference`);

CREATE INDEX `mletr_shipment_idx` ON `mletr_transferable_records` (`shipment_id`);

CREATE INDEX `mletr_status_idx` ON `mletr_transferable_records` (`status`);

CREATE INDEX `ocean_bkg_booking_idx` ON `ocean_booking_details` (`booking_id`);

CREATE INDEX `ocean_bkg_shipment_idx` ON `ocean_booking_details` (`shipment_id`);

CREATE UNIQUE INDEX `permissions_code_unique` ON `permissions` (`code`);

CREATE UNIQUE INDEX `rail_consignments_cim_number_unique` ON `rail_consignments` (`cim_number`);

CREATE UNIQUE INDEX `rail_corridors_code_unique` ON `rail_corridors` (`code`);

CREATE UNIQUE INDEX `rail_terminals_uic_station_code_unique` ON `rail_terminals` (`uic_station_code`);

CREATE UNIQUE INDEX `rail_train_consists_train_run_number_unique` ON `rail_train_consists` (`train_run_number`);

CREATE UNIQUE INDEX `rail_wagons_uic_wagon_number_unique` ON `rail_wagons` (`uic_wagon_number`);

CREATE UNIQUE INDEX `road_consignments_consignment_number_unique` ON `road_consignments` (`consignment_number`);

CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);

CREATE UNIQUE INDEX `smart_escrow_contracts_shipment_id_unique` ON `smart_escrow_contracts` (`shipment_id`);

CREATE INDEX `source_records_hash_idx` ON `source_records` (`sha256_hash`);

CREATE INDEX source_records_src_ext_idx ON source_records(source_id, external_id);

CREATE UNIQUE INDEX `statement_of_facts_sof_reference_unique` ON `statement_of_facts` (`sof_reference`);

CREATE INDEX `stowage_container_idx` ON `container_stowage_plans` (`container_id`);

CREATE INDEX `stowage_shipment_idx` ON `container_stowage_plans` (`shipment_id`);

CREATE UNIQUE INDEX `time_charter_off_hires_off_hire_reference_unique` ON `time_charter_off_hires` (`off_hire_reference`);

CREATE UNIQUE INDEX `tracked_assets_asset_code_unique` ON `tracked_assets` (`asset_code`);

CREATE UNIQUE INDEX `trade_credit_instruments_instrument_reference_unique` ON `trade_credit_instruments` (`instrument_reference`);

CREATE UNIQUE INDEX `treasury_fx_positions_currency_unique` ON `treasury_fx_positions` (`currency`);

CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
