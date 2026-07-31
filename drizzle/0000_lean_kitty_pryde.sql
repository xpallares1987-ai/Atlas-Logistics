CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customs_event_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`event_type` text NOT NULL,
	`description` text NOT NULL,
	`recorded_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceNumber` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pending_ai_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`document_url` text NOT NULL,
	`extracted_data` text,
	`confidence_score` real,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rates` (
	`id` text PRIMARY KEY NOT NULL,
	`carrier` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`containerType` text NOT NULL,
	`baseRate` real NOT NULL,
	`transitDays` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shipment_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`gcs_url` text NOT NULL,
	`parsed_data` text
);
--> statement-breakpoint
CREATE TABLE `shipment_event_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`status` text NOT NULL,
	`location` text NOT NULL,
	`recorded_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`origin` text NOT NULL,
	`destination` text NOT NULL,
	`currentLat` real,
	`currentLng` real,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`hashed_password` text,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);