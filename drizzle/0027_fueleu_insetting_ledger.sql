CREATE TABLE IF NOT EXISTS `carbon_insetting_tokens` (
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insetting_tokens_fuel_idx` ON `carbon_insetting_tokens` (`fuel_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insetting_tokens_status_idx` ON `carbon_insetting_tokens` (`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carbon_insetting_allocations` (
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insetting_alloc_token_idx` ON `carbon_insetting_allocations` (`token_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insetting_alloc_shipment_idx` ON `carbon_insetting_allocations` (`shipment_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insetting_alloc_hash_idx` ON `carbon_insetting_allocations` (`block_hash_sha256`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `fuel_eu_penalties_ledger` (
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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fueleu_penalties_vessel_idx` ON `fuel_eu_penalties_ledger` (`vessel_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `fueleu_penalties_year_idx` ON `fuel_eu_penalties_ledger` (`reporting_year`);
