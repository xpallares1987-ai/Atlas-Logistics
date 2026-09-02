CREATE TABLE `bulk_draft_surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`survey_type` text NOT NULL,
	`survey_date` text NOT NULL,
	`surveyor_name` text NOT NULL,
	`chief_officer_name` text NOT NULL,
	`forward_draft_port` real NOT NULL,
	`forward_draft_starboard` real NOT NULL,
	`aft_draft_port` real NOT NULL,
	`aft_draft_starboard` real NOT NULL,
	`mid_draft_port` real NOT NULL,
	`mid_draft_starboard` real NOT NULL,
	`forward_mean_draft` real NOT NULL,
	`aft_mean_draft` real NOT NULL,
	`mid_mean_draft` real NOT NULL,
	`apparent_trim` real NOT NULL,
	`quarter_mean_draft` real NOT NULL,
	`length_between_perpendiculars` real NOT NULL,
	`longitudinal_center_of_flotation` real NOT NULL,
	`tonnes_per_cm_immersion` real NOT NULL,
	`moment_to_change_trim_1cm` real NOT NULL,
	`measured_water_density` real NOT NULL,
	`hydrostatic_displacement` real NOT NULL,
	`first_trim_correction` real NOT NULL,
	`second_trim_correction` real NOT NULL,
	`corrected_displacement` real NOT NULL,
	`ballast_water_deductible` real DEFAULT 0 NOT NULL,
	`fuel_oil_deductible` real DEFAULT 0 NOT NULL,
	`diesel_oil_deductible` real DEFAULT 0 NOT NULL,
	`fresh_water_deductible` real DEFAULT 0 NOT NULL,
	`sludge_bilge_deductible` real DEFAULT 0 NOT NULL,
	`total_deductibles` real NOT NULL,
	`net_displacement` real NOT NULL,
	`calculated_cargo_tonnage` real,
	`status` text DEFAULT 'CERTIFIED_BY_SURVEYOR' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bulk_draft_op` ON `bulk_draft_surveys` (`operation_id`);--> statement-breakpoint
CREATE TABLE `bulk_grain_stability_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`plan_reference` text NOT NULL,
	`grain_type` text NOT NULL,
	`total_grain_tonnage` real NOT NULL,
	`stowage_factor_m3_per_tonne` real NOT NULL,
	`total_volumetric_heeling_moment` real NOT NULL,
	`departure_displacement` real NOT NULL,
	`departure_kg` real NOT NULL,
	`departure_gm0` real NOT NULL,
	`corrected_heeling_moment` real NOT NULL,
	`residual_heel_angle_degrees` real NOT NULL,
	`residual_dynamical_stability_area` real NOT NULL,
	`is_imo_grain_code_compliant` integer NOT NULL,
	`approved_by_master_name` text NOT NULL,
	`approval_date` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bulk_grain_stability_plans_plan_reference_unique` ON `bulk_grain_stability_plans` (`plan_reference`);--> statement-breakpoint
CREATE INDEX `idx_bulk_grain_ref` ON `bulk_grain_stability_plans` (`plan_reference`);--> statement-breakpoint
CREATE TABLE `bulk_imsbc_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`declaration_reference` text NOT NULL,
	`bulk_cargo_shipping_name` text NOT NULL,
	`imsbc_group` text NOT NULL,
	`gross_weight_tonnes` real NOT NULL,
	`moisture_content_percentage` real NOT NULL,
	`flow_moisture_point_percentage` real,
	`transportable_moisture_limit` real,
	`is_liquefaction_compliant` integer NOT NULL,
	`angle_of_repose_degrees` real,
	`stowage_factor_m3_per_tonne` real NOT NULL,
	`shipper_name` text NOT NULL,
	`laboratory_test_date` text NOT NULL,
	`testing_laboratory_name` text NOT NULL,
	`declaration_status` text DEFAULT 'APPROVED_FOR_LOADING' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bulk_imsbc_declarations_declaration_reference_unique` ON `bulk_imsbc_declarations` (`declaration_reference`);--> statement-breakpoint
CREATE INDEX `idx_bulk_imsbc_ref` ON `bulk_imsbc_declarations` (`declaration_reference`);--> statement-breakpoint
CREATE TABLE `bulk_ullage_surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`survey_reference` text NOT NULL,
	`product_name` text NOT NULL,
	`tank_count` integer NOT NULL,
	`observed_average_temperature_celsius` real NOT NULL,
	`density_at_15_celsius` real NOT NULL,
	`api_gravity_at_60_fahrenheit` real,
	`total_observed_volume_m3` real NOT NULL,
	`total_free_water_volume_m3` real NOT NULL,
	`gross_observed_volume_m3` real NOT NULL,
	`volume_correction_factor_astm_54` real NOT NULL,
	`gross_standard_volume_m3` real NOT NULL,
	`net_standard_volume_m3` real NOT NULL,
	`metric_tonnes_in_air` real NOT NULL,
	`metric_tonnes_in_vacuum` real NOT NULL,
	`survey_date` text NOT NULL,
	`surveyor_company` text NOT NULL,
	`status` text DEFAULT 'CERTIFIED_COMPLIANT' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `bulk_vessel_operations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bulk_ullage_surveys_survey_reference_unique` ON `bulk_ullage_surveys` (`survey_reference`);--> statement-breakpoint
CREATE INDEX `idx_bulk_ullage_ref` ON `bulk_ullage_surveys` (`survey_reference`);--> statement-breakpoint
CREATE TABLE `bulk_vessel_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`vessel_name` text NOT NULL,
	`imo_number` text NOT NULL,
	`call_sign` text,
	`vessel_type` text NOT NULL,
	`port_name` text NOT NULL,
	`terminal_name` text NOT NULL,
	`berth_number` text NOT NULL,
	`cargo_category` text NOT NULL,
	`operation_type` text NOT NULL,
	`target_cargo_tonnage` real NOT NULL,
	`eta_date` text NOT NULL,
	`etd_date` text,
	`actual_commenced_date` text,
	`actual_completed_date` text,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bulk_vessel_imo` ON `bulk_vessel_operations` (`imo_number`);--> statement-breakpoint
CREATE INDEX `idx_bulk_vessel_port` ON `bulk_vessel_operations` (`port_name`);