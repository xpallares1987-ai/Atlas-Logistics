CREATE TABLE `carrier_services` (
	`id` text PRIMARY KEY,
	`carrier_id` text NOT NULL,
	`service_code` text NOT NULL,
	`service_name` text NOT NULL,
	`transport_mode` text DEFAULT 'OCEAN' NOT NULL,
	`trade_lane` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_carrier_services_carrier_id_addresses_id_fk` FOREIGN KEY (`carrier_id`) REFERENCES `addresses`(`id`)
);
--> statement-breakpoint
CREATE TABLE `vessels` (
	`id` text PRIMARY KEY,
	`imo_number` text NOT NULL,
	`vessel_name` text NOT NULL,
	`flag` text,
	`capacity_teu` integer,
	`year_built` integer,
	`call_sign` text,
	`mmsi` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE TABLE `voyages` (
	`id` text PRIMARY KEY,
	`voyage_number` text NOT NULL,
	`vessel_id` text NOT NULL,
	`service_id` text,
	`direction` text DEFAULT 'EAST' NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_voyages_vessel_id_vessels_id_fk` FOREIGN KEY (`vessel_id`) REFERENCES `vessels`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_voyages_service_id_carrier_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `carrier_services`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `port_calls` (
	`id` text PRIMARY KEY,
	`voyage_id` text NOT NULL,
	`location_id` text,
	`unlocode` text NOT NULL,
	`terminal_code` text,
	`sequence` integer NOT NULL,
	`eta` integer,
	`etd` integer,
	`ata` integer,
	`atd` integer,
	`cy_cut_off` integer,
	`vgm_cut_off` integer,
	`si_cut_off` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_port_calls_voyage_id_voyages_id_fk` FOREIGN KEY (`voyage_id`) REFERENCES `voyages`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_port_calls_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_carrier_services_carrier_id` ON `carrier_services` (`carrier_id`);--> statement-breakpoint
CREATE INDEX `idx_carrier_services_code` ON `carrier_services` (`service_code`);--> statement-breakpoint
CREATE INDEX `idx_vessels_name` ON `vessels` (`vessel_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vessels_imo` ON `vessels` (`imo_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_voyages_vessel_voyage` ON `voyages` (`vessel_id`,`voyage_number`);--> statement-breakpoint
CREATE INDEX `idx_voyages_service_id` ON `voyages` (`service_id`);--> statement-breakpoint
CREATE INDEX `idx_voyages_status` ON `voyages` (`status`);--> statement-breakpoint
CREATE INDEX `idx_port_calls_voyage_sequence` ON `port_calls` (`voyage_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_port_calls_unlocode` ON `port_calls` (`unlocode`);
