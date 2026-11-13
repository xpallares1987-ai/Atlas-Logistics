CREATE TABLE IF NOT EXISTS `location_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`alias` text NOT NULL,
	`location_id` text NOT NULL,
	`learned_from` text DEFAULT 'EXCEL_IMPORT',
	`confidence` real DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `location_aliases_alias_unique` ON `location_aliases` (`alias`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `rate_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`carrier_id` text,
	`total_rows` integer NOT NULL,
	`inserted_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'COMPLETED' NOT NULL,
	`errors_json` text,
	`imported_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`carrier_id`) REFERENCES `carriers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `edi_interchanges` (
	`id` text PRIMARY KEY NOT NULL,
	`partner_id` text,
	`control_number` text NOT NULL,
	`direction` text NOT NULL,
	`standard` text NOT NULL,
	`sender_id` text NOT NULL,
	`receiver_id` text NOT NULL,
	`status` text NOT NULL,
	`raw_payload` text NOT NULL,
	`ack_payload` text,
	`ack_status` text,
	`error_message` text,
	`processed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`partner_id`) REFERENCES `edi_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `edi_interchanges_ctrl_idx` ON `edi_interchanges` (`control_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `edi_interchanges_direction_idx` ON `edi_interchanges` (`direction`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `edi_interchanges_status_idx` ON `edi_interchanges` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `edi_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`interchange_id` text NOT NULL,
	`message_type` text NOT NULL,
	`control_number` text NOT NULL,
	`shipment_id` text,
	`booking_reference` text,
	`status` text NOT NULL,
	`parsed_content` text,
	`extracted_milestone` text,
	`exception_triggered` integer DEFAULT false NOT NULL,
	`exception_details` text,
	`processed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`interchange_id`) REFERENCES `edi_interchanges`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `edi_messages_type_idx` ON `edi_messages` (`message_type`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `edi_messages_shipment_idx` ON `edi_messages` (`shipment_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `edi_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`name` text NOT NULL,
	`standard` text NOT NULL,
	`sender_id` text NOT NULL,
	`sender_qualifier` text DEFAULT 'ZZ' NOT NULL,
	`receiver_id` text NOT NULL,
	`receiver_qualifier` text DEFAULT 'ZZ' NOT NULL,
	`transport_protocol` text DEFAULT 'REST_WEBHOOK' NOT NULL,
	`endpoint_url` text,
	`test_mode` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `edi_partners_name_idx` ON `edi_partners` (`name`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `edi_partners_sender_idx` ON `edi_partners` (`sender_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `control_tower_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_number` text NOT NULL,
	`shipment_id` text,
	`asset_id` text,
	`incident_type` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`location_name` text,
	`location_lat` real,
	`location_lng` real,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`auto_resolved` integer DEFAULT false NOT NULL,
	`impact_amount_eur` real DEFAULT 0 NOT NULL,
	`delay_hours` real DEFAULT 0 NOT NULL,
	`sla_deadline` text,
	`assigned_to` text,
	`resolution_action` text,
	`resolved_at` text,
	`resolved_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `tracked_assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `control_tower_incidents_incident_number_unique` ON `control_tower_incidents` (`incident_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ct_incidents_status` ON `control_tower_incidents` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ct_incidents_severity` ON `control_tower_incidents` (`severity`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `customs_ics2_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`mrn` text NOT NULL,
	`shipment_id` text,
	`declaration_type` text DEFAULT 'ENS' NOT NULL,
	`filing_status` text DEFAULT 'SUBMITTED' NOT NULL,
	`risk_circuit` text DEFAULT 'GREEN' NOT NULL,
	`declarant_eori` text NOT NULL,
	`customs_office_code` text NOT NULL,
	`security_assessment_score` integer DEFAULT 98 NOT NULL,
	`submitted_at` text NOT NULL,
	`cleared_at` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `customs_ics2_declarations_mrn_unique` ON `customs_ics2_declarations` (`mrn`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ics2_mrn` ON `customs_ics2_declarations` (`mrn`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ics2_circuit` ON `customs_ics2_declarations` (`risk_circuit`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `freight_audit_disputes` (
	`id` text PRIMARY KEY NOT NULL,
	`dispute_code` text NOT NULL,
	`invoice_line_id` text,
	`carrier_invoice_id` text,
	`shipment_id` text,
	`claimed_amount` real NOT NULL,
	`expected_amount` real NOT NULL,
	`disputed_amount` real NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`carrier_response_date` text,
	`resolution_note` text,
	`debit_note_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoice_line_id`) REFERENCES `carrier_invoice_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`carrier_invoice_id`) REFERENCES `carrier_invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `freight_audit_disputes_dispute_code_unique` ON `freight_audit_disputes` (`dispute_code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_dispute_status` ON `freight_audit_disputes` (`status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `incident_reroute_options` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`option_name` text NOT NULL,
	`transport_mode` text NOT NULL,
	`corridor_description` text NOT NULL,
	`eta_delta_hours` real NOT NULL,
	`cost_delta_eur` real NOT NULL,
	`co2_delta_kg` real NOT NULL,
	`feasibility_score` integer DEFAULT 85 NOT NULL,
	`is_recommended` integer DEFAULT false NOT NULL,
	`execution_status` text DEFAULT 'PROPOSED' NOT NULL,
	`legs_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `control_tower_incidents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_reroute_incident_id` ON `incident_reroute_options` (`incident_id`);--> statement-breakpoint
ALTER TABLE `surcharges` ADD `currency` text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE `surcharges` ADD `calc_basis` text DEFAULT 'PER_CONTAINER' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `document_reference` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `sha256_hash` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `status` text DEFAULT 'EMITTED' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `signed_by` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `signer_title` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `signer_certificate` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `signed_at` integer;--> statement-breakpoint
ALTER TABLE `documents` ADD `payload_data` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `file_size` integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `documents_sha256_idx` ON `documents` (`sha256_hash`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `documents_ref_idx` ON `documents` (`document_reference`);
