/**
 * @file env-contract-validation.test.ts
 * @description Unit tests for centralized environment configuration schema, metadata catalog,
 *              SQLite/libSQL protocol enforcement, 3-bucket separation (frontend-public / backend-config / backend-secret),
 *              `.env.example` parity, and anti-zombie live usage verification (P2.1).
 * @module @atlas/tests/env-contract-validation
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateEnv, ENV_CONTRACT_CATALOG } from "../src/config/env.js";

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, acc);
    } else if (
      /\.(ts|tsx|js|mjs|cjs|yml|yaml)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx") &&
      entry.name !== "env.ts" &&
      entry.name !== "env.d.ts"
    ) {
      acc.push(fullPath);
    }
  }
  return acc;
}

describe("Centralized Environment Configuration Contract (P2.1)", () => {
  it("accepts a valid development SQLite configuration with FRONTEND_PORT", () => {
    const result = validateEnv({
      NODE_ENV: "development",
      DATABASE_URL: "file:./data/dev.db",
      JWT_SECRET: "a-very-strong-development-jwt-secret-key-2026",
    });

    expect(result.NODE_ENV).toBe("development");
    expect(result.DATABASE_URL).toBe("file:./data/dev.db");
    expect(result.BACKEND_PORT).toBe(3001);
    expect(result.FRONTEND_PORT).toBe(5173);
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

  it("enforces strict 3-bucket separation: VITE_* variables can NEVER be marked as secrets", () => {
    for (const [key, descriptor] of Object.entries(ENV_CONTRACT_CATALOG)) {
      if (key.startsWith("VITE_")) {
        expect(
          descriptor.secret,
          `SECURITY VIOLATION: Client-exposed variable '${key}' must never be a secret`,
        ).toBe(false);
        expect(descriptor.scope).toBe("frontend-public");
      } else if (descriptor.secret) {
        expect(descriptor.scope).toBe("backend-secret");
      } else {
        expect(descriptor.scope).toBe("backend-config");
      }
    }
  });

  it("anti-zombie guard: every variable in ENV_CONTRACT_CATALOG must be referenced by active source or workflow code", () => {
    const root = process.cwd();
    const files = [
      ...collectSourceFiles(path.join(root, "src")),
      ...collectSourceFiles(path.join(root, "packages")),
      ...collectSourceFiles(path.join(root, ".github")),
    ];
    const corpus = files
      .map((filePath) => fs.readFileSync(filePath, "utf-8"))
      .join("\n");

    const zombies: string[] = [];
    for (const key of Object.keys(ENV_CONTRACT_CATALOG)) {
      const pattern = new RegExp(`\\b${key}\\b`);
      if (!pattern.test(corpus)) {
        zombies.push(key);
      }
    }

    expect(
      zombies,
      `Orphaned/zombie environment variables found in ENV_CONTRACT_CATALOG with zero active code references: ${zombies.join(", ")}`,
    ).toEqual([]);
  });
});
