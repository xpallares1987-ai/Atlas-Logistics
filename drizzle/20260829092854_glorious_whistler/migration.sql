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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `fuel_eu_pools_pool_code_unique` ON `fuel_eu_pools` (`pool_code`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `marine_fuels_fuel_code_unique` ON `marine_fuels` (`fuel_code`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `marine_vessels_imo_number_unique` ON `marine_vessels` (`imo_number`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `marine_voyages_voyage_reference_number_unique` ON `marine_voyages` (`voyage_reference_number`);