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
--> statement-breakpoint
CREATE UNIQUE INDEX `cold_chain_profiles_code_unique` ON `cold_chain_profiles` (`code`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `cold_chain_shipments_tracking_number_unique` ON `cold_chain_shipments` (`tracking_number`);--> statement-breakpoint
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
