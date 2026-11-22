CREATE TABLE `supply_chain_exceptions` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`po_id` text NOT NULL,
	`booking_id` text,
	`shipment_id` text,
	`milestone_event_id` text,
	`exception_code` text NOT NULL,
	`exception_category` text NOT NULL,
	`severity` text DEFAULT 'MEDIUM' NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`impact_summary` text,
	`delay_estimate_hours` integer DEFAULT 0 NOT NULL,
	`financial_risk_amount` text DEFAULT '0.00',
	`financial_risk_currency` text DEFAULT 'USD',
	`suggested_mitigations` text,
	`ai_analysis` text,
	`resolved_by` text,
	`resolved_at` text,
	`resolution_notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_supply_chain_exceptions_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_supply_chain_exceptions_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_supply_chain_exceptions_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_supply_chain_exceptions_milestone_event_id_supply_chain_milestone_events_id_fk` FOREIGN KEY (`milestone_event_id`) REFERENCES `supply_chain_milestone_events`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `supply_chain_milestone_events` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`po_id` text NOT NULL,
	`po_line_item_id` text,
	`booking_id` text,
	`shipment_id` text,
	`container_number` text,
	`milestone_code` text NOT NULL,
	`milestone_category` text NOT NULL,
	`status` text DEFAULT 'PLANNED' NOT NULL,
	`planned_timestamp` text NOT NULL,
	`estimated_timestamp` text,
	`actual_timestamp` text,
	`delay_hours` integer DEFAULT 0 NOT NULL,
	`location_code` text,
	`location_name` text,
	`latitude` text,
	`longitude` text,
	`vessel_name` text,
	`voyage_number` text,
	`carrier_code` text,
	`data_source` text DEFAULT 'SYSTEM_DERIVED' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_supply_chain_milestone_events_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_supply_chain_milestone_events_po_line_item_id_po_line_items_id_fk` FOREIGN KEY (`po_line_item_id`) REFERENCES `po_line_items`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_supply_chain_milestone_events_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_supply_chain_milestone_events_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scex_tenant_po` ON `supply_chain_exceptions` (`tenant_id`,`po_id`);--> statement-breakpoint
CREATE INDEX `idx_scex_tenant_status` ON `supply_chain_exceptions` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_scex_tenant_severity` ON `supply_chain_exceptions` (`tenant_id`,`severity`);--> statement-breakpoint
CREATE INDEX `idx_scex_tenant_category` ON `supply_chain_exceptions` (`tenant_id`,`exception_category`);--> statement-breakpoint
CREATE INDEX `idx_scme_tenant_po` ON `supply_chain_milestone_events` (`tenant_id`,`po_id`);--> statement-breakpoint
CREATE INDEX `idx_scme_tenant_booking` ON `supply_chain_milestone_events` (`tenant_id`,`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_scme_tenant_shipment` ON `supply_chain_milestone_events` (`tenant_id`,`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_scme_tenant_status` ON `supply_chain_milestone_events` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_scme_tenant_category` ON `supply_chain_milestone_events` (`tenant_id`,`milestone_category`);