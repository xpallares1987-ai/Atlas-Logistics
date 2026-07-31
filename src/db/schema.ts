import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password'),
  role: text('role').notNull(),
  companyId: text('company_id').references(() => companies.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at').notNull()
});

export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  currentLat: real('currentLat'),
  currentLng: real('currentLng'),
  companyId: text('company_id').references(() => companies.id),
  createdBy: text('created_by').references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
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
  companyId: text('company_id').references(() => companies.id),
  createdBy: text('created_by').references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
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
  companyId: text('company_id').references(() => companies.id),
  createdBy: text('created_by').references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
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

export const invoiceEventLogs = sqliteTable('invoice_event_logs', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  changedBy: text('changed_by').references(() => users.id),
  reason: text('reason'),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

export const rateChangeLogs = sqliteTable('rate_change_logs', {
  id: text('id').primaryKey(),
  rateId: text('rate_id').notNull().references(() => rates.id),
  previousAmount: real('previous_amount'),
  newAmount: real('new_amount').notNull(),
  changedBy: text('changed_by').references(() => users.id),
  reason: text('reason'),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});
