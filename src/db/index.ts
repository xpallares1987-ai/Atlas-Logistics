import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

// Load environment-specific configurations with safe local fallback
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

// Ensure parent directory exists for file-based SQLite databases
if (databaseUrl.startsWith("file:")) {
  const filePath = databaseUrl.replace(/^file:/, "").split("?")[0];
  const dir = path.dirname(filePath);
  if (dir && dir !== "." && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

if (databaseUrl.startsWith("file:")) {
  client.execute("PRAGMA journal_mode = WAL;").catch(() => {});
  client.execute("PRAGMA busy_timeout = 5000;").catch(() => {});
  client.execute("PRAGMA foreign_keys = ON;").catch(() => {});
}

export const db = drizzle(client, { schema });

/**
 * Health check for database connectivity.
 * Safe way to test if the database is accessible without accessing private properties.
 * @returns true if database is healthy, false otherwise
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    // Execute a simple query to validate connectivity
    await client.execute("SELECT 1");
    return true;
  } catch (error) {
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
  } catch (error) {
    // Silently ignore errors during close
  }
};
