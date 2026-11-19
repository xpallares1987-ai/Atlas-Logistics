-- Strict 25-Code Logistics Entity Taxonomy Migration & Zero-Atlas-Mock Cleanup
-- 1. Upsert all 25 canonical unique 3-letter codes into address_types (FK-safe ON CONFLICT DO UPDATE)
INSERT INTO `address_types` (`code`, `name`, `description`, `is_active`, `is_deleted`) VALUES
  ('MCC', 'Main Customer Company', 'Beneficial cargo owner (BCO), primary merchant, shipper, importer, exporter, or consignee party.', 1, 0),
  ('OCA', 'Ocean Carrier', 'Vessel-operating common carrier (VOCC), container liner service, or ocean shipping company.', 1, 0),
  ('ACA', 'Airline Carrier', 'Commercial cargo airline, air freight carrier, or scheduled freighter operator.', 1, 0),
  ('RCA', 'Rail Carrier', 'Intermodal freight rail operator, railway undertaking, or rail shuttle service.', 1, 0),
  ('CLA', 'Carrier Line Agency', 'Authorized liner shipping agency representing an ocean or air carrier at port (agencia consignataria).', 1, 0),
  ('CBA', 'Customs Broker Agency', 'AEO-licensed customs house broker agency, fiscal representative, and tariff clearance provider.', 1, 0),
  ('OAG', 'Representative Agent (Origin)', 'Freight forwarding representative and handling partner for the country of origin.', 1, 0),
  ('DAG', 'Representative Agent (Destination)', 'Freight forwarding representative and breakbulk delivery partner for the country of destination.', 1, 0),
  ('FFC', 'Freight Forwarding Company', 'Non-vessel operating common carrier (NVOCC), international freight forwarder, or 3PL orchestrator.', 1, 0),
  ('SPT', 'Seaport Terminal', 'Deep-sea maritime container terminal, stevedoring facility, or seaport container quay.', 1, 0),
  ('RST', 'Railway Station Terminal', 'Intermodal rail freight terminal, container railhead depot, or marshalling yard.', 1, 0),
  ('OIC', 'Inland Container Terminal (Origin)', 'Inland dry port, container depot, or off-dock intermodal facility at origin.', 1, 0),
  ('DIC', 'Inland Container Terminal (Destination)', 'Inland dry port, container depot, or off-dock intermodal facility at destination.', 1, 0),
  ('OEW', 'External Warehouse (Origin)', 'Third-party (3PL) contracted consolidation warehouse, CFS, or distribution facility at origin.', 1, 0),
  ('DEW', 'External Warehouse (Destination)', 'Third-party (3PL) contracted deconsolidation warehouse, CFS, or bonded distribution facility at destination.', 1, 0),
  ('OWO', 'Owned Warehouse (Origin)', 'Company-owned and operated cross-dock facility, customs warehouse, or distribution hub at origin.', 1, 0),
  ('DWO', 'Owned Warehouse (Destination)', 'Company-owned and operated cross-dock facility, bonded depot, or delivery hub at destination.', 1, 0),
  ('OHA', 'Haulier (Origin)', 'Pre-carriage road transport operator, drayage trucker, or inland carrier at origin.', 1, 0),
  ('DHA', 'Haulier (Destination)', 'On-carriage road transport operator, final-mile delivery trucker, or drayage carrier at destination.', 1, 0),
  ('INS', 'Insurance', 'Marine cargo insurer, P&I club, cargo underwriter, or claims average adjuster.', 1, 0),
  ('PLL', 'Place of Loading Location', 'Designated origin place, factory, farm, or cargo consolidation location where freight is loaded.', 1, 0),
  ('PDL', 'Place of Delivery Location', 'Designated destination place, consignee facility, or cargo delivery location where freight is surrendered.', 1, 0),
  ('POL', 'Port of Loading', 'Origin maritime seaport, airport, or railhead where goods are laden on board the main international conveyance.', 1, 0),
  ('POD', 'Port of Discharge', 'Destination maritime seaport, airport, or railhead where goods are unladen from the main international conveyance.', 1, 0),
  ('TSP', 'Transhipment Port', 'Intermediate transfer port or airport hub where containers/cargo undergo vessel-to-vessel or multimodal relay.', 1, 0)
ON CONFLICT(`code`) DO UPDATE SET
  `name` = excluded.`name`,
  `description` = excluded.`description`,
  `is_active` = 1,
  `is_deleted` = 0;
