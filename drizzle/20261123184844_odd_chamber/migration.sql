CREATE TABLE `customs_filing_transmissions` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`clearance_id` text NOT NULL,
	`agency` text NOT NULL,
	`protocol` text DEFAULT 'SOAP_MTLS' NOT NULL,
	`message_function` text DEFAULT 'ORIGINAL' NOT NULL,
	`filing_reference` text NOT NULL UNIQUE,
	`payload_sha256` text NOT NULL,
	`signature_algorithm` text DEFAULT 'rsa-sha256' NOT NULL,
	`certificate_thumbprint` text NOT NULL,
	`raw_request_xml_path` text,
	`raw_response_xml_path` text,
	`response_status` text DEFAULT 'PENDING' NOT NULL,
	`mrn_assigned` text,
	`error_code` text,
	`error_message` text,
	`sent_at` text,
	`acknowledged_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_customs_filing_transmissions_clearance_id_customs_clearances_id_fk` FOREIGN KEY (`clearance_id`) REFERENCES `customs_clearances`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `customs_pki_certificates` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`agency` text NOT NULL,
	`certificate_alias` text NOT NULL,
	`thumbprint_sha256` text NOT NULL UNIQUE,
	`issuer_dn` text NOT NULL,
	`subject_dn` text NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text NOT NULL,
	`key_storage_type` text DEFAULT 'LOCAL_PKCS12' NOT NULL,
	`is_revoked` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_customs_transmissions_tenant_clearance` ON `customs_filing_transmissions` (`tenant_id`,`clearance_id`);--> statement-breakpoint
CREATE INDEX `idx_customs_transmissions_tenant_agency` ON `customs_filing_transmissions` (`tenant_id`,`agency`);--> statement-breakpoint
CREATE INDEX `idx_customs_transmissions_filing_ref` ON `customs_filing_transmissions` (`filing_reference`);--> statement-breakpoint
CREATE INDEX `idx_customs_transmissions_status` ON `customs_filing_transmissions` (`tenant_id`,`response_status`);--> statement-breakpoint
CREATE INDEX `idx_customs_pki_certs_tenant_agency` ON `customs_pki_certificates` (`tenant_id`,`agency`);--> statement-breakpoint
CREATE INDEX `idx_customs_pki_certs_thumbprint` ON `customs_pki_certificates` (`thumbprint_sha256`);