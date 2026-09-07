import dotenv from "dotenv";

// Load environment-specific configs ONCE at startup, before any other imports
const isProduction = process.env.NODE_ENV === "production";
dotenv.config({
  path: isProduction ? ".env.production" : ".env.local",
  override: false,
});
dotenv.config({ path: ".env", override: false });

import app from "./app.js";
import { db, databaseUrl } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import { createAdmin } from "./admin/adminService.js";
import { initPubSub } from "./services/pubsub.service.js";
import { loadSecrets } from "./config/secrets.js";
import { logger } from "./config/logger.js";
import { connectRedis } from "./config/redis.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.API_PORT || "3001",
  10,
);

async function bootstrap() {
  logger.info(
    `Starting Atlas Logistics Backend (Mode: ${process.env.NODE_ENV || "development"})...`,
  );

  if (process.env.GOOGLE_CLOUD_PROJECT) {
    await loadSecrets(process.env.GOOGLE_CLOUD_PROJECT);
  }

  if (db) {
    logger.info(`Database connection initialized: ${databaseUrl}`);
    try {
      await runMigrations();
      await createAdmin();
    } catch (migErr) {
      logger.warn({ err: migErr }, "Database auto-migration/admin setup warning:");
    }
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
  process.exit(1);
});
