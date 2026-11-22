CREATE TABLE `ais_vessel_positions` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`vessel_imo` text NOT NULL,
	`vessel_name` text,
	`call_sign` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`speed_knots` real DEFAULT 0 NOT NULL,
	`heading` real,
	`navigational_status` text DEFAULT 'UNDERWAY' NOT NULL,
	`destination_locode` text,
	`eta_date_time` text,
	`draught` real,
	`source_provider` text DEFAULT 'SPIRE' NOT NULL,
	`timestamp` integer NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`tags` text
);
--> statement-breakpoint
CREATE TABLE `carrier_telemetry_ingestion_logs` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`feed_type` text NOT NULL,
	`carrier_code` text,
	`event_fingerprint` text NOT NULL UNIQUE,
	`raw_payload` text NOT NULL,
	`http_status` integer DEFAULT 200 NOT NULL,
	`processing_status` text DEFAULT 'PROCESSED' NOT NULL,
	`matched_booking_id` text,
	`matched_po_id` text,
	`matched_container_number` text,
	`milestone_event_id` text,
	`exception_id` text,
	`error_message` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_carrier_telemetry_ingestion_logs_matched_booking_id_bookings_id_fk` FOREIGN KEY (`matched_booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_carrier_telemetry_ingestion_logs_matched_po_id_purchase_orders_id_fk` FOREIGN KEY (`matched_po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_carrier_telemetry_ingestion_logs_milestone_event_id_supply_chain_milestone_events_id_fk` FOREIGN KEY (`milestone_event_id`) REFERENCES `supply_chain_milestone_events`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_carrier_telemetry_ingestion_logs_exception_id_supply_chain_exceptions_id_fk` FOREIGN KEY (`exception_id`) REFERENCES `supply_chain_exceptions`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `port_geofences` (
	`locode` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`port_name` text NOT NULL,
	`country_code` text NOT NULL,
	`center_lat` real NOT NULL,
	`center_lon` real NOT NULL,
	`radius_km` real DEFAULT 25 NOT NULL,
	`berth_polygon_json` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE INDEX `ais_vessel_imo_idx` ON `ais_vessel_positions` (`vessel_imo`);--> statement-breakpoint
CREATE INDEX `ais_dest_locode_idx` ON `ais_vessel_positions` (`destination_locode`);--> statement-breakpoint
CREATE INDEX `ais_timestamp_idx` ON `ais_vessel_positions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `ais_tenant_idx` ON `ais_vessel_positions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `telemetry_fp_idx` ON `carrier_telemetry_ingestion_logs` (`event_fingerprint`);--> statement-breakpoint
CREATE INDEX `telemetry_carrier_idx` ON `carrier_telemetry_ingestion_logs` (`carrier_code`);--> statement-breakpoint
CREATE INDEX `telemetry_status_idx` ON `carrier_telemetry_ingestion_logs` (`processing_status`);--> statement-breakpoint
CREATE INDEX `telemetry_bkg_idx` ON `carrier_telemetry_ingestion_logs` (`matched_booking_id`);--> statement-breakpoint
CREATE INDEX `telemetry_po_idx` ON `carrier_telemetry_ingestion_logs` (`matched_po_id`);--> statement-breakpoint
CREATE INDEX `telemetry_tenant_idx` ON `carrier_telemetry_ingestion_logs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `geofence_country_idx` ON `port_geofences` (`country_code`);--> statement-breakpoint
CREATE INDEX `geofence_tenant_idx` ON `port_geofences` (`tenant_id`);