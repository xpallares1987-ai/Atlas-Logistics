/**
 * @file vendors.ts
 * @description Fleet assets and drayage road transport operational resources (drivers, trucks).
 * Note: Commercial partners (carriers, customs brokers, destination agents) are canonicalized in core.ts (addresses).
 * @module @atlas/db/schema/vendors
 */

import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { commonAuditFields } from "./_common.js";

export const drivers = sqliteTable("drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  licenseType: text("license_type"),
  ...commonAuditFields,
});

export const trucks = sqliteTable("trucks", {
  id: text("id").primaryKey(),
  plateNumber: text("plate_number").notNull(),
  capacity: real("capacity"),
  ...commonAuditFields,
});
