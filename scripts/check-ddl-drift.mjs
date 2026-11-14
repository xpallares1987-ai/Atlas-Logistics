/**
 * @file check-ddl-drift.mjs
 * @description Automated DDL drift detection & verification script for SQLite & Drizzle ORM.
 * Checks for unmigrated schema definitions, snapshot integrity, and SQLite physical DDL parity.
 * @module @atlas/scripts/check-ddl-drift
 * @see {@link docs/setup-guides/database-migration-workflow.md}
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

const ROOT_DIR = process.cwd();
const DRIZZLE_DIR = path.join(ROOT_DIR, "drizzle");
const SCRATCH_DB_PATH = path.join(ROOT_DIR, "data", "drift-check-scratch.db");
const SCRATCH_DB_URL = `file:${SCRATCH_DB_PATH}`;

console.log("================================================================================");
console.log(" ATLAS LOGISTICS - AUTOMATED DDL DRIFT & PARITY VERIFICATION");
console.log("================================================================================\n");

function cleanupScratchDb() {
  const dir = path.dirname(SCRATCH_DB_PATH);
  const base = path.basename(SCRATCH_DB_PATH);
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      if (f.startsWith(base)) {
        fs.unlinkSync(path.join(dir, f));
      }
    }
  } catch (_e) {
    // Ignore cleanup errors
  }
}

async function runCheck() {
  let hasFailed = false;

  // ---------------------------------------------------------------------------
  // STEP 1: DRIZZLE SNAPSHOT INTEGRITY (drizzle-kit check)
  // ---------------------------------------------------------------------------
  console.log("[1/3] Verifying migration snapshot consistency (drizzle-kit check)...");
  try {
    const checkOutput = execSync("pnpm drizzle-kit check", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log("  ✓ Drizzle migration snapshots are consistent.");
    if (process.env.DEBUG) console.log(checkOutput);
  } catch (err) {
    console.error("  ✗ Drizzle snapshot consistency check failed:");
    console.error(err.stdout || err.message);
    hasFailed = true;
  }

  // ---------------------------------------------------------------------------
  // STEP 2: SCHEMA DRIFT DETECTION (drizzle-kit generate)
  // ---------------------------------------------------------------------------
  console.log("\n[2/3] Checking for schema drift between src/db/schema/ and drizzle/ snapshots...");
  const initialFolders = new Set(
    fs.existsSync(DRIZZLE_DIR)
      ? fs.readdirSync(DRIZZLE_DIR).filter((f) => fs.statSync(path.join(DRIZZLE_DIR, f)).isDirectory())
      : []
  );

  let generateOutput = "";
  try {
    generateOutput = execSync("pnpm drizzle-kit generate", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    console.error("  ✗ Error running drizzle-kit generate:");
    console.error(err.stdout || err.message);
    hasFailed = true;
  }

  const currentFolders = fs.existsSync(DRIZZLE_DIR)
    ? fs.readdirSync(DRIZZLE_DIR).filter((f) => fs.statSync(path.join(DRIZZLE_DIR, f)).isDirectory())
    : [];

  const newlyCreated = currentFolders.filter((f) => !initialFolders.has(f));

  if (newlyCreated.length > 0) {
    console.error(`\n  ✗ DRIFT DETECTED! Found ${newlyCreated.length} uncommitted schema change(s):`);
    for (const folder of newlyCreated) {
      const sqlPath = path.join(DRIZZLE_DIR, folder, "migration.sql");
      console.error(`    - Generated: ${folder}`);
      if (fs.existsSync(sqlPath)) {
        const preview = fs.readFileSync(sqlPath, "utf-8").slice(0, 300);
        console.error(`      Preview:\n${preview}...\n`);
      }
      // Revert/clean up generated directory so workspace remains clean
      fs.rmSync(path.join(DRIZZLE_DIR, folder), { recursive: true, force: true });
    }
    console.error("  Remediation:");
    console.error("    1. Run 'pnpm db:generate' locally.");
    console.error("    2. Review the resulting SQL migration and commit both schema and migration files.");
    hasFailed = true;
  } else {
    console.log("  ✓ No schema drift detected: TypeScript schemas and migrations are in 100% parity.");
  }

  // ---------------------------------------------------------------------------
  // STEP 3: PHYSICAL REPLAY & PRAGMA INTEGRITY CHECKS
  // ---------------------------------------------------------------------------
  console.log("\n[3/3] Replaying all migrations on fresh SQLite scratch database...");
  cleanupScratchDb();

  try {
    // Run migrations using tsx against scratch database
    execSync(`pnpm tsx src/db/migrate.ts`, {
      env: { ...process.env, DATABASE_URL: SCRATCH_DB_URL },
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const client = createClient({ url: SCRATCH_DB_URL });

    // A. PRAGMA integrity_check
    const integrityRes = await client.execute("PRAGMA integrity_check;");
    const integrityStatus = integrityRes.rows[0]?.[0] || integrityRes.rows[0]?.integrity_check;
    if (integrityStatus !== "ok") {
      console.error(`  ✗ PRAGMA integrity_check failed: ${integrityStatus}`);
      hasFailed = true;
    } else {
      console.log("  ✓ PRAGMA integrity_check: ok");
    }

    // B. PRAGMA foreign_key_check
    const fkRes = await client.execute("PRAGMA foreign_key_check;");
    if (fkRes.rows.length > 0) {
      console.error(`  ✗ PRAGMA foreign_key_check reported ${fkRes.rows.length} violation(s):`, fkRes.rows);
      hasFailed = true;
    } else {
      console.log("  ✓ PRAGMA foreign_key_check: 0 violations");
    }

    // C. Table inventory parity
    const tablesRes = await client.execute(
      "SELECT count(*) as count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';"
    );
    const tableCount = Number(tablesRes.rows[0]?.count || 0);
    console.log(`  ✓ Replayed tables count: ${tableCount} physical tables (domain + __drizzle_migrations)`);

    if (tableCount < 230) {
      console.error(`  ✗ Table count (${tableCount}) is below expected minimum (230).`);
      hasFailed = true;
    }

    await client.close();
  } catch (err) {
    console.error("  ✗ Error during scratch migration replay:", err.message);
    hasFailed = true;
  } finally {
    cleanupScratchDb();
  }

  // ---------------------------------------------------------------------------
  // SUMMARY & EXIT CODE
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  if (hasFailed) {
    console.error(" [FAIL] DDL drift verification failed. Resolve the errors above before merge.");
    console.log("================================================================================\n");
    process.exit(1);
  } else {
    console.log(" [PASS] DDL drift verification completed successfully. Zero drift detected.");
    console.log("================================================================================\n");
    process.exit(0);
  }
}

runCheck().catch((err) => {
  console.error("Fatal error running DDL drift check:", err);
  cleanupScratchDb();
  process.exit(1);
});
