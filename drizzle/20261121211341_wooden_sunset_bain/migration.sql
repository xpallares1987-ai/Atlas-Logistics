CREATE TABLE `po_line_items` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`po_id` text NOT NULL,
	`booking_id` text,
	`sku_code` text NOT NULL,
	`description` text NOT NULL,
	`quantity` text NOT NULL,
	`allocated_quantity` text DEFAULT '0.000' NOT NULL,
	`uom` text DEFAULT 'PCS' NOT NULL,
	`hs_code` text,
	`package_count` integer,
	`gross_weight_kg` text,
	`volume_cbm` text,
	`original_unit_price` text,
	`original_currency` text DEFAULT 'USD',
	`exchange_rate` text DEFAULT '1.000000',
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_po_line_items_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_po_line_items_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `production_milestones` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`po_id` text NOT NULL,
	`milestone_code` text NOT NULL,
	`planned_date` text NOT NULL,
	`actual_date` text,
	`notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_production_milestones_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`buyer_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`po_number` text NOT NULL,
	`incoterm` text NOT NULL,
	`expected_cargo_ready_date` text NOT NULL,
	`status` text DEFAULT 'ISSUED' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_purchase_orders_buyer_id_companies_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_purchase_orders_supplier_id_companies_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `idx_po_line_items_po` ON `po_line_items` (`tenant_id`,`po_id`);--> statement-breakpoint
CREATE INDEX `idx_po_line_items_booking` ON `po_line_items` (`tenant_id`,`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_po_line_items_sku` ON `po_line_items` (`tenant_id`,`sku_code`);--> statement-breakpoint
CREATE INDEX `idx_production_milestones_po` ON `production_milestones` (`tenant_id`,`po_id`);--> statement-breakpoint
CREATE INDEX `idx_production_milestones_code` ON `production_milestones` (`tenant_id`,`milestone_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_purchase_orders_tenant_po` ON `purchase_orders` (`tenant_id`,`po_number`);--> statement-breakpoint
CREATE INDEX `idx_purchase_orders_buyer` ON `purchase_orders` (`tenant_id`,`buyer_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_orders_supplier` ON `purchase_orders` (`tenant_id`,`supplier_id`);--> statement-breakpoint
CREATE INDEX `idx_purchase_orders_status` ON `purchase_orders` (`tenant_id`,`status`);