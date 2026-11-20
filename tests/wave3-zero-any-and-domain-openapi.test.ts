/**
 * @file wave3-zero-any-and-domain-openapi.test.ts
 * @description Contract, AST static-analysis, and Fastify runtime OpenAPI verification tests for P1-A Wave 3:
 * enforces zero explicit `any` across all non-test TypeScript files in `src/`, 100% OpenAPI schema coverage
 * across all 30 domain route modules (297 endpoints), Fastify v5 Swagger compilation, and edge-case tests
 * for refactored BPM workers, saga orchestrator, pagination, and metrics helpers.
 * @module @atlas/tests/wave3-zero-any-and-domain-openapi
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { BPMNParser } from "../src/bpm/utils/bpmn-parser.js";
import { compareRatesWorker } from "../src/bpm/workers/rates/compare-rates.worker.js";
import { BusinessSagaOrchestrator } from "../src/lib/workflow/choreography-engine.js";
import { validatePaginationParams } from "../src/utils/pagination.js";
import {
  httpRequestDuration,
  httpRequestTotal,
} from "../src/monitoring/metrics.js";
import { startSpan, traceSpan } from "../src/observability/tracer.js";
import {
  DocumentSignerService,
  type OfficialDocumentType,
} from "../src/services/documents/document-signer.service.js";

// ============================================================================
// 1. WAVE 3 DOMAIN ROUTE MODULE MANIFEST (20 MODULES / 179 ENDPOINTS)
// ============================================================================

interface Wave3RouteModuleSpec {
  relativePath: string;
  expectedEndpoints: number;
  expectedTag: string;
}

const WAVE3_ROUTE_MODULES: readonly Wave3RouteModuleSpec[] = [
  {
    relativePath: "src/modules/fueleu/fueleu.routes.ts",
    expectedEndpoints: 18,
    expectedTag: "FuelEU Maritime & EU ETS",
  },
  {
    relativePath: "src/modules/rail/rail.routes.ts",
    expectedEndpoints: 13,
    expectedTag: "Intermodal Rail Freight",
  },
  {
    relativePath: "src/modules/erp-integrations/erp-integrations.routes.ts",
    expectedEndpoints: 11,
    expectedTag: "ERP Integrations",
  },
  {
    relativePath: "src/modules/carbon-insetting/carbon-insetting.routes.ts",
    expectedEndpoints: 10,
    expectedTag: "Carbon Insetting & Book-and-Claim",
  },
  {
    relativePath: "src/modules/customs-warehouse/customs-warehouse.routes.ts",
    expectedEndpoints: 10,
    expectedTag: "Customs Bonded Warehouse",
  },
  {
    relativePath: "src/modules/passkeys/passkeys.routes.ts",
    expectedEndpoints: 10,
    expectedTag: "Passkeys & Step-Up Security",
  },
  {
    relativePath: "src/modules/trade-finance/trade-finance.routes.ts",
    expectedEndpoints: 10,
    expectedTag: "Trade Finance & Letters of Credit",
  },
  {
    relativePath: "src/modules/cbam/cbam.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "EU CBAM Compliance",
  },
  {
    relativePath: "src/modules/demurrage-dispute/demurrage-dispute.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "Demurrage & Detention Disputes",
  },
  {
    relativePath: "src/modules/ocean-booking/ocean-booking.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "Ocean Booking & DCSA",
  },
  {
    relativePath: "src/modules/port-congestion/port-congestion.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "Port Congestion & Berth AIS",
  },
  {
    relativePath: "src/modules/treasury/treasury.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "Treasury & Carrier Reconciliation",
  },
  {
    relativePath: "src/modules/cold-chain/cold-chain.routes.ts",
    expectedEndpoints: 8,
    expectedTag: "Cold Chain & Pharma GDP",
  },
  {
    relativePath: "src/modules/cross-border/cross-border.routes.ts",
    expectedEndpoints: 7,
    expectedTag: "Cross-Border USMCA & Carta Porte",
  },
  {
    relativePath: "src/modules/notifications/notifications.routes.ts",
    expectedEndpoints: 7,
    expectedTag: "Notifications & Alerting",
  },
  {
    relativePath: "src/modules/road-freight/road-freight.routes.ts",
    expectedEndpoints: 7,
    expectedTag: "Road Freight & e-CMR",
  },
  {
    relativePath: "src/modules/stowage/stowage.routes.ts",
    expectedEndpoints: 7,
    expectedTag: "3D Stowage & Load Optimization",
  },
  {
    relativePath: "src/modules/claims/claims.routes.ts",
    expectedEndpoints: 6,
    expectedTag: "Cargo Claims & Carrier Liability",
  },
  {
    relativePath: "src/modules/efirma/efirma.routes.ts",
    expectedEndpoints: 5,
    expectedTag: "SAT e.firma Digital Signatures",
  },
  {
    relativePath: "src/modules/iata-one-record/iata-one-record.routes.ts",
    expectedEndpoints: 5,
    expectedTag: "IATA ONE Record & e-AWB",
  },
] as const;

function collectSourceTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceTsFiles(fullPath));
    } else if (
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

// ============================================================================
// 2. STATIC AST ZERO-ANY & DOMAIN OPENAPI GATES
// ============================================================================

describe("P1-A Wave 3 — Repository-Wide Zero-Any & Domain OpenAPI Closure", () => {
  it("enforces zero explicit AnyKeyword, z.any(), and no-explicit-any disables across all non-test src/ files", () => {
    const srcRoot = resolve(process.cwd(), "src");
    const tsFiles = collectSourceTsFiles(srcRoot);
    expect(tsFiles.length).toBeGreaterThan(150);

    const anyViolations: string[] = [];
    const zodAnyViolations: string[] = [];

    for (const absPath of tsFiles) {
      const code = readFileSync(absPath, "utf8");
      const relPath = relative(process.cwd(), absPath).replace(/\\/g, "/");
      const sourceFile = ts.createSourceFile(
        absPath,
        code,
        ts.ScriptTarget.Latest,
        true,
      );

      const visit = (node: ts.Node) => {
        if (node.kind === ts.SyntaxKind.AnyKeyword) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(),
          );
          anyViolations.push(`${relPath}:${line + 1}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);

      if (/\bz\.any\s*\(|no-explicit-any/.test(code)) {
        zodAnyViolations.push(relPath);
      }
    }

    expect(
      anyViolations,
      `Found explicit 'any' keywords in src/: ${anyViolations.join(", ")}`,
    ).toEqual([]);
    expect(
      zodAnyViolations,
      `Found z.any() or no-explicit-any disables in src/: ${zodAnyViolations.join(", ")}`,
    ).toEqual([]);
  });

  it("enforces 1:1 OpenAPI schema coverage, domain tags, and AGENTS.md §6 headers on all 20 Wave 3 domain route modules (179 endpoints)", () => {
    let wave3TotalEndpoints = 0;

    for (const mod of WAVE3_ROUTE_MODULES) {
      const absPath = resolve(process.cwd(), mod.relativePath);
      const source = readFileSync(absPath, "utf8");

      const routeCount = (
        source.match(
          /\b(?:fastify|app|server)\.(get|post|put|patch|delete)\s*(?:<[\s\S]*?>)?\s*\(/g,
        ) ?? []
      ).length;
      const schemaCount = (source.match(/\bschema\s*:/g) ?? []).length;

      expect(
        routeCount,
        `${mod.relativePath} endpoint count should be ${mod.expectedEndpoints}`,
      ).toBe(mod.expectedEndpoints);
      expect(
        schemaCount,
        `${mod.relativePath} must attach an OpenAPI schema to every endpoint`,
      ).toBe(routeCount);
      expect(source).toContain(mod.expectedTag);
      expect(source).toContain("buildErrorResponses(");
      expect(source).toContain("@file ");
      expect(source).toContain("@description ");
      expect(source).toContain("@module ");

      wave3TotalEndpoints += schemaCount;
    }

    expect(wave3TotalEndpoints).toBe(179);
  });

  it("enforces 100% OpenAPI schema coverage across all 30 domain route modules in src/modules/ (297 endpoints)", () => {
    const modulesRoot = resolve(process.cwd(), "src/modules");
    const allRouteFiles = collectSourceTsFiles(modulesRoot).filter((f) =>
      f.endsWith(".routes.ts"),
    );
    expect(allRouteFiles.length).toBe(30);

    let totalRoutes = 0;
    let totalSchemas = 0;
    const mismatches: string[] = [];

    for (const absPath of allRouteFiles) {
      const source = readFileSync(absPath, "utf8");
      const relPath = relative(process.cwd(), absPath).replace(/\\/g, "/");
      const routes = (
        source.match(
          /\b(?:fastify|app|server)\.(get|post|put|patch|delete)\s*(?:<[\s\S]*?>)?\s*\(/g,
        ) ?? []
      ).length;
      const schemas = (source.match(/\bschema\s*:/g) ?? []).length;
      totalRoutes += routes;
      totalSchemas += schemas;
      if (routes !== schemas) {
        mismatches.push(`${relPath}: routes=${routes}, schemas=${schemas}`);
      }
    }

    expect(mismatches).toEqual([]);
    expect(totalRoutes).toBe(297);
    expect(totalSchemas).toBe(297);
  });

  it("boots Fastify app and compiles a valid OpenAPI 3.x document containing Wave 3 domain tags", async () => {
    await app.ready();
    const spec = app.swagger() as {
      openapi?: string;
      paths?: Record<string, Record<string, { tags?: string[] }>>;
    };

    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.paths).toBeDefined();

    const collectedTags = new Set<string>();
    for (const pathItem of Object.values(spec.paths ?? {})) {
      for (const op of Object.values(pathItem)) {
        for (const tag of op?.tags ?? []) {
          collectedTags.add(tag);
        }
      }
    }

    for (const mod of WAVE3_ROUTE_MODULES) {
      expect(
        collectedTags.has(mod.expectedTag),
        `OpenAPI spec should expose endpoints tagged "${mod.expectedTag}"`,
      ).toBe(true);
    }
  }, 30_000);
});

// ============================================================================
// 3. RUNTIME EDGE-CASE TESTS FOR WAVE 3 TYPED SERVICES & WORKERS
// ============================================================================

describe("P1-A Wave 3 — Typed Workers, Saga Orchestrator & Utility Edge Cases", () => {
  it("handles empty and populated rate lists in CompareRatesWorker without unsafe casts", async () => {
    const emptyResult = await compareRatesWorker.execute({
      variables: { rates: [] },
    });
    expect(emptyResult.rankedRates).toEqual([]);
    expect(emptyResult.bestValue).toBeNull();
    expect(emptyResult.cheapest).toBeNull();
    expect(emptyResult.fastest).toBeNull();

    const rankedResult = await compareRatesWorker.execute({
      variables: {
        preferCost: true,
        rates: [
          {
            id: "r1",
            carrier: "Maersk",
            totalCost: 1500,
            transitTime: 20,
            baseOceanFreight: 1200,
            baf: 100,
            pss: 100,
            thc: 100,
          },
          {
            id: "r2",
            carrier: "MSC",
            totalCost: 1100,
            transitTime: 25,
            baseOceanFreight: 900,
            baf: 80,
            pss: 60,
            thc: 60,
          },
        ],
      },
    });
    expect(rankedResult.rankedRates).toHaveLength(2);
    expect(rankedResult.cheapest?.carrier).toBe("MSC");
    expect(rankedResult.fastest?.carrier).toBe("Maersk");
    expect(rankedResult.bestValue?.carrier).toBe("MSC");
  });

  it("parses BPMN XML nodes & flows and rejects malformed definitions cleanly", () => {
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:zeebe="http://camunda.org/schema/zeebe/1.0">
        <bpmn:process id="proc_1">
          <bpmn:startEvent id="start_1">
            <bpmn:outgoing>flow_1</bpmn:outgoing>
          </bpmn:startEvent>
          <bpmn:serviceTask id="task_1" name="Compare Rates">
            <bpmn:extensionElements>
              <zeebe:taskDefinition type="atlas.rates.compare" />
            </bpmn:extensionElements>
            <bpmn:incoming>flow_1</bpmn:incoming>
          </bpmn:serviceTask>
          <bpmn:sequenceFlow id="flow_1" sourceRef="start_1" targetRef="task_1" />
        </bpmn:process>
      </bpmn:definitions>`;

    const parser = new BPMNParser(validXml);
    const start = parser.getStartEvent();
    expect(start?.id).toBe("start_1");
    const next = parser.getNextNodes("start_1");
    expect(next).toHaveLength(1);
    expect(next[0].taskType).toBe("atlas.rates.compare");

    expect(() => new BPMNParser("<invalid></invalid>")).toThrow(
      /Missing definitions/,
    );
  });

  it("runs BusinessSagaOrchestrator reverse compensation on step failure", async () => {
    const orchestrator = new BusinessSagaOrchestrator();
    const compensated: string[] = [];

    const result = await orchestrator.execute(
      "test-booking-saga",
      [
        {
          name: "reserve-slot",
          execute: async () => ({ reserved: true }),
          compensate: async () => {
            compensated.push("reserve-slot");
          },
        },
        {
          name: "charge-freight",
          execute: async () => {
            throw new Error("Insufficient credit limit");
          },
        },
      ],
      { bookingId: "bkg-1", reserved: false },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insufficient credit limit");
    expect(compensated).toEqual(["reserve-slot"]);
    expect(result.executedSteps.map((s) => s.status)).toEqual([
      "COMPLETED",
      "FAILED",
      "COMPENSATED",
    ]);
  });

  it("validates pagination boundaries and handles Prometheus metric proxy overloads safely", () => {
    expect(validatePaginationParams({ page: "2", limit: "50" })).toEqual({
      page: 2,
      limit: 50,
      sortOrder: "desc",
    });
    expect(() => validatePaginationParams({ page: 1, limit: 500 })).toThrow();

    expect(() => httpRequestDuration.observe(0.123)).not.toThrow();
    expect(() =>
      httpRequestDuration.observe({ method: "GET", status_code: 200 }, 0.05),
    ).not.toThrow();
    expect(() => httpRequestTotal.inc()).not.toThrow();
    expect(() => httpRequestTotal.inc(1)).not.toThrow();
    expect(() =>
      httpRequestTotal.inc({ method: "GET", status_code: 200 }, 1),
    ).not.toThrow();
  });

  it("preserves array details in 400 error responses without fast-json-stringify object coercion", async () => {
    await app.ready();
    const secret =
      process.env.JWT_SECRET ||
      "atlas-logistics-dev-secret-key-2026-min-32-chars!!";
    const token = jwt.sign(
      {
        id: "u-admin",
        email: "admin@atlaslogistics.io",
        role: "ADMIN",
        companyId: "c-1",
      },
      secret,
      { expiresIn: "1h" },
    );

    const endpoints = [
      "/api/demurrage-dispute/audit",
      "/api/demurrage-dispute/generate-pack",
      "/api/ocean-booking/request",
      "/api/ocean-booking/submit-si",
    ];

    for (const url of endpoints) {
      const res = await app.inject({
        method: "POST",
        url,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      const body = res.json() as { error: string; details: unknown };
      expect(
        Array.isArray(body.details),
        `${url} should serialize Zod issues as an array, not an indexed object`,
      ).toBe(true);
      expect((body.details as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it("returns 400 instead of 500 when POST /api/trade-finance/instruments receives missing/invalid fields", async () => {
    await app.ready();
    const secret =
      process.env.JWT_SECRET ||
      "atlas-logistics-dev-secret-key-2026-min-32-chars!!";
    const token = jwt.sign(
      {
        id: "u-admin",
        email: "admin@atlaslogistics.io",
        role: "ADMIN",
        companyId: "c-1",
      },
      secret,
      { expiresIn: "1h" },
    );

    const res = await app.inject({
      method: "POST",
      url: "/api/trade-finance/instruments",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error?: string };
    expect(body.error).toBe("INVALID_TRADE_INSTRUMENT_PAYLOAD");
  });

  it("renders valid PDF buffers for all 12 official document types including CONTRACT on minimal payloads", async () => {
    const allTypes: readonly OfficialDocumentType[] = [
      "HBL",
      "DUA",
      "ECMR",
      "AWB",
      "CIM",
      "INSURANCE_CERT",
      "CONTRACT",
      "GDP_CERT",
      "CBAM_DECLARATION",
      "DGR_DECLARATION",
      "AEO_7POINT",
      "LAYTIME_SHEET",
    ];

    for (const docType of allTypes) {
      const pdf = await DocumentSignerService.renderPdf(docType, {});
      expect(
        pdf.subarray(0, 4).toString("ascii"),
        `DocumentSignerService.renderPdf(${docType}, {}) should emit a valid PDF`,
      ).toBe("%PDF");
    }
  });

  it("sanitizes BigInt, Symbol, and circular object attributes in tracer spans without throwing", async () => {
    const circular: Record<string, unknown> = { label: "loop" };
    circular.self = circular;

    expect(() => {
      const span = startSpan("wave3-edge-span", {
        big: BigInt(42),
        sym: Symbol("trace"),
        circular,
      });
      span.end();
    }).not.toThrow();

    const value = await traceSpan(
      "wave3-edge-async-span",
      { big: BigInt(99), circular },
      async () => "ok",
    );
    expect(value).toBe("ok");
  });
});
