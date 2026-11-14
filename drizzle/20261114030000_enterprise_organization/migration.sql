CREATE TABLE IF NOT EXISTS `branch_offices` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`address_id` text NOT NULL,
	`station_code` text NOT NULL,
	`name` text NOT NULL,
	`station_type` text NOT NULL,
	`un_locode` text NOT NULL,
	`iata_code` text,
	`primary_currency` text DEFAULT 'EUR' NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`manager_user_id` text,
	`fmc_oti_number` text,
	`iata_numeric_code` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `branch_offices_station_code_unique` ON `branch_offices` (`station_code`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_branch_offices_company` ON `branch_offices` (`company_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_branch_offices_un_locode` ON `branch_offices` (`un_locode`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`cost_center` text NOT NULL,
	`parent_department_id` text,
	`manager_user_id` text,
	`email_alias` text,
	`phone` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch_offices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_departments_branch` ON `departments` (`branch_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_departments_code` ON `departments` (`code`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_system_role` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `roles_name_unique` ON `roles` (`name`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `permissions_code_unique` ON `permissions` (`code`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `role_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_role_permissions_unique` ON `role_permissions` (`role_id`,`permission_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_station_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`department_id` text,
	`role_id` text NOT NULL,
	`is_primary` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branch_offices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_station_assignments_user` ON `user_station_assignments` (`user_id`,`branch_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `forwarding_agent_networks` (
	`id` text PRIMARY KEY NOT NULL,
	`network_code` text NOT NULL,
	`name` text NOT NULL,
	`secretarial_body` text,
	`financial_protection_coverage_usd` real DEFAULT 100000,
	`arbitration_jurisdiction` text DEFAULT 'Singapore / Geneva',
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `forwarding_agent_networks_network_code_unique` ON `forwarding_agent_networks` (`network_code`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `carrier_allocation_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`carrier_address_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`contract_reference` text NOT NULL,
	`trade_lane_name` text NOT NULL,
	`effective_from` integer NOT NULL,
	`effective_to` integer NOT NULL,
	`monthly_teu_mqc` real NOT NULL,
	`committed_teu_tiers` text,
	`deadfreight_penalty_rate_per_teu` real DEFAULT 250,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`metadata` text,
	`tags` text,
	FOREIGN KEY (`carrier_address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`branch_id`) REFERENCES `branch_offices`(`id`) ON UPDATE no action ON DELETE no action
);
