import { sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { ensureWorkflowEngineTables } from "./workflow-engine-tables.js";

let bffTablesInitialized = false;

export async function ensureOperationalBffTables(): Promise<void> {
  if (bffTablesInitialized) return;
  await ensureWorkflowEngineTables();

  const statements = [
    `CREATE TABLE IF NOT EXISTS op_intelligence_shipment_360_views_v2 (
      shipment_id TEXT PRIMARY KEY NOT NULL,
      shipment_reference TEXT NOT NULL,
      service_type TEXT NOT NULL,
      lifecycle TEXT NOT NULL,
      closure_status TEXT NOT NULL DEFAULT 'OPEN',
      customer_party_id TEXT,
      active_route_version INTEGER,
      workflow_instance_id TEXT,
      workflow_status TEXT,
      health_status TEXT NOT NULL DEFAULT 'ON_TRACK',
      open_tasks_count INTEGER NOT NULL DEFAULT 0,
      blocked_tasks_count INTEGER NOT NULL DEFAULT 0,
      completed_tasks_count INTEGER NOT NULL DEFAULT 0,
      projection_version INTEGER NOT NULL DEFAULT 1,
      view_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_ref ON op_intelligence_shipment_360_views_v2(shipment_reference);`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_lifecycle ON op_intelligence_shipment_360_views_v2(lifecycle);`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_service_type ON op_intelligence_shipment_360_views_v2(service_type);`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_health ON op_intelligence_shipment_360_views_v2(health_status);`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_shp360_v2_wf_inst ON op_intelligence_shipment_360_views_v2(workflow_instance_id);`,

    `CREATE TABLE IF NOT EXISTS op_intelligence_cockpit_items_v2 (
      work_item_id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      shipment_id TEXT NOT NULL,
      shipment_reference TEXT NOT NULL,
      service_type TEXT NOT NULL,
      task_type_code TEXT NOT NULL,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      status TEXT NOT NULL DEFAULT 'OPEN',
      is_blocked INTEGER NOT NULL DEFAULT 0,
      urgency_bucket TEXT NOT NULL DEFAULT 'UPCOMING',
      attention_score INTEGER NOT NULL DEFAULT 50,
      workflow_instance_id TEXT,
      item_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_task_id ON op_intelligence_cockpit_items_v2(task_id);`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_shipment_id ON op_intelligence_cockpit_items_v2(shipment_id);`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_status_priority ON op_intelligence_cockpit_items_v2(status, is_blocked, priority, attention_score);`,
    `CREATE INDEX IF NOT EXISTS idx_op_intel_cockpit_v2_urgency ON op_intelligence_cockpit_items_v2(urgency_bucket);`,
  ];

  for (const stmt of statements) {
    await db.run(sql.raw(stmt));
  }

  bffTablesInitialized = true;
}
