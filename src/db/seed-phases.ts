import "dotenv/config";
import { databaseUrl } from "./index.js";
import {
  seedPhase1,
  seedPhase2,
  seedPhase3,
  runAllSeeds,
} from "./seeds/index.js";
import { logger } from "../config/logger.js";

async function main() {
  const args = process.argv.slice(2);
  const phaseArg =
    args.find((arg) => arg.startsWith("--phase="))?.split("=")[1] || "all";

  logger.info(
    `Starting modular seed execution on ${databaseUrl} for [Phase: ${phaseArg}]...`,
  );

  try {
    switch (phaseArg) {
      case "1":
        await seedPhase1();
        break;
      case "2":
        await seedPhase2();
        break;
      case "3":
        await seedPhase3();
        break;
      case "all":
      default:
        await runAllSeeds();
        break;
    }

    // Ensure admin user exists
    const { createAdmin } = await import("../admin/adminService.js");
    await createAdmin();
    logger.info(
      `Admin user ensured. Seed execution for Phase [${phaseArg}] completed successfully.`,
    );
    process.exit(0);
  } catch (error) {
    logger.error(
      { err: error },
      `Error during seed execution for Phase [${phaseArg}]:`,
    );
    process.exit(1);
  }
}

main();
