CREATE TABLE `demurrage_disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`disputed_amount_usd` real NOT NULL,
	`revised_payable_usd` real NOT NULL,
	`fmc_rule_clause` text NOT NULL,
	`status` text DEFAULT 'SUBMITTED' NOT NULL,
	`formal_letter_payload` text,
	`submitted_at` integer,
	`resolved_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `demurrage_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `demurrage_disp_invoice_idx` ON `demurrage_disputes` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `demurrage_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`container_number` text NOT NULL,
	`carrier_scac` text NOT NULL,
	`carrier_name` text NOT NULL,
	`bill_of_lading` text NOT NULL,
	`pod` text NOT NULL,
	`terminal_name` text NOT NULL,
	`vessel_discharge_date` text,
	`gate_in_date` text,
	`gate_out_date` text,
	`available_date` text,
	`free_time_start_date` text,
	`free_time_end_date` text,
	`free_days_granted` integer DEFAULT 4 NOT NULL,
	`daily_rate_usd` real DEFAULT 150 NOT NULL,
	`total_invoiced_usd` real NOT NULL,
	`status` text DEFAULT 'ISSUED' NOT NULL,
	`fmc_compliant` integer DEFAULT true NOT NULL,
	`tariff_tiers_json` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `demurrage_inv_shipment_idx` ON `demurrage_invoices` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `demurrage_inv_container_idx` ON `demurrage_invoices` (`container_number`);--> statement-breakpoint
CREATE INDEX `demurrage_inv_bl_idx` ON `demurrage_invoices` (`bill_of_lading`);--> statement-breakpoint
CREATE TABLE `demurrage_suspensions` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days_suspended` integer NOT NULL,
	`reason` text NOT NULL,
	`justification_text` text,
	`evidence_document_id` text,
	`approved` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `demurrage_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `demurrage_susp_invoice_idx` ON `demurrage_suspensions` (`invoice_id`);--> statement-breakpoint
CREATE TABLE `ocean_booking_details` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`shipment_id` text NOT NULL,
	`carrier_scac` text NOT NULL,
	`service_contract_number` text,
	`cargo_cut_off` text,
	`vcs_cut_off` text,
	`doc_cut_off` text,
	`si_cut_off` text,
	`si_status` text DEFAULT 'DRAFT' NOT NULL,
	`draft_bl_status` text DEFAULT 'PENDING' NOT NULL,
	`hazardous_declaration` text,
	`special_instructions` text,
	`vgm_json` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ocean_bkg_booking_idx` ON `ocean_booking_details` (`booking_id`);--> statement-breakpoint
CREATE INDEX `ocean_bkg_shipment_idx` ON `ocean_booking_details` (`shipment_id`);--> statement-breakpoint
CREATE TABLE `container_stowage_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`container_id` text NOT NULL,
	`shipment_id` text NOT NULL,
	`total_cargo_weight_kg` real NOT NULL,
	`max_payload_kg` real NOT NULL,
	`tare_weight_kg` real NOT NULL,
	`volume_utilization_percent` real NOT NULL,
	`weight_utilization_percent` real NOT NULL,
	`center_of_gravity_json` text,
	`axle_load_distribution_json` text,
	`stability_certified` integer DEFAULT false NOT NULL,
	`certified_by` text,
	`certified_at` integer,
	`stowage_sequence_json` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`container_id`) REFERENCES `shipment_containers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stowage_container_idx` ON `container_stowage_plans` (`container_id`);--> statement-breakpoint
CREATE INDEX `stowage_shipment_idx` ON `container_stowage_plans` (`shipment_id`);