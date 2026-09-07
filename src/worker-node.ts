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

  if (db) {
    logger.info("Database connection initialized in worker node.");
  }

  await connectRedis();

  logger.info("Starting background workers...");

  // Iniciamos los procesos en segundo plano (Zeebe Workers y utilidades AI)
  startAiParserWorker();
  registerAllWorkers();
  startOcrWorker();

  logger.info("Worker Node is running and waiting for jobs.");

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down worker node gracefully...`);
    try {
      if (redis) {
        await redis.quit();
        logger.info("Redis connection closed.");
      }

      // Close database connection
      if (db) {
        try {
          // If using Drizzle with libsql, close the client
          const client = (db as any).client || (db as any)._client;
          if (client && typeof client.close === "function") {
            await client.close();
            logger.info("Database connection closed.");
          }
        } catch (closeError) {
          logger.warn({ err: closeError }, "Error closing database connection:");
        }
      }

      process.exit(0);
    } catch (error) {
      logger.error(error, "Error during graceful shutdown:");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startWorkerNode().catch((err) => {
  logger.error({ err }, "Failed to start Worker Node");
  process.exit(1);
});
