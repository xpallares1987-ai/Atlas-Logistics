import { loadSecrets } from "./config/secrets.js";
import { logger } from "./config/logger.js";
import { db } from "./db/db.config.js";
import { connectRedis } from "./config/redis.js";
import { startAiParserWorker } from "./pubsub-workers/ai-parser.worker.js";
import { registerAllWorkers } from "./bpm/workers/index.js";

async function startWorkerNode() {
  logger.info("Initializing Worker Node...");
  await loadSecrets();
  
  if (db) {
    logger.info("Database connection initialized in worker node.");
  }
  
  await connectRedis();

  logger.info("Starting background workers...");
  
  // Iniciamos los procesos en segundo plano (Zeebe Workers y utilidades AI)
  startAiParserWorker();
  registerAllWorkers();

  logger.info("Worker Node is running and waiting for jobs.");
}

startWorkerNode().catch((err) => {
  logger.error("Failed to start Worker Node", err);
  process.exit(1);
});
