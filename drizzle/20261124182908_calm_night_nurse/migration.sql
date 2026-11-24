CREATE TABLE `cbam_certificate_inventory` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`lot_reference` text NOT NULL UNIQUE,
	`purchase_date` text NOT NULL,
	`nca_registry_account_id` text NOT NULL,
	`quantity_purchased` integer NOT NULL,
	`quantity_surrendered` integer DEFAULT 0 NOT NULL,
	`quantity_available` integer NOT NULL,
	`unit_price_eur` real NOT NULL,
	`unit_price_scaled` integer NOT NULL,
	`total_cost_eur` real NOT NULL,
	`total_cost_scaled` integer NOT NULL,
	`payment_reference` text,
	`banking_transmission_id` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cbam_certificate_surrenders` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`surrender_reference` text NOT NULL UNIQUE,
	`declaration_id` text NOT NULL,
	`reporting_period` text NOT NULL,
	`total_certificates_surrendered` integer NOT NULL,
	`surrender_date` text NOT NULL,
	`surrender_lots` text NOT NULL,
	`total_cost_eur` real NOT NULL,
	`verifier_name` text NOT NULL,
	`verifier_accreditation_number` text NOT NULL,
	`verification_report_id` text NOT NULL,
	`surrender_payload_hash_sha256` text NOT NULL,
	`iso20022_payment_transmission_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_cbam_certificate_surrenders_declaration_id_cbam_declarations_id_fk` FOREIGN KEY (`declaration_id`) REFERENCES `cbam_declarations`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `cbam_eex_quotes` (
	`id` text PRIMARY KEY,
	`quote_week` text NOT NULL UNIQUE,
	`valid_from` text NOT NULL,
	`valid_until` text NOT NULL,
	`auction_average_price_eur` real NOT NULL,
	`scaled_price` integer NOT NULL,
	`published_at` text NOT NULL,
	`source` text DEFAULT 'EEX_AUCTION' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `customs_pki_certificates` ADD `encrypted_pkcs12_blob` text;--> statement-breakpoint
ALTER TABLE `customs_pki_certificates` ADD `iv_hex` text;--> statement-breakpoint
ALTER TABLE `customs_pki_certificates` ADD `auth_tag_hex` text;--> statement-breakpoint
CREATE INDEX `cbam_cert_inv_tenant_status_idx` ON `cbam_certificate_inventory` (`tenant_id`,`status`);--> statement-breakpoint
CREATE INDEX `cbam_cert_surrenders_decl_idx` ON `cbam_certificate_surrenders` (`declaration_id`);--> statement-breakpoint
CREATE INDEX `cbam_cert_surrenders_tenant_period_idx` ON `cbam_certificate_surrenders` (`tenant_id`,`reporting_period`);--> statement-breakpoint
CREATE INDEX `cbam_eex_quotes_week_idx` ON `cbam_eex_quotes` (`quote_week`);