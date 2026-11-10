import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

// Load environment-specific configurations
const isProduction = process.env.NODE_ENV === "production";
dotenv.config({
  path: isProduction ? ".env.production" : ".env.local",
  override: false,
});
dotenv.config({ path: ".env", override: false });

export const getDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // In production, DATABASE_URL is mandatory
  if (isProduction) {
    throw new Error(
      "DATABASE_URL environment variable is required in production",
    );
  }

  // In development, fall back to local SQLite
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
}

export const db = drizzle(client, { schema });
