CREATE TABLE `bilateral_netting_cycles` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`base_currency` text DEFAULT 'USD' NOT NULL,
	`participant_a` text NOT NULL,
	`participant_b` text NOT NULL,
	`gross_volume_a_to_b` real NOT NULL,
	`gross_volume_b_to_a` real NOT NULL,
	`net_payer` text,
	`net_receiver` text,
	`net_settlement_amount` real NOT NULL,
	`reconciled_transactions_count` integer DEFAULT 0 NOT NULL,
	`transaction_ids` text NOT NULL,
	`status` text DEFAULT 'PROPOSED' NOT NULL,
	`settlement_reference` text,
	`cleared_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cass_reconciliation_batches` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`airline_code` text NOT NULL,
	`airline_name` text NOT NULL,
	`billing_period` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`total_awbs_count` integer DEFAULT 0 NOT NULL,
	`exact_match_count` integer DEFAULT 0 NOT NULL,
	`tolerance_match_count` integer DEFAULT 0 NOT NULL,
	`discrepancy_count` integer DEFAULT 0 NOT NULL,
	`total_forwarder_amount` real DEFAULT 0 NOT NULL,
	`total_airline_amount` real DEFAULT 0 NOT NULL,
	`total_net_variance` real DEFAULT 0 NOT NULL,
	`disputed_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cass_reconciliation_items` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`batch_id` text NOT NULL,
	`awb_number` text NOT NULL,
	`status` text NOT NULL,
	`forwarder_total` real DEFAULT 0 NOT NULL,
	`airline_total` real DEFAULT 0 NOT NULL,
	`variance_amount` real DEFAULT 0 NOT NULL,
	`weight_variance_kg` real DEFAULT 0 NOT NULL,
	`rate_variance` real DEFAULT 0 NOT NULL,
	`surcharge_variance` real DEFAULT 0 NOT NULL,
	`auto_accepted` integer DEFAULT false NOT NULL,
	`dispute_required` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_cass_reconciliation_items_batch_id_cass_reconciliation_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `cass_reconciliation_batches`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `financial_clearing_entries` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`debtor_agent_id` text NOT NULL,
	`creditor_agent_id` text NOT NULL,
	`shipment_id` text,
	`note_type` text NOT NULL,
	`reference` text NOT NULL,
	`amount` real NOT NULL,
	`scaled_amount` integer NOT NULL,
	`currency` text NOT NULL,
	`exchange_rate_to_base` real DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`netting_cycle_id` text,
	`issue_date` text NOT NULL,
	`due_date` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bilateral_netting_tenant_pair` ON `bilateral_netting_cycles` (`tenant_id`,`participant_a`,`participant_b`);--> statement-breakpoint
CREATE INDEX `idx_bilateral_netting_status` ON `bilateral_netting_cycles` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_cass_batches_tenant_airline_period` ON `cass_reconciliation_batches` (`tenant_id`,`airline_code`,`billing_period`);--> statement-breakpoint
CREATE INDEX `idx_cass_batches_status` ON `cass_reconciliation_batches` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_cass_items_tenant_batch` ON `cass_reconciliation_items` (`tenant_id`,`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_cass_items_tenant_awb` ON `cass_reconciliation_items` (`tenant_id`,`awb_number`);--> statement-breakpoint
CREATE INDEX `idx_cass_items_batch_status` ON `cass_reconciliation_items` (`batch_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_fin_clearing_tenant_agents` ON `financial_clearing_entries` (`tenant_id`,`debtor_agent_id`,`creditor_agent_id`);--> statement-breakpoint
CREATE INDEX `idx_fin_clearing_tenant_status` ON `financial_clearing_entries` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_fin_clearing_netting_cycle` ON `financial_clearing_entries` (`tenant_id`,`netting_cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_fin_clearing_reference` ON `financial_clearing_entries` (`tenant_id`,`reference`);