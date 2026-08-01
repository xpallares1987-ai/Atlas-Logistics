import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { commonAuditFields } from './_common.js';
import { lanes } from './pricing.js';
import { carriers, customsBrokers } from './vendors.js';
import { locations, companies, users } from './core.js';

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  laneId: text('lane_id').notNull().references(() => lanes.id),
  carrierId: text('carrier_id').notNull().references(() => carriers.id),
  vesselName: text('vessel_name'),
  voyageNumber: text('voyage_number'),
  departureDate: integer('departure_date', { mode: 'timestamp' }).notNull(),
  arrivalDate: integer('arrival_date', { mode: 'timestamp' }).notNull(),
  ...commonAuditFields
});

export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  incoterm: text('incoterm'), // FOB, CIF, EXW
  serviceType: text('service_type'), // FCL, LCL, AIR, ROAD
  laneId: text('lane_id').notNull().references(() => lanes.id),
  scheduleId: text('schedule_id').references(() => schedules.id),
  vesselName: text('vessel_name'),
  voyageNumber: text('voyage_number'),
  carbonFootprint: real('carbon_footprint'),
  portOfEntryId: text('port_of_entry_id').references(() => locations.id),
  clearanceStatus: text('clearance_status'),
  currentLat: real('currentLat'),
  currentLng: real('currentLng'),
  companyId: text('company_id').notNull().references(() => companies.id),
  createdBy: text('created_by').references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
  ...commonAuditFields
});

export const shipmentContainers = sqliteTable('shipment_containers', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull().references(() => shipments.id),
  containerNumber: text('container_number').notNull(),
  containerType: text('container_type').notNull(),
  sealNumber: text('seal_number'),
  weight: real('weight'),
  ...commonAuditFields
});

export const hsCodes = sqliteTable('hs_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description').notNull(),
  ...commonAuditFields
});

export const customsDeclarations = sqliteTable('customs_declarations', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull().references(() => shipments.id),
  brokerId: text('broker_id').references(() => customsBrokers.id),
  hsCodeId: text('hs_code_id').references(() => hsCodes.id),
  dutiesAmount: real('duties_amount'),
  taxesAmount: real('taxes_amount'),
  status: text('status').notNull(),
  ...commonAuditFields
});
