import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { scmLogicalTasks } from "./scm_entities_sqlite.js";

// ============================================================================
// SCM LOGICAL MODEL v1 — SLICE 4: VERSIONED WORKFLOW ENGINE SCHEMA
// WorkflowDefinition -> WorkflowDefinitionVersion -> TaskDefinition / DependencyDefinition
// WorkflowInstance -> TaskInstance (linked to work_mgmt_tasks_v2)
// ============================================================================

export type WorkflowStatus = "ACTIVE" | "DEPRECATED" | "ARCHIVED";
export type VersionStatus = "DRAFT" | "PUBLISHED" | "SUPERSEDED";
export type WorkflowInstanceStatus =
  "PENDING" | "RUNNING" | "SUSPENDED" | "COMPLETED" | "CANCELLED";

// 1. WorkflowDefinition (Aggregate Root de Catálogo)
export const scmWorkflowEngineDefinitionsV2 = sqliteTable(
  "wf_engine_definitions_v2",
  {
    workflowDefinitionId: text("workflow_definition_id").primaryKey(),
    definitionKey: text("definition_key").notNull().unique(), // e.g. OCEAN_EXPORT_STANDARD, AIR_IMPORT_DIRECT
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(), // EXPORT | IMPORT | DOMESTIC | CUSTOMS | BILLING | CLAIMS
    serviceMode: text("service_mode").notNull().default("ALL"), // OCEAN | AIR | ROAD | RAIL | MULTIMODAL | ALL
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | DEPRECATED | ARCHIVED
    activeVersionId: text("active_version_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
);

// 2. WorkflowDefinitionVersion (Versión Inmutable al Publicarse)
export const scmWorkflowEngineDefinitionVersionsV2 = sqliteTable(
  "wf_engine_definition_versions_v2",
  {
    workflowVersionId: text("workflow_version_id").primaryKey(),
    workflowDefinitionId: text("workflow_definition_id")
      .notNull()
      .references(() => scmWorkflowEngineDefinitionsV2.workflowDefinitionId, {
        onDelete: "cascade",
      }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("DRAFT"), // DRAFT | PUBLISHED | SUPERSEDED
    triggerEventType: text("trigger_event_type")
      .notNull()
      .default("transport_planning.RoutePlanned.v2"),
    matchConditionJson: text("match_condition_json").notNull().default("{}"),
    publishedAt: text("published_at"),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_wf_engine_def_ver_num").on(
      t.workflowDefinitionId,
      t.versionNumber,
    ),
    check(
      "chk_wf_engine_def_ver_status",
      sql`${t.status} IN ('DRAFT', 'PUBLISHED', 'SUPERSEDED')`,
    ),
  ],
);

// 3. TaskDefinition (Plantilla de Tarea dentro de una Versión)
export const scmWorkflowEngineTaskDefinitionsV2 = sqliteTable(
  "wf_engine_task_definitions_v2",
  {
    taskDefinitionId: text("task_definition_id").primaryKey(),
    workflowVersionId: text("workflow_version_id")
      .notNull()
      .references(
        () => scmWorkflowEngineDefinitionVersionsV2.workflowVersionId,
        {
          onDelete: "cascade",
        },
      ),
    taskTypeCode: text("task_type_code").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    defaultPriority: text("default_priority").notNull().default("MEDIUM"), // LOW | MEDIUM | HIGH | CRITICAL
    defaultCandidateRole: text("default_candidate_role"),
    defaultCandidateTeam: text("default_candidate_team"),
    slaDurationMinutes: integer("sla_duration_minutes").default(480),
    requiredInputKeysJson: text("required_input_keys_json")
      .notNull()
      .default("[]"),
    isMilestoneTrigger: integer("is_milestone_trigger").notNull().default(0),
    sequenceHint: integer("sequence_hint").notNull().default(1),
  },
  (t) => [
    uniqueIndex("uq_wf_engine_task_def_type").on(
      t.workflowVersionId,
      t.taskTypeCode,
    ),
    check(
      "chk_wf_engine_task_def_priority",
      sql`${t.defaultPriority} IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`,
    ),
  ],
);

// 4. DependencyDefinition (Aristas de Precedencia en la Versión)
export const scmWorkflowEngineDependencyDefinitionsV2 = sqliteTable(
  "wf_engine_dependency_definitions_v2",
  {
    dependencyDefinitionId: text("dependency_definition_id").primaryKey(),
    workflowVersionId: text("workflow_version_id")
      .notNull()
      .references(
        () => scmWorkflowEngineDefinitionVersionsV2.workflowVersionId,
        {
          onDelete: "cascade",
        },
      ),
    predecessorTaskTypeCode: text("predecessor_task_type_code").notNull(),
    successorTaskTypeCode: text("successor_task_type_code").notNull(),
    dependencyType: text("dependency_type")
      .notNull()
      .default("FINISH_TO_START"), // FINISH_TO_START | EVENT_REQUIRED | APPROVAL_REQUIRED
    conditionJson: text("condition_json"),
  },
  (t) => [
    uniqueIndex("uq_wf_engine_dep_def_pred_succ").on(
      t.workflowVersionId,
      t.predecessorTaskTypeCode,
      t.successorTaskTypeCode,
    ),
    check(
      "chk_wf_engine_dep_def_no_self_loop",
      sql`${t.predecessorTaskTypeCode} <> ${t.successorTaskTypeCode}`,
    ),
  ],
);

// 5. WorkflowInstance (Instancia viva de un proceso operacional)
export const scmWorkflowEngineInstancesV2 = sqliteTable(
  "wf_engine_instances_v2",
  {
    instanceId: text("instance_id").primaryKey(),
    workflowDefinitionId: text("workflow_definition_id")
      .notNull()
      .references(() => scmWorkflowEngineDefinitionsV2.workflowDefinitionId),
    workflowVersionId: text("workflow_version_id")
      .notNull()
      .references(
        () => scmWorkflowEngineDefinitionVersionsV2.workflowVersionId,
      ),
    subjectType: text("subject_type").notNull().default("SHIPMENT"),
    subjectId: text("subject_id").notNull(),
    status: text("status").notNull().default("PENDING"), // PENDING | RUNNING | SUSPENDED | COMPLETED | CANCELLED
    variablesJson: text("variables_json").notNull().default("{}"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    version: integer("version").notNull().default(1),
  },
  (t) => [
    index("idx_wf_engine_inst_subject").on(t.subjectType, t.subjectId),
    index("idx_wf_engine_inst_status").on(t.status),
    check(
      "chk_wf_engine_inst_status",
      sql`${t.status} IN ('PENDING', 'RUNNING', 'SUSPENDED', 'COMPLETED', 'CANCELLED')`,
    ),
  ],
);

// 6. TaskInstance (Instancia de tarea asociada a la WorkflowInstance y scmLogicalTasks)
export const scmWorkflowEngineTaskInstancesV2 = sqliteTable(
  "wf_engine_task_instances_v2",
  {
    taskInstanceId: text("task_instance_id").primaryKey(),
    workflowInstanceId: text("workflow_instance_id")
      .notNull()
      .references(() => scmWorkflowEngineInstancesV2.instanceId, {
        onDelete: "cascade",
      }),
    taskDefinitionId: text("task_definition_id")
      .notNull()
      .references(() => scmWorkflowEngineTaskDefinitionsV2.taskDefinitionId),
    // Link canónico al agregado Task concreto en work_mgmt_tasks_v2
    taskId: text("task_id")
      .notNull()
      .references(() => scmLogicalTasks.taskId, { onDelete: "cascade" }),
    taskTypeCode: text("task_type_code").notNull(),
    status: text("status").notNull().default("OPEN"), // OPEN | IN_PROGRESS | BLOCKED | COMPLETED | CANCELLED
    executionResultJson: text("execution_result_json"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
  },
  (t) => [
    uniqueIndex("uq_wf_engine_task_inst_wf_task").on(
      t.workflowInstanceId,
      t.taskTypeCode,
    ),
    index("idx_wf_engine_task_inst_task_id").on(t.taskId),
  ],
);