--> statement-breakpoint
-- 2. Migrate existing addresses rows from legacy codes to canonical 25-code taxonomy
UPDATE `addresses` SET `address_type` = 'OCA' WHERE `address_type` IN ('CAR', 'CARRIER');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'SPT' WHERE `address_type` IN ('TRM', 'TERMINAL');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'MCC' WHERE `address_type` IN ('CUS', 'CUST', 'CUSTOMER', 'CONSIGNEE_NOTIFY', 'SUP');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'CBA' WHERE `address_type` IN ('CB', 'CUSTOMS_BROKER');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'CLA' WHERE `address_type` IN ('CAA', 'CARRIER_AGENT');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'FFC' WHERE `address_type` IN ('FW', 'FWD', 'FORWARDER');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'OHA' WHERE `address_type` IN ('HAU', 'HAULIER');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'OIC' WHERE `id` LIKE 'addr_icd_%' OR `address_type` IN ('INLAND_DEPOT', 'INLAND_CONTAINER_DEPOT');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'OWO' WHERE `id` IN ('addr_fac_da_bcn_zal', 'addr_fac_dda_mad_cos', 'addr_fac_adt_vlc_port') AND `address_type` IN ('WH', 'WAREHOUSE');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'OEW' WHERE `address_type` IN ('WH', 'WAREHOUSE');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'POL' WHERE `id` = 'addr_port_bcn' OR `address_type` IN ('PORT_AUTHORITY', 'PAT');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'OAG' WHERE `address_type` IN ('AG', 'AGENT') AND `country` IN ('CN', 'SG');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'DAG' WHERE `address_type` IN ('AG', 'AGENT');
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'INS' WHERE `address_type` = 'INSURANCE';
--> statement-breakpoint
UPDATE `addresses` SET `address_type` = 'MCC' WHERE `address_type` NOT IN (
  'MCC','OCA','ACA','RCA','CLA','CBA','OAG','DAG','FFC',
  'SPT','RST','OIC','DIC','OEW','DEW','OWO','DWO','OHA','DHA',
  'INS','PLL','PDL','POL','POD','TSP'
);
--> statement-breakpoint
-- 3. Replace mock 'Atlas' holding groups with real-world Noatum Logistics group
UPDATE `companies`
SET `name` = 'Noatum Logistics Enterprise Group',
    `group_code` = 'NOATUM-HQ',
    `sector` = 'Global Supply Chain & Multimodal 4PL',
    `headquarters_country` = 'ES',
    `tax_id` = 'ES-A28219553'
WHERE `id` = 'c-1';
--> statement-breakpoint
INSERT INTO `companies` (`id`, `name`, `group_code`, `sector`, `headquarters_country`, `tax_id`, `credit_limit`, `is_active`, `is_deleted`)
VALUES ('grp_noatum', 'Noatum Logistics Global Forwarding', 'NOAT', 'Freight Forwarding & NVOCC', 'ES', 'ES-B84129901', 2000000, 1, 0)
ON CONFLICT(`id`) DO UPDATE SET
  `name` = excluded.`name`,
  `group_code` = excluded.`group_code`,
  `sector` = excluded.`sector`;
--> statement-breakpoint
UPDATE `addresses` SET `company_id` = 'grp_noatum' WHERE `company_id` = 'grp_atlas';
--> statement-breakpoint
UPDATE `contacts` SET `company_id` = 'grp_noatum' WHERE `company_id` = 'grp_atlas';
--> statement-breakpoint
UPDATE `users` SET `company_id` = 'grp_noatum' WHERE `company_id` = 'grp_atlas';
--> statement-breakpoint
UPDATE `bookings` SET `customer_id` = 'grp_noatum' WHERE `customer_id` = 'grp_atlas';
--> statement-breakpoint
UPDATE `shipments` SET `company_id` = 'grp_noatum' WHERE `company_id` = 'grp_atlas';
--> statement-breakpoint
UPDATE `agent_settlements` SET `agent_id` = 'grp_noatum' WHERE `agent_id` = 'grp_atlas';
--> statement-breakpoint
UPDATE `contracts` SET `company_id` = 'grp_noatum' WHERE `company_id` = 'grp_atlas';
--> statement-breakpoint
UPDATE `edi_partners` SET `company_id` = 'grp_noatum' WHERE `company_id` = 'grp_atlas';
--> statement-breakpoint
DELETE FROM `companies` WHERE `id` = 'grp_atlas';
--> statement-breakpoint
-- 4. Purge legacy non-canonical codes from address_types so FK enforces strictly 25 unique codes
DELETE FROM `address_types` WHERE `code` NOT IN (
  'MCC','OCA','ACA','RCA','CLA','CBA','OAG','DAG','FFC',
  'SPT','RST','OIC','DIC','OEW','DEW','OWO','DWO','OHA','DHA',
  'INS','PLL','PDL','POL','POD','TSP'
);
