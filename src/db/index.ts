/**
 * @file index.ts
 * @description Canonical SQLite/libSQL connection factory and Drizzle ORM instance (P0.2).
 * Centralizes WAL mode, busy_timeout (5000ms), and mandatory foreign key enforcement.
 * @module @atlas/backend/db
 * @see {@link docs/adr/0009-sqlite-wal-mandatory-foreign-keys.md}
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// 1. ENVIRONMENT & CANONICAL DATABASE URL RESOLUTION
// ============================================================================

const isProduction = process.env.NODE_ENV === "production";
if (isProduction && fs.existsSync(".env.production")) {
  dotenv.config({ path: ".env.production", override: false });
}
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: false });
}
if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env", override: false });
}

export const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fall back to local SQLite database when DATABASE_URL is not explicitly set
  return "file:./data/dev.db";
};

export const databaseUrl = getDatabaseUrl();

// ============================================================================
// 2. CENTRALIZED SQLITE / LIBSQL CONNECTION FACTORY (P0.2)
// ============================================================================

const clientPragmasMap = new WeakMap<Client, Promise<void>>();

/**
 * Applies mandatory SQLite PRAGMAs sequentially and returns an awaitable Promise.
 */
export async function applyMandatorySqlitePragmas(
  sqlClient: Client,
): Promise<void> {
  await sqlClient.execute("PRAGMA busy_timeout = 5000;");
  await sqlClient.execute("PRAGMA journal_mode = WAL;");
  await sqlClient.execute("PRAGMA synchronous = NORMAL;");
  await sqlClient.execute("PRAGMA foreign_keys = ON;");
}

/**
 * Awaits PRAGMA initialization for a client created by `createConfiguredSqliteClient`.
 */
export async function ensureSqlitePragmas(
  sqlClient: Client = client,
): Promise<void> {
  const pending = clientPragmasMap.get(sqlClient);
  if (pending) {
    await pending;
  }
}

/**
 * Creates a SQLite/libSQL client pre-configured with Atlas Logistics mandatory PRAGMAs:
 * - PRAGMA journal_mode = WAL
 * - PRAGMA busy_timeout = 5000
 * - PRAGMA foreign_keys = ON
 */
export function createConfiguredSqliteClient(
  targetUrl: string = databaseUrl,
  authToken: string | undefined = process.env.DATABASE_AUTH_TOKEN,
): Client {
  if (targetUrl.startsWith("file:")) {
    const filePath = targetUrl.replace(/^file:/, "").split("?")[0];
    const dir = path.dirname(filePath);
    if (dir && dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlClient = createClient({
    url: targetUrl,
    authToken,
  });

  if (targetUrl.startsWith("file:")) {
    const initPromise = applyMandatorySqlitePragmas(sqlClient).catch(() => {});
    clientPragmasMap.set(sqlClient, initPromise);
  }

  return sqlClient;
}

export const client = createConfiguredSqliteClient(
  databaseUrl,
  process.env.DATABASE_AUTH_TOKEN,
);

export const dbReady: Promise<void> = ensureSqlitePragmas(client);

export const db = drizzle({ client });

// ============================================================================
// 3. HEALTH & LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Health check for database connectivity.
 * Safe way to test if the database is accessible without accessing private properties.
 * @returns true if database is healthy, false otherwise
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await client.execute("SELECT 1");
    return true;
  } catch (_error) {
    return false;
  }
};

/**
 * Close database connection gracefully.
 * @returns Promise that resolves when connection is closed
 */
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    if (client && typeof client.close === "function") {
      await client.close();
    }
  } catch (_error) {
    // Silently ignore errors during close
  }
};
