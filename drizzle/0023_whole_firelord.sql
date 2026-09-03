CREATE INDEX `idx_carbon_calculations_created_at_id` ON `carbon_calculations` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_carbon_calculations_filters_created_at_id` ON `carbon_calculations` (`entity_type`,`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_carbon_certificates_issued_at_id` ON `carbon_certificates` (`issued_at`,`id`);