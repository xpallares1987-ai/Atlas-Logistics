import "dotenv/config";
import { databaseUrl } from "./index.js";
import { runAllSeeds } from "./seeds/index.js";
import { logger } from "../config/logger.js";

async function main() {
  logger.info(`Starting bulk data injection (Seed) on: ${databaseUrl}...`);
  try {
    await runAllSeeds();

    // Ensure admin user exists
    const { createAdmin } = await import("../admin/adminService.js");
    await createAdmin();
    logger.info("Admin user ensured after seeding.");
    logger.info("Bulk seed completed successfully.");
    process.exit(0);
  } catch (e) {
    logger.error({ err: e }, "Error during seed:");
    process.exit(1);
  }
}

main();
