import { client } from "../../db/index.js";
import { ensureScmLogicalSlice1Tables } from "./logical-slice1-tables.js";

let wfTablesInitialized = false;

export async function ensureWorkflowEngineTables(): Promise<void> {
  if (wfTablesInitialized) return;
  await ensureScmLogicalSlice1Tables();

  const statements = [
    `CREATE TABLE IF NOT EXISTS wf_engine_definitions_v2 (
      workflow_definition_id TEXT PRIMARY KEY NOT NULL,
      definition_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      service_mode TEXT NOT NULL DEFAULT 'ALL',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      active_version_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS wf_engine_definition_versions_v2 (
      workflow_version_id TEXT PRIMARY KEY NOT NULL,
      workflow_definition_id TEXT NOT NULL REFERENCES wf_engine_definitions_v2(workflow_definition_id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      trigger_event_type TEXT NOT NULL DEFAULT 'transport_planning.RoutePlanned.v2',
      match_condition_json TEXT NOT NULL DEFAULT '{}',
      published_at TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(workflow_definition_id, version_number),
      CONSTRAINT chk_wf_engine_def_ver_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED'))
    );`,
    `CREATE TABLE IF NOT EXISTS wf_engine_task_definitions_v2 (
      task_definition_id TEXT PRIMARY KEY NOT NULL,
      workflow_version_id TEXT NOT NULL REFERENCES wf_engine_definition_versions_v2(workflow_version_id) ON DELETE CASCADE,
      task_type_code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      default_priority TEXT NOT NULL DEFAULT 'MEDIUM',
      default_candidate_role TEXT,
      default_candidate_team TEXT,
      sla_duration_minutes INTEGER DEFAULT 480,
      required_input_keys_json TEXT NOT NULL DEFAULT '[]',
      is_milestone_trigger INTEGER NOT NULL DEFAULT 0,
      sequence_hint INTEGER NOT NULL DEFAULT 1,
      UNIQUE(workflow_version_id, task_type_code),
      CONSTRAINT chk_wf_engine_task_def_priority CHECK (default_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
    );`,
    `CREATE TABLE IF NOT EXISTS wf_engine_dependency_definitions_v2 (
      dependency_definition_id TEXT PRIMARY KEY NOT NULL,
      workflow_version_id TEXT NOT NULL REFERENCES wf_engine_definition_versions_v2(workflow_version_id) ON DELETE CASCADE,
      predecessor_task_type_code TEXT NOT NULL,
      successor_task_type_code TEXT NOT NULL,
      dependency_type TEXT NOT NULL DEFAULT 'FINISH_TO_START',
      condition_json TEXT,
      UNIQUE(workflow_version_id, predecessor_task_type_code, successor_task_type_code),
      CONSTRAINT chk_wf_engine_dep_def_no_self_loop CHECK (predecessor_task_type_code <> successor_task_type_code)
    );`,
    `CREATE TABLE IF NOT EXISTS wf_engine_instances_v2 (
      instance_id TEXT PRIMARY KEY NOT NULL,
      workflow_definition_id TEXT NOT NULL REFERENCES wf_engine_definitions_v2(workflow_definition_id),
      workflow_version_id TEXT NOT NULL REFERENCES wf_engine_definition_versions_v2(workflow_version_id),
      subject_type TEXT NOT NULL DEFAULT 'SHIPMENT',
      subject_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      variables_json TEXT NOT NULL DEFAULT '{}',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      CONSTRAINT chk_wf_engine_inst_status CHECK (status IN ('PENDING', 'RUNNING', 'SUSPENDED', 'COMPLETED', 'CANCELLED'))
    );`,
    `CREATE TABLE IF NOT EXISTS wf_engine_task_instances_v2 (
      task_instance_id TEXT PRIMARY KEY NOT NULL,
      workflow_instance_id TEXT NOT NULL REFERENCES wf_engine_instances_v2(instance_id) ON DELETE CASCADE,
      task_definition_id TEXT NOT NULL REFERENCES wf_engine_task_definitions_v2(task_definition_id),
      task_id TEXT NOT NULL REFERENCES work_mgmt_tasks_v2(task_id) ON DELETE CASCADE,
      task_type_code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      execution_result_json TEXT,
      started_at TEXT,
      completed_at TEXT,
      UNIQUE(workflow_instance_id, task_type_code)
    );`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }

  wfTablesInitialized = true;
}
