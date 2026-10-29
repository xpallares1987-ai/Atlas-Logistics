import { v4 as uuidv4 } from "uuid";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  scmLogicalTasks,
  scmLogicalTaskDependencies,
  SubjectType,
} from "../../../db/schema/scm_logical_slice1_sqlite.js";
import {
  DomainInvariantError,
  SecurityActorContext,
  DEFAULT_OPERATOR_ACTOR,
  assertInvariant,
} from "../../kernel/primitives.js";
import { ensureScmLogicalSlice1Tables } from "../../kernel/logical-slice1-tables.js";

// ============================================================================
// WORK MANAGEMENT CONTEXT (Sections 21-22)
// Invariants:
// 1. TaskDependency cannot introduce transitive cycles (must form a strict DAG).
// 2. A task cannot be marked COMPLETED if any blocking predecessor is unresolved.
// ============================================================================

export interface TaskRecord {
  taskId: string;
  taskType: string;
  subjectType: SubjectType;
  subjectId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  ownerUserId?: string | null;
  ownerTeamId?: string | null;
  deadline?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";
  resultJson?: string | null;
  createdAt: Date;
  completedAt?: string | null;
  version: number;
}

export interface TaskDependencyRecord {
  dependencyId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: "FINISH_TO_START" | "EVENT_REQUIRED" | "APPROVAL_REQUIRED";
  status: "BLOCKING" | "SATISFIED" | "WAIVED";
}

/**
 * Checks whether adding an edge (predecessorTaskId -> successorTaskId) would
 * create a directed cycle in the Task dependency graph.
 *
 * In a DAG where edge (u -> v) means "u precedes v" (v depends on u):
 * Adding (predecessor -> successor) introduces a cycle IF AND ONLY IF
 * predecessor is already reachable from successor!
 */
export async function assertNoTransitiveCycle(
  predecessorTaskId: string,
  successorTaskId: string,
): Promise<void> {
  // 1. Direct self-cycle check
  assertInvariant(
    predecessorTaskId !== successorTaskId,
    "work_mgmt",
    "TASK_SELF_DEPENDENCY_FORBIDDEN",
    `Task '${predecessorTaskId}' cannot depend on itself`,
  );

  // 2. Fetch all current dependencies in the system to build the adjacency list
  const allDeps = await db.select().from(scmLogicalTaskDependencies);

  // Adjacency map: node -> list of immediate successors
  // edge (u -> v) means u is predecessor of v (v depends on u)
  const adj = new Map<string, string[]>();
  for (const dep of allDeps) {
    const list = adj.get(dep.predecessorTaskId) || [];
    list.push(dep.successorTaskId);
    adj.set(dep.predecessorTaskId, list);
  }

  // Check if predecessorTaskId is reachable from successorTaskId using BFS
  // If successor -> ... -> predecessor exists, then adding (predecessor -> successor) forms a cycle!
  const queue: string[] = [successorTaskId];
  const visited = new Set<string>([successorTaskId]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === predecessorTaskId) {
      throw new DomainInvariantError(
        "work_mgmt",
        "TASK_CYCLIC_DEPENDENCY_DETECTED",
        `Cycle detected: Task '${predecessorTaskId}' is already reachable from '${successorTaskId}'. Adding this dependency would create a directed cycle in the Task DAG.`,
      );
    }

    const nextNodes = adj.get(curr) || [];
    for (const next of nextNodes) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
}

