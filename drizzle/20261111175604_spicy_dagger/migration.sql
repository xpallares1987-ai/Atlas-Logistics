CREATE TABLE IF NOT EXISTS `cargo_iq_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`awb_number` text NOT NULL,
	`milestone_code` text NOT NULL,
	`milestone_name` text NOT NULL,
	`scheduled_time` integer NOT NULL,
	`actual_time` integer,
	`sla_deadline` integer NOT NULL,
	`sla_status` text DEFAULT 'ON_TIME' NOT NULL,
	`location_airport_code` text NOT NULL,
	`flight_number` text,
	`carrier_code` text,
	`event_remarks` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`awb_number`) REFERENCES `airway_bills`(`awb_number`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`location_airport_code`) REFERENCES `iata_airports`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ciq_awb_idx` ON `cargo_iq_milestones` (`awb_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ciq_code_idx` ON `cargo_iq_milestones` (`milestone_code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ciq_sla_idx` ON `cargo_iq_milestones` (`sla_status`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mletr_endorsements_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`block_number` integer NOT NULL,
	`previous_hash` text NOT NULL,
	`tx_hash` text NOT NULL,
	`transfer_type` text NOT NULL,
	`from_party` text NOT NULL,
	`to_party` text NOT NULL,
	`signer_name` text NOT NULL,
	`signer_title` text,
	`signer_certificate` text,
	`signature` text NOT NULL,
	`details` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`timestamp` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `mletr_transferable_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mletr_ledger_rec_idx` ON `mletr_endorsements_ledger` (`record_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mletr_ledger_seq_idx` ON `mletr_endorsements_ledger` (`record_id`,`block_number`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mletr_ledger_hash_idx` ON `mletr_endorsements_ledger` (`tx_hash`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `mletr_transferable_records` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text,
	`shipment_id` text NOT NULL,
	`registry_type` text DEFAULT 'ELECTRONIC_BILL_OF_LADING' NOT NULL,
	`document_reference` text NOT NULL,
	`status` text DEFAULT 'ISSUED' NOT NULL,
	`current_holder` text NOT NULL,
	`current_holder_role` text DEFAULT 'SHIPPER' NOT NULL,
	`issuer_name` text NOT NULL,
	`consignee_name` text NOT NULL,
	`total_endorsements` integer DEFAULT 1 NOT NULL,
	`genesis_hash` text NOT NULL,
	`latest_tx_hash` text NOT NULL,
	`is_surrendered` integer DEFAULT false NOT NULL,
	`surrendered_at` integer,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mletr_shipment_idx` ON `mletr_transferable_records` (`shipment_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mletr_doc_idx` ON `mletr_transferable_records` (`document_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mletr_ref_idx` ON `mletr_transferable_records` (`document_reference`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `mletr_status_idx` ON `mletr_transferable_records` (`status`);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `airway_bills` ADD `one_record_json_ld` text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customs_decl_shipment_created_idx` ON `customs_declarations` (`shipment_id`,`created_at`);