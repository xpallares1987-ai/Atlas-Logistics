import { integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const commonAuditFields = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
  isDeleted: integer("is_deleted", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  metadata: text("metadata", { mode: "json" }),
  tags: text("tags", { mode: "json" }), // array of strings stored as JSON
};
