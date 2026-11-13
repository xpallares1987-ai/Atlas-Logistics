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
--> statement-breakpoint
CREATE UNIQUE INDEX `customs_discharge_declarations_discharge_declaration_number_unique` ON `customs_discharge_declarations` (`discharge_declaration_number`);--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customs_facilities_facility_code_unique` ON `customs_facilities` (`facility_code`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `customs_guarantees_guarantee_reference_number_unique` ON `customs_guarantees` (`guarantee_reference_number`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `customs_inventory_lots_lot_number_unique` ON `customs_inventory_lots` (`lot_number`);--> statement-breakpoint
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
