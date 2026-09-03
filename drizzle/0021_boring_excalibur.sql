CREATE TABLE `carbon_calculation_legs` (
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
CREATE TABLE `carbon_calculations` (
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
CREATE TABLE `carbon_certificates` (
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
CREATE UNIQUE INDEX `carbon_certificates_certificate_number_unique` ON `carbon_certificates` (`certificate_number`);--> statement-breakpoint
CREATE TABLE `carbon_offset_projects` (
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