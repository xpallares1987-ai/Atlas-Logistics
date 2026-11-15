/**
 * @file env-contract-validation.test.ts
 * @description Unit tests for centralized environment configuration schema, metadata catalog,
 *              SQLite/libSQL protocol enforcement, and `.env.example` parity (P2.1).
 * @module @atlas/tests/env-contract-validation
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateEnv, ENV_CONTRACT_CATALOG } from "../src/config/env.js";

describe("Centralized Environment Configuration Contract (P2.1)", () => {
  it("accepts a valid development SQLite configuration", () => {
    const result = validateEnv({
      NODE_ENV: "development",
      DATABASE_URL: "file:./data/dev.db",
      JWT_SECRET: "a-very-strong-development-jwt-secret-key-2026",
    });

    expect(result.NODE_ENV).toBe("development");
    expect(result.DATABASE_URL).toBe("file:./data/dev.db");
    expect(result.BACKEND_PORT).toBe(3001);
    expect(result.GRAFANA_CLOUD_PROM_INSTANCE).toBe("cheerfulmole1135-prom");
    expect(result.GRAFANA_ASSISTANT_INSTANCE_ID).toBe("1917865");
  });

  it("rejects legacy PostgreSQL DATABASE_URL strings (P0.2)", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "development",
        DATABASE_URL: "postgres://user:pass@localhost:5432/atlas",
      }),
    ).toThrow(/DATABASE_URL must use SQLite\/libSQL protocol/);
  });

  it("rejects insecure placeholder JWT_SECRET in production mode (P0.7 / P2.1)", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "file:/app/data/prod.db",
        JWT_SECRET: "your-jwt-secret-minimum-32-characters-change-me",
      }),
    ).toThrow(
      /Production environment requires a strong, non-default JWT_SECRET/,
    );

    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "file:/app/data/prod.db",
      }),
    ).toThrow(
      /Production environment requires a strong, non-default JWT_SECRET/,
    );
  });

  it("ensures every active key in .env.example is declared in ENV_CONTRACT_CATALOG", () => {
    const envExamplePath = path.resolve(process.cwd(), ".env.example");
    const content = fs.readFileSync(envExamplePath, "utf-8");
    const keys = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.split("=")[0].trim());

    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(
        ENV_CONTRACT_CATALOG[key],
        `Missing metadata descriptor in ENV_CONTRACT_CATALOG for .env.example key: ${key}`,
      ).toBeDefined();
    }
  });
});
