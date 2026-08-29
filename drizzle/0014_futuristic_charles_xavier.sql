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
--> statement-breakpoint
CREATE UNIQUE INDEX `aeo_audits_audit_reference_unique` ON `aeo_audits` (`audit_reference`);--> statement-breakpoint
CREATE TABLE `aeo_business_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_name` text NOT NULL,
	`partner_vat_number` text NOT NULL,
	`partner_type` text NOT NULL,
	`country_code` text DEFAULT 'ES' NOT NULL,
	`has_aeo_certification` integer DEFAULT false NOT NULL,
	`aeo_certificate_number` text,
	`has_ctpat_certification` integer DEFAULT false NOT NULL,
	`ctpat_svi_number` text,
	`iso28000_certified` integer DEFAULT false NOT NULL,
	`security_questionnaire_score` real DEFAULT 0 NOT NULL,
	`risk_level` text DEFAULT 'LOW_RISK' NOT NULL,
	`last_assessment_date` text NOT NULL,
	`reassessment_due_date` text NOT NULL,
	`status` text DEFAULT 'APPROVED_PARTNER' NOT NULL,
	`remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aeo_business_partners_partner_vat_number_unique` ON `aeo_business_partners` (`partner_vat_number`);--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `aeo_security_seals_seal_number_unique` ON `aeo_security_seals` (`seal_number`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `aeo_seven_point_inspections_inspection_reference_unique` ON `aeo_seven_point_inspections` (`inspection_reference`);