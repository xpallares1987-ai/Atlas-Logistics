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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `cbam_declarations_declaration_number_unique` ON `cbam_declarations` (`declaration_number`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `cbam_goods_catalog_cn_code_unique` ON `cbam_goods_catalog` (`cn_code`);--> statement-breakpoint
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
