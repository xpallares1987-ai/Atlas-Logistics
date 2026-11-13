CREATE TABLE `trade_sanctions` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`sanction_type` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `dua_number` text;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `customs_value` real;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `total_payable` real;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `risk_score` integer;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `risk_flags` text;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `eori_number` text;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `origin_country` text;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `destination_country` text;--> statement-breakpoint
ALTER TABLE `customs_declarations` ADD `dua_data` text;--> statement-breakpoint
ALTER TABLE `hs_codes` ADD `chapter` text;--> statement-breakpoint
ALTER TABLE `hs_codes` ADD `ad_valorem_duty` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `hs_codes` ADD `specific_duty_per_kg` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `hs_codes` ADD `vat_rate` real DEFAULT 0.21;--> statement-breakpoint
ALTER TABLE `hs_codes` ADD `is_dual_use` integer DEFAULT 0;