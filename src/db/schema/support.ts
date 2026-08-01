import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { commonAuditFields } from './_common.js';
import { users, locations } from './core.js';
import { shipments } from './operations.js';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  assignedTo: text('assigned_to').references(() => users.id),
  status: text('status').notNull(), // TODO, IN_PROGRESS, DONE
  dueDate: integer('due_date', { mode: 'timestamp' }),
  shipmentId: text('shipment_id').references(() => shipments.id),
  ...commonAuditFields
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  ...commonAuditFields
});

export const warehouseInventory = sqliteTable('warehouse_inventory', {
  id: text('id').primaryKey(),
  locationId: text('location_id').notNull().references(() => locations.id),
  shipmentId: text('shipment_id').references(() => shipments.id),
  itemDescription: text('item_description').notNull(),
  quantity: integer('quantity').notNull(),
  weight: real('weight'),
  volume: real('volume'),
  ...commonAuditFields
});

export const equipments = sqliteTable('equipments', {
  id: text('id').primaryKey(),
  equipmentNumber: text('equipment_number').notNull(), // e.g., Container number
  type: text('type').notNull(),
  status: text('status').notNull(), // AVAILABLE, IN_USE, MAINTENANCE
  currentLocationId: text('current_location_id').references(() => locations.id),
  ...commonAuditFields
});

export const bpmnDiagrams = sqliteTable('bpmn_diagrams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ...commonAuditFields
});

export const bpmnVersions = sqliteTable('bpmn_versions', {
  id: text('id').primaryKey(),
  diagramId: text('diagram_id').notNull().references(() => bpmnDiagrams.id),
  versionNumber: integer('version_number').notNull(),
  xmlContent: text('xml_content').notNull(),
  authorId: text('author_id').references(() => users.id),
  ...commonAuditFields
});

export const pendingAiReviews = sqliteTable('pending_ai_reviews', {
  id: text('id').primaryKey(),
  shipmentId: text('shipment_id').references(() => shipments.id),
  documentUrl: text('document_url'),
  status: text('status').notNull(),
  result: text('result'),
  ...commonAuditFields
});
