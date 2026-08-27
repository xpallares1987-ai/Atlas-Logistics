CREATE TABLE `carrier_invoice_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`carrier_invoice_id` text NOT NULL,
	`shipment_id` text,
	`booking_number` text,
	`document_number` text NOT NULL,
	`charge_code` text NOT NULL,
	`description` text NOT NULL,
	`billed_quantity` real DEFAULT 1 NOT NULL,
	`billed_rate` real NOT NULL,
	`billed_amount` real NOT NULL,
	`expected_quantity` real DEFAULT 1 NOT NULL,
	`expected_rate` real NOT NULL,
	`expected_amount` real NOT NULL,
	`variance_amount` real DEFAULT 0 NOT NULL,
	`variance_percentage` real DEFAULT 0 NOT NULL,
	`is_within_tolerance` integer DEFAULT true NOT NULL,
	`dispute_reason` text,
	`dispute_status` text DEFAULT 'NONE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`carrier_invoice_id`) REFERENCES `carrier_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `carrier_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_number` text NOT NULL,
	`carrier_id` text,
	`carrier_name` text NOT NULL,
	`carrier_vat` text,
	`mode` text NOT NULL,
	`invoice_date` text NOT NULL,
	`due_date` text NOT NULL,
	`billing_period` text,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`total_amount` real NOT NULL,
	`matched_amount` real DEFAULT 0 NOT NULL,
	`disputed_amount` real DEFAULT 0 NOT NULL,
	`reconciliation_status` text DEFAULT 'PENDING' NOT NULL,
	`cass_statement_number` text,
	`payment_terms` text DEFAULT '30_DAYS',
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`carrier_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `carrier_invoices_invoice_number_unique` ON `carrier_invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `fx_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`from_currency` text NOT NULL,
	`to_currency` text NOT NULL,
	`spot_rate` real NOT NULL,
	`effective_date` text NOT NULL,
	`source` text DEFAULT 'ECB' NOT NULL,
	`forward_30_rate` real,
	`forward_60_rate` real,
	`forward_90_rate` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `treasury_fx_positions` (
	`id` text PRIMARY KEY NOT NULL,
	`currency` text NOT NULL,
	`receivables_amount` real DEFAULT 0 NOT NULL,
	`payables_amount` real DEFAULT 0 NOT NULL,
	`net_exposure` real DEFAULT 0 NOT NULL,
	`average_exchange_rate` real NOT NULL,
	`current_spot_rate` real NOT NULL,
	`unrealized_gain_loss_eur` real DEFAULT 0 NOT NULL,
	`hedged_amount` real DEFAULT 0 NOT NULL,
	`unhedged_amount` real DEFAULT 0 NOT NULL,
	`risk_level` text DEFAULT 'LOW' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `treasury_fx_positions_currency_unique` ON `treasury_fx_positions` (`currency`);