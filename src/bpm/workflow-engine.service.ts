import { Worker, Queue, Job } from "bullmq";
import { logger } from "../config/logger.js";
import { AtlasWorker, AtlasWorkerJob } from "./utils/worker-base.js";
import { BPMNParser, BPMNNode } from "./utils/bpmn-parser.js";
import { redis } from "../config/redis.js";

export type WorkflowVariables = Record<string, unknown>;

interface WorkflowJobData {
  taskType: string;
  workflowId: string;
  variables?: WorkflowVariables;
  xmlData?: string;
  currentElementId?: string;
}

interface ExecutableWorker {
  readonly taskType: string;
  execute(job: AtlasWorkerJob<WorkflowVariables>): Promise<unknown>;
}

// Mocks for legacy Data Connect
const startWorkflowInstance = async (_data: {
  name: string;
  context: WorkflowVariables;
}) => ({
  data: { workflow_insert: { key: { id: "mock-id" } } },
});
const updateWorkflowStatus = async (_data: {
  id: string;
  status: string;
}) => ({});
const updateWorkflowContext = async (_data: {
  id: string;
  context: WorkflowVariables;
}) => ({});
const createWorkflowTask = async (_data: {
  workflowId: string;
  taskType: string;
  elementId: string;
}) => ({});
const updateWorkflowTaskStatus = async (_data: {
  id: string;
  status: string;
}) => ({});
const getWorkflowDefinition = async (_data: { name: string }) => ({
  data: {
    workflowDefinitions: [
      { xmlData: "<bpmn2:definitions></bpmn2:definitions>" },
    ],
  },
});
const getWorkflowTask = async (_data: { id: string }) => ({
  data: {
    workflowTask: {
      status: "PENDING",
      workflowId: "mock-id",
      elementId: "mock-el",
      workflow: {
        id: "mock-id",
        context: {} as WorkflowVariables,
        name: "mock",
      },
    },
  },
});

const isMock =
  process.env.NODE_ENV !== "production" &&
  process.env.USE_REDIS_MOCK !== "false";

export const workflowQueue = isMock
  ? null
  : new Queue<WorkflowJobData>("atlas-workflows", { connection: redis });

// Registry for AtlasWorkers
const workerRegistry = new Map<string, ExecutableWorker>();

export function registerWorker<TInput, TOutput>(
  worker: AtlasWorker<TInput, TOutput>,
) {
  workerRegistry.set(worker.taskType, {
    taskType: worker.taskType,
    execute: (job) => worker.execute(job as unknown as AtlasWorkerJob<TInput>),
  });
  logger.info(`Registered internal worker for taskType: ${worker.taskType}`);
}

// Global BullMQ Worker to process tasks from the queue
export const bullWorker = isMock
  ? null
  : new Worker<WorkflowJobData>(
      "atlas-workflows",
      async (job: Job<WorkflowJobData>) => {
        const { taskType, workflowId, variables } = job.data;

        const workerInstance = workerRegistry.get(taskType);
        if (!workerInstance) {
          throw new Error(`No worker registered for taskType: ${taskType}`);
        }

        logger.info(
          `[WorkflowEngine] Executing ${taskType} for workflow ${workflowId}`,
        );

        const mockZeebeJob: AtlasWorkerJob<WorkflowVariables> = {
          key: job.id,
          processInstanceKey: workflowId,
          variables: variables || {},
        };

        try {
          const result = await workerInstance.execute(mockZeebeJob);
          logger.info(
            `[WorkflowEngine] Successfully finished task ${taskType}`,
          );
          return result;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.error(`[WorkflowEngine] Error in ${taskType}: ${msg}`);
          throw err;
        }
      },
      { connection: redis },
    );

if (bullWorker) {
  bullWorker.on("completed", async (job, result) => {
    logger.info(
      `Job ${job.id} completed with result: ${JSON.stringify(result)}`,
    );
    // Enqueue next elements
    try {
      const { workflowId, xmlData, currentElementId, variables } = job.data;
      if (workflowId && xmlData && currentElementId) {
        const parser = new BPMNParser(xmlData);
        // Update variables if result has new ones
        const resultRecord =
          result && typeof result === "object"
            ? (result as WorkflowVariables)
            : {};
        const newVariables: WorkflowVariables = {
          ...(variables || {}),
          ...resultRecord,
        };
        const nextElements = parser.getNextNodes(currentElementId);
        for (const el of nextElements) {
          await enqueueElement(el, workflowId, xmlData, newVariables);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Error enqueuing next tasks after job ${job.id}: ${msg}`);
    }
  });

  bullWorker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });
}

export async function startWorkflow(
  workflowName: string,
  variables: WorkflowVariables = {},
) {
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
  variables: WorkflowVariables,
) {
  if (el.type === "serviceTask") {
    // Add to BullMQ or execute locally if mocked
    if (workflowQueue) {
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
    } else {
      logger.info(
        `[MOCK] In-memory execution for serviceTask: ${el.taskType || el.id} for workflow: ${workflowId}`,
      );
      setTimeout(async () => {
        const workerInstance = workerRegistry.get(el.taskType || el.id);
        if (workerInstance) {
          try {
            await workerInstance.execute({
              key: `mock-job-${Date.now()}`,
              processInstanceKey: workflowId,
              variables: variables || {},
            });

            // Next elements...
            const parser = new BPMNParser(xmlData);
            const nextElements = parser.getNextNodes(el.id);
            for (const nextEl of nextElements) {
              await enqueueElement(nextEl, workflowId, xmlData, variables);
            }
          } catch (e: unknown) {
            logger.error({ err: e }, `[MOCK] In-memory execution failed`);
          }
        }
      }, 500);
    }
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

export async function completeUserTask(
  taskId: string,
  variables: WorkflowVariables = {},
) {
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
  const newVariables: WorkflowVariables = {
    ...(workflowInstance.context || {}),
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
