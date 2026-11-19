CREATE TABLE `edifact_message_types` (
	`code` text PRIMARY KEY,
	`name_en` text NOT NULL,
	`name_es` text NOT NULL,
	`functional_domain` text NOT NULL,
	`is_logistics_core` integer DEFAULT false NOT NULL,
	`typical_sender_types` text,
	`typical_receiver_types` text,
	`directory_version` text DEFAULT 'D.23B' NOT NULL,
	`supports_live_engine` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE TABLE `uncefact_xml_schemas` (
	`code` text PRIMARY KEY,
	`name` text NOT NULL,
	`standard_family` text NOT NULL,
	`release_version` text NOT NULL,
	`root_element` text NOT NULL,
	`namespace_uri` text NOT NULL,
	`schema_url` text NOT NULL,
	`edifact_equivalents` text,
	`applicable_entity_types` text,
	`supports_live_generator` integer DEFAULT false NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE TABLE `unece_transport_statistics` (
	`id` text PRIMARY KEY,
	`dataset_code` text NOT NULL,
	`transport_mode` text NOT NULL,
	`country_code` text NOT NULL,
	`country_name` text NOT NULL,
	`year` integer NOT NULL,
	`metric_label` text NOT NULL,
	`value` real NOT NULL,
	`unit` text NOT NULL,
	`source_table_id` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE INDEX `idx_edifact_msg_domain` ON `edifact_message_types` (`functional_domain`);--> statement-breakpoint
CREATE INDEX `idx_edifact_msg_logistics` ON `edifact_message_types` (`is_logistics_core`);--> statement-breakpoint
CREATE INDEX `idx_uncefact_xml_family` ON `uncefact_xml_schemas` (`standard_family`);--> statement-breakpoint
CREATE INDEX `idx_unece_stats_mode_country_year` ON `unece_transport_statistics` (`transport_mode`,`country_code`,`year`);--> statement-breakpoint
CREATE INDEX `idx_unece_stats_dataset` ON `unece_transport_statistics` (`dataset_code`);