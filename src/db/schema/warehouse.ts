import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";
import { users } from "./core.js";

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"),
  ...commonAuditFields,
});

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  status: text("status").notNull().default("PENDING"),
  totalAmount: real("total_amount"),
  ...commonAuditFields,
});

export const fulfillmentTasks = sqliteTable("fulfillment_tasks", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  status: text("status").notNull().default("PICK"), // PICK, PACK, DISPATCH, COMPLETED
  assignedTo: text("assigned_to").references(() => users.id),
  priority: text("priority").notNull().default("NORMAL"),
  ...commonAuditFields,
});
