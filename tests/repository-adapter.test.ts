/**
 * @file repository-adapter.test.ts
 * @description Unit and integration tests for Pluggable Database Repository Adapter (T-59 / ADR 0039).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createDatabaseAdapter,
  SqliteLibsqlRepositoryAdapter,
  MockInMemoryRepositoryAdapter,
} from "../src/db/adapters/repository.adapter.js";
import fs from "node:fs";
import path from "node:path";

describe("Database Repository Adapter (T-59)", () => {
  const testDbPath = path.resolve("./data/test-adapter.db");

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
  });

  describe("MockInMemoryRepositoryAdapter", () => {
    it("should connect, perform healthcheck and execute raw dummy query", async () => {
      const adapter = new MockInMemoryRepositoryAdapter();
      await adapter.connect();

      const health = await adapter.healthCheck();
      expect(health.ok).toBe(true);
      expect(health.driver).toBe("mock-memory");
      expect(adapter.isEdgeLocal()).toBe(true);

      const res = await adapter.executeRaw("SELECT 1;");
      expect(res.rows).toEqual([{ "1": 1 }]);

      await adapter.disconnect();
    });

    it("should support simulated transactions", async () => {
      const adapter = new MockInMemoryRepositoryAdapter();
      await adapter.connect();

      const val = await adapter.transaction(async (tx) => {
        const queryRes = await tx.executeRaw("SELECT 1;");
        return queryRes.rows.length;
      });

      expect(val).toBe(1);
      await adapter.disconnect();
    });
  });

  describe("SqliteLibsqlRepositoryAdapter (Edge SQLite WAL)", () => {
    it("should connect, enforce WAL PRAGMAs and report healthy status", async () => {
      const adapter = new SqliteLibsqlRepositoryAdapter({
        url: `file:${testDbPath}`,
      });

      await adapter.connect();
      expect(adapter.driverType).toBe("sqlite-wal");
      expect(adapter.isEdgeLocal()).toBe(true);

      const health = await adapter.healthCheck();
      expect(health.ok).toBe(true);
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);

      // Verify PRAGMA journal_mode is WAL
      const pragmaRes = await adapter.executeRaw("PRAGMA journal_mode;");
      expect(pragmaRes.rows[0]?.journal_mode).toBe("wal");

      await adapter.disconnect();
    });

    it("should execute table creation, insertions and ACID transaction rollback on error", async () => {
      const adapter = new SqliteLibsqlRepositoryAdapter({
        url: `file:${testDbPath}`,
      });

      await adapter.connect();

      await adapter.executeRaw(
        "CREATE TABLE test_items (id TEXT PRIMARY KEY, value INTEGER);",
      );

      // Successful transaction
      await adapter.transaction(async (tx) => {
        await tx.executeRaw("INSERT INTO test_items VALUES ('item-1', 100);");
        await tx.executeRaw("INSERT INTO test_items VALUES ('item-2', 200);");
      });

      const countRes = await adapter.executeRaw(
        "SELECT COUNT(*) as c FROM test_items;",
      );
      expect(countRes.rows[0]?.c).toBe(2);

      // Failed transaction must roll back cleanly
      await expect(
        adapter.transaction(async (tx) => {
          await tx.executeRaw("INSERT INTO test_items VALUES ('item-3', 300);");
          throw new Error("Simulated failure inside transaction");
        }),
      ).rejects.toThrow("Simulated failure");

      // Verify item-3 was NOT committed
      const finalRes = await adapter.executeRaw(
        "SELECT COUNT(*) as c FROM test_items;",
      );
      expect(finalRes.rows[0]?.c).toBe(2);

      await adapter.disconnect();
    });
  });

  describe("createDatabaseAdapter Factory", () => {
    it("should instantiate correct adapter according to config mode", () => {
      const mockAdapter = createDatabaseAdapter({ mode: "mock-memory" });
      expect(mockAdapter.driverType).toBe("mock-memory");

      const edgeAdapter = createDatabaseAdapter({
        mode: "sqlite-wal",
        url: "file:./data/edge.db",
      });
      expect(edgeAdapter.driverType).toBe("sqlite-wal");
      expect(edgeAdapter.isEdgeLocal()).toBe(true);
    });
  });
});
