import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });

import app from "./app.js";
import { db } from "./db/index.js";
import { initPubSub } from "./services/pubsub.service.js";
import { loadSecrets } from "./config/secrets.js";
import { logger } from "./config/logger.js";
import { connectRedis } from "./config/redis.js";
const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.API_PORT || "3001",
  10,
);

async function bootstrap() {
  logger.info("Starting Atlas Logistics Backend...");

  if (process.env.GOOGLE_CLOUD_PROJECT) {
    await loadSecrets(process.env.GOOGLE_CLOUD_PROJECT);
  }

  if (db) {
    logger.info("Database connection initialized.");
  }

  await connectRedis();

  await initPubSub();

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    logger.info(`API Server running on http://0.0.0.0:${PORT}`);
    logger.info("Backend is running and listening for Camunda jobs.");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  logger.error("Error during bootstrap:", err);
});
