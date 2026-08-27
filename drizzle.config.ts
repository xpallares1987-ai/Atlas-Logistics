import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

const isProduction = process.env.NODE_ENV === "production";
dotenv.config({
  path: isProduction ? ".env.production" : ".env.local",
  override: false,
});
dotenv.config({ path: ".env", override: false });

const databaseUrl =
  process.env.DATABASE_URL ||
  (isProduction ? "file:./atlas-erp-prod.db" : "file:./atlas-erp-v2.db");

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
