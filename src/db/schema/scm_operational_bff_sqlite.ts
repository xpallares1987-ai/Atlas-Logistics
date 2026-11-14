import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// ============================================================================
// OPERATIONAL INTELLIGENCE BFF SCHEMA (SQLite CQRS Projections)
// ============================================================================

export const scmOperationalShipment360ViewsV2 = sqliteTable(
  "op_intelligence_shipment_360_views_v2",
  {
    shipmentId: text("shipment_id").primaryKey(),
    shipmentReference: text("shipment_reference").notNull(),
    serviceType: text("service_type").notNull(),
    lifecycle: text("lifecycle").notNull(),
    closureStatus: text("closure_status").notNull().default("OPEN"),
    customerPartyId: text("customer_party_id"),
    activeRouteVersion: integer("active_route_version"),
    workflowInstanceId: text("workflow_instance_id"),
    workflowStatus: text("workflow_status"),
    healthStatus: text("health_status").notNull().default("ON_TRACK"),
    openTasksCount: integer("open_tasks_count").notNull().default(0),
    blockedTasksCount: integer("blocked_tasks_count").notNull().default(0),
    completedTasksCount: integer("completed_tasks_count").notNull().default(0),
    projectionVersion: integer("projection_version").notNull().default(1),
    viewJson: text("view_json").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("idx_op_intel_shp360_v2_ref").on(t.shipmentReference),
    index("idx_op_intel_shp360_v2_lifecycle").on(t.lifecycle),
    index("idx_op_intel_shp360_v2_service_type").on(t.serviceType),
    index("idx_op_intel_shp360_v2_health").on(t.healthStatus),
    index("idx_op_intel_shp360_v2_wf_inst").on(t.workflowInstanceId),
  ],
);

export const scmOperationalCockpitWorkItemsV2 = sqliteTable(
  "op_intelligence_cockpit_items_v2",
  {
    workItemId: text("work_item_id").primaryKey(), // maps to taskId
    taskId: text("task_id").notNull(),
    shipmentId: text("shipment_id").notNull(),
    shipmentReference: text("shipment_reference").notNull(),
    serviceType: text("service_type").notNull(),
    taskTypeCode: text("task_type_code").notNull(),
    title: text("title").notNull(),
    priority: text("priority").notNull().default("MEDIUM"),
    status: text("status").notNull().default("OPEN"), // OPEN | BLOCKED | COMPLETED
    isBlocked: integer("is_blocked").notNull().default(0), // 0 or 1
    urgencyBucket: text("urgency_bucket").notNull().default("UPCOMING"), // IMMEDIATE_ACTION | DUE_TODAY | UPCOMING | BLOCKED
    attentionScore: integer("attention_score").notNull().default(50),
    workflowInstanceId: text("workflow_instance_id"),
    itemJson: text("item_json").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("idx_op_intel_cockpit_v2_task_id").on(t.taskId),
    index("idx_op_intel_cockpit_v2_shipment_id").on(t.shipmentId),
    index("idx_op_intel_cockpit_v2_status_priority").on(
      t.status,
      t.isBlocked,
      t.priority,
      t.attentionScore,
    ),
    index("idx_op_intel_cockpit_v2_urgency").on(t.urgencyBucket),
  ],
);
