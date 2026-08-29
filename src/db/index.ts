import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.js";
import dotenv from "dotenv";

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
  return isProduction ? "file:atlas-erp-prod.db" : "file:atlas-erp-v2.db";
};

export const databaseUrl = getDatabaseUrl();
export const client = createClient({
  url: databaseUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

if (databaseUrl.startsWith("file:")) {
  client.execute("PRAGMA journal_mode = WAL;").catch(() => {});
  client.execute("PRAGMA busy_timeout = 5000;").catch(() => {});
}

export const db = drizzle(client, { schema });
