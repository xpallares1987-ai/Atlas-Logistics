CREATE TABLE `agent_clearing_ledger` (
	`id` text PRIMARY KEY,
	`entry_number` text NOT NULL UNIQUE,
	`note_type` text NOT NULL,
	`agent_company_id` text NOT NULL,
	`shipment_id` text,
	`hbl_or_hawb_number` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`amount` real NOT NULL,
	`exchange_rate_to_eur` real DEFAULT 1 NOT NULL,
	`amount_eur` real NOT NULL,
	`verified_gross_profit_eur` real,
	`agent_profit_share_percent` real DEFAULT 50 NOT NULL,
	`calculated_agent_share_eur` real,
	`origin_forwarder_share_eur` real,
	`description` text NOT NULL,
	`clearing_status` text DEFAULT 'OPEN' NOT NULL,
	`settlement_id` text,
	`dispute_reason` text,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_agent_clearing_ledger_agent_company_id_companies_id_fk` FOREIGN KEY (`agent_company_id`) REFERENCES `companies`(`id`),
	CONSTRAINT `fk_agent_clearing_ledger_shipment_id_shipments_id_fk` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`),
	CONSTRAINT `fk_agent_clearing_ledger_settlement_id_agent_settlements_id_fk` FOREIGN KEY (`settlement_id`) REFERENCES `agent_settlements`(`id`)
);
--> statement-breakpoint
CREATE TABLE `air_cargo_messages` (
	`id` text PRIMARY KEY,
	`message_type` text NOT NULL,
	`message_standard` text DEFAULT 'CARGO_IMP' NOT NULL,
	`message_version` text DEFAULT '16' NOT NULL,
	`awb_number` text NOT NULL,
	`airway_bill_id` text,
	`parent_mawb_number` text,
	`flight_number` text,
	`flight_date` text,
	`origin_airport` text NOT NULL,
	`destination_airport` text NOT NULL,
	`milestone_code` text,
	`direction` text NOT NULL,
	`payload_raw` text NOT NULL,
	`pieces_count` integer DEFAULT 1 NOT NULL,
	`gross_weight_kg` real DEFAULT 0 NOT NULL,
	`chargeable_weight_kg` real DEFAULT 0 NOT NULL,
	`transmission_status` text DEFAULT 'QUEUED' NOT NULL,
	`airline_ack_code` text,
	`airline_ack_message` text,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `fk_air_cargo_messages_airway_bill_id_airway_bills_id_fk` FOREIGN KEY (`airway_bill_id`) REFERENCES `airway_bills`(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_agent_clearing_agent_status` ON `agent_clearing_ledger` (`agent_company_id`,`clearing_status`);--> statement-breakpoint
CREATE INDEX `idx_agent_clearing_hbl` ON `agent_clearing_ledger` (`hbl_or_hawb_number`);--> statement-breakpoint
CREATE INDEX `idx_air_cargo_messages_awb` ON `air_cargo_messages` (`awb_number`);--> statement-breakpoint
CREATE INDEX `idx_air_cargo_messages_type_status` ON `air_cargo_messages` (`message_type`,`transmission_status`);