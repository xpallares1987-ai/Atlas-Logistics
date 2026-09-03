CREATE INDEX `idx_invoices_type_created_at` ON `invoices` (`type`, `created_at`);--> statement-breakpoint
CREATE INDEX `idx_shipments_status_created_at` ON `shipments` (`status`, `created_at`);--> statement-breakpoint
CREATE INDEX `idx_shipment_event_logs_shipment_id` ON `shipment_event_logs` (`shipment_id`);
