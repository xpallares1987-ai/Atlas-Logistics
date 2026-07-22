/**
 * ATLAS LOGISTICS - SECURE SEED SCRIPT
 *
 * This script is intended to populate the local PostgreSQL database via Firebase Data Connect.
 * It contains a strict guard to prevent execution in production environments.
 */

// Strict Environment Blocker - NEVER remove this block.
if (process.env.NODE_ENV === "production") {
  console.error(
    "🛑 CRITICAL ERROR: Refusing to run seed script in production environment.",
  );
  console.error(
    "Running this script in production could lead to irreversible data loss or corruption.",
  );
  process.exit(1);
}

// TODO: Import the generated admin SDK
// import { executeSeedMutation } from '../src/dataconnect-admin-generated';

async function main() {
  console.log("🌱 Starting database seed process in safe environment...");

  // TODO: Define and execute your Data Connect mutations here to insert initial test data.
  // Example:
  // await executeSeedMutation({
  //   companyName: "Atlas Dummy Freight Forwarder",
  //   adminEmail: "admin@atlaslogistics.local"
  // });

  console.log("✅ Seeding completed successfully.");
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
