/**
 * @file repository.adapter.ts
 * @description Pluggable Abstract Database Repository Adapter (T-59 / ADR 0039).
 * Provides uniform database lifecycle, query execution, transaction abstraction,
 * and seamless runtime switching between SQLite WAL (Edge) and libSQL/PostgreSQL (Hub).
 * @module @atlas/backend/db/adapters
 * @see {@link docs/adr/0039-distributed-edge-persistence-and-crdt-synchronization.md}
 */

import {
  createClient,
  type Client,
  type ResultSet,
  type InArgs,
} from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// 1. TYPES & CONTRACTS
// ============================================================================

export type DatabaseDriverType =
  "sqlite-wal" | "libsql-hub" | "postgres-hub" | "mock-memory";

export interface DatabaseAdapterConfig {
  mode?: DatabaseDriverType;
  url?: string;
  authToken?: string;
  busyTimeoutMs?: number;
  maxRetries?: number;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowsAffected: number;
  lastInsertRowid?: number | bigint;
}

export interface ITransactionContext {
  executeRaw(sql: string, params?: unknown[]): Promise<QueryResult>;
}

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number;
  driver: DatabaseDriverType;
  details?: Record<string, unknown>;
  error?: string;
}

export interface IDatabaseRepositoryAdapter {
  readonly driverType: DatabaseDriverType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  executeRaw(sql: string, params?: unknown[]): Promise<QueryResult>;
  transaction<T>(fn: (tx: ITransactionContext) => Promise<T>): Promise<T>;
  getUnderlyingClient<T = unknown>(): T;
  isEdgeLocal(): boolean;
}

// ============================================================================
// 2. MOCK IN-MEMORY REPOSITORY ADAPTER (FOR ISOLATED TESTS & ZERO DISK I/O)
// ============================================================================

export class MockInMemoryRepositoryAdapter implements IDatabaseRepositoryAdapter {
  public readonly driverType: DatabaseDriverType = "mock-memory";
  private connected = false;
  private tables = new Map<string, Record<string, unknown>[]>();

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.tables.clear();
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      ok: this.connected,
      latencyMs: 0.1,
      driver: this.driverType,
      details: { tablesCount: this.tables.size },
    };
  }

  async executeRaw(sql: string, _params: unknown[] = []): Promise<QueryResult> {
    if (!this.connected) {
      throw new Error("MockInMemoryRepositoryAdapter is not connected");
    }
    const cleanSql = sql.trim().toUpperCase();
    if (cleanSql.startsWith("SELECT 1")) {
      return { rows: [{ "1": 1 }], rowsAffected: 0 };
    }
    return { rows: [], rowsAffected: 1 };
  }

  async transaction<T>(
    fn: (tx: ITransactionContext) => Promise<T>,
  ): Promise<T> {
    const txCtx: ITransactionContext = {
      executeRaw: (sql, params) => this.executeRaw(sql, params),
    };
    return fn(txCtx);
  }

  getUnderlyingClient<T = unknown>(): T {
    return this.tables as unknown as T;
  }

  isEdgeLocal(): boolean {
    return true;
  }
}

// ============================================================================
// 3. SQLITE WAL & LIBSQL REPOSITORY ADAPTER (EDGE / LOCAL / HUB)
// ============================================================================

export class SqliteLibsqlRepositoryAdapter implements IDatabaseRepositoryAdapter {
  public readonly driverType: DatabaseDriverType;
  private client: Client | null = null;
  private readonly config: Required<DatabaseAdapterConfig>;

