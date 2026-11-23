CREATE TABLE `crdt_entity_states` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`vector_clock` text NOT NULL,
	`state_payload` text NOT NULL,
	`last_modified_node_id` text NOT NULL,
	`last_hlc_timestamp` text NOT NULL,
	`has_active_hold` integer DEFAULT false NOT NULL,
	`hold_metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crdt_mutation_audit` (
	`id` text PRIMARY KEY,
	`tenant_id` text DEFAULT 'tenant-default' NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`origin_node_id` text NOT NULL,
	`applied_node_id` text NOT NULL,
	`mutation_vector_clock` text NOT NULL,
	`delta_payload` text NOT NULL,
	`resolution_outcome` text NOT NULL,
	`conflicts_detected` text,
	`hlc_timestamp` text NOT NULL,
	`applied_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crdt_station_peers` (
	`node_id` text PRIMARY KEY,
	`station_code` text NOT NULL UNIQUE,
	`station_name` text NOT NULL,
	`role` text DEFAULT 'EDGE_STATION' NOT NULL,
	`endpoint_url` text,
	`last_sync_at` text,
	`last_known_vector_clock` text,
	`sync_status` text DEFAULT 'ONLINE_SYNCED' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_crdt_states_tenant_entity` ON `crdt_entity_states` (`tenant_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_crdt_states_hold` ON `crdt_entity_states` (`tenant_id`,`has_active_hold`);--> statement-breakpoint
CREATE INDEX `idx_crdt_states_updated` ON `crdt_entity_states` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_crdt_mutations_tenant_entity` ON `crdt_mutation_audit` (`tenant_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_crdt_mutations_node_hlc` ON `crdt_mutation_audit` (`origin_node_id`,`hlc_timestamp`);--> statement-breakpoint
CREATE INDEX `idx_crdt_peers_station_code` ON `crdt_station_peers` (`station_code`);--> statement-breakpoint
CREATE INDEX `idx_crdt_peers_sync_status` ON `crdt_station_peers` (`sync_status`);