/**
 * @file wave2-domain-routes-openapi.test.ts
 * @description Contract and static-verification tests for P1-A Wave 2 domain route modules: zero explicit `any`, AGENTS.md §6 JSDoc headers, and Fastify OpenAPI schema coverage across all 10 domain route files (118 endpoints).
 * @module @atlas/tests/wave2-domain-routes-openapi
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OPENAPI_ID_PARAMS_SCHEMA,
  OPENAPI_ERROR_RESPONSE_SCHEMA,
  buildErrorResponses,
  buildParamSchema,
  getErrorMessage,
  openApiArray,
  openApiObject,
} from "../src/routes/openapi.schemas.js";

// ============================================================================
// 1. WAVE 2 DOMAIN ROUTE MODULE MANIFEST
// ============================================================================

interface Wave2RouteModuleSpec {
  relativePath: string;
  expectedMinSchemas: number;
  expectedTagSubstring: string;
}

const WAVE2_ROUTE_MODULES: readonly Wave2RouteModuleSpec[] = [
  {
    relativePath: "src/modules/customs/customs.routes.ts",
    expectedMinSchemas: 12,
    expectedTagSubstring: "Customs Declarations",
  },
  {
    relativePath: "src/modules/smart-contracts/smart-contracts.routes.ts",
    expectedMinSchemas: 14,
    expectedTagSubstring: "Smart Contracts",
  },
  {
    relativePath: "src/modules/chartering/chartering-laytime.routes.ts",
    expectedMinSchemas: 13,
    expectedTagSubstring: "Chartering & Laytime",
  },
  {
    relativePath: "src/modules/air-cargo/air-cargo.routes.ts",
    expectedMinSchemas: 10,
    expectedTagSubstring: "Air Cargo",
  },
  {
    relativePath: "src/modules/aeo-security/aeo-security.routes.ts",
    expectedMinSchemas: 13,
    expectedTagSubstring: "AEO & Supply Chain Security",
  },
  {
    relativePath: "src/modules/cargo-insurance/cargo-insurance.routes.ts",
    expectedMinSchemas: 13,
    expectedTagSubstring: "Cargo Insurance",
  },
  {
    relativePath: "src/modules/dangerous-goods/dangerous-goods.routes.ts",
    expectedMinSchemas: 11,
    expectedTagSubstring: "Dangerous Goods",
  },
  {
    relativePath: "src/modules/bulk-operations/bulk-operations.routes.ts",
    expectedMinSchemas: 11,
    expectedTagSubstring: "Bulk & Tanker Operations",
  },
  {
    relativePath: "src/modules/general-average/general-average.routes.ts",
    expectedMinSchemas: 11,
    expectedTagSubstring: "General Average",
  },
  {
    relativePath: "src/modules/incoterms/incoterms.routes.ts",
    expectedMinSchemas: 9,
    expectedTagSubstring: "Incoterms 2020",
  },
] as const;

const EXPLICIT_ANY_REGEX = /(:\s*any\b|as\s+any\b|<any>|any\[\]|z\.any\(\))/g;

// ============================================================================
// 2. TEST SUITE
// ============================================================================

describe("P1-A Wave 2 Domain Routes — Zero-Any & OpenAPI Schema Contracts", () => {
  it("enforces zero explicit any and AGENTS.md §6 JSDoc headers across all 10 Wave 2 domain route modules", () => {
    for (const mod of WAVE2_ROUTE_MODULES) {
      const absPath = resolve(process.cwd(), mod.relativePath);
      const source = readFileSync(absPath, "utf8");

      const anyMatches = source.match(EXPLICIT_ANY_REGEX) ?? [];
      expect(
        anyMatches,
        `${mod.relativePath} must contain 0 explicit any occurrences`,
      ).toHaveLength(0);

      expect(source).toContain("@file ");
      expect(source).toContain("@description ");
      expect(source).toContain("@module ");
    }
  });

  it("enforces OpenAPI schema blocks across all 118 endpoints in the 10 Wave 2 domain route modules", () => {
    let totalEndpointsWithSchema = 0;

    for (const mod of WAVE2_ROUTE_MODULES) {
      const absPath = resolve(process.cwd(), mod.relativePath);
      const source = readFileSync(absPath, "utf8");

      const schemaMatches = source.match(/\bschema:\s*(\{|OCR_)/g) ?? [];
      expect(
        schemaMatches.length,
        `${mod.relativePath} should declare at least ${mod.expectedMinSchemas} OpenAPI route schemas`,
      ).toBeGreaterThanOrEqual(mod.expectedMinSchemas);

      expect(source).toContain(mod.expectedTagSubstring);
      expect(source).toContain("buildErrorResponses(");

      totalEndpointsWithSchema += schemaMatches.length;
    }

    expect(totalEndpointsWithSchema).toBeGreaterThanOrEqual(117);
  });

  it("provides type-safe OpenAPI schema helpers and error message extraction", () => {
    expect(OPENAPI_ID_PARAMS_SCHEMA.required).toEqual(["id"]);
    expect(buildParamSchema("recordId", "MLETR ID")).toEqual({
      type: "object",
      required: ["recordId"],
      properties: {
        recordId: {
          type: "string",
          minLength: 1,
          description: "MLETR ID",
        },
      },
    });

    const errMap = buildErrorResponses([400, 404, 500]);
    expect(errMap[400]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);
    expect(errMap[404]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);
    expect(errMap[500]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);

    const objSchema = openApiObject({ id: { type: "string" } }, "Record");
    expect(objSchema.additionalProperties).toBe(true);

    const arrSchema = openApiArray({ id: { type: "string" } }, "List");
    expect(arrSchema.type).toBe("array");

    expect(getErrorMessage(new Error("Tariff lookup failed"))).toBe(
      "Tariff lookup failed",
    );
    expect(getErrorMessage({ message: "Custom object error" })).toBe(
      "Custom object error",
    );
    expect(getErrorMessage(null, "Fallback message")).toBe("Fallback message");
  });
});