export async function createTask(
  input: {
    taskId?: string;
    taskType: string;
    subjectType: SubjectType;
    subjectId: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    ownerUserId?: string;
    ownerTeamId?: string;
    deadline?: string;
  },
  _actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<TaskRecord> {
  await ensureScmLogicalSlice1Tables();

  const taskId = input.taskId || `tsk_${uuidv4()}`;
  const now = new Date();

  const record: TaskRecord = {
    taskId,
    taskType: input.taskType,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    priority: input.priority || "MEDIUM",
    ownerUserId: input.ownerUserId || null,
    ownerTeamId: input.ownerTeamId || null,
    deadline: input.deadline || null,
    status: "OPEN",
    resultJson: null,
    createdAt: now,
    completedAt: null,
    version: 1,
  };

  await db.insert(scmLogicalTasks).values({
    ...record,
    createdAt: now,
  });

  return record;
}

export async function addTaskDependency(
  input: {
    predecessorTaskId: string;
    successorTaskId: string;
    dependencyType?: "FINISH_TO_START" | "EVENT_REQUIRED" | "APPROVAL_REQUIRED";
    status?: "BLOCKING" | "SATISFIED" | "WAIVED";
  },
  _actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<TaskDependencyRecord> {
  await ensureScmLogicalSlice1Tables();

  // Enforce domain invariant: no cycles in the DAG
  await assertNoTransitiveCycle(input.predecessorTaskId, input.successorTaskId);

  // Check both tasks exist
  const [pred, succ] = await Promise.all([
    db
      .select()
      .from(scmLogicalTasks)
      .where(eq(scmLogicalTasks.taskId, input.predecessorTaskId))
      .limit(1),
    db
      .select()
      .from(scmLogicalTasks)
      .where(eq(scmLogicalTasks.taskId, input.successorTaskId))
      .limit(1),
  ]);

  assertInvariant(
    pred.length > 0,
    "work_mgmt",
    "TASK_PREDECESSOR_NOT_FOUND",
    `Predecessor Task '${input.predecessorTaskId}' not found`,
  );
  assertInvariant(
    succ.length > 0,
    "work_mgmt",
    "TASK_SUCCESSOR_NOT_FOUND",
    `Successor Task '${input.successorTaskId}' not found`,
  );

  const dependencyId = `tdep_${uuidv4()}`;
  const record: TaskDependencyRecord = {
    dependencyId,
    predecessorTaskId: input.predecessorTaskId,
    successorTaskId: input.successorTaskId,
    dependencyType: input.dependencyType || "FINISH_TO_START",
    status: input.status || "BLOCKING",
  };

  await db.insert(scmLogicalTaskDependencies).values(record);

  // If predecessor is not yet completed and dependency is BLOCKING, update successor status to BLOCKED if it was OPEN
  if (
    pred[0].status !== "COMPLETED" &&
    record.status === "BLOCKING" &&
    succ[0].status === "OPEN"
  ) {
    await db
      .update(scmLogicalTasks)
      .set({ status: "BLOCKED", version: succ[0].version + 1 })
      .where(eq(scmLogicalTasks.taskId, succ[0].taskId));
  }

  return record;
}

export async function completeTask(
  taskId: string,
  result?: Record<string, unknown>,
  _actor: SecurityActorContext = DEFAULT_OPERATOR_ACTOR,
): Promise<TaskRecord> {
  await ensureScmLogicalSlice1Tables();

  const tasks = await db
    .select()
    .from(scmLogicalTasks)
    .where(eq(scmLogicalTasks.taskId, taskId))
    .limit(1);

  assertInvariant(
    tasks.length > 0,
    "work_mgmt",
    "TASK_NOT_FOUND",
    `Task '${taskId}' not found`,
  );

  const task = tasks[0];
  assertInvariant(
    task.status !== "COMPLETED",
    "work_mgmt",
    "TASK_ALREADY_COMPLETED",
    `Task '${taskId}' is already completed`,
  );

  // Check unresolved blocking predecessors
  const incomingDeps = await db
    .select()
    .from(scmLogicalTaskDependencies)
    .where(eq(scmLogicalTaskDependencies.successorTaskId, taskId));

  const blockingDeps = incomingDeps.filter((d) => d.status === "BLOCKING");
  if (blockingDeps.length > 0) {
    for (const dep of blockingDeps) {
      const pred = await db
        .select()
        .from(scmLogicalTasks)
        .where(eq(scmLogicalTasks.taskId, dep.predecessorTaskId))
        .limit(1);

      if (pred.length > 0 && pred[0].status !== "COMPLETED") {
        throw new DomainInvariantError(
          "work_mgmt",
          "TASK_BLOCKED_BY_PREDECESSOR",
          `Cannot complete Task '${taskId}': blocked by incomplete predecessor Task '${pred[0].taskId}' (${pred[0].taskType})`,
        );
      }
    }
  }

  const nowIso = new Date().toISOString();
  await db
    .update(scmLogicalTasks)
    .set({
      status: "COMPLETED",
      resultJson: result ? JSON.stringify(result) : null,
      completedAt: nowIso,
      version: task.version + 1,
    })
    .where(eq(scmLogicalTasks.taskId, taskId));

  // Now inspect tasks that were depending on this task and unblock them if all their dependencies are satisfied!
  const outgoingDeps = await db
    .select()
    .from(scmLogicalTaskDependencies)
    .where(eq(scmLogicalTaskDependencies.predecessorTaskId, taskId));

  for (const dep of outgoingDeps) {
    const succTasks = await db
      .select()
      .from(scmLogicalTasks)
      .where(eq(scmLogicalTasks.taskId, dep.successorTaskId))
      .limit(1);

    if (succTasks.length > 0 && succTasks[0].status === "BLOCKED") {
      // Check if any other predecessor is still incomplete
      const succIncoming = await db
        .select()
        .from(scmLogicalTaskDependencies)
        .where(
          eq(scmLogicalTaskDependencies.successorTaskId, dep.successorTaskId),
        );

      let stillBlocked = false;
      for (const d of succIncoming) {
        if (d.predecessorTaskId === taskId) continue; // the one we just completed
        if (d.status === "BLOCKING") {
          const otherPred = await db
            .select()
            .from(scmLogicalTasks)
            .where(eq(scmLogicalTasks.taskId, d.predecessorTaskId))
            .limit(1);
          if (otherPred.length > 0 && otherPred[0].status !== "COMPLETED") {
            stillBlocked = true;
            break;
          }
        }
      }

      if (!stillBlocked) {
        await db
          .update(scmLogicalTasks)
          .set({ status: "OPEN", version: succTasks[0].version + 1 })
          .where(eq(scmLogicalTasks.taskId, dep.successorTaskId));
      }
    }
  }

  const updated = await db
    .select()
    .from(scmLogicalTasks)
    .where(eq(scmLogicalTasks.taskId, taskId))
    .limit(1);

  return {
    ...updated[0],
    createdAt: new Date(updated[0].createdAt),
    status: updated[0].status as any,
    subjectType: updated[0].subjectType as any,
    priority: updated[0].priority as any,
  };
}

export async function getTasksForSubject(
  subjectType: SubjectType,
  subjectId: string,
): Promise<
  Array<
    TaskRecord & {
      dependencies: TaskDependencyRecord[];
      isBlocked: boolean;
    }
  >
> {
  await ensureScmLogicalSlice1Tables();

  const tasks = await db
    .select()
    .from(scmLogicalTasks)
    .where(
      and(
        eq(scmLogicalTasks.subjectId, subjectId),
        eq(scmLogicalTasks.subjectType, subjectType),
      ),
    );

  const results: Array<
    TaskRecord & {
      dependencies: TaskDependencyRecord[];
      isBlocked: boolean;
    }
  > = [];

  for (const t of tasks) {
    const deps = await db
      .select()
      .from(scmLogicalTaskDependencies)
      .where(eq(scmLogicalTaskDependencies.successorTaskId, t.taskId));

    results.push({
      ...t,
      createdAt: new Date(t.createdAt),
      status: t.status as any,
      subjectType: t.subjectType as any,
      priority: t.priority as any,
      dependencies: deps.map((d) => ({
        ...d,
        dependencyType: d.dependencyType as any,
        status: d.status as any,
      })),
      isBlocked: t.status === "BLOCKED",
    });
  }

  return results;
}
