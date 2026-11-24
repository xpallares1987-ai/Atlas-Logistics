CREATE TABLE `bank_statement_entries` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`statement_id` text NOT NULL,
	`transmission_id` text,
	`booking_date` text NOT NULL,
	`value_date` text NOT NULL,
	`credit_debit_indicator` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`account_iban` text,
	`account_bic` text,
	`end_to_end_id` text,
	`payment_information_id` text,
	`remittance_information` text,
	`reconciliation_status` text DEFAULT 'UNMATCHED' NOT NULL,
	`matched_invoice_id` text,
	`matched_company_id` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_bank_statement_entries_transmission_id_banking_transmissions_id_fk` FOREIGN KEY (`transmission_id`) REFERENCES `banking_transmissions`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `banking_transmissions` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`transmission_number` text NOT NULL UNIQUE,
	`netting_cycle_id` text,
	`message_type` text NOT NULL,
	`bah_message_id` text NOT NULL,
	`sender_bic` text NOT NULL,
	`receiver_bic` text NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`payload_xml` text NOT NULL,
	`payload_hash_sha256` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`transmitted_at` text,
	`ack_received_at` text,
	`failure_reason` text,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_banking_transmissions_netting_cycle_id_bilateral_netting_cycles_id_fk` FOREIGN KEY (`netting_cycle_id`) REFERENCES `bilateral_netting_cycles`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `idx_bank_statement_tenant_statement` ON `bank_statement_entries` (`tenant_id`,`statement_id`);--> statement-breakpoint
CREATE INDEX `idx_bank_statement_tenant_reconciled` ON `bank_statement_entries` (`tenant_id`,`reconciliation_status`);--> statement-breakpoint
CREATE INDEX `idx_bank_statement_end_to_end` ON `bank_statement_entries` (`tenant_id`,`end_to_end_id`);--> statement-breakpoint
CREATE INDEX `idx_bank_statement_transmission` ON `bank_statement_entries` (`tenant_id`,`transmission_id`);--> statement-breakpoint
CREATE INDEX `idx_banking_transmissions_tenant_status` ON `banking_transmissions` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_banking_transmissions_netting_cycle` ON `banking_transmissions` (`tenant_id`,`netting_cycle_id`);--> statement-breakpoint
CREATE INDEX `idx_banking_transmissions_number` ON `banking_transmissions` (`tenant_id`,`transmission_number`);--> statement-breakpoint
CREATE INDEX `idx_banking_transmissions_message_type` ON `banking_transmissions` (`tenant_id`,`message_type`);