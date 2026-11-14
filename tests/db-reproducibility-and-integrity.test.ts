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
import fs from "node:fs";
import path from "node:path";

describe("Database Integrity, DDL Parity & Migration Reproducibility Contract", () => {
  const scratchDbPath = "./data/test-scratch-reproducibility.db";

  afterAll(async () => {
    // Clean up temporary test database and WAL files
    try {
      if (fs.existsSync(scratchDbPath)) fs.unlinkSync(scratchDbPath);
      if (fs.existsSync(`${scratchDbPath}-wal`))
        fs.unlinkSync(`${scratchDbPath}-wal`);
      if (fs.existsSync(`${scratchDbPath}-shm`))
        fs.unlinkSync(`${scratchDbPath}-shm`);
    } catch {
      // Ignored
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
});
