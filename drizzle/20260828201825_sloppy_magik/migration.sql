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
--> statement-breakpoint
CREATE UNIQUE INDEX `rail_consignments_cim_number_unique` ON `rail_consignments` (`cim_number`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `rail_corridors_code_unique` ON `rail_corridors` (`code`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `rail_terminals_uic_station_code_unique` ON `rail_terminals` (`uic_station_code`);--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `rail_train_consists_train_run_number_unique` ON `rail_train_consists` (`train_run_number`);--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE UNIQUE INDEX `rail_wagons_uic_wagon_number_unique` ON `rail_wagons` (`uic_wagon_number`);