CREATE TABLE `portal_access_tokens` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`po_id` text NOT NULL,
	`company_id` text NOT NULL,
	`portal_type` text NOT NULL,
	`token_hash` text NOT NULL UNIQUE,
	`expires_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	`is_revoked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_portal_access_tokens_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `portal_po_projections` (
	`id` text PRIMARY KEY,
	`po_id` text NOT NULL UNIQUE,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`vendor_company_id` text NOT NULL,
	`buyer_company_id` text NOT NULL,
	`po_number` text NOT NULL,
	`buyer_name` text NOT NULL,
	`supplier_name` text NOT NULL,
	`incoterm` text NOT NULL,
	`expected_cargo_ready_date` text NOT NULL,
	`promised_cargo_ready_date` text,
	`po_status` text NOT NULL,
	`supplier_confirmation_status` text DEFAULT 'PENDING' NOT NULL,
	`confirmed_at` text,
	`confirmation_notes` text,
	`line_items_summary_json` text DEFAULT '[]' NOT NULL,
	`milestones_summary_json` text DEFAULT '[]' NOT NULL,
	`exceptions_summary_json` text DEFAULT '[]' NOT NULL,
	`last_projected_at` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_portal_po_projections_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_portal_tokens_hash` ON `portal_access_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_portal_tokens_po_company` ON `portal_access_tokens` (`tenant_id`,`po_id`,`company_id`);--> statement-breakpoint
CREATE INDEX `idx_portal_po_vendor_company` ON `portal_po_projections` (`tenant_id`,`vendor_company_id`);--> statement-breakpoint
CREATE INDEX `idx_portal_po_buyer_company` ON `portal_po_projections` (`tenant_id`,`buyer_company_id`);--> statement-breakpoint
CREATE INDEX `idx_portal_po_number` ON `portal_po_projections` (`po_number`);