ALTER TABLE `companies` ADD COLUMN `group_code` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `sector` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `headquarters_country` text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `address_types` (
	`code` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `address_identifiers` (
	`id` text PRIMARY KEY,
	`address_id` text NOT NULL,
	`scheme` text NOT NULL,
	`value` text NOT NULL,
	`transport_mode` text,
	`is_primary` integer DEFAULT true,
	`issued_by` text,
	`valid_from` text,
	`valid_to` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_address_identifiers_address_id_addresses_id_fk` FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `container_iso_types` (
	`iso_code` text PRIMARY KEY,
	`industry_code` text NOT NULL,
	`category` text NOT NULL,
	`nominal_length_ft` real NOT NULL,
	`nominal_height_ft` real NOT NULL,
	`nominal_width_ft` real DEFAULT 8 NOT NULL,
	`external_length_mm` integer NOT NULL,
	`external_width_mm` integer NOT NULL,
	`external_height_mm` integer NOT NULL,
	`internal_length_mm` integer NOT NULL,
	`internal_width_mm` integer NOT NULL,
	`internal_height_mm` integer NOT NULL,
	`door_opening_width_mm` integer,
	`door_opening_height_mm` integer,
	`tare_weight_kg` real NOT NULL,
	`max_payload_kg` real NOT NULL,
	`max_gross_weight_kg` real NOT NULL,
	`cubic_capacity_cbm` real NOT NULL,
	`teu_factor` real NOT NULL,
	`is_reefer` integer DEFAULT false NOT NULL,
	`has_controlled_atmosphere` integer DEFAULT false NOT NULL,
	`is_ventilated` integer DEFAULT false NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_container_iso_industry_code` ON `container_iso_types` (`industry_code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_container_iso_category` ON `container_iso_types` (`category`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_container_iso_length` ON `container_iso_types` (`nominal_length_ft`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `unlocode_locations` (
	`un_locode` text PRIMARY KEY,
	`country_code` text NOT NULL,
	`location_code` text NOT NULL,
	`name` text NOT NULL,
	`name_wo_diacritics` text,
	`subdivision_code` text,
	`function_classifier` text NOT NULL,
	`is_port` integer DEFAULT false NOT NULL,
	`is_rail_terminal` integer DEFAULT false NOT NULL,
	`is_road_terminal` integer DEFAULT false NOT NULL,
	`is_airport` integer DEFAULT false NOT NULL,
	`is_postal_hub` integer DEFAULT false NOT NULL,
	`is_multimodal_icd` integer DEFAULT false NOT NULL,
	`is_border_crossing` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'RL' NOT NULL,
	`change_code` text,
	`release_date_yymm` text,
	`iata_code` text,
	`raw_coordinates` text,
	`latitude` real,
	`longitude` real,
	`remarks` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_unlocode_country` ON `unlocode_locations` (`country_code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_unlocode_name_wo_diacritics` ON `unlocode_locations` (`name_wo_diacritics`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_unlocode_iata` ON `unlocode_locations` (`iata_code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_unlocode_is_port` ON `unlocode_locations` (`is_port`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_unlocode_is_airport` ON `unlocode_locations` (`is_airport`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_unlocode_is_rail` ON `unlocode_locations` (`is_rail_terminal`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_unlocode_is_multimodal` ON `unlocode_locations` (`is_multimodal_icd`);
