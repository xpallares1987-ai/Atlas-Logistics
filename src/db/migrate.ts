import { existsSync } from "fs";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { client, databaseUrl } from "./index.js";

export async function runMigrations(
  targetClient: any = client,
  targetUrl: string = databaseUrl,
) {
  const migrationsFolder = "./drizzle";

  // Validate migrations folder exists
  if (!existsSync(migrationsFolder)) {
    throw new Error(
      `Migrations folder not found at ${migrationsFolder}. Ensure Drizzle migrations are generated.`,
    );
  }

  console.log(`Running database migrations on ${targetUrl}...`);
  try {
    // 1. Ensure __drizzle_migrations table exists with Drizzle v1 standard schema
    await targetClient.execute(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash text NOT NULL,
        created_at numeric,
        name text,
        applied_at TEXT
      );
    `);

    // 2. Fetch already applied migrations
    const appliedRes = await targetClient.execute(
      `SELECT name FROM "__drizzle_migrations"`,
    );
    const appliedSet = new Set(appliedRes.rows.map((r: any) => String(r.name)));

    // 3. Read migration folder snapshots
    const migrations = readMigrationFiles({ migrationsFolder });
    let newlyAppliedCount = 0;

    for (const m of migrations) {
      if (appliedSet.has(m.name)) {
        continue;
      }

      console.log(`Applying migration: ${m.name}...`);
      for (const rawStmt of m.sql) {
        const stmt = rawStmt.trim();
        if (!stmt) continue;
        try {
          await targetClient.execute(stmt);
        } catch (stmtErr: any) {
          const msg = stmtErr?.message || String(stmtErr);
          // Defensive handling for already existing columns, tables, or indexes in SQLite
          if (
            msg.includes("duplicate column name") ||
            msg.includes("already exists")
          ) {
            console.log(
              `  [Notice] Skipping idempotent evolution: ${msg.split("\n")[0]}`,
            );
            continue;
          }
          throw stmtErr;
        }
      }

      // Record migration as applied
      await targetClient.execute({
        sql: `INSERT INTO "__drizzle_migrations" ("hash", "created_at", "name", "applied_at") VALUES (?, ?, ?, ?)`,
        args: [m.hash, m.folderMillis, m.name, new Date().toISOString()],
      });
      newlyAppliedCount++;
    }

    console.log(
      `Database migrations on ${targetUrl} completed successfully (${newlyAppliedCount} applied).`,
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
