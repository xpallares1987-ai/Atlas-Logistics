CREATE TABLE `disruption_resolution_plans` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`exception_id` text NOT NULL,
	`po_id` text NOT NULL,
	`booking_id` text,
	`shipment_id` text,
	`plan_type` text NOT NULL,
	`status` text DEFAULT 'GENERATED' NOT NULL,
	`confidence_score` text DEFAULT '0.85' NOT NULL,
	`recommendation_rank` integer DEFAULT 1 NOT NULL,
	`estimated_transit_days` integer NOT NULL,
	`transit_time_delta_hours` integer NOT NULL,
	`cost_delta_amount` text DEFAULT '0.00' NOT NULL,
	`cost_delta_currency` text DEFAULT 'USD' NOT NULL,
	`carbon_delta_kg_co2` text DEFAULT '0.00',
	`justification` text NOT NULL,
	`policy_evaluation_json` text,
	`action_payload_json` text,
	`execution_error` text,
	`approved_by` text,
	`approved_at` integer,
	`executed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_disruption_resolution_plans_exception_id_supply_chain_exceptions_id_fk` FOREIGN KEY (`exception_id`) REFERENCES `supply_chain_exceptions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_disruption_resolution_plans_po_id_purchase_orders_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_disruption_resolution_plans_booking_id_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_disruption_resolution_plans_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `rerouting_execution_logs` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant_default' NOT NULL,
	`plan_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`step_name` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`details_json` text,
	`error_message` text,
	`executed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_rerouting_execution_logs_plan_id_disruption_resolution_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `disruption_resolution_plans`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_drp_tenant_exception` ON `disruption_resolution_plans` (`tenant_id`,`exception_id`);--> statement-breakpoint
CREATE INDEX `idx_drp_tenant_po` ON `disruption_resolution_plans` (`tenant_id`,`po_id`);--> statement-breakpoint
CREATE INDEX `idx_drp_tenant_status` ON `disruption_resolution_plans` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_drp_tenant_plan_type` ON `disruption_resolution_plans` (`tenant_id`,`plan_type`);--> statement-breakpoint
CREATE INDEX `idx_rel_tenant_plan` ON `rerouting_execution_logs` (`tenant_id`,`plan_id`);