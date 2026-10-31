import { v4 as uuidv4 } from "uuid";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmWorkflowEngineDefinitionsV2 as scmWorkflowDefinitions,
  scmWorkflowEngineDefinitionVersionsV2 as scmWorkflowDefinitionVersions,
  scmWorkflowEngineTaskDefinitionsV2 as scmWorkflowTaskDefinitions,
  scmWorkflowEngineDependencyDefinitionsV2 as scmWorkflowDependencyDefinitions,
  scmWorkflowEngineInstancesV2 as scmWorkflowInstances,
  scmWorkflowEngineTaskInstancesV2 as scmWorkflowTaskInstances,
} from "../../../db/schema/scm_workflow_engine_sqlite.js";
import {
  scmLogicalTasks,
  scmLogicalTaskDependencies,
  SubjectType,
} from "../../../db/schema/scm_entities_sqlite.js";
import {
  DomainInvariantError,
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import { ensureWorkflowEngineTables } from "../../kernel/workflow-engine-tables.js";
import { outboxBus } from "../../kernel/outbox-bus.js";

// ============================================================================
// WORKFLOW ENGINE CONTEXT (Slice 4: BPMN/Camunda-inspired SCM Engine)
// Separates WorkflowDefinition from WorkflowInstance with versioned DAG execution.
// ============================================================================

export interface WorkflowDefinitionRecord {
  workflowDefinitionId: string;
  definitionKey: string;
  name: string;
  description?: string | null;
  category: string;
  serviceMode: string;
  status: string;
  activeVersionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowVersionRecord {
  workflowVersionId: string;
  workflowDefinitionId: string;
  versionNumber: number;
  status: string;
  triggerEventType: string;
  matchCondition: Record<string, unknown>;
  publishedAt?: string | null;
  createdBy: string;
  createdAt: Date;
  tasks?: TaskDefinitionRecord[];
  dependencies?: DependencyDefinitionRecord[];
}

export interface TaskDefinitionRecord {
  taskDefinitionId: string;
  workflowVersionId: string;
  taskTypeCode: string;
  title: string;
  description?: string | null;
  defaultPriority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  defaultCandidateRole?: string | null;
  defaultCandidateTeam?: string | null;
  slaDurationMinutes?: number | null;
  requiredInputKeys: string[];
  isMilestoneTrigger: boolean;
  sequenceHint: number;
}

export interface DependencyDefinitionRecord {
  dependencyDefinitionId: string;
  workflowVersionId: string;
  predecessorTaskTypeCode: string;
  successorTaskTypeCode: string;
  dependencyType: "FINISH_TO_START" | "EVENT_REQUIRED" | "APPROVAL_REQUIRED";
  conditionJson?: string | null;
}

export interface WorkflowInstanceRecord {
  instanceId: string;
  workflowDefinitionId: string;
  workflowVersionId: string;
  subjectType: SubjectType;
  subjectId: string;
  status: "PENDING" | "RUNNING" | "SUSPENDED" | "COMPLETED" | "CANCELLED";
  variables: Record<string, unknown>;
  startedAt: string;
  completedAt?: string | null;
  version: number;
  tasks: Array<{
    taskInstanceId: string;
    taskId: string;
    taskTypeCode: string;
    status: string;
    startedAt?: string | null;
    completedAt?: string | null;
  }>;
}

/**
 * Validates that all dependency definitions within a version form a strict DAG (no directed cycles).
 */
export async function assertVersionIsDAG(versionId: string): Promise<void> {
  const deps = await db
    .select()
    .from(scmWorkflowDependencyDefinitions)
    .where(eq(scmWorkflowDependencyDefinitions.workflowVersionId, versionId));

  const adj = new Map<string, string[]>();
  const nodes = new Set<string>();

  for (const dep of deps) {
    nodes.add(dep.predecessorTaskTypeCode);
    nodes.add(dep.successorTaskTypeCode);

    // Immediate self cycle
    assertInvariant(
      dep.predecessorTaskTypeCode !== dep.successorTaskTypeCode,
      "workflow_engine",
      "WORKFLOW_DAG_SELF_CYCLE",
      `Task type '${dep.predecessorTaskTypeCode}' cannot depend on itself`,
    );

    const list = adj.get(dep.predecessorTaskTypeCode) || [];
    list.push(dep.successorTaskTypeCode);
    adj.set(dep.predecessorTaskTypeCode, list);
  }

  // BFS / DFS cycle detection for each node
  for (const startNode of nodes) {
    const queue = [...(adj.get(startNode) || [])];
    const visited = new Set<string>(queue);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === startNode) {
        throw new DomainInvariantError(
          "workflow_engine",
          "WORKFLOW_DAG_CYCLE_DETECTED",
          `Cycle detected in Workflow Definition Version '${versionId}': Node '${startNode}' is reachable from its own successors. Workflow definitions must be strict DAGs.`,
        );
      }
      const nexts = adj.get(curr) || [];
      for (const n of nexts) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
  }
}

// ============================================================================
// 1. WORKFLOW DEFINITION CRUD & VERSIONING
// ============================================================================

export async function createWorkflowDefinition(
  input: {
    definitionKey: string;
    name: string;
    description?: string;
    category: string;
    serviceMode?: string;
  },
  _actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<WorkflowDefinitionRecord> {
  await ensureWorkflowEngineTables();

  const existing = await db
    .select()
    .from(scmWorkflowDefinitions)
    .where(eq(scmWorkflowDefinitions.definitionKey, input.definitionKey))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  const workflowDefinitionId = `wfd_${uuidv4()}`;
  const now = new Date();

  const record = {
    workflowDefinitionId,
    definitionKey: input.definitionKey,
    name: input.name,
    description: input.description || null,
    category: input.category,
    serviceMode: input.serviceMode || "ALL",
    status: "ACTIVE",
    activeVersionId: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(scmWorkflowDefinitions).values({
    ...record,
    createdAt: now,
    updatedAt: now,
  });

  return record;
}

export async function createWorkflowDefinitionVersion(
  input: {
    workflowDefinitionId: string;
    triggerEventType?: string;
    matchCondition?: Record<string, unknown>;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<WorkflowVersionRecord> {
  await ensureWorkflowEngineTables();

  const defRows = await db
    .select()
    .from(scmWorkflowDefinitions)
    .where(
      eq(
        scmWorkflowDefinitions.workflowDefinitionId,
        input.workflowDefinitionId,
      ),
    )
    .limit(1);

  assertInvariant(
    defRows.length > 0,
    "workflow_engine",
    "WORKFLOW_DEFINITION_NOT_FOUND",
    `WorkflowDefinition '${input.workflowDefinitionId}' not found`,
  );

  const existingVersions = await db
    .select()
    .from(scmWorkflowDefinitionVersions)
    .where(
      eq(
        scmWorkflowDefinitionVersions.workflowDefinitionId,
        input.workflowDefinitionId,
      ),
    )
    .orderBy(desc(scmWorkflowDefinitionVersions.versionNumber));

  const nextVersionNumber =
    existingVersions.length > 0 ? existingVersions[0].versionNumber + 1 : 1;
  const workflowVersionId = `wfver_${uuidv4()}`;
  const now = new Date();

  const record: WorkflowVersionRecord = {
    workflowVersionId,
    workflowDefinitionId: input.workflowDefinitionId,
    versionNumber: nextVersionNumber,
    status: "DRAFT",
    triggerEventType:
      input.triggerEventType || "transport_planning.RoutePlanned.v2",
    matchCondition: input.matchCondition || {},
    publishedAt: null,
    createdBy: actor.userId,
    createdAt: now,
    tasks: [],
    dependencies: [],
  };

  await db.insert(scmWorkflowDefinitionVersions).values({
    workflowVersionId,
    workflowDefinitionId: input.workflowDefinitionId,
    versionNumber: nextVersionNumber,
    status: "DRAFT",
    triggerEventType: record.triggerEventType,
    matchConditionJson: JSON.stringify(record.matchCondition),
    publishedAt: null,
    createdBy: actor.userId,
    createdAt: now,
  });

  return record;
}

export async function addTaskDefinitionToVersion(
  input: {
    workflowVersionId: string;
    taskTypeCode: string;
    title: string;
    description?: string;
    defaultPriority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    defaultCandidateRole?: string;
    defaultCandidateTeam?: string;
    slaDurationMinutes?: number;
    requiredInputKeys?: string[];
    isMilestoneTrigger?: boolean;
    sequenceHint?: number;
  },
  _actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<TaskDefinitionRecord> {
  await ensureWorkflowEngineTables();

  const verRows = await db
    .select()
    .from(scmWorkflowDefinitionVersions)
    .where(
      eq(
        scmWorkflowDefinitionVersions.workflowVersionId,
        input.workflowVersionId,
      ),
    )
    .limit(1);

  assertInvariant(
    verRows.length > 0,
    "workflow_engine",
    "WORKFLOW_VERSION_NOT_FOUND",
    `WorkflowVersion '${input.workflowVersionId}' not found`,
  );

  // Invariant: PUBLISHED or SUPERSEDED versions are strictly immutable
  assertInvariant(
    verRows[0].status === "DRAFT",
    "workflow_engine",
    "WORKFLOW_VERSION_IMMUTABLE",
    `Cannot add task: WorkflowVersion '${input.workflowVersionId}' is in status '${verRows[0].status}' and cannot be modified.`,
  );

  const taskDefinitionId = `tdef_${uuidv4()}`;
  const record: TaskDefinitionRecord = {
    taskDefinitionId,
    workflowVersionId: input.workflowVersionId,
    taskTypeCode: input.taskTypeCode,
    title: input.title,
    description: input.description || null,
    defaultPriority: input.defaultPriority || "MEDIUM",
    defaultCandidateRole: input.defaultCandidateRole || null,
    defaultCandidateTeam: input.defaultCandidateTeam || null,
    slaDurationMinutes: input.slaDurationMinutes || 480,
    requiredInputKeys: input.requiredInputKeys || [],
    isMilestoneTrigger: Boolean(input.isMilestoneTrigger),
    sequenceHint: input.sequenceHint || 1,
  };

  await db.insert(scmWorkflowTaskDefinitions).values({
    taskDefinitionId,
    workflowVersionId: input.workflowVersionId,
    taskTypeCode: input.taskTypeCode,
    title: input.title,
    description: input.description || null,
    defaultPriority: record.defaultPriority,
    defaultCandidateRole: record.defaultCandidateRole,
    defaultCandidateTeam: record.defaultCandidateTeam,
    slaDurationMinutes: record.slaDurationMinutes,
    requiredInputKeysJson: JSON.stringify(record.requiredInputKeys),
    isMilestoneTrigger: record.isMilestoneTrigger ? 1 : 0,
    sequenceHint: record.sequenceHint,
  });

  return record;
}

export async function addDependencyDefinitionToVersion(
  input: {
    workflowVersionId: string;
    predecessorTaskTypeCode: string;
    successorTaskTypeCode: string;
    dependencyType?: "FINISH_TO_START" | "EVENT_REQUIRED" | "APPROVAL_REQUIRED";
    conditionJson?: string;
  },
  _actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<DependencyDefinitionRecord> {
  await ensureWorkflowEngineTables();

  const verRows = await db
    .select()
    .from(scmWorkflowDefinitionVersions)
    .where(
      eq(
        scmWorkflowDefinitionVersions.workflowVersionId,
        input.workflowVersionId,
      ),
    )
    .limit(1);

  assertInvariant(
    verRows.length > 0,
    "workflow_engine",
    "WORKFLOW_VERSION_NOT_FOUND",
    `WorkflowVersion '${input.workflowVersionId}' not found`,
  );

  assertInvariant(
    verRows[0].status === "DRAFT",
    "workflow_engine",
    "WORKFLOW_VERSION_IMMUTABLE",
    `Cannot add dependency: WorkflowVersion '${input.workflowVersionId}' is in status '${verRows[0].status}' and cannot be modified.`,
  );

  const dependencyDefinitionId = `depdef_${uuidv4()}`;
  const record: DependencyDefinitionRecord = {
    dependencyDefinitionId,
    workflowVersionId: input.workflowVersionId,
    predecessorTaskTypeCode: input.predecessorTaskTypeCode,
    successorTaskTypeCode: input.successorTaskTypeCode,
    dependencyType: input.dependencyType || "FINISH_TO_START",
    conditionJson: input.conditionJson || null,
  };

  await db.insert(scmWorkflowDependencyDefinitions).values({
    dependencyDefinitionId,
    workflowVersionId: input.workflowVersionId,
    predecessorTaskTypeCode: input.predecessorTaskTypeCode,
    successorTaskTypeCode: input.successorTaskTypeCode,
    dependencyType: record.dependencyType,
    conditionJson: record.conditionJson,
  });

  // Verify that adding this edge did not introduce a cycle into the draft version
  await assertVersionIsDAG(input.workflowVersionId);

  return record;
}

export async function publishWorkflowDefinitionVersion(
  versionId: string,
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<WorkflowVersionRecord> {
  await ensureWorkflowEngineTables();

  const verRows = await db
    .select()
    .from(scmWorkflowDefinitionVersions)
    .where(eq(scmWorkflowDefinitionVersions.workflowVersionId, versionId))
    .limit(1);

  assertInvariant(
    verRows.length > 0,
    "workflow_engine",
    "WORKFLOW_VERSION_NOT_FOUND",
    `WorkflowVersion '${versionId}' not found`,
  );

  const version = verRows[0];
  if (version.status === "PUBLISHED") {
    return getWorkflowVersionWithDAG(versionId);
  }

  // 1. Verify DAG integrity before publication
  await assertVersionIsDAG(versionId);

  // 2. Verify it has at least one task definition
  const tasks = await db
    .select()
    .from(scmWorkflowTaskDefinitions)
    .where(eq(scmWorkflowTaskDefinitions.workflowVersionId, versionId));

  assertInvariant(
    tasks.length > 0,
    "workflow_engine",
    "WORKFLOW_EMPTY_TASKS",
    `Cannot publish WorkflowVersion '${versionId}': version has no task definitions`,
  );

  const nowIso = new Date().toISOString();

  // 3. Mark previous published versions as SUPERSEDED and set this one to PUBLISHED
  await db.transaction(async (tx) => {
    await tx
      .update(scmWorkflowDefinitionVersions)
      .set({ status: "SUPERSEDED" })
      .where(
        and(
          eq(
            scmWorkflowDefinitionVersions.workflowDefinitionId,
            version.workflowDefinitionId,
          ),
          eq(scmWorkflowDefinitionVersions.status, "PUBLISHED"),
        ),
      );

    await tx
      .update(scmWorkflowDefinitionVersions)
      .set({
        status: "PUBLISHED",
        publishedAt: nowIso,
      })
      .where(eq(scmWorkflowDefinitionVersions.workflowVersionId, versionId));

    await tx
      .update(scmWorkflowDefinitions)
      .set({
        activeVersionId: versionId,
        updatedAt: new Date(),
      })
      .where(
        eq(
          scmWorkflowDefinitions.workflowDefinitionId,
          version.workflowDefinitionId,
        ),
      );

    // Enqueue Domain Event
    await outboxBus.enqueueEvents(
      [
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "workflow_engine.WorkflowDefinitionPublished.v2",
          schemaVersion: 2,
          producerContext: "workflow_engine",
          aggregateType: "WorkflowDefinition",
          aggregateId: version.workflowDefinitionId,
          aggregateVersion: version.versionNumber,
          correlationId: `corr_${uuidv4()}`,
          causationId: `cmd_publish_version_${versionId}`,
          actor,
          occurredAt: nowIso,
          payload: {
            workflowDefinitionId: version.workflowDefinitionId,
            workflowVersionId: versionId,
            versionNumber: version.versionNumber,
            taskCount: tasks.length,
          },
        },
      ],
      tx,
    );
  });

  await outboxBus.relayPendingEvents();

  return getWorkflowVersionWithDAG(versionId);
}

export async function getWorkflowVersionWithDAG(
  versionId: string,
): Promise<WorkflowVersionRecord> {
  await ensureWorkflowEngineTables();

  const verRows = await db
    .select()
    .from(scmWorkflowDefinitionVersions)
    .where(eq(scmWorkflowDefinitionVersions.workflowVersionId, versionId))
    .limit(1);

  assertInvariant(
    verRows.length > 0,
    "workflow_engine",
    "WORKFLOW_VERSION_NOT_FOUND",
    `WorkflowVersion '${versionId}' not found`,
  );

  const ver = verRows[0];
  const [tasks, deps] = await Promise.all([
    db
      .select()
      .from(scmWorkflowTaskDefinitions)
      .where(eq(scmWorkflowTaskDefinitions.workflowVersionId, versionId))
      .orderBy(scmWorkflowTaskDefinitions.sequenceHint),
    db
      .select()
      .from(scmWorkflowDependencyDefinitions)
      .where(eq(scmWorkflowDependencyDefinitions.workflowVersionId, versionId)),
  ]);

  return {
    workflowVersionId: ver.workflowVersionId,
    workflowDefinitionId: ver.workflowDefinitionId,
    versionNumber: ver.versionNumber,
    status: ver.status,
    triggerEventType: ver.triggerEventType,
    matchCondition: JSON.parse(ver.matchConditionJson),
    publishedAt: ver.publishedAt,
    createdBy: ver.createdBy,
    createdAt: new Date(ver.createdAt),
    tasks: tasks.map((t) => ({
      taskDefinitionId: t.taskDefinitionId,
      workflowVersionId: t.workflowVersionId,
      taskTypeCode: t.taskTypeCode,
      title: t.title,
      description: t.description,
      defaultPriority: t.defaultPriority as any,
      defaultCandidateRole: t.defaultCandidateRole,
      defaultCandidateTeam: t.defaultCandidateTeam,
      slaDurationMinutes: t.slaDurationMinutes,
      requiredInputKeys: JSON.parse(t.requiredInputKeysJson),
      isMilestoneTrigger: Boolean(t.isMilestoneTrigger),
      sequenceHint: t.sequenceHint,
    })),
    dependencies: deps.map((d) => ({
      dependencyDefinitionId: d.dependencyDefinitionId,
      workflowVersionId: d.workflowVersionId,
      predecessorTaskTypeCode: d.predecessorTaskTypeCode,
      successorTaskTypeCode: d.successorTaskTypeCode,
      dependencyType: d.dependencyType as any,
      conditionJson: d.conditionJson,
    })),
  };
}

export async function listWorkflowDefinitions(): Promise<
  WorkflowDefinitionRecord[]
> {
  await ensureWorkflowEngineTables();
  const rows = await db
    .select()
    .from(scmWorkflowDefinitions)
    .orderBy(scmWorkflowDefinitions.name);

  return rows.map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
}

// ============================================================================
// 2. WORKFLOW INSTANTIATION & EXECUTION RUNTIME
// ============================================================================

export async function instantiateWorkflow(
  input: {
    definitionKey?: string;
    workflowDefinitionId?: string;
    subjectType: SubjectType;
    subjectId: string;
    variables?: Record<string, unknown>;
  },
  actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<WorkflowInstanceRecord> {
  await ensureWorkflowEngineTables();

  // 1. Resolve active published workflow version
  let defId = input.workflowDefinitionId;
  if (!defId && input.definitionKey) {
    const d = await db
      .select()
      .from(scmWorkflowDefinitions)
      .where(eq(scmWorkflowDefinitions.definitionKey, input.definitionKey))
      .limit(1);
    if (d.length > 0) {
      defId = d[0].workflowDefinitionId;
    }
  }

  assertInvariant(
    Boolean(defId),
    "workflow_engine",
    "WORKFLOW_DEFINITION_NOT_SPECIFIED",
    `Could not resolve workflow definition for key '${input.definitionKey}'`,
  );

  const defRows = await db
    .select()
    .from(scmWorkflowDefinitions)
    .where(eq(scmWorkflowDefinitions.workflowDefinitionId, defId!))
    .limit(1);

  assertInvariant(
    defRows.length > 0 && Boolean(defRows[0].activeVersionId),
    "workflow_engine",
    "WORKFLOW_NO_ACTIVE_PUBLISHED_VERSION",
    `WorkflowDefinition '${defId}' has no published active version`,
  );

  const activeVersionId = defRows[0].activeVersionId!;
  const versionWithDag = await getWorkflowVersionWithDAG(activeVersionId);

  const instanceId = `wfi_${uuidv4()}`;
  const now = new Date();
  const nowIso = now.toISOString();

  const createdTasks: Array<{
    taskInstanceId: string;
    taskId: string;
    taskTypeCode: string;
    status: string;
  }> = [];

  // Atomic transaction: Create WorkflowInstance + TaskInstances + Tasks + Dependencies + Outbox Event
  await db.transaction(async (tx) => {
    // 1. Create WorkflowInstance
    await tx.insert(scmWorkflowInstances).values({
      instanceId,
      workflowDefinitionId: defId!,
      workflowVersionId: activeVersionId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      status: "RUNNING",
      variablesJson: JSON.stringify(input.variables || {}),
      startedAt: nowIso,
      completedAt: null,
      version: 1,
    });

    // 2. Identify initial blocked tasks (any task that has an incoming dependency)
    const incomingTypes = new Set<string>(
      (versionWithDag.dependencies || []).map((d) => d.successorTaskTypeCode),
    );

    // Map: taskTypeCode -> taskId
    const taskTypeToId = new Map<string, string>();

    // 3. Instantiate concrete Tasks & TaskInstances
    for (const tdef of versionWithDag.tasks || []) {
      const taskId = `tsk_${uuidv4()}`;
      const taskInstanceId = `tinst_${uuidv4()}`;
      const isInitiallyBlocked = incomingTypes.has(tdef.taskTypeCode);
      const initialStatus = isInitiallyBlocked ? "BLOCKED" : "OPEN";

      taskTypeToId.set(tdef.taskTypeCode, taskId);

      // Persist in work_mgmt_tasks_v2
      await tx.insert(scmLogicalTasks).values({
        taskId,
        taskType: tdef.taskTypeCode,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        priority: tdef.defaultPriority,
        ownerUserId: null,
        ownerTeamId: tdef.defaultCandidateTeam || null,
        deadline: null,
        status: initialStatus,
        resultJson: null,
        createdAt: now,
        completedAt: null,
        version: 1,
      });

      // Persist in wf_engine_task_instances_v2
      await tx.insert(scmWorkflowTaskInstances).values({
        taskInstanceId,
        workflowInstanceId: instanceId,
        taskDefinitionId: tdef.taskDefinitionId,
        taskId,
        taskTypeCode: tdef.taskTypeCode,
        status: initialStatus,
        executionResultJson: null,
        startedAt: initialStatus === "OPEN" ? nowIso : null,
        completedAt: null,
      });

      createdTasks.push({
        taskInstanceId,
        taskId,
        taskTypeCode: tdef.taskTypeCode,
        status: initialStatus,
      });
    }

    // 4. Instantiate concrete Task Dependencies
    for (const depDef of versionWithDag.dependencies || []) {
      const predTaskId = taskTypeToId.get(depDef.predecessorTaskTypeCode);
      const succTaskId = taskTypeToId.get(depDef.successorTaskTypeCode);

      if (predTaskId && succTaskId) {
        await tx.insert(scmLogicalTaskDependencies).values({
          dependencyId: `tdep_${uuidv4()}`,
          predecessorTaskId: predTaskId,
          successorTaskId: succTaskId,
          dependencyType: depDef.dependencyType,
          status: "BLOCKING",
        });
      }
    }

    // 5. Enqueue Domain Event in Outbox
    await outboxBus.enqueueEvents(
      [
        {
          eventId: `evt_${uuidv4()}`,
          eventType: "workflow_engine.WorkflowInstanceStarted.v2",
          schemaVersion: 2,
          producerContext: "workflow_engine",
          aggregateType: "WorkflowInstance",
          aggregateId: instanceId,
          aggregateVersion: 1,
          correlationId: `corr_${uuidv4()}`,
          causationId: `cmd_instantiate_wf_${input.subjectId}`,
          actor,
          occurredAt: nowIso,
          payload: {
            instanceId,
            workflowDefinitionId: defId,
            workflowVersionId: activeVersionId,
            subjectType: input.subjectType,
            subjectId: input.subjectId,
            tasksCount: createdTasks.length,
          },
        },
      ],
      tx,
    );
  });

  await outboxBus.relayPendingEvents();

  return {
    instanceId,
    workflowDefinitionId: defId!,
    workflowVersionId: activeVersionId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    status: "RUNNING",
    variables: input.variables || {},
    startedAt: nowIso,
    completedAt: null,
    version: 1,
    tasks: createdTasks,
  };
}

export async function getWorkflowInstanceById(
  instanceId: string,
): Promise<WorkflowInstanceRecord> {
  await ensureWorkflowEngineTables();

  const instRows = await db
    .select()
    .from(scmWorkflowInstances)
    .where(eq(scmWorkflowInstances.instanceId, instanceId))
    .limit(1);

  assertInvariant(
    instRows.length > 0,
    "workflow_engine",
    "WORKFLOW_INSTANCE_NOT_FOUND",
    `WorkflowInstance '${instanceId}' not found`,
  );

  const inst = instRows[0];
  const taskRows = await db
    .select()
    .from(scmWorkflowTaskInstances)
    .where(eq(scmWorkflowTaskInstances.workflowInstanceId, instanceId));

  return {
    instanceId: inst.instanceId,
    workflowDefinitionId: inst.workflowDefinitionId,
    workflowVersionId: inst.workflowVersionId,
    subjectType: inst.subjectType as any,
    subjectId: inst.subjectId,
    status: inst.status as any,
    variables: JSON.parse(inst.variablesJson),
    startedAt: inst.startedAt,
    completedAt: inst.completedAt,
    version: inst.version,
    tasks: taskRows.map((t) => ({
      taskInstanceId: t.taskInstanceId,
      taskId: t.taskId,
      taskTypeCode: t.taskTypeCode,
      status: t.status,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    })),
  };
}

// ============================================================================
// 3. SEED DEFAULT FREIGHT FORWARDING WORKFLOW DEFINITION
// ============================================================================

export async function seedStandardWorkflowDefinitions(): Promise<WorkflowDefinitionRecord> {
  await ensureWorkflowEngineTables();

  const existing = await db
    .select()
    .from(scmWorkflowDefinitions)
    .where(eq(scmWorkflowDefinitions.definitionKey, "OCEAN_EXPORT_STANDARD"))
    .limit(1);

  if (existing.length > 0 && existing[0].activeVersionId) {
    const row = existing[0];
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  // 1. Definition
  const def = await createWorkflowDefinition({
    definitionKey: "OCEAN_EXPORT_STANDARD",
    name: "Standard Ocean FCL Export Operations",
    description: "End-to-end operational task pipeline for Ocean FCL exports.",
    category: "EXPORT",
    serviceMode: "OCEAN",
  });

  // 2. Version 1 (DRAFT)
  const ver = await createWorkflowDefinitionVersion({
    workflowDefinitionId: def.workflowDefinitionId,
    triggerEventType: "transport_planning.RoutePlanned.v2",
    matchCondition: { serviceType: "OCEAN_FCL" },
  });

  // 3. Task Definitions
  await addTaskDefinitionToVersion({
    workflowVersionId: ver.workflowVersionId,
    taskTypeCode: "CONFIRM_CARRIER_BOOKING",
    title: "Confirm Carrier Booking & Container Release",
    defaultPriority: "HIGH",
    defaultCandidateRole: "OPERATIONS_COORDINATOR",
    slaDurationMinutes: 120,
    sequenceHint: 1,
  });

  await addTaskDefinitionToVersion({
    workflowVersionId: ver.workflowVersionId,
    taskTypeCode: "VERIFY_VGM_CUTOFF",
    title: "Verify SOLAS VGM & Terminal Cut-off",
    defaultPriority: "HIGH",
    defaultCandidateRole: "OPERATIONS_COORDINATOR",
    slaDurationMinutes: 240,
    sequenceHint: 2,
  });

  await addTaskDefinitionToVersion({
    workflowVersionId: ver.workflowVersionId,
    taskTypeCode: "ISSUE_BILL_OF_LADING",
    title: "Issue Bill of Lading (Transport Document)",
    defaultPriority: "MEDIUM",
    defaultCandidateRole: "DOCUMENTATION_SPECIALIST",
    slaDurationMinutes: 480,
    sequenceHint: 3,
  });

  // 4. Dependency Definitions: Task A -> Task B -> Task C
  await addDependencyDefinitionToVersion({
    workflowVersionId: ver.workflowVersionId,
    predecessorTaskTypeCode: "CONFIRM_CARRIER_BOOKING",
    successorTaskTypeCode: "VERIFY_VGM_CUTOFF",
    dependencyType: "FINISH_TO_START",
  });

  await addDependencyDefinitionToVersion({
    workflowVersionId: ver.workflowVersionId,
    predecessorTaskTypeCode: "VERIFY_VGM_CUTOFF",
    successorTaskTypeCode: "ISSUE_BILL_OF_LADING",
    dependencyType: "FINISH_TO_START",
  });

  // 5. Publish Version 1 (Validates DAG and activates)
  await publishWorkflowDefinitionVersion(ver.workflowVersionId);

  const updatedDef = (
    await db
      .select()
      .from(scmWorkflowDefinitions)
      .where(
        eq(
          scmWorkflowDefinitions.workflowDefinitionId,
          def.workflowDefinitionId,
        ),
      )
  )[0];

  return {
    ...updatedDef,
    createdAt: new Date(updatedDef.createdAt),
    updatedAt: new Date(updatedDef.updatedAt),
  };
}
