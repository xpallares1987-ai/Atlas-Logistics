import { Worker, Queue, Job } from "bullmq";
import { Redis } from "ioredis";
import { db } from "../db/db.config.js";
import { workflows, workflowTasks, workflowDefinitions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.js";
import { AtlasWorker } from "./utils/worker-base.js";
import { BPMNParser, BPMNNode } from "./utils/bpmn-parser.js";
import { slackWorker } from "./workers/slack.worker.js";
import { emailWorker } from "./workers/email.worker.js";
import { aiWorker } from "./workers/ai.worker.js";

const connection = new Redis(
  process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "127.0.0.1"}:6379`,
  { maxRetriesPerRequest: null },
);

export const workflowQueue = new Queue("atlas-workflows", { connection });

// Registry for AtlasWorkers
const workerRegistry = new Map<string, AtlasWorker>();

export function registerWorker(worker: AtlasWorker) {
  workerRegistry.set(worker.taskType, worker);
  logger.info(`Registered internal worker for taskType: ${worker.taskType}`);
}

// Global BullMQ Worker to process tasks from the queue
export const bullWorker = new Worker(
  "atlas-workflows",
  async (job: Job) => {
    const { taskType, workflowId, variables } = job.data;

    const workerInstance = workerRegistry.get(taskType);
    if (!workerInstance) {
      throw new Error(`No worker registered for taskType: ${taskType}`);
    }

    logger.info(
      `[WorkflowEngine] Executing ${taskType} for workflow ${workflowId}`,
    );

    // Create a mock Zeebe job object so we don't have to rewrite the worker's execute signatures
    const mockZeebeJob = {
      key: job.id,
      processInstanceKey: workflowId,
      variables: variables || {},
    };

    try {
      const result = await workerInstance.execute(mockZeebeJob);
      return result;
    } catch (err: any) {
      logger.error(`[WorkflowEngine] Error in ${taskType}: ${err.message}`);
      throw err;
    }
  },
  { connection },
);

bullWorker.on("completed", async (job, result) => {
  logger.info(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
  // Enqueue next elements
  try {
    const { workflowId, xmlData, currentElementId, variables } = job.data;
    if (workflowId && xmlData && currentElementId) {
      const parser = new BPMNParser(xmlData);
      // Update variables if result has new ones
      const newVariables = { ...variables, ...(result || {}) };
      const nextElements = parser.getNextNodes(currentElementId);
      for (const el of nextElements) {
        await enqueueElement(el, workflowId, xmlData, newVariables);
      }
    }
  } catch (err: any) {
    logger.error(
      `Error enqueuing next tasks after job ${job.id}: ${err.message}`,
    );
  }
});

bullWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed with error: ${err.message}`);
});

export async function startWorkflow(workflowName: string, variables: any = {}) {
  // 1. Fetch XML from DB
  const defs = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.name, workflowName))
    .limit(1);
  if (defs.length === 0) {
    throw new Error(`Workflow definition ${workflowName} not found.`);
  }
  const xmlData = defs[0].xmlData;

  // 2. Parse XML
  const parser = new BPMNParser(xmlData);
  const startEvent = parser.getStartEvent();

  if (!startEvent) {
    throw new Error(
      `Start event not found in workflow definition ${workflowName}.`,
    );
  }

  // 3. Create workflow instance in DB
  const workflowInstance = await db
    .insert(workflows)
    .values({
      name: workflowName,
      context: variables,
    })
    .returning();

  const workflowId = workflowInstance[0].id;

  // 4. Get next element after start event
  const nextElements = parser.getNextNodes(startEvent.id);

  // 5. Enqueue the next elements into BullMQ
  for (const el of nextElements) {
    await enqueueElement(el, workflowId, xmlData, variables);
  }

  return workflowId;
}

export async function enqueueElement(
  el: BPMNNode,
  workflowId: string,
  xmlData: string,
  variables: any,
) {
  if (el.type === "serviceTask") {
    // Add to BullMQ
    await workflowQueue.add("execute-task", {
      taskType: el.taskType || el.id,
      workflowId,
      variables,
      xmlData,
      currentElementId: el.id,
    });
    logger.info(
      `Enqueued serviceTask: ${el.taskType || el.id} for workflow: ${workflowId}`,
    );
  } else if (el.type === "userTask") {
    // Create a task in the database for humans
    await db.insert(workflowTasks).values({
      workflowId,
      taskType: el.taskType || el.name || el.id,
      elementId: el.id,
      status: "PENDING",
    });
    logger.info(
      `Created UserTask: ${el.taskType || el.name || el.id} for workflow: ${workflowId}`,
    );
  } else if (el.type === "endEvent") {
    // Mark workflow as completed
    await db
      .update(workflows)
      .set({ status: "COMPLETED" })
      .where(eq(workflows.id, workflowId));
    logger.info(`Workflow ${workflowId} reached endEvent.`);
  }
}

export async function completeUserTask(taskId: string, variables: any = {}) {
  // 1. Get task
  const tasks = await db
    .select()
    .from(workflowTasks)
    .where(eq(workflowTasks.id, taskId))
    .limit(1);
  if (tasks.length === 0) throw new Error(`User Task ${taskId} not found.`);
  const task = tasks[0];

  if (task.status !== "PENDING") {
    throw new Error(`User Task ${taskId} is already ${task.status}.`);
  }

  // 2. Mark completed
  await db
    .update(workflowTasks)
    .set({ status: "COMPLETED" })
    .where(eq(workflowTasks.id, taskId));

  // 3. Get workflow instance
  const workflowInstances = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, task.workflowId))
    .limit(1);
  if (workflowInstances.length === 0)
    throw new Error(`Workflow ${task.workflowId} not found.`);
  const workflowInstance = workflowInstances[0];

  // 4. Update workflow context variables
  const newVariables = {
    ...((workflowInstance.context as object) || {}),
    ...variables,
  };
  await db
    .update(workflows)
    .set({ context: newVariables })
    .where(eq(workflows.id, task.workflowId));

  // 5. Get workflow definition to get xmlData
  const defs = await db
    .select()
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.name, workflowInstance.name))
    .limit(1);
  if (defs.length === 0)
    throw new Error(`Definition ${workflowInstance.name} not found.`);
  const xmlData = defs[0].xmlData;

  // 6. Enqueue next elements
  const parser = new BPMNParser(xmlData);
  const nextElements = parser.getNextNodes(task.elementId);
  for (const el of nextElements) {
    await enqueueElement(el, task.workflowId, xmlData, newVariables);
  }
}
