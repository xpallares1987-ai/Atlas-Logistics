import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index.js";

export async function runMigrations() {
  console.log("Running database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Database migrations completed successfully.");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
}

const isMain =
  import.meta.url.includes("migrate.ts") ||
  process.argv[1].includes("migrate.ts");
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
