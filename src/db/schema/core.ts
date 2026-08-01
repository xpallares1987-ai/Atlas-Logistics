import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { commonAuditFields } from './_common.js';

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  taxId: text('tax_id'),
  creditLimit: real('credit_limit'),
  ...commonAuditFields
});

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  ...commonAuditFields
});

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  name: text('name').notNull(),
  type: text('type').notNull(), // PORT, WAREHOUSE, AIRPORT, CUSTOMER_FACILITY
  address: text('address'),
  lat: real('lat'),
  lng: real('lng'),
  ...commonAuditFields
});

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id),
  title: text('title').notNull(),
  validFrom: integer('valid_from', { mode: 'timestamp' }),
  validTo: integer('valid_to', { mode: 'timestamp' }),
  ...commonAuditFields
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password'),
  role: text('role').notNull(),
  ...commonAuditFields
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at').notNull()
});

export const systemSequences = sqliteTable('system_sequences', {
  name: text('name').primaryKey(),
  currentValue: integer('current_value').notNull().default(0),
  prefix: text('prefix'),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(),
  oldData: text('old_data'),
  newData: text('new_data'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().defaultNow()
});
