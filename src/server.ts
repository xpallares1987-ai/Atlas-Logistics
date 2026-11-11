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
  process.env.PORT ||
    process.env.BACKEND_PORT ||
    process.env.API_PORT ||
    "3001",
  10,
);

/**
 * Validate required environment variables at startup.
 */
function validateEnvironment() {
  const required = ["JWT_SECRET", "COOKIE_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(
      { missing },
      "FATAL: Required environment variables are missing",
    );
    process.exit(1);
  }

  // Warn if using weak secrets in production
  if (process.env.NODE_ENV === "production") {
    const weakSecrets = required.filter(
      (key) => (process.env[key] || "").length < 32,
    );
    if (weakSecrets.length > 0) {
      logger.warn(
        { weakSecrets },
        "WARNING: Production secrets are too short (< 32 chars). Security may be compromised.",
      );
    }
  }
}

async function bootstrap() {
  logger.info(
    `Starting Atlas Logistics Backend (Mode: ${process.env.NODE_ENV || "development"})...`,
  );

  // Load any mounted/external secrets BEFORE validating required variables
  await loadSecrets(process.env.GOOGLE_CLOUD_PROJECT);

  // Validate critical environment variables
  validateEnvironment();

  if (db) {
    logger.info(`Database connection initialized: ${databaseUrl}`);
    try {
      await runMigrations();
      logger.info("Database migrations completed successfully");
      try {
        await createAdmin();
      } catch (adminErr) {
        logger.warn(
          { err: adminErr },
          "Admin user creation warning (non-critical):",
        );
      }
    } catch (migErr) {
      logger.error(
        { err: migErr },
        "FATAL: Database migration failed. Schema is incomplete.",
      );
      process.exit(1);
    }
  }

  await connectRedis();

  await initPubSub();

  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    logger.info(`API Server running on http://0.0.0.0:${PORT}`);
    logger.info("Backend is running and listening for Camunda jobs.");

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
    for (const signal of signals) {
      process.once(signal, async () => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        try {
          await app.close();
        } catch (err) {
          logger.error({ err }, "Error closing Fastify app");
        }
        process.exit(0);
      });
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  logger.error({ err }, "Error during bootstrap:");
  process.exit(1);
});
