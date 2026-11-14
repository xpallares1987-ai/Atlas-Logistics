ALTER TABLE `companies` ADD COLUMN `group_code` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `sector` text;
--> statement-breakpoint
ALTER TABLE `companies` ADD COLUMN `headquarters_country` text;
--> statement-breakpoint
PRAGMA foreign_keys = OFF;
--> statement-breakpoint
DROP TABLE IF EXISTS `schedules_new`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `schedules_new` (
  `id` text PRIMARY KEY,
  `lane_id` text NOT NULL REFERENCES `lanes`(`id`),
  `carrier_id` text NOT NULL REFERENCES `addresses`(`id`),
  `vessel_name` text,
  `voyage_number` text,
  `departure_date` integer NOT NULL,
  `arrival_date` integer NOT NULL,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now')),
  `updated_at` integer,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `is_active` integer NOT NULL DEFAULT 1,
  `metadata` text,
  `tags` text
);
--> statement-breakpoint
INSERT OR IGNORE INTO `schedules_new` SELECT * FROM `schedules`;
--> statement-breakpoint
DROP TABLE IF EXISTS `schedules`;
--> statement-breakpoint
ALTER TABLE `schedules_new` RENAME TO `schedules`;
--> statement-breakpoint
DROP TABLE IF EXISTS `rates_new`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rates_new` (
  `id` text PRIMARY KEY,
  `carrier_id` text NOT NULL REFERENCES `addresses`(`id`),
  `lane_id` text NOT NULL REFERENCES `lanes`(`id`),
  `containerType` text NOT NULL,
  `baseRate` real NOT NULL,
  `baf` real NOT NULL DEFAULT 0,
  `pss` real NOT NULL DEFAULT 0,
  `thc` real NOT NULL DEFAULT 0,
  `service_line` text NOT NULL DEFAULT 'Standard',
  `transitDays` integer NOT NULL,
  `valid_from` integer,
  `valid_to` integer,
  `company_id` text REFERENCES `companies`(`id`),
  `created_by` text REFERENCES `users`(`id`),
  `updated_by` text REFERENCES `users`(`id`),
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now')),
  `updated_at` integer,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `is_active` integer NOT NULL DEFAULT 1,
  `metadata` text,
  `tags` text,
  CONSTRAINT `rates_dates_check` CHECK (valid_to > valid_from),
  CONSTRAINT `rates_base_check` CHECK (baseRate >= 0)
);
--> statement-breakpoint
INSERT OR IGNORE INTO `rates_new` SELECT * FROM `rates`;
--> statement-breakpoint
DROP TABLE IF EXISTS `rates`;
--> statement-breakpoint
ALTER TABLE `rates_new` RENAME TO `rates`;
--> statement-breakpoint
DROP TABLE IF EXISTS `costs_new`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `costs_new` (
  `id` text PRIMARY KEY,
  `shipment_id` text NOT NULL REFERENCES `shipments`(`id`),
  `vendor_id` text REFERENCES `addresses`(`id`),
  `amount` real NOT NULL,
  `currency` text NOT NULL,
  `description` text,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now')),
  `updated_at` integer,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `is_active` integer NOT NULL DEFAULT 1,
  `metadata` text,
  `tags` text,
  CONSTRAINT `costs_amount_check` CHECK (amount >= 0)
);
--> statement-breakpoint
INSERT OR IGNORE INTO `costs_new` SELECT * FROM `costs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `costs`;
--> statement-breakpoint
ALTER TABLE `costs_new` RENAME TO `costs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `rate_import_batches_new`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_import_batches_new` (
  `id` text PRIMARY KEY,
  `file_name` text NOT NULL,
  `carrier_id` text REFERENCES `addresses`(`id`),
  `total_rows` integer NOT NULL,
  `inserted_count` integer NOT NULL DEFAULT 0,
  `updated_count` integer NOT NULL DEFAULT 0,
  `failed_count` integer NOT NULL DEFAULT 0,
  `status` text NOT NULL DEFAULT 'COMPLETED',
  `errors_json` text,
  `imported_by` text REFERENCES `users`(`id`),
  `created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `rate_import_batches_new` SELECT * FROM `rate_import_batches`;
--> statement-breakpoint
DROP TABLE IF EXISTS `rate_import_batches`;
--> statement-breakpoint
ALTER TABLE `rate_import_batches_new` RENAME TO `rate_import_batches`;
--> statement-breakpoint
DROP TABLE IF EXISTS `customs_declarations_new`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customs_declarations_new` (
  `id` text PRIMARY KEY,
  `shipment_id` text NOT NULL REFERENCES `shipments`(`id`),
  `broker_id` text REFERENCES `addresses`(`id`),
  `hs_code_id` text REFERENCES `hs_codes`(`id`),
  `bl_number` text,
  `type` text DEFAULT 'Import',
  `duties_amount` real,
  `taxes_amount` real,
  `status` text NOT NULL,
  `ai_risk_score` integer,
  `ai_risk_flag` text,
  `created_at` integer NOT NULL DEFAULT (strftime('%s', 'now')),
  `updated_at` integer,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `is_active` integer NOT NULL DEFAULT 1,
  `metadata` text,
  `tags` text,
  `dua_number` text,
  `customs_value` real,
  `total_payable` real,
  `risk_score` integer,
  `risk_flags` text,
  `eori_number` text,
  `origin_country` text,
  `destination_country` text,
  `dua_data` text
);
--> statement-breakpoint
INSERT OR IGNORE INTO `customs_declarations_new` SELECT * FROM `customs_declarations`;
--> statement-breakpoint
DROP TABLE IF EXISTS `customs_declarations`;
--> statement-breakpoint
ALTER TABLE `customs_declarations_new` RENAME TO `customs_declarations`;
--> statement-breakpoint
DROP TABLE IF EXISTS `destination_agents`;
--> statement-breakpoint
DROP TABLE IF EXISTS `customs_brokers`;
--> statement-breakpoint
DROP TABLE IF EXISTS `carriers`;
--> statement-breakpoint
PRAGMA foreign_keys = ON;
--> statement-breakpoint
INSERT OR IGNORE INTO `companies` (`id`, `name`, `tax_id`, `credit_limit`, `group_code`, `is_active`)
VALUES ('c-1', 'Atlas Global Freight Forwarding S.L.', 'ESB99887766', 5000000, 'HOLDING_ATLAS', 1);
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
INSERT OR IGNORE INTO `address_types` (`code`, `name`, `description`) VALUES
('CUS', 'Customer', 'Beneficial cargo owner (BCO), shipper, importer, exporter, or consignee party.'),
('CB', 'Customs Broker', 'Licensed customs house broker, fiscal representative, and tariff clearance agency.'),
('AG', 'Agent', 'Port agency, handling agent, surveyor, or regional logistics representative.'),
('HAU', 'Haulier', 'Road transport operator, drayage carrier, and intermodal trucking fleet.'),
('CAR', 'Carrier', 'Vessel-operating common carrier (VOCC), airline, or rail operator.'),
('INS', 'Insurance', 'Marine cargo insurer, P&I club, underwriter, or claims average adjuster.'),
('CAA', 'Carrier Agent', 'Authorized liner shipping agency representing an ocean or air carrier at port.'),
('WH', 'Warehouse', 'Logistics distribution center, bonded warehouse, CFS, or inland container depot.'),
('FW', 'Forwarder', 'Freight forwarder, NVOCC, or 3PL/4PL logistics orchestrator.'),
('TRM', 'Terminal', 'Maritime container terminal, stevedoring facility, or air cargo terminal.');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`address_type` text NOT NULL,
	`company_name` text NOT NULL,
	`trade_name` text,
	`tax_id` text,
	`street_1` text NOT NULL,
	`street_2` text,
	`zip_code` text NOT NULL,
	`city` text NOT NULL,
	`federal_state` text,
	`country` text NOT NULL,
	`un_locode` text,
	`is_default_shipper` integer DEFAULT 0,
	`is_default_consignee` integer DEFAULT 0,
	`is_default_notify` integer DEFAULT 0,
	`notes` text,
	`lat` real,
	`lon` real,
	`formatted_address` text,
	`verification_status` text DEFAULT 'NOT_CHECKED',
	`verification_provider` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`address_type`) REFERENCES `address_types`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `address_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`address_id` text NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`mobile` text,
	`role_category` text DEFAULT 'OPERATIONS',
	`job_title` text,
	`is_primary` integer DEFAULT 0,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE cascade
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
