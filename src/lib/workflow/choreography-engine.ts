import { Queue, Worker, Job } from "bullmq";
import { redis, isRedisAvailable } from "../../config/redis.js";
import { logger } from "../../config/logger.js";

// ── Track 1: Transactional Job Bus (BullMQ + Resilient In-Memory Fallback) ──

export interface TransactionalJobResult {
  jobId: string;
  queue: string;
  name: string;
  status: "QUEUED" | "COMPLETED_SYNC" | "FAILED";
  result?: any;
}

export type JobHandler<T = any, R = any> = (payload: T) => Promise<R>;

export class TransactionalJobBus {
  private queues: Map<string, Queue> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private workers: Map<string, Worker> = new Map();

  /**
   * Register a job handler for a specific queue
   */
  registerHandler(queueName: string, handler: JobHandler): void {
    this.handlers.set(queueName, handler);

    if (isRedisAvailable && redis && !this.workers.has(queueName)) {
      try {
        const worker = new Worker(
          queueName,
          async (job: Job) => {
            return await handler(job.data);
          },
          { connection: redis },
        );

        worker.on("failed", (job, err) => {
          logger.error({ jobId: job?.id, queueName, err }, "BullMQ job failed");
        });

        this.workers.set(queueName, worker);
      } catch (err) {
        logger.warn(
          { queueName, err },
          "Failed to start BullMQ worker, will use in-memory fallback",
        );
      }
    }
  }

  /**
   * Dispatch a transactional job (PDF generation, EDI dispatch, outbound notifications)
   */
  async dispatch<T = any>(
    queueName: string,
    jobName: string,
    payload: T,
  ): Promise<TransactionalJobResult> {
    // 1. Try BullMQ if Redis is active
    if (isRedisAvailable && redis) {
      try {
        let queue = this.queues.get(queueName);
        if (!queue) {
          queue = new Queue(queueName, { connection: redis });
          this.queues.set(queueName, queue);
        }
        const job = await queue.add(jobName, payload);
        return {
          jobId: job.id ?? `job_${Date.now()}`,
          queue: queueName,
          name: jobName,
          status: "QUEUED",
        };
      } catch (err) {
        logger.warn(
          { queueName, jobName, err },
          "BullMQ queue add failed; falling back to in-memory synchronous execution",
        );
      }
    }

    // 2. In-memory execution fallback
    const handler = this.handlers.get(queueName);
    if (handler) {
      try {
        const result = await handler(payload);
        return {
          jobId: `mem_${Date.now()}`,
          queue: queueName,
          name: jobName,
          status: "COMPLETED_SYNC",
          result,
        };
      } catch (err) {
        return {
          jobId: `mem_${Date.now()}`,
          queue: queueName,
          name: jobName,
          status: "FAILED",
          result: (err as Error).message,
        };
      }
    }

    return {
      jobId: `mem_noop_${Date.now()}`,
      queue: queueName,
      name: jobName,
      status: "COMPLETED_SYNC",
    };
  }
}

// ── Track 2: Multi-Party Business Saga Orchestrator ──

export interface SagaStep<TContext> {
  name: string;
  execute: (context: TContext) => Promise<Partial<TContext> | void>;
  compensate?: (context: TContext) => Promise<void>;
}

export interface StepExecutionRecord {
  step: string;
  timestamp: string;
  durationMs: number;
  status: "COMPLETED" | "COMPENSATED" | "FAILED";
  error?: string;
}

export interface SagaResult<TContext> {
  sagaName: string;
  success: boolean;
  finalContext: TContext;
  executedSteps: StepExecutionRecord[];
  error?: string;
}

export class SagaExecutionError extends Error {
  public history: StepExecutionRecord[];
  constructor(message: string, history: StepExecutionRecord[]) {
    super(message);
    this.name = "SagaExecutionError";
    this.history = history;
  }
}

export class BusinessSagaOrchestrator {
  /**
   * Execute a multi-step business saga with automatic compensation rollback on failure
   */
  async execute<TContext extends Record<string, any>>(
    sagaName: string,
    steps: SagaStep<TContext>[],
    initialContext: TContext,
  ): Promise<SagaResult<TContext>> {
    const context = { ...initialContext };
    const history: StepExecutionRecord[] = [];
    const completedSteps: SagaStep<TContext>[] = [];

    for (const step of steps) {
      const startTime = Date.now();
      try {
        const partial = await step.execute(context);
        if (partial && typeof partial === "object") {
          Object.assign(context, partial);
        }
        completedSteps.push(step);
        history.push({
          step: step.name,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          status: "COMPLETED",
        });
      } catch (stepErr: any) {
        history.push({
          step: step.name,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          status: "FAILED",
          error: stepErr?.message || "Unknown error",
        });

        // Trigger compensation rollback in reverse order
        for (const doneStep of completedSteps.reverse()) {
          if (doneStep.compensate) {
            try {
              await doneStep.compensate(context);
              history.push({
                step: `compensate:${doneStep.name}`,
                timestamp: new Date().toISOString(),
                durationMs: 0,
                status: "COMPENSATED",
              });
            } catch (compErr: any) {
              logger.error(
                { sagaName, step: doneStep.name, compErr },
                "Saga compensation step failed",
              );
            }
          }
        }

        return {
          sagaName,
          success: false,
          finalContext: context,
          executedSteps: history,
          error: stepErr?.message,
        };
      }
    }

    return {
      sagaName,
      success: true,
      finalContext: context,
      executedSteps: history,
    };
  }
}

/** Global instances */
export const transactionalJobBus = new TransactionalJobBus();
export const businessSagaOrchestrator = new BusinessSagaOrchestrator();
