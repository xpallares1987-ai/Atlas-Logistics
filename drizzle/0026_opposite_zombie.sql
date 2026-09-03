PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_carbon_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`certificate_number` text NOT NULL,
	`calculation_id` text NOT NULL,
	`beneficiary_name` text NOT NULL,
	`project_id` text NOT NULL,
	`project_name` text NOT NULL,
	`project_standard` text NOT NULL,
	`offset_tco2e` real NOT NULL,
	`amount_paid_eur` real NOT NULL,
	`qr_validation_url` text NOT NULL,
	`issued_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`calculation_id`) REFERENCES `carbon_calculations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `carbon_offset_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_carbon_certificates`("id", "certificate_number", "calculation_id", "beneficiary_name", "project_id", "project_name", "project_standard", "offset_tco2e", "amount_paid_eur", "qr_validation_url", "issued_at") SELECT "id", "certificate_number", "calculation_id", "beneficiary_name", "project_id", "project_name", "project_standard", "offset_tco2e", "amount_paid_eur", "qr_validation_url", "issued_at" FROM `carbon_certificates`;--> statement-breakpoint
DROP TABLE `carbon_certificates`;--> statement-breakpoint
ALTER TABLE `__new_carbon_certificates` RENAME TO `carbon_certificates`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `carbon_certificates_certificate_number_unique` ON `carbon_certificates` (`certificate_number`);--> statement-breakpoint
CREATE INDEX `idx_carbon_certificates_issued_at_id` ON `carbon_certificates` (`issued_at`,`id`);