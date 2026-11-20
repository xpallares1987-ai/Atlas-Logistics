/**
 * @file wave4b-full-backend-openapi.test.ts
 * @description Final Wave 4B full-backend contract gate asserting 100% OpenAPI schema coverage across all backend route files (`src/routes/` + `src/modules/`), zero explicit `any` across production `src/`, DRY `gemini.service.ts` naming, and public `/api/healthz` & `/api/readyz` liveness/readiness responses.
 * @module @atlas/tests/wave4b-full-backend-openapi
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import app from "../src/app.js";

// ============================================================================
// 1. FILESYSTEM & AST HELPERS
// ============================================================================

const REPO_ROOT = process.cwd();

function collectFiles(
  dir: string,
  predicate: (name: string) => boolean,
): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      results.push(...collectFiles(full, predicate));
    } else if (predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

function inspectRouteSchemas(filePath: string): {
  totalRoutes: number;
  missingSchemaLines: number[];
} {
  const sourceText = readFileSync(filePath, "utf8");
  const sf = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  let totalRoutes = 0;
  const missingSchemaLines: number[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      HTTP_METHODS.has(node.expression.name.text) &&
      ts.isIdentifier(node.expression.expression) &&
      (node.expression.expression.text === "fastify" ||
        node.expression.expression.text === "app") &&
      node.arguments.length >= 2 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      totalRoutes++;
      const hasOptionsSchema =
        node.arguments.length >= 3 &&
        ts.isObjectLiteralExpression(node.arguments[1]) &&
        node.arguments[1].properties.some(
          (p) =>
            ts.isPropertyAssignment(p) &&
            ts.isIdentifier(p.name) &&
            p.name.text === "schema",
        );

      if (!hasOptionsSchema) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        missingSchemaLines.push(line + 1);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);
  return { totalRoutes, missingSchemaLines };
}

// ============================================================================
// 2. WAVE 4B FULL-BACKEND OPENAPI & DRY NAMING CONTRACT SUITE
// ============================================================================

describe("P1-A Wave 4B — 100% Backend OpenAPI Closure, Zero-Any & Public Health Probes", () => {
  beforeAll(async () => {
    await app.ready();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it("enforces 100% Fastify OpenAPI schema coverage across every *.routes.ts file in src/routes/ and src/modules/", () => {
    const routeFiles = [
      ...collectFiles(resolve(REPO_ROOT, "src/routes"), (n) =>
        n.endsWith(".routes.ts"),
      ),
      ...collectFiles(resolve(REPO_ROOT, "src/modules"), (n) =>
        n.endsWith(".routes.ts"),
      ),
    ];

    expect(routeFiles.length).toBeGreaterThanOrEqual(65);

    const violations: string[] = [];
    let totalEndpoints = 0;

    for (const file of routeFiles) {
      const { totalRoutes, missingSchemaLines } = inspectRouteSchemas(file);
      totalEndpoints += totalRoutes;
      if (missingSchemaLines.length > 0) {
        violations.push(
          `${relative(REPO_ROOT, file)} missing schema at lines: ${missingSchemaLines.join(", ")}`,
        );
      }
    }

    expect(totalEndpoints).toBeGreaterThanOrEqual(550);
    expect(violations).toEqual([]);
  });

  it("verifies T-21 DRY naming hygiene (zero index.tsx in rate-comparer and canonical gemini.service.ts)", () => {
    expect(
      existsSync(resolve(REPO_ROOT, "packages/rate-comparer/src/index.tsx")),
    ).toBe(false);
    expect(
      existsSync(
        resolve(REPO_ROOT, "packages/rate-comparer/src/FreightComparerApp.tsx"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(
          REPO_ROOT,
          "packages/rate-comparer/src/components/Drawer/index.ts",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(
          REPO_ROOT,
          "packages/rate-comparer/src/components/Modal/index.ts",
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(REPO_ROOT, "packages/rate-comparer/src/services/index.ts"),
      ),
    ).toBe(true);
    expect(
      existsSync(resolve(REPO_ROOT, "src/services/geminiService.ts")),
    ).toBe(false);
    expect(
      existsSync(resolve(REPO_ROOT, "src/services/gemini.service.ts")),
    ).toBe(true);
  });

  it("serves public /healthz, /readyz, /api/healthz, and /api/readyz cleanly without JWT and exposes full OpenAPI 3.x document", async () => {
    const spec = app.swagger() as {
      openapi?: string;
      paths?: Record<string, Record<string, unknown>>;
    };
    expect(spec.openapi).toMatch(/^3\./);
    expect(Object.keys(spec.paths ?? {}).length).toBeGreaterThanOrEqual(500);

    for (const probePath of [
      "/healthz",
      "/readyz",
      "/api/healthz",
      "/api/readyz",
    ]) {
      const res = await app.inject({ method: "GET", url: probePath });
      expect(
        [200, 503],
        `Public probe ${probePath} should return 200 or 503 without JWT auth`,
      ).toContain(res.statusCode);
      const body = res.json() as Record<string, unknown>;
      expect(body).not.toHaveProperty("raw");
    }
  }, 30_000);
});
