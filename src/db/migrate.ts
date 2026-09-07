import { migrate } from "drizzle-orm/libsql/migrator";
import { db, databaseUrl } from "./index.js";

export async function runMigrations() {
  console.log(`Running database migrations on ${databaseUrl}...`);
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
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
const isMain = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(currentFile) : false;

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
