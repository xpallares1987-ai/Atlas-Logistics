CREATE TABLE IF NOT EXISTS `data_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'OPEN_DATA' NOT NULL,
	`website_url` text,
	`terms_url` text,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `data_sources_code_unique` ON `data_sources` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `data_sources_code_idx` ON `data_sources` (`code`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `data_sources_type_idx` ON `data_sources` (`type`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entity_source_links` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`source_record_id` text NOT NULL,
	`match_confidence` real DEFAULT 1 NOT NULL,
	`match_method` text DEFAULT 'EXACT_CODE' NOT NULL,
	`verified_at` integer NOT NULL,
	`verified_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`source_record_id`) REFERENCES `source_records`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entity_source_links_entity_idx` ON `entity_source_links` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entity_source_links_record_idx` ON `entity_source_links` (`source_record_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `source_records` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text NOT NULL,
	`source_url` text,
	`raw_payload` text NOT NULL,
	`normalized_payload` text,
	`sha256_hash` text NOT NULL,
	`retrieved_at` integer NOT NULL,
	`version_tag` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_records_src_ext_idx` ON `source_records` (`source_id`,`external_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `source_records_hash_idx` ON `source_records` (`sha256_hash`);
