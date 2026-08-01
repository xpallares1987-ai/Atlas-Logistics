import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { commonAuditFields } from './_common.js';

export const carriers = sqliteTable('carriers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  scac: text('scac'), // Standard Carrier Alpha Code
  type: text('type').notNull(), // OCEAN, AIR, ROAD
  ...commonAuditFields
});

export const destinationAgents = sqliteTable('destination_agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  ...commonAuditFields
});

export const customsBrokers = sqliteTable('customs_brokers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  licenseNumber: text('license_number'),
  ...commonAuditFields
});

export const drivers = sqliteTable('drivers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  licenseType: text('license_type'),
  ...commonAuditFields
});

export const trucks = sqliteTable('trucks', {
  id: text('id').primaryKey(),
  plateNumber: text('plate_number').notNull(),
  capacity: real('capacity'),
  ...commonAuditFields
});
