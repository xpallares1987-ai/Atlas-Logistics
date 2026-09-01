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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `insurance_bordereaux_bordereau_reference_unique` ON `insurance_bordereaux` (`bordereau_reference`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `insurance_certificates_certificate_number_unique` ON `insurance_certificates` (`certificate_number`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `insurance_claims_settlements_claim_reference_unique` ON `insurance_claims_settlements` (`claim_reference`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `insurance_open_policies_policy_number_unique` ON `insurance_open_policies` (`policy_number`);