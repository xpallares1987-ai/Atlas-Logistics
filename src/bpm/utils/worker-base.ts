import { zbc } from '../client.js';
import { db } from '../../db/db.config.js';
import type { ICustomHeaders, IInputVariables, IOutputVariables, ZeebeJob } from '@camunda8/sdk/dist/zeebe/types';

/**
 * Atlas Logistics — Base class for Zeebe Job Workers.
 *
 * Provides standardised error handling, structured logging,
 * retry policies, and database access for all BPM workers.
 *
 * Usage:
 *   class MyWorker extends AtlasWorker {
 *     readonly taskType = 'atlas.rates.fetch';
 *     async execute(job) { ... return { result: ... }; }
 *   }
 *   new MyWorker().register();
 */
export abstract class AtlasWorker<
  TInput extends IInputVariables = IInputVariables,
  TOutput extends IOutputVariables = IOutputVariables,
  THeaders extends ICustomHeaders = ICustomHeaders
> {
  /** Zeebe task type this worker subscribes to (e.g. `atlas.rates.fetch`) */
  abstract readonly taskType: string;

  /** Human-readable worker name (for logging) */
  get workerName(): string {
    return this.taskType;
  }

  /** Max number of concurrent jobs for this worker */
  protected maxJobsToActivate = 5;

  /** Job timeout in ms (default: 30 s) */
  protected timeout = 30_000;

  /** Number of retries before the job is sent to the incident log */
  protected retries = 3;

  /** Database handle (Drizzle ORM) */
  protected db = db;

  /**
   * Core business logic — implement in each worker.
   *
   * Return an object that will be merged into the process variables,
   * or throw an `AtlasBpmnError` to raise a BPMN error event.
   */
  abstract execute(
    job: ZeebeJob<TInput, THeaders>,
  ): Promise<TOutput>;

  /** Register this worker with the Zeebe client. */
  register(): void {
    console.log(`[Worker] Registering: ${this.workerName} (type: ${this.taskType})`);

    zbc.createWorker<TInput, THeaders, TOutput>({
      taskType: this.taskType,
      maxJobsToActivate: this.maxJobsToActivate,
      timeout: this.timeout,
      taskHandler: async (job) => {
        const start = Date.now();
        console.log(
          `[${this.workerName}] ▶ Job ${job.key} started | processInstance=${job.processInstanceKey}`,
        );

        try {
          const result = await this.execute(job);
          const elapsed = Date.now() - start;
          console.log(
            `[${this.workerName}] ✓ Job ${job.key} completed in ${elapsed}ms`,
          );
          return job.complete(result);
        } catch (error: unknown) {
          const elapsed = Date.now() - start;

          // BPMN-level error (caught by Error Boundary Events)
          if (error instanceof AtlasBpmnError) {
            console.error(
              `[${this.workerName}] ⚠ Job ${job.key} BPMN error "${error.code}" after ${elapsed}ms: ${error.message}`,
            );
            return job.error({
              errorCode: error.code,
              errorMessage: error.message,
            });
          }

          // Technical failure — retry or create incident
          const msg = error instanceof Error ? error.message : String(error);
          const remainingRetries = (job.retries ?? this.retries) - 1;
          console.error(
            `[${this.workerName}] ✗ Job ${job.key} failed after ${elapsed}ms (retries left: ${remainingRetries}): ${msg}`,
          );
          return job.fail({
            errorMessage: msg,
            retries: Math.max(0, remainingRetries),
            retryBackOff: this.getBackoff(remainingRetries),
          });
        }
      },
    });
  }

  /** Exponential backoff: 5 s → 15 s → 45 s */
  private getBackoff(retriesLeft: number): number {
    const base = 5000;
    const factor = Math.max(0, this.retries - retriesLeft - 1);
    return base * Math.pow(3, factor);
  }
}

/**
 * Throw this inside `execute()` to raise a BPMN Error Event.
 * The error code must match an Error Boundary Event definition in the BPMN model.
 */
export class AtlasBpmnError extends Error {
  constructor(
    /** Error code matched by BPMN Error Boundary Events */
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AtlasBpmnError';
  }
}
