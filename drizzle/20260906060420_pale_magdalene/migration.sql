CREATE TABLE IF NOT EXISTS `carbon_calculation_legs` (
	`id` text PRIMARY KEY NOT NULL,
	`calculation_id` text NOT NULL,
	`leg_order` integer NOT NULL,
	`origin_name` text NOT NULL,
	`destination_name` text NOT NULL,
	`mode` text NOT NULL,
	`distance_km` real NOT NULL,
	`weight_tonnes` real NOT NULL,
	`emission_factor_wtw` real NOT NULL,
	`emission_factor_ttw` real NOT NULL,
	`emission_factor_wtt` real NOT NULL,
	`leg_tco2e_wtw` real NOT NULL,
	`leg_tco2e_ttw` real NOT NULL,
	`leg_tco2e_wtt` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calculation_id`) REFERENCES `carbon_calculations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carbon_calculations` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text DEFAULT 'SHIPMENT' NOT NULL,
	`entity_id` text,
	`reference_code` text NOT NULL,
	`origin_city` text NOT NULL,
	`destination_city` text NOT NULL,
	`total_weight_kg` real NOT NULL,
	`total_distance_km` real NOT NULL,
	`total_tco2e_wtw` real NOT NULL,
	`total_tco2e_ttw` real NOT NULL,
	`total_tco2e_wtt` real NOT NULL,
	`carbon_intensity_gco2e_per_tkm` real NOT NULL,
	`status` text DEFAULT 'CALCULATED' NOT NULL,
	`offset_project_id` text,
	`offset_cost_eur` real,
	`certificate_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carbon_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`certificate_number` text NOT NULL,
	`calculation_id` text NOT NULL,
	`beneficiary_name` text NOT NULL,
	`project_id` text NOT NULL,
	`project_name` text NOT NULL,
	`project_standard` text NOT NULL,
	`offset_tco2e` real NOT NULL,
	`amount_paid_eur` real NOT NULL,
	`qr_validation_url` text NOT NULL,
	`issued_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`calculation_id`) REFERENCES `carbon_calculations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `carbon_offset_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `carbon_certificates_certificate_number_unique` ON `carbon_certificates` (`certificate_number`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carbon_offset_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`standard` text NOT NULL,
	`category` text NOT NULL,
	`country` text NOT NULL,
	`price_per_tco2e_eur` real NOT NULL,
	`available_credits_tco2e` real NOT NULL,
	`description` text NOT NULL,
	`image_url` text,
	`verification_registry_url` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `geofences` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`center_lat` real NOT NULL,
	`center_lng` real NOT NULL,
	`radius_meters` real NOT NULL,
	`polygon_coordinates_json` text,
	`trigger_on` text DEFAULT 'BOTH' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `iot_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code` text NOT NULL,
	`device_type` text NOT NULL,
	`battery_level_pct` integer DEFAULT 100 NOT NULL,
	`firmware_version` text DEFAULT 'v2.4.1' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`last_heartbeat_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `iot_devices_device_code_unique` ON `iot_devices` (`device_code`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `telemetry_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`severity` text NOT NULL,
	`alert_type` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`metric_value` text,
	`threshold_value` text,
	`created_at` text NOT NULL,
	`resolved_at` text,
	`resolved_by` text,
	FOREIGN KEY (`asset_id`) REFERENCES `tracked_assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `telemetry_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`device_id` text,
	`timestamp` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`speed_knots` real DEFAULT 0 NOT NULL,
	`heading_deg` real DEFAULT 0 NOT NULL,
	`altitude_meters` real DEFAULT 0 NOT NULL,
	`temperature_celsius` real,
	`humidity_pct` real,
	`shock_g_force` real DEFAULT 0 NOT NULL,
	`door_open` integer DEFAULT false NOT NULL,
	`seal_tampered` integer DEFAULT false NOT NULL,
	`battery_pct` integer DEFAULT 100 NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `tracked_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`device_id`) REFERENCES `iot_devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tracked_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_code` text NOT NULL,
	`name` text NOT NULL,
	`asset_type` text NOT NULL,
	`device_id` text,
	`current_lat` real NOT NULL,
	`current_lng` real NOT NULL,
	`current_speed_knots` real DEFAULT 0 NOT NULL,
	`current_heading_deg` real DEFAULT 0 NOT NULL,
	`current_altitude_meters` real DEFAULT 0 NOT NULL,
	`origin_name` text NOT NULL,
	`destination_name` text NOT NULL,
	`cargo_description` text NOT NULL,
	`cargo_category` text DEFAULT 'GENERAL' NOT NULL,
	`min_temp_celsius` real,
	`max_temp_celsius` real,
	`planned_eta` text NOT NULL,
	`predicted_eta` text NOT NULL,
	`status` text DEFAULT 'IN_TRANSIT' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`device_id`) REFERENCES `iot_devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tracked_assets_asset_code_unique` ON `tracked_assets` (`asset_code`);