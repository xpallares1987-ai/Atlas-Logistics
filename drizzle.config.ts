import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import fs from "node:fs";

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

const databaseUrl = process.env.DATABASE_URL || "file:./data/dev.db";

const dbCredentials: { url: string; authToken?: string } = {
  url: databaseUrl,
  ...(process.env.DATABASE_AUTH_TOKEN
    ? { authToken: process.env.DATABASE_AUTH_TOKEN }
    : {}),
};

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials,
});
