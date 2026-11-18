CREATE TABLE `containers` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`shipment_id` text NOT NULL,
	`container_number` text NOT NULL,
	`iso_size_type` text,
	`seal_number` text,
	`tare_weight_kg` real,
	`max_payload_kg` real,
	`is_shipper_owned` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_containers_tenant_id_companies_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_containers_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `container_vgm` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`container_id` text NOT NULL,
	`shipment_id` text,
	`container_number` text NOT NULL,
	`vgm_weight_kg` real NOT NULL,
	`weighing_method` text NOT NULL,
	`authorized_person` text NOT NULL,
	`signature_date` integer NOT NULL,
	`certificate_blob_url` text,
	`edi_transmitted_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_container_vgm_tenant_id_companies_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_container_vgm_container_id_containers_id_fk` FOREIGN KEY (`container_id`) REFERENCES `containers`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_container_vgm_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `demurrage_accruals` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`container_id` text,
	`container_number` text NOT NULL,
	`shipment_id` text NOT NULL,
	`charge_type` text NOT NULL,
	`accrual_date` text NOT NULL,
	`days_exceeded` integer NOT NULL,
	`daily_rate` real NOT NULL,
	`accrual_amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'ESTIMATED' NOT NULL,
	`cost_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_demurrage_accruals_tenant_id_companies_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_demurrage_accruals_container_id_containers_id_fk` FOREIGN KEY (`container_id`) REFERENCES `containers`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_demurrage_accruals_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_demurrage_accruals_cost_id_costs_id_fk` FOREIGN KEY (`cost_id`) REFERENCES `costs`(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment_lifecycle` (
	`id` text PRIMARY KEY,
	`tenant_id` text,
	`container_id` text NOT NULL,
	`container_number` text NOT NULL,
	`shipment_id` text,
	`event_type` text NOT NULL,
	`event_timestamp` integer NOT NULL,
	`location_id` text,
	`reported_by` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`tags` text,
	CONSTRAINT `fk_equipment_lifecycle_tenant_id_companies_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_equipment_lifecycle_container_id_containers_id_fk` FOREIGN KEY (`container_id`) REFERENCES `containers`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_equipment_lifecycle_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_equipment_lifecycle_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_container_vgm_container_id` ON `container_vgm` (`container_id`);--> statement-breakpoint
CREATE INDEX `idx_container_vgm_shipment_id` ON `container_vgm` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_container_vgm_container_num` ON `container_vgm` (`container_number`);--> statement-breakpoint
CREATE INDEX `idx_containers_shipment_id` ON `containers` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_containers_container_number` ON `containers` (`container_number`);--> statement-breakpoint
CREATE INDEX `idx_containers_tenant_id` ON `containers` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_demurrage_accrual_idempotency` ON `demurrage_accruals` (`container_number`,`charge_type`,`accrual_date`);--> statement-breakpoint
CREATE INDEX `idx_demurrage_accrual_shipment_id` ON `demurrage_accruals` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_equipment_lifecycle_container_id` ON `equipment_lifecycle` (`container_id`);--> statement-breakpoint
CREATE INDEX `idx_equipment_lifecycle_container_num` ON `equipment_lifecycle` (`container_number`);--> statement-breakpoint
CREATE INDEX `idx_equipment_lifecycle_event_type` ON `equipment_lifecycle` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_equipment_lifecycle_timestamp` ON `equipment_lifecycle` (`event_timestamp`);
