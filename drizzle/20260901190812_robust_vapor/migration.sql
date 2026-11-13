CREATE TABLE `dg_consignment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`un_number` text NOT NULL,
	`proper_shipping_name` text NOT NULL,
	`technical_chemical_name` text,
	`primary_hazard_class` text NOT NULL,
	`subsidiary_hazard_classes` text,
	`packing_group` text DEFAULT 'PG_II' NOT NULL,
	`flash_point_celsius` real,
	`is_marine_pollutant` integer DEFAULT false NOT NULL,
	`package_count` integer DEFAULT 1 NOT NULL,
	`package_type_description` text NOT NULL,
	`package_un_code` text DEFAULT '4G' NOT NULL,
	`net_quantity_per_package` real NOT NULL,
	`unit_of_measure` text DEFAULT 'LITERS' NOT NULL,
	`total_net_quantity` real NOT NULL,
	`total_gross_mass_kg` real NOT NULL,
	`net_explosive_mass_kg` real DEFAULT 0 NOT NULL,
	`is_limited_quantity_lq` integer DEFAULT false NOT NULL,
	`excepted_quantity_code` text DEFAULT 'E0' NOT NULL,
	`adr_transport_category` integer DEFAULT 2 NOT NULL,
	`adr_points_calculated` real DEFAULT 0 NOT NULL,
	`adr_tunnel_restriction_code` text DEFAULT 'D/E' NOT NULL,
	`kemler_hazard_id_number` text DEFAULT '33' NOT NULL,
	`ems_fire_code` text DEFAULT 'F-E' NOT NULL,
	`ems_spillage_code` text DEFAULT 'S-E' NOT NULL,
	`iata_packing_instruction` text,
	`lithium_battery_section` text DEFAULT 'NOT_APPLICABLE' NOT NULL,
	`lithium_state_of_charge_percentage` real,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dg_emergency_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`card_reference` text NOT NULL,
	`un_numbers_summary` text NOT NULL,
	`primary_classes_summary` text NOT NULL,
	`emergency_phone_24h` text NOT NULL,
	`fire_intervention_protocol` text NOT NULL,
	`spillage_containment_protocol` text NOT NULL,
	`first_aid_protocol` text NOT NULL,
	`required_ppe_equipment` text NOT NULL,
	`special_environmental_hazards` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dg_emergency_cards_card_reference_unique` ON `dg_emergency_cards` (`card_reference`);--> statement-breakpoint
CREATE TABLE `dg_packing_certificates` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`certificate_reference` text NOT NULL,
	`container_or_vehicle_number` text NOT NULL,
	`seal_number_iso_17712` text NOT NULL,
	`packing_facility_name` text NOT NULL,
	`packing_facility_address` text NOT NULL,
	`declarant_name` text NOT NULL,
	`declarant_company` text NOT NULL,
	`declarant_position` text NOT NULL,
	`is_clean_dry_suitable` integer DEFAULT true NOT NULL,
	`is_segregation_compliant` integer DEFAULT true NOT NULL,
	`is_packages_sound_undamaged` integer DEFAULT true NOT NULL,
	`is_properly_secured_braced` integer DEFAULT true NOT NULL,
	`is_placarded_and_marked` integer DEFAULT true NOT NULL,
	`sign_date` text NOT NULL,
	`status` text DEFAULT 'CERTIFIED_COMPLIANT' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dg_packing_certificates_certificate_reference_unique` ON `dg_packing_certificates` (`certificate_reference`);--> statement-breakpoint
CREATE TABLE `dg_segregation_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`dg_shipment_id` text NOT NULL,
	`container_or_vehicle_number` text NOT NULL,
	`audit_date` text NOT NULL,
	`evaluated_item_ids_json` text NOT NULL,
	`segregation_compliance_status` text DEFAULT 'COMPLIANT_SEGREGATED' NOT NULL,
	`total_conflicts_detected` integer DEFAULT 0 NOT NULL,
	`conflict_details_json` text,
	`auditor_name` text NOT NULL,
	`audit_certificate_statement` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`dg_shipment_id`) REFERENCES `dg_shipments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dg_shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_reference` text NOT NULL,
	`transport_mode` text NOT NULL,
	`carrier_name` text NOT NULL,
	`vessel_or_flight_or_vehicle_plate` text NOT NULL,
	`voyage_or_flight_number` text,
	`origin_port_or_location` text NOT NULL,
	`destination_port_or_location` text NOT NULL,
	`shipper_name` text NOT NULL,
	`shipper_address` text NOT NULL,
	`consignee_name` text NOT NULL,
	`consignee_address` text NOT NULL,
	`emergency_contact_name` text NOT NULL,
	`emergency_contact_phone` text NOT NULL,
	`aircraft_type` text DEFAULT 'NOT_APPLICABLE' NOT NULL,
	`total_packages` integer DEFAULT 1 NOT NULL,
	`total_net_quantity_kg` real DEFAULT 0 NOT NULL,
	`total_gross_mass_kg` real DEFAULT 0 NOT NULL,
	`has_radioactive_materials` integer DEFAULT false NOT NULL,
	`has_marine_pollutants` integer DEFAULT false NOT NULL,
	`has_lithium_batteries` integer DEFAULT false NOT NULL,
	`segregation_status` text DEFAULT 'PENDING_AUDIT' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`declaration_remarks` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dg_shipments_shipment_reference_unique` ON `dg_shipments` (`shipment_reference`);