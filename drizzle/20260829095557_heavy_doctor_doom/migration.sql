CREATE TABLE `trade_credit_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`document_type` text NOT NULL,
	`original_copies_required` integer DEFAULT 1 NOT NULL,
	`original_copies_presented` integer DEFAULT 1 NOT NULL,
	`document_reference_number` text NOT NULL,
	`document_date` text NOT NULL,
	`issuer_name` text NOT NULL,
	`shipped_on_board_date` text,
	`clean_on_board_status` integer DEFAULT true NOT NULL,
	`freight_payment_clause` text DEFAULT 'PREPAID',
	`invoice_amount` real,
	`invoice_currency` text,
	`goods_description_exact_match` integer DEFAULT true,
	`insured_amount` real,
	`insured_percentage_of_cif` real,
	`compliance_status` text DEFAULT 'PENDING' NOT NULL,
	`remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trade_credit_instruments` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_reference` text NOT NULL,
	`instrument_type` text NOT NULL,
	`applicable_rules` text DEFAULT 'UCP600' NOT NULL,
	`applicant_company_id` text,
	`applicant_name` text NOT NULL,
	`beneficiary_name` text NOT NULL,
	`beneficiary_country` text DEFAULT 'ES' NOT NULL,
	`issuing_bank_bic` text NOT NULL,
	`issuing_bank_name` text NOT NULL,
	`confirming_bank_bic` text,
	`confirming_bank_name` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`credit_amount` real NOT NULL,
	`tolerance_percentage` real DEFAULT 5 NOT NULL,
	`issue_date` text NOT NULL,
	`latest_shipment_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`expiry_place` text DEFAULT 'Counters of Beneficiary Bank' NOT NULL,
	`port_of_loading` text NOT NULL,
	`port_of_discharge` text NOT NULL,
	`goods_description_summary` text NOT NULL,
	`partial_shipments_allowed` integer DEFAULT false NOT NULL,
	`transhipment_allowed` integer DEFAULT false NOT NULL,
	`presentation_period_days` integer DEFAULT 21 NOT NULL,
	`confirmation_instructions` text DEFAULT 'CONFIRM' NOT NULL,
	`payment_terms` text DEFAULT 'SIGHT' NOT NULL,
	`tenor_days` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ISSUED' NOT NULL,
	`remarks` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`applicant_company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trade_credit_instruments_instrument_reference_unique` ON `trade_credit_instruments` (`instrument_reference`);--> statement-breakpoint
CREATE TABLE `trade_discrepancies` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`document_id` text,
	`discrepancy_rule_code` text NOT NULL,
	`article_reference` text NOT NULL,
	`severity` text NOT NULL,
	`description` text NOT NULL,
	`suggested_remedy` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `trade_credit_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trade_fee_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`opening_fee_rate_pct` real DEFAULT 0.25 NOT NULL,
	`confirmation_fee_rate_pct` real DEFAULT 0.5 NOT NULL,
	`discrepancy_fee_amount` real DEFAULT 75 NOT NULL,
	`amendment_fee_amount` real DEFAULT 50 NOT NULL,
	`payment_settlement_fee_amount` real DEFAULT 60 NOT NULL,
	`calculated_opening_fee_eur` real DEFAULT 0 NOT NULL,
	`calculated_confirmation_fee_eur` real DEFAULT 0 NOT NULL,
	`calculated_discrepancy_fee_eur` real DEFAULT 0 NOT NULL,
	`total_bank_fees_eur` real DEFAULT 0 NOT NULL,
	`fee_payer_party` text DEFAULT 'APPLICANT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trade_swift_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`message_type` text NOT NULL,
	`sender_bic` text NOT NULL,
	`receiver_bic` text NOT NULL,
	`raw_swift_message` text NOT NULL,
	`transmission_status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `trade_credit_instruments`(`id`) ON UPDATE no action ON DELETE cascade
);
