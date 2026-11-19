CREATE TABLE `customs_clearances` (
	`id` text PRIMARY KEY,
	`clearance_number` text NOT NULL UNIQUE,
	`mrn` text NOT NULL UNIQUE,
	`procedure_type` text DEFAULT 'IMPORT_4000' NOT NULL,
	`customs_office_code` text NOT NULL,
	`importer_company_id` text NOT NULL,
	`declarant_address_id` text NOT NULL,
	`taric_code` text NOT NULL,
	`goods_description` text NOT NULL,
	`origin_country_code` text NOT NULL,
	`gross_mass_kg` real NOT NULL,
	`net_mass_kg` real NOT NULL,
	`customs_value_eur` real NOT NULL,
	`duty_tariff_rate_percent` real DEFAULT 0 NOT NULL,
	`assessed_duty_amount_eur` real DEFAULT 0 NOT NULL,
	`import_vat_rate_percent` real DEFAULT 21 NOT NULL,
	`assessed_vat_amount_eur` real DEFAULT 0 NOT NULL,
	`total_disbursement_eur` real DEFAULT 0 NOT NULL,
	`routing_channel` text DEFAULT 'PENDING' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`levante_released_at` text,
	`t1_guarantee_id` text,
	`guarantee_committed_eur` real DEFAULT 0 NOT NULL,
	`is_cbam_applicable` integer DEFAULT false NOT NULL,
	`cbam_declaration_line_id` text,
	`ocr_staging_reference` text,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_customs_clearances_importer_company_id_companies_id_fk` FOREIGN KEY (`importer_company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_customs_clearances_declarant_address_id_addresses_id_fk` FOREIGN KEY (`declarant_address_id`) REFERENCES `addresses`(`id`),
	CONSTRAINT `fk_customs_clearances_t1_guarantee_id_customs_guarantees_id_fk` FOREIGN KEY (`t1_guarantee_id`) REFERENCES `customs_guarantees`(`id`)
);
--> statement-breakpoint
CREATE TABLE `customs_clearance_shipments` (
	`id` text PRIMARY KEY,
	`clearance_id` text NOT NULL,
	`shipment_id` text NOT NULL,
	`allocated_net_mass_kg` real NOT NULL,
	`prorated_duty_eur` real DEFAULT 0 NOT NULL,
	`prorated_vat_eur` real DEFAULT 0 NOT NULL,
	`prorated_disbursement_eur` real DEFAULT 0 NOT NULL,
	`allocated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_customs_clearance_shipments_clearance_id_customs_clearances_id_fk` FOREIGN KEY (`clearance_id`) REFERENCES `customs_clearances`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_customs_clearance_shipments_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `customs_disbursements` (
	`id` text PRIMARY KEY,
	`clearance_id` text NOT NULL,
	`shipment_id` text NOT NULL,
	`disbursement_type` text NOT NULL,
	`official_voucher_number` text NOT NULL,
	`incurred_cost_amount_eur` real NOT NULL,
	`billed_revenue_amount_eur` real NOT NULL,
	`markup_amount_eur` real DEFAULT 0 NOT NULL,
	`is_zero_markup_validated` integer DEFAULT true NOT NULL,
	`ap_invoice_reference` text NOT NULL,
	`ar_invoice_id` text,
	`is_reconciled` integer DEFAULT false NOT NULL,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_customs_disbursements_clearance_id_customs_clearances_id_fk` FOREIGN KEY (`clearance_id`) REFERENCES `customs_clearances`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_customs_disbursements_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_customs_clearances_mrn` ON `customs_clearances` (`mrn`);--> statement-breakpoint
CREATE INDEX `idx_customs_clearances_tenant_status` ON `customs_clearances` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_customs_clearance_shipments_lookup` ON `customs_clearance_shipments` (`clearance_id`,`shipment_id`);--> statement-breakpoint
CREATE INDEX `idx_customs_disbursements_tenant_shipment` ON `customs_disbursements` (`tenant_id`,`shipment_id`);
