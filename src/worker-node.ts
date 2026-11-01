import { loadSecrets } from "./config/secrets.js";
import { logger } from "./config/logger.js";
import { db } from "./db/index.js";
import { connectRedis, redis } from "./config/redis.js";
import { startAiParserWorker } from "./pubsub-workers/ai-parser.worker.js";
import { registerAllWorkers } from "./bpm/workers/index.js";
import { startOcrWorker } from "./queues/ocr.queue.js";

async function startWorkerNode() {
  logger.info("Initializing Worker Node...");
  await loadSecrets(process.env.GOOGLE_CLOUD_PROJECT || "atlas-logistics");

  // Validate database connectivity before starting workers
  if (db) {
    try {
      logger.info("Testing database connectivity...");
      // Simple query to validate connectivity
      const client = (db as any).client || (db as any)._client;
      if (client && typeof client.execute === "function") {
        await client.execute("SELECT 1");
      }
      logger.info("Database connection validated");
    } catch (error) {
      logger.error(
        { err: error },
        "FATAL: Failed to connect to database. Worker cannot start.",
      );
      process.exit(1);
    }
  }

  await connectRedis();

  logger.info("Starting background workers...");

  // Start background processes (Zeebe Workers and AI utilities)
  startAiParserWorker();
  registerAllWorkers();
  startOcrWorker();

  logger.info("Worker Node is running and waiting for jobs.");

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down worker node gracefully...`);
    const errors: Error[] = [];

    // Close Redis
    if (redis) {
      try {
        await redis.quit();
        logger.info("Redis connection closed.");
      } catch (err) {
        logger.warn({ err }, "Error closing Redis connection");
        errors.push(err as Error);
      }
    }

    // Close database connection
    if (db) {
      try {
        const client = (db as any).client || (db as any)._client;
        if (client && typeof client.close === "function") {
          await client.close();
          logger.info("Database connection closed.");
        }
      } catch (closeError) {
        logger.warn({ err: closeError }, "Error closing database connection");
        errors.push(closeError as Error);
      }
    }

    if (errors.length > 0) {
      logger.warn(
        { errors },
        "Shutdown completed with errors, but process exiting.",
      );
      process.exit(1);
    } else {
      logger.info("Graceful shutdown completed successfully.");
      process.exit(0);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startWorkerNode().catch((err) => {
  logger.error({ err }, "Failed to start Worker Node");
  process.exit(1);
});
