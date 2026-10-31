import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// ============================================================================
// OPERATIONAL INTELLIGENCE SCHEMA (SQLite Domain Tables)
// ============================================================================

export const scmOperationalExceptionsV2 = sqliteTable(
  "op_intelligence_exceptions_v2",
  {
    exceptionId: text("exception_id").primaryKey(),
    shipmentId: text("shipment_id").notNull(),
    category: text("category").notNull(), // CUSTOMS_HOLD | WEATHER_DELAY | CARRIER_ROLL | EQUIPMENT_DEFECT | SLA_BREACH | DOCUMENTATION_ERROR | ROUTE_DEVIATION
    severity: text("severity").notNull(), // CRITICAL | MAJOR | MINOR | INFO
    status: text("status").notNull().default("OPEN"), // OPEN | IN_REVIEW | RESOLVED | WAIVED
    isBlocking: integer("is_blocking").notNull().default(1), // 1 = blocking, 0 = non-blocking
    title: text("title").notNull(),
    description: text("description").notNull(),
    rootCause: text("root_cause"),
    assignedToUserId: text("assigned_to_user_id"),
    assignedTeam: text("assigned_team"),
    resolutionNotes: text("resolution_notes"),
    resolvedByUserId: text("resolved_by_user_id"),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("idx_op_intel_exc_v2_shipment").on(t.shipmentId),
    index("idx_op_intel_exc_v2_status_sev").on(
      t.status,
      t.severity,
      t.isBlocking,
    ),
    index("idx_op_intel_exc_v2_team").on(t.assignedTeam),
  ],
);
