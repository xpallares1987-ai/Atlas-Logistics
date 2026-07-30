import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  currentLat: real('currentLat'),
  currentLng: real('currentLng'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoiceNumber').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const rates = sqliteTable('rates', {
  id: text('id').primaryKey(),
  carrier: text('carrier').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  containerType: text('containerType').notNull(),
  baseRate: real('baseRate').notNull(),
  transitDays: integer('transitDays').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const customsEventLogs = sqliteTable('customs_event_logs', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull(),
  eventType: text('event_type').notNull(),
  description: text('description').notNull(),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const shipmentEventLogs = sqliteTable('shipment_event_logs', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull(),
  status: text('status').notNull(),
  location: text('location').notNull(),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const shipmentDocuments = sqliteTable('shipment_documents', {
  id: text('id').primaryKey(),
  gcsUrl: text('gcs_url').notNull(),
  parsedData: text('parsed_data', { mode: 'json' }),
});

export const pendingAiReviews = sqliteTable('pending_ai_reviews', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').notNull(),
  documentUrl: text('document_url').notNull(),
  extractedData: text('extracted_data', { mode: 'json' }),
  confidenceScore: real('confidence_score'),
  status: text('status').notNull(),
});
