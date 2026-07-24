import { Worker, Queue, Job } from "bullmq";
import { Redis } from "ioredis";
import { Logging } from "@google-cloud/logging";
import {
  startWorkflowInstance,
  updateWorkflowStatus,
  updateWorkflowContext,
  createWorkflowTask,
  updateWorkflowTaskStatus,
  getWorkflowDefinition,
  getWorkflowTask,
} from "@dataconnect/generated";
import { logger } from "../config/logger.js";
import { AtlasWorker } from "./utils/worker-base.js";
import { BPMNParser, BPMNNode } from "./utils/bpmn-parser.js";
import { slackWorker } from "./workers/slack.worker.js";
import { emailWorker } from "./workers/email.worker.js";
import { aiWorker, ocrWorker, predictEtaWorker } from "./workers/ai.worker.js";

const connection = new Redis(
  process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || "127.0.0.1"}:6379`,
  { maxRetriesPerRequest: null },
);

export const workflowQueue = new Queue("atlas-workflows", { connection });

// Initialize GCP Logging
const gcpLogging = new Logging();
const gcpLog = gcpLogging.log("atlas-workflows");

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
    // Send structured log to GCP
    const metadata = {
      resource: { type: "global" },
      labels: { taskType, workflowId },
    };
    const entry = gcpLog.entry(metadata, {
      message: `Started task ${taskType}`,
      taskType,
      workflowId,
    });
    gcpLog.write(entry).catch(console.error);

    // Create a mock Zeebe job object so we don't have to rewrite the worker's execute signatures
    const mockZeebeJob = {
      key: job.id,
      processInstanceKey: workflowId,
      variables: variables || {},
    };

    try {
      const result = await workerInstance.execute(mockZeebeJob);
      const successEntry = gcpLog.entry(metadata, {
        message: `Successfully finished task ${taskType}`,
        result,
      });
      gcpLog.write(successEntry).catch(console.error);
      return result;
    } catch (err: any) {
      logger.error(`[WorkflowEngine] Error in ${taskType}: ${err.message}`);
      const errorEntry = gcpLog.entry(
        { ...metadata, severity: "ERROR" },
        { message: `Error in task ${taskType}`, error: err.message },
      );
      gcpLog.write(errorEntry).catch(console.error);
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
  // 1. Fetch XML from DB via Data Connect
  const response = await getWorkflowDefinition({ name: workflowName });
  const defs = response.data.workflowDefinitions;
  if (!defs || defs.length === 0) {
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

  // 3. Create workflow instance in DB via Data Connect
  const workflowInstanceResponse = await startWorkflowInstance({
    name: workflowName,
    context: variables,
  });

  const workflowId = workflowInstanceResponse.data.workflow_insert.key.id;

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
    // Create a task in the database for humans via Data Connect
    await createWorkflowTask({
      workflowId,
      taskType: el.taskType || el.name || el.id,
      elementId: el.id,
    });
    logger.info(
      `Created UserTask: ${el.taskType || el.name || el.id} for workflow: ${workflowId}`,
    );
  } else if (el.type === "endEvent") {
    // Mark workflow as completed via Data Connect
    await updateWorkflowStatus({ id: workflowId, status: "COMPLETED" });
    logger.info(`Workflow ${workflowId} reached endEvent.`);
  }
}

export async function completeUserTask(taskId: string, variables: any = {}) {
  // 1. Get task via Data Connect
  const taskResponse = await getWorkflowTask({ id: taskId });
  const task = taskResponse.data.workflowTask;
  if (!task) throw new Error(`User Task ${taskId} not found.`);

  if (task.status !== "PENDING") {
    throw new Error(`User Task ${taskId} is already ${task.status}.`);
  }

  // 2. Mark completed via Data Connect
  await updateWorkflowTaskStatus({ id: taskId, status: "COMPLETED" });

  // 3. Get workflow instance
  const workflowInstance = task.workflow;
  if (!workflowInstance)
    throw new Error(`Workflow for task ${taskId} not found.`);

  // 4. Update workflow context variables via Data Connect
  const newVariables = {
    ...((workflowInstance.context as object) || {}),
    ...variables,
  };
  await updateWorkflowContext({
    id: workflowInstance.id,
    context: newVariables,
  });

  // 5. Get workflow definition to get xmlData via Data Connect
  const defsResponse = await getWorkflowDefinition({
    name: workflowInstance.name,
  });
  const defs = defsResponse.data.workflowDefinitions;
  if (!defs || defs.length === 0)
    throw new Error(`Definition ${workflowInstance.name} not found.`);
  const xmlData = defs[0].xmlData;

  // 6. Enqueue next elements
  const parser = new BPMNParser(xmlData);
  const nextElements = parser.getNextNodes(task.elementId);
  for (const el of nextElements) {
    await enqueueElement(el, task.workflowId, xmlData, newVariables);
  }
}
