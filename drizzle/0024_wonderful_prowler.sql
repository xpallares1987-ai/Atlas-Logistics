CREATE TABLE `carta_porte_declarations` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`id_ccp` text NOT NULL,
	`transporte_tipo` text DEFAULT 'AUTOTRANSPORTE_FEDERAL' NOT NULL,
	`rfc_emisor` text NOT NULL,
	`rfc_receptor` text NOT NULL,
	`origen_json` text NOT NULL,
	`destino_json` text NOT NULL,
	`vehiculo_json` text NOT NULL,
	`operador_json` text NOT NULL,
	`mercancias_json` text NOT NULL,
	`xml_timbrado` text,
	`qr_code_data` text,
	`rvc_percentage` real,
	`immex_pedimento_tipo` text,
	`customs_dwell_hours_predicted` real,
	`status` text DEFAULT 'STAMPED' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `carta_porte_declarations_id_ccp_unique` ON `carta_porte_declarations` (`id_ccp`);--> statement-breakpoint
CREATE INDEX `cp_shipment_idx` ON `carta_porte_declarations` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `cp_id_ccp_idx` ON `carta_porte_declarations` (`id_ccp`);--> statement-breakpoint
CREATE TABLE `efirma_audit_stamps` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text,
	`document_id` text,
	`carta_porte_id` text,
	`document_type` text NOT NULL,
	`certificate_serial` text NOT NULL,
	`rfc_titular` text NOT NULL,
	`razon_social` text NOT NULL,
	`cadena_original` text NOT NULL,
	`cadena_original_sha256` text NOT NULL,
	`sello_digital_base64` text NOT NULL,
	`rfc3161_timestamp_token` text NOT NULL,
	`tamper_seal_hash` text NOT NULL,
	`status` text DEFAULT 'VALIDATED_AND_SEALED' NOT NULL,
	`verified_at` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`carta_porte_id`) REFERENCES `carta_porte_declarations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `efirma_shipment_idx` ON `efirma_audit_stamps` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `efirma_doc_idx` ON `efirma_audit_stamps` (`document_id`);--> statement-breakpoint
CREATE INDEX `efirma_serial_idx` ON `efirma_audit_stamps` (`certificate_serial`);--> statement-breakpoint
CREATE TABLE `blockchain_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`contract_id` text NOT NULL,
	`block_number` integer NOT NULL,
	`timestamp` text NOT NULL,
	`previous_hash` text NOT NULL,
	`block_hash` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_data_json` text NOT NULL,
	`signer` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `smart_escrow_contracts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blk_contract_idx` ON `blockchain_blocks` (`contract_id`);--> statement-breakpoint
CREATE INDEX `blk_num_idx` ON `blockchain_blocks` (`contract_id`,`block_number`);--> statement-breakpoint
CREATE INDEX `blk_hash_idx` ON `blockchain_blocks` (`block_hash`);--> statement-breakpoint
CREATE TABLE `smart_escrow_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`carrier_scac` text NOT NULL,
	`shipper_name` text NOT NULL,
	`consignee_name` text NOT NULL,
	`escrow_amount_eur` real NOT NULL,
	`escrow_status` text DEFAULT 'FUNDED' NOT NULL,
	`dispute_reason` text,
	`ebl_data_json` text NOT NULL,
	`milestones_data_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `smart_escrow_contracts_shipment_id_unique` ON `smart_escrow_contracts` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `escrow_shipment_idx` ON `smart_escrow_contracts` (`shipment_id`);--> statement-breakpoint
CREATE TABLE `erp_purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`po_number` text NOT NULL,
	`erp_system` text NOT NULL,
	`shipment_id` text,
	`vendor_name` text NOT NULL,
	`company_code` text NOT NULL,
	`purchasing_group` text NOT NULL,
	`total_amount` real NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`status` text DEFAULT 'RELEASED' NOT NULL,
	`line_items_json` text NOT NULL,
	`grn_number` text,
	`freight_accrual_doc_number` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `erp_purchase_orders_po_number_unique` ON `erp_purchase_orders` (`po_number`);--> statement-breakpoint
CREATE INDEX `erp_po_num_idx` ON `erp_purchase_orders` (`po_number`);--> statement-breakpoint
CREATE INDEX `erp_shipment_idx` ON `erp_purchase_orders` (`shipment_id`);--> statement-breakpoint
CREATE INDEX `erp_system_idx` ON `erp_purchase_orders` (`erp_system`);--> statement-breakpoint
CREATE TABLE `erp_sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`po_id` text,
	`erp_system` text NOT NULL,
	`operation` text NOT NULL,
	`status` text NOT NULL,
	`request_payload_json` text,
	`response_payload_json` text,
	`latency_ms` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`po_id`) REFERENCES `erp_purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `erp_log_po_idx` ON `erp_sync_logs` (`po_id`);--> statement-breakpoint
CREATE INDEX `erp_log_status_idx` ON `erp_sync_logs` (`status`);