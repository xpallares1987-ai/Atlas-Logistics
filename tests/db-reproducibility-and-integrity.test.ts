/**
 * @file db-reproducibility-and-integrity.test.ts
 * @description Automated CI contract test verifying sequential SQLite migrations, foreign key integrity, and fresh reproducibility.
 * @module @atlas/tests/db-reproducibility-and-integrity
 * @see {@link docs/reference/database-schema-full-inventory-and-relational-map.md}
 */

import { describe, it, expect, afterAll } from "vitest";
import { client } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";
import { createClient } from "@libsql/client";
import { readMigrationFiles } from "drizzle-orm/migrator";
import fs from "node:fs";
import path from "node:path";

describe("Database Integrity, DDL Parity & Migration Reproducibility Contract", () => {
  const scratchDbPath = "./data/test-scratch-reproducibility.db";
  const upgradeDbPath = "./data/test-scratch-upgrade.db";

  afterAll(async () => {
    // Clean up temporary test databases and WAL files
    for (const p of [scratchDbPath, upgradeDbPath]) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
        if (fs.existsSync(`${p}-wal`)) fs.unlinkSync(`${p}-wal`);
        if (fs.existsSync(`${p}-shm`)) fs.unlinkSync(`${p}-shm`);
      } catch {
        // Ignored
      }
    }
  });

  it("verifies Drizzle migration folder snapshots exist and are well-formed", () => {
    const drizzleDir = path.resolve("./drizzle");
    expect(fs.existsSync(drizzleDir)).toBe(true);

    const migrationDirs = fs
      .readdirSync(drizzleDir)
      .filter((f) => fs.statSync(path.join(drizzleDir, f)).isDirectory());

    expect(migrationDirs.length).toBeGreaterThanOrEqual(30);

    for (const dir of migrationDirs) {
      const migrationFile = path.join(drizzleDir, dir, "migration.sql");
      expect(
        fs.existsSync(migrationFile),
        `Migration snapshot file missing in folder '${dir}'`,
      ).toBe(true);
      const sqlContent = fs.readFileSync(migrationFile, "utf8");
      expect(sqlContent.length).toBeGreaterThan(0);
    }
  });

  it("verifies PRAGMA integrity_check passes with 'ok' on active database", async () => {
    const res = await client.execute("PRAGMA integrity_check;");
    expect(res.rows.length).toBe(1);
    const row = res.rows[0] as any;
    const status = row.integrity_check || Object.values(row)[0];
    expect(status).toBe("ok");
  });

  it("verifies PRAGMA foreign_key_check reports zero violations across all 237 tables", async () => {
    const res = await client.execute("PRAGMA foreign_key_check;");
    if (res.rows.length > 0) {
      console.error("Detected foreign key violations:", res.rows);
    }
    expect(res.rows.length).toBe(0);
  });

  it("verifies operational table count matches canonical schema inventory", async () => {
    const res = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%' ORDER BY name;",
    );
    const tables = res.rows.map((r: any) => String(r.name));
    // 236 operational domain tables (+ 1 __drizzle_migrations table = 237 total physical tables)
    expect(tables.length).toBe(236);

    // Assert canonical core bounded context tables exist
    expect(tables).toContain("companies");
    expect(tables).toContain("users");
    expect(tables).toContain("branch_offices");
    expect(tables).toContain("departments");
    expect(tables).toContain("user_station_assignments");
    expect(tables).toContain("roles");
    expect(tables).toContain("permissions");
    expect(tables).toContain("carrier_allocation_contracts");
    expect(tables).toContain("addresses");
    expect(tables).toContain("shipments");
    expect(tables).toContain("container_iso_types");
    expect(tables).toContain("shipment_containers");
    expect(tables).toContain("op_intelligence_cockpit_items_v2");
    expect(tables).toContain("shipment_exec_shipments_v2");
    expect(tables).toContain("dcsa_event_subscriptions");
  });

  it("proves complete migration reproducibility on a fresh SQLite database from scratch", async () => {
    // Ensure clean slate
    if (fs.existsSync(scratchDbPath)) fs.unlinkSync(scratchDbPath);

    const scratchClient = createClient({
      url: `file:${scratchDbPath}`,
    });

    await scratchClient.execute("PRAGMA journal_mode = WAL;");
    await scratchClient.execute("PRAGMA foreign_keys = ON;");
    await scratchClient.execute("PRAGMA busy_timeout = 5000;");

    // Execute full sequential migrations
    await runMigrations(scratchClient, `file:${scratchDbPath}`);

    // Verify integrity of fresh database
    const integrityRes = await scratchClient.execute("PRAGMA integrity_check;");
    const status =
      (integrityRes.rows[0] as any).integrity_check ||
      Object.values(integrityRes.rows[0])[0];
    expect(status).toBe("ok");

    // Verify foreign key integrity of fresh database
    const fkRes = await scratchClient.execute("PRAGMA foreign_key_check;");
    expect(fkRes.rows.length).toBe(0);

    // Verify tables were created
    const tablesRes = await scratchClient.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%' ORDER BY name;",
    );
    expect(tablesRes.rows.length).toBe(236);
  }, 30000);

  it("proves forward migration upgrade continuity and data preservation from an earlier baseline snapshot (E4 verification)", async () => {
    // Ensure clean slate
    if (fs.existsSync(upgradeDbPath)) fs.unlinkSync(upgradeDbPath);

    const upgradeClient = createClient({
      url: `file:${upgradeDbPath}`,
    });

    await upgradeClient.execute("PRAGMA journal_mode = WAL;");
    await upgradeClient.execute("PRAGMA foreign_keys = ON;");
    await upgradeClient.execute("PRAGMA busy_timeout = 5000;");

    // 1. Setup __drizzle_migrations table
    await upgradeClient.execute(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash text NOT NULL,
        created_at numeric,
        name text,
        applied_at TEXT
      );
    `);

    // 2. Apply only the first 30 historical migrations (simulating an existing pre-governance production database)
    const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
    const baselineMigrations = migrations.slice(0, 30);
    expect(baselineMigrations.length).toBe(30);

    for (const m of baselineMigrations) {
      for (const rawStmt of m.sql) {
        const stmt = rawStmt.trim();
        if (!stmt) continue;
        try {
          await upgradeClient.execute(stmt);
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (
            msg.includes("duplicate column name") ||
            msg.includes("already exists")
          )
            continue;
          throw e;
        }
      }
      await upgradeClient.execute({
        sql: `INSERT INTO "__drizzle_migrations" ("hash", "created_at", "name", "applied_at") VALUES (?, ?, ?, ?)`,
        args: [m.hash, m.folderMillis, m.name, new Date().toISOString()],
      });
    }

    // 3. Insert baseline data (companies, users) to simulate historical active usage
    await upgradeClient.execute({
      sql: `INSERT INTO "companies" ("id", "name", "created_at") VALUES (?, ?, ?)`,
      args: [
        "comp-upgrade-test",
        "Historical Shipping Corp",
        new Date().toISOString(),
      ],
    });

    await upgradeClient.execute({
      sql: `INSERT INTO "users" ("id", "company_id", "email", "role", "created_at") VALUES (?, ?, ?, ?, ?)`,
      args: [
        "usr-upgrade-test",
        "comp-upgrade-test",
        "upgrade@atlas.test",
        "FORWARDER",
        Math.floor(Date.now() / 1000),
      ],
    });

    // Verify baseline state
    const preCount = await upgradeClient.execute(
      "SELECT count(*) as c FROM companies WHERE id = 'comp-upgrade-test';",
    );
    expect(Number((preCount.rows[0] as any).c)).toBe(1);

    // 4. Now execute runMigrations against the historical database to simulate forward upgrade to latest
    await runMigrations(upgradeClient, `file:${upgradeDbPath}`);

    // 5. Verify data preservation
    const postCount = await upgradeClient.execute(
      "SELECT name FROM companies WHERE id = 'comp-upgrade-test';",
    );
    expect(postCount.rows.length).toBe(1);
    expect(String((postCount.rows[0] as any).name)).toBe(
      "Historical Shipping Corp",
    );

    const postUser = await upgradeClient.execute(
      "SELECT email FROM users WHERE id = 'usr-upgrade-test';",
    );
    expect(postUser.rows.length).toBe(1);
    expect(String((postUser.rows[0] as any).email)).toBe("upgrade@atlas.test");

    // 6. Verify integrity & foreign keys on upgraded database
    const integrityRes = await upgradeClient.execute("PRAGMA integrity_check;");
    const status =
      (integrityRes.rows[0] as any).integrity_check ||
      Object.values(integrityRes.rows[0])[0];
    expect(status).toBe("ok");

    const fkRes = await upgradeClient.execute("PRAGMA foreign_key_check;");
    expect(fkRes.rows.length).toBe(0);

    // 7. Verify all 236 domain tables exist after forward upgrade
    const tablesRes = await upgradeClient.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%' ORDER BY name;",
    );
    expect(tablesRes.rows.length).toBe(236);

    // 8. Verify all 33 migrations recorded in __drizzle_migrations
    const migCount = await upgradeClient.execute(
      "SELECT count(*) as c FROM __drizzle_migrations;",
    );
    expect(Number((migCount.rows[0] as any).c)).toBe(33);
  }, 45000);
});
