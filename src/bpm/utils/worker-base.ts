import { db } from "../../db/index.js";
import { logger } from "../../config/logger.js";
import { registerWorker } from "../workflow-engine.service.js";

/**
 * Atlas Logistics — Base class for Background Workers.
 *
 * This no longer uses Zeebe/Camunda. It runs inside our custom Node engine.
 */
export abstract class AtlasWorker<TInput = any, TOutput = any> {
  /** Task type this worker handles (e.g. `atlas.invoice.match-ap`) */
  abstract readonly taskType: string;

  get workerName(): string {
    return this.taskType;
  }

  protected db = db;

  /**
   * Core business logic.
   */
  abstract execute(job: {
    variables: TInput;
    [key: string]: any;
  }): Promise<TOutput>;

  /** Register this worker with the internal workflow engine. */
  register(): void {
    logger.info(`[Worker] Registering internal worker: ${this.workerName}`);
    registerWorker(this);
  }
}

/**
 * Thrown inside `execute()` to raise a workflow Error Event.
 */
export class AtlasBpmnError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AtlasBpmnError";
  }
}