  constructor(config: DatabaseAdapterConfig = {}) {
    const rawUrl =
      config.url || process.env.DATABASE_URL || "file:./data/dev.db";
    const inferredType: DatabaseDriverType =
      config.mode ||
      (rawUrl.startsWith("libsql://") || rawUrl.startsWith("https://")
        ? "libsql-hub"
        : "sqlite-wal");

    this.driverType = inferredType;
    this.config = {
      mode: inferredType,
      url: rawUrl,
      authToken: config.authToken || process.env.DATABASE_AUTH_TOKEN || "",
      busyTimeoutMs: config.busyTimeoutMs ?? 5000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  async connect(): Promise<void> {
    if (this.client) return;

    if (this.config.url.startsWith("file:")) {
      const filePath = this.config.url.replace(/^file:/, "").split("?")[0];
      const dir = path.dirname(filePath);
      if (dir && dir !== "." && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.client = createClient({
      url: this.config.url,
      authToken: this.config.authToken || undefined,
    });

    if (
      this.driverType === "sqlite-wal" &&
      this.config.url.startsWith("file:")
    ) {
      await this.applyPragmas();
    }
  }

  private async applyPragmas(): Promise<void> {
    if (!this.client) return;
    await this.client.execute(
      `PRAGMA busy_timeout = ${this.config.busyTimeoutMs};`,
    );
    await this.client.execute("PRAGMA journal_mode = WAL;");
    await this.client.execute("PRAGMA synchronous = NORMAL;");
    await this.client.execute("PRAGMA foreign_keys = ON;");
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      if (typeof this.client.close === "function") {
        await this.client.close();
      }
      this.client = null;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const start = performance.now();
    try {
      if (!this.client) {
        await this.connect();
      }
      await this.client!.execute("SELECT 1;");
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        ok: true,
        latencyMs,
        driver: this.driverType,
        details: { url: this.config.url.replace(/:[^:@]*@/, ":***@") },
      };
    } catch (err) {
      const latencyMs = Number((performance.now() - start).toFixed(2));
      return {
        ok: false,
        latencyMs,
        driver: this.driverType,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async executeRaw(sql: string, params: unknown[] = []): Promise<QueryResult> {
    if (!this.client) {
      await this.connect();
    }

    let attempts = 0;
    while (attempts <= this.config.maxRetries) {
      try {
        const rs: ResultSet = await this.client!.execute({
          sql,
          args: params as InArgs,
        });

        const rows: Record<string, unknown>[] = rs.rows.map((r) => {
          if (Array.isArray(r)) {
            const obj: Record<string, unknown> = {};
            rs.columns.forEach((col, idx) => {
              obj[col] = r[idx];
            });
            return obj;
          }
          return r as Record<string, unknown>;
        });

        return {
          rows,
          rowsAffected: rs.rowsAffected,
          lastInsertRowid:
            rs.lastInsertRowid !== undefined
              ? Number(rs.lastInsertRowid)
              : undefined,
        };
      } catch (error: unknown) {
        attempts += 1;
        const msg = error instanceof Error ? error.message : String(error);
        const isBusy =
          msg.includes("SQLITE_BUSY") || msg.includes("database is locked");
        if (isBusy && attempts <= this.config.maxRetries) {
          const backoff = Math.min(50 * Math.pow(2, attempts), 500);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Execution failed after ${this.config.maxRetries} retries`);
  }

  async transaction<T>(
    fn: (tx: ITransactionContext) => Promise<T>,
  ): Promise<T> {
    if (!this.client) {
      await this.connect();
    }

    if (typeof this.client!.transaction === "function") {
      const nativeTx = await this.client!.transaction("write");
      try {
        const txCtx: ITransactionContext = {
          executeRaw: async (sql, params = []) => {
            const rs = await nativeTx.execute({
              sql,
              args: params as InArgs,
            });
            const rows: Record<string, unknown>[] = rs.rows.map((r) => {
              if (Array.isArray(r)) {
                const obj: Record<string, unknown> = {};
                rs.columns.forEach((col, idx) => {
                  obj[col] = r[idx];
                });
                return obj;
              }
              return r as Record<string, unknown>;
            });
            return {
              rows,
              rowsAffected: rs.rowsAffected,
              lastInsertRowid:
                rs.lastInsertRowid !== undefined
                  ? Number(rs.lastInsertRowid)
                  : undefined,
            };
          },
        };

        const result = await fn(txCtx);
        await nativeTx.commit();
        return result;
      } catch (error) {
        try {
          await nativeTx.rollback();
        } catch {
          // ignore
        }
        throw error;
      }
    }

    // Fallback for clients without native transaction wrapper
    await this.executeRaw("BEGIN IMMEDIATE;");
    try {
      const txCtx: ITransactionContext = {
        executeRaw: (sql, params) => this.executeRaw(sql, params),
      };
      const result = await fn(txCtx);
      await this.executeRaw("COMMIT;");
      return result;
    } catch (error) {
      try {
        await this.executeRaw("ROLLBACK;");
      } catch {
        // ignore
      }
      throw error;
    }
  }

  getUnderlyingClient<T = unknown>(): T {
    if (!this.client) {
      throw new Error("Client not initialized. Call connect() first.");
    }
    return this.client as unknown as T;
  }

  isEdgeLocal(): boolean {
    return this.driverType === "sqlite-wal";
  }
}

// ============================================================================
// 4. CANONICAL FACTORY
// ============================================================================

export function createDatabaseAdapter(
  config: DatabaseAdapterConfig = {},
): IDatabaseRepositoryAdapter {
  const mode =
    config.mode ||
    (process.env.ATLAS_PERSISTENCE_MODE as DatabaseDriverType) ||
    "sqlite-wal";

  if (mode === "mock-memory") {
    return new MockInMemoryRepositoryAdapter();
  }

  return new SqliteLibsqlRepositoryAdapter({ ...config, mode });
}
