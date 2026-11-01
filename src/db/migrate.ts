import { existsSync } from "fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, databaseUrl } from "./index.js";

export async function runMigrations() {
  const migrationsFolder = "./drizzle";

  // Validate migrations folder exists
  if (!existsSync(migrationsFolder)) {
    throw new Error(
      `Migrations folder not found at ${migrationsFolder}. Ensure Drizzle migrations are generated.`,
    );
  }

  console.log(`Running database migrations on ${databaseUrl}...`);
  try {
    await migrate(db, { migrationsFolder });
    console.log(
      `Database migrations on ${databaseUrl} completed successfully.`,
    );
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

import { fileURLToPath } from "node:url";
import path from "node:path";

const currentFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(currentFile)
  : false;

if (isMain) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
