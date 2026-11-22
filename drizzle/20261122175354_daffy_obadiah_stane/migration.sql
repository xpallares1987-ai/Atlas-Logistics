ALTER TABLE `dcsa_events_log` ADD `transport_mode` text DEFAULT 'OCEAN' NOT NULL;--> statement-breakpoint
ALTER TABLE `dcsa_events_log` ADD `source_type` text DEFAULT 'CARRIER_DCSA_EDI' NOT NULL;--> statement-breakpoint
ALTER TABLE `dcsa_events_log` ADD `air_waybill_number` text;--> statement-breakpoint
ALTER TABLE `dcsa_events_log` ADD `resolved_po_id` text;--> statement-breakpoint
ALTER TABLE `dcsa_events_log` ADD `matched_milestone_code` text;--> statement-breakpoint
ALTER TABLE `dcsa_events_log` ADD `variance_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `dcsa_events_source_type_idx` ON `dcsa_events_log` (`source_type`);--> statement-breakpoint
CREATE INDEX `dcsa_events_awb_idx` ON `dcsa_events_log` (`air_waybill_number`);--> statement-breakpoint
CREATE INDEX `dcsa_events_resolved_po_idx` ON `dcsa_events_log` (`resolved_po_id`);