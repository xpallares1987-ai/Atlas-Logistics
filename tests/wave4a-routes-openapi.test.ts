/**
 * @file wave4a-routes-openapi.test.ts
 * @description Contract, AST static-analysis, Fastify Swagger compilation, and runtime edge-case verification tests
 * for P1-A Wave 4A (T-24): enforces 100% OpenAPI schema coverage, zero explicit `any`, AGENTS.md §6 headers,
 * non-stripping JSON serialization, binary/streaming route safety, and error payload contracts across all
 * 24 unlocked route files (154 endpoints) in `src/routes/`.
 * @module @atlas/tests/wave4a-routes-openapi
 */

import { beforeAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import {
  buildErrorResponses,
  buildParamsSchema,
  OPENAPI_ERROR_RESPONSE_SCHEMA,
} from "../src/routes/openapi.schemas.js";

// ============================================================================
// 1. WAVE 4A UNLOCKED ROUTE MANIFEST (24 FILES / 154 ENDPOINTS)
// ============================================================================

interface Wave4ARouteSpec {
  relativePath: string;
  expectedEndpoints: number;
  expectedTag: string;
}

const WAVE4A_T24_ROUTE_FILES: readonly Wave4ARouteSpec[] = [
  {
    relativePath: "src/routes/edi.routes.ts",
    expectedEndpoints: 17,
    expectedTag: "EDI & UN/EDIFACT Gateway",
  },
  {
    relativePath: "src/routes/carrier/carrier-integrations.routes.ts",
    expectedEndpoints: 13,
    expectedTag: "Carrier Integrations & Schedules",
  },
  {
    relativePath: "src/routes/control-tower.routes.ts",
    expectedEndpoints: 11,
    expectedTag: "Control Tower",
  },
  {
    relativePath: "src/routes/carbon.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "Carbon & GLEC v3 ESG",
  },
  {
    relativePath: "src/routes/warehouse.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "Warehouse Management",
  },
  {
    relativePath: "src/routes/external-governance.routes.ts",
    expectedEndpoints: 9,
    expectedTag: "External Governance & UN/LOCODE",
  },
  {
    relativePath: "src/routes/air-cargo/air-cargo-clearing.routes.ts",
    expectedEndpoints: 8,
    expectedTag: "Air Cargo Messaging & Clearing",
  },
  {
    relativePath: "src/routes/operations/bookings.routes.ts",
    expectedEndpoints: 8,
    expectedTag: "Operations Bookings",
  },
  {
    relativePath: "src/routes/operations/demurrage.routes.ts",
    expectedEndpoints: 8,
    expectedTag: "Demurrage & Equipment Control",
  },
  {
    relativePath: "src/routes/operations/lcl.routes.ts",
    expectedEndpoints: 10,
    expectedTag: "LCL Consolidation & 3D Stowage",
  },
  {
    relativePath: "src/routes/financial/analytics.routes.ts",
    expectedEndpoints: 5,
    expectedTag: "Financial Analytics",
  },
  {
    relativePath: "src/routes/events.routes.ts",
    expectedEndpoints: 5,
    expectedTag: "Real-Time Events & Streaming",
  },
  {
    relativePath: "src/routes/telemetry.routes.ts",
    expectedEndpoints: 7,
    expectedTag: "IoT Fleet Telemetry",
  },
  {
    relativePath: "src/routes/financial/settlements.routes.ts",
    expectedEndpoints: 4,
    expectedTag: "Financial Settlements",
  },
  {
    relativePath: "src/routes/bpmn.routes.ts",
    expectedEndpoints: 4,
    expectedTag: "BPMN Workflows",
  },
  {
    relativePath: "src/routes/operations/warehouse-traffic.routes.ts",
    expectedEndpoints: 4,
    expectedTag: "Warehouse Operations",
  },
  {
    relativePath: "src/routes/unece-transport.routes.ts",
    expectedEndpoints: 2,
    expectedTag: "UNECE Transport Statistics",
  },
  {
    relativePath: "src/routes/tasks.routes.ts",
    expectedEndpoints: 2,
    expectedTag: "Tasks",
  },
  {
    relativePath: "src/routes/dashboard.routes.ts",
    expectedEndpoints: 2,
    expectedTag: "Executive Dashboard",
  },
  {
    relativePath: "src/routes/tracking.routes.ts",
    expectedEndpoints: 4,
    expectedTag: "Cargo Tracking",
  },
] as const;

const WAVE4A_ADDITIONAL_UNLOCKED_FILES: readonly Wave4ARouteSpec[] = [
  {
    relativePath: "src/routes/exceptions.routes.ts",
    expectedEndpoints: 1,
    expectedTag: "Exceptions",
  },
  {
    relativePath: "src/routes/health.routes.ts",
    expectedEndpoints: 4,
    expectedTag: "Health & Probes",
  },
  {
    relativePath: "src/routes/organization.routes.ts",
    expectedEndpoints: 6,
    expectedTag: "Organization & Matrix RBAC",
  },
  {
    relativePath: "src/routes/schedules.routes.ts",
    expectedEndpoints: 2,
    expectedTag: "Vessel Schedules",
  },
] as const;

const ALL_WAVE4A_ROUTE_FILES: readonly Wave4ARouteSpec[] = [
  ...WAVE4A_T24_ROUTE_FILES,
  ...WAVE4A_ADDITIONAL_UNLOCKED_FILES,
];

interface RouteAstInfo {
  method: string;
  routePath: string;
  hasSchema: boolean;
  hasTags: boolean;
  hasSummary: boolean;
  hasResponse200: boolean;
  undeclaredStatusCodes: string[];
}

function inspectRouteCallsAst(absPath: string): RouteAstInfo[] {
  const code = readFileSync(absPath, "utf8");
  const sf = ts.createSourceFile(absPath, code, ts.ScriptTarget.Latest, true);
  const results: RouteAstInfo[] = [];

  const getObjectProp = (
    obj: ts.ObjectLiteralExpression,
    name: string,
  ): ts.Expression | undefined => {
    for (const p of obj.properties) {
      if (ts.isPropertyAssignment(p)) {
        const key = ts.isIdentifier(p.name)
          ? p.name.text
          : ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name)
            ? p.name.text
            : p.name.getText(sf);
        if (key === name) return p.initializer;
      }
    }
    return undefined;
  };

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const targetObj = node.expression.expression.getText(sf);
      const prop = node.expression.name.getText(sf);
      if (
        ["fastify", "app", "server"].includes(targetObj) &&
        ["get", "post", "put", "patch", "delete", "route"].includes(prop)
      ) {
        const opts =
          prop === "route"
            ? node.arguments[0]
            : node.arguments.length >= 3
              ? node.arguments[1]
              : undefined;
        let routePath = "";
        if (
          prop !== "route" &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          routePath = node.arguments[0].text;
        } else if (opts && ts.isObjectLiteralExpression(opts)) {
          const urlExpr = getObjectProp(opts, "url");
          if (urlExpr && ts.isStringLiteral(urlExpr)) routePath = urlExpr.text;
        }

        let hasSchema = false;
        let hasTags = false;
        let hasSummary = false;
        let hasResponse200 = false;
        let responseText = "";

        if (opts && ts.isObjectLiteralExpression(opts)) {
          const schemaExpr = getObjectProp(opts, "schema");
          if (schemaExpr && ts.isObjectLiteralExpression(schemaExpr)) {
            hasSchema = true;
            hasTags = Boolean(getObjectProp(schemaExpr, "tags"));
            hasSummary = Boolean(getObjectProp(schemaExpr, "summary"));
            const respExpr = getObjectProp(schemaExpr, "response");
            if (respExpr && ts.isObjectLiteralExpression(respExpr)) {
              hasResponse200 = Boolean(getObjectProp(respExpr, "200"));
              responseText = respExpr.getText(sf);
            }
          }
        }

        const handlerExpr =
          prop === "route"
            ? opts && ts.isObjectLiteralExpression(opts)
              ? getObjectProp(opts, "handler")
              : undefined
            : node.arguments[node.arguments.length - 1];
        const sentStatusCodes = new Set<string>();
        const walkHandler = (hNode: ts.Node) => {
          if (
            ts.isCallExpression(hNode) &&
            ts.isPropertyAccessExpression(hNode.expression)
          ) {
            const callName = hNode.expression.name.text;
            if (
              (callName === "code" || callName === "status") &&
              hNode.arguments[0] &&
              ts.isNumericLiteral(hNode.arguments[0])
            ) {
              sentStatusCodes.add(hNode.arguments[0].text);
            }
          }
          ts.forEachChild(hNode, walkHandler);
        };
        if (handlerExpr) walkHandler(handlerExpr);

        const undeclaredStatusCodes = [...sentStatusCodes].filter(
          (codeStr) => !new RegExp(`\\b${codeStr}\\b`).test(responseText),
        );

        results.push({
          method: prop.toUpperCase(),
          routePath,
          hasSchema,
          hasTags,
          hasSummary,
          hasResponse200,
          undeclaredStatusCodes,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return results;
}

function createAdminToken(): string {
  const secret =
    process.env.JWT_SECRET ||
    "atlas-logistics-dev-secret-key-2026-min-32-chars!!";
  return jwt.sign(
    {
      id: "u-admin",
      email: "admin@atlaslogistics.io",
      role: "ADMIN",
      companyId: "c-1",
    },
    secret,
    { expiresIn: "1h" },
  );
}

// ============================================================================
// 2. STATIC AST CONTRACT & SCHEMA HELPER TESTS
// ============================================================================

describe("P1-A Wave 4A — Unlocked Route OpenAPI Contracts & AST Gates", () => {
  it("supports extended OpenApiErrorCode values and multi-param buildParamsSchema helper", () => {
    const errors = buildErrorResponses([400, 422, 429, 502, 503]);
    expect(errors[400]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);
    expect(errors[422]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);
    expect(errors[429]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);
    expect(errors[502]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);
    expect(errors[503]).toBe(OPENAPI_ERROR_RESPONSE_SCHEMA);

    const multiParams = buildParamsSchema({
      entityType: "Domain entity type.",
      entityId: "Domain entity ID.",
    }) as {
      type: string;
      required: string[];
      properties: Record<
        string,
        { type: string; minLength: number; description: string }
      >;
    };
    expect(multiParams.type).toBe("object");
    expect(multiParams.required).toEqual(["entityType", "entityId"]);
    expect(multiParams.properties.entityType.minLength).toBe(1);
    expect(multiParams.properties.entityId.description).toBe(
      "Domain entity ID.",
    );
  });

  it("enforces zero explicit AnyKeyword, z.any(), and no-explicit-any disables across all Wave 4A files", () => {
    const filesToCheck = [
      "src/routes/openapi.schemas.ts",
      ...ALL_WAVE4A_ROUTE_FILES.map((m) => m.relativePath),
    ];

    const anyViolations: string[] = [];
    const zodAnyViolations: string[] = [];

    for (const relPath of filesToCheck) {
      const absPath = resolve(process.cwd(), relPath);
      const code = readFileSync(absPath, "utf8");
      const sf = ts.createSourceFile(
        absPath,
        code,
        ts.ScriptTarget.Latest,
        true,
      );

      const visit = (node: ts.Node) => {
        if (node.kind === ts.SyntaxKind.AnyKeyword) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
          anyViolations.push(`${relPath}:${line + 1}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);

      if (/\bz\.any\s*\(|no-explicit-any/.test(code)) {
        zodAnyViolations.push(relPath);
      }
    }

    expect(anyViolations).toEqual([]);
    expect(zodAnyViolations).toEqual([]);
  });

  it("enforces 1:1 AST OpenAPI schema coverage, tags, summaries, and AGENTS.md §6 headers on all 24 unlocked route files (154 endpoints)", () => {
    let totalT24 = 0;
    let totalAll = 0;

    for (const mod of ALL_WAVE4A_ROUTE_FILES) {
      const absPath = resolve(process.cwd(), mod.relativePath);
      const source = readFileSync(absPath, "utf8");
      const routes = inspectRouteCallsAst(absPath);

      expect(
        routes.length,
        `${mod.relativePath} endpoint count should be ${mod.expectedEndpoints}`,
      ).toBe(mod.expectedEndpoints);

      for (const r of routes) {
        expect(
          r.hasSchema,
          `${mod.relativePath} ${r.method} ${r.routePath} must declare a schema block`,
        ).toBe(true);
        expect(
          r.hasTags,
          `${mod.relativePath} ${r.method} ${r.routePath} schema must include tags`,
        ).toBe(true);
        expect(
          r.hasSummary,
          `${mod.relativePath} ${r.method} ${r.routePath} schema must include summary`,
        ).toBe(true);
        expect(
          r.undeclaredStatusCodes,
          `${mod.relativePath} ${r.method} ${r.routePath} sends status codes omitted from schema.response`,
        ).toEqual([]);
      }

      expect(source).toContain(mod.expectedTag);
      expect(source).toContain("buildErrorResponses(");
      expect(source).toContain("@file ");
      expect(source).toContain("@description ");
      expect(source).toContain("@module ");

      totalAll += routes.length;
      if (WAVE4A_T24_ROUTE_FILES.includes(mod)) {
        totalT24 += routes.length;
      }
    }

    expect(totalT24).toBe(141);
    expect(totalAll).toBe(154);
  });

  it("intentionally omits 200 JSON schemas on binary PDF, SSE, and WebSocket routes to prevent fast-json-stringify corruption", () => {
    const nonJsonRoutes: Array<{ file: string; path: string }> = [
      {
        file: "src/routes/financial/settlements.routes.ts",
        path: "/agent-settlements/:id/pdf",
      },
      { file: "src/routes/carbon.routes.ts", path: "/certificates/:id/pdf" },
      {
        file: "src/routes/operations/lcl.routes.ts",
        path: "/lcl/manifest/:containerId",
      },
      { file: "src/routes/events.routes.ts", path: "/events" },
      { file: "src/routes/events.routes.ts", path: "/ws/notifications" },
      { file: "src/routes/dashboard.routes.ts", path: "/live" },
      { file: "src/routes/warehouse.routes.ts", path: "/ws" },
    ];

    for (const target of nonJsonRoutes) {
      const absPath = resolve(process.cwd(), target.file);
      const routes = inspectRouteCallsAst(absPath);
      const match = routes.find((r) => r.routePath === target.path);
      expect(
        match,
        `Expected route ${target.path} in ${target.file}`,
      ).toBeDefined();
      expect(
        match?.hasResponse200,
        `${target.file} ${target.path} must omit 200 JSON schema`,
      ).toBe(false);
    }
  });

  it("boots Fastify app and compiles a valid OpenAPI 3.x document exposing all 24 Wave 4A domain tags", async () => {
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

    for (const mod of ALL_WAVE4A_ROUTE_FILES) {
      expect(
        collectedTags.has(mod.expectedTag),
        `Compiled OpenAPI spec should expose tag "${mod.expectedTag}"`,
      ).toBe(true);
    }
  }, 30_000);
});

// ============================================================================
// 3. RUNTIME SERIALIZATION & EDGE-CASE VERIFICATION TESTS
// ============================================================================

describe("P1-A Wave 4A — Fastify Runtime Serialization & Edge Cases", () => {
  beforeAll(async () => {
    await app.ready();
  }, 30_000);

  it("preserves top-level JSON array serialization on Wave 4A collection endpoints", async () => {
    await app.ready();
    const token = createAdminToken();
    const headers = { authorization: `Bearer ${token}` };

    const arrayEndpoints = [
      "/api/tasks",
      "/api/operations/companies",
      "/api/carbon/projects",
      "/api/telemetry/assets",
      "/api/schedules",
    ];

    for (const url of arrayEndpoints) {
      const res = await app.inject({ method: "GET", url, headers });
      expect(res.statusCode, `${url} should return HTTP 200`).toBe(200);
      const parsed = res.json() as unknown;
      expect(
        Array.isArray(parsed),
        `${url} must serialize as a JSON array`,
      ).toBe(true);
    }
  });

  it("preserves full object payloads without field stripping on Wave 4A JSON endpoints", async () => {
    await app.ready();
    const token = createAdminToken();
    const headers = { authorization: `Bearer ${token}` };

    const healthRes = await app.inject({ method: "GET", url: "/health" });
    expect([200, 503]).toContain(healthRes.statusCode);
    const healthBody = healthRes.json() as {
      status?: string;
      checks?: unknown;
    };
    expect(typeof healthBody.status).toBe("string");
    expect(healthBody.checks).toBeDefined();

    const ediSamplesRes = await app.inject({
      method: "GET",
      url: "/api/edi/samples",
      headers,
    });
    expect(ediSamplesRes.statusCode).toBe(200);
    const ediSamplesBody = ediSamplesRes.json() as {
      success?: boolean;
      data?: unknown[];
    };
    expect(ediSamplesBody.success).toBe(true);
    expect(Array.isArray(ediSamplesBody.data)).toBe(true);
    expect((ediSamplesBody.data ?? []).length).toBeGreaterThan(0);

    const uneceRes = await app.inject({
      method: "GET",
      url: "/api/analytics/unece-transport",
      headers,
    });
    expect(uneceRes.statusCode).toBe(200);
    const uneceBody = uneceRes.json() as { success?: boolean; source?: string };
    expect(uneceBody.success).toBe(true);
    expect(uneceBody.source).toContain("UNECE");

    const ctRes = await app.inject({
      method: "GET",
      url: "/api/control-tower/kpis",
      headers,
    });
    expect(ctRes.statusCode).toBe(200);
    const ctBody = ctRes.json() as { success?: boolean; data?: unknown };
    expect(ctBody.success).toBe(true);
    expect(ctBody.data).toBeDefined();
  });

  it("preserves domain 400/404 error payloads and Zod issue arrays on invalid inputs", async () => {
    await app.ready();
    const token = createAdminToken();
    const jsonHeaders = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    };

    const ediInvalid = await app.inject({
      method: "POST",
      url: "/api/edi/inbound",
      headers: jsonHeaders,
      payload: { rawPayload: "short" },
    });
    expect(ediInvalid.statusCode).toBe(400);
    const ediBody = ediInvalid.json() as {
      success?: boolean;
      details?: unknown;
    };
    expect(ediBody.success).toBe(false);
    expect(Array.isArray(ediBody.details)).toBe(true);

    const taskInvalid = await app.inject({
      method: "PUT",
      url: "/api/tasks/nonexistent-task/state",
      headers: jsonHeaders,
      payload: { state: "INVALID_STATE" },
    });
    expect(taskInvalid.statusCode).toBe(400);
    expect((taskInvalid.json() as { error?: string }).error).toBe(
      "Invalid state",
    );

    const dashInvalid = await app.inject({
      method: "GET",
      url: "/api/dashboard?start=not-a-valid-date",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(dashInvalid.statusCode).toBe(400);
    expect((dashInvalid.json() as { error?: string }).error).toContain(
      "Invalid start date",
    );

    const lclInvalid = await app.inject({
      method: "POST",
      url: "/api/operations/lcl/calculate-cw",
      headers: jsonHeaders,
      payload: {},
    });
    expect(lclInvalid.statusCode).toBe(400);

    const trackMissing = await app.inject({
      method: "GET",
      url: "/api/tracking/NONEXISTENT-REF-999999",
    });
    expect(trackMissing.statusCode).toBe(404);
  });

  it("forwards clean health/readiness JSON and status codes on /healthz and /readyz aliases without leaking LightMyRequest internals", async () => {
    const token = createAdminToken();
    const authHeaders = { authorization: `Bearer ${token}` };

    const healthzTargets = [
      { url: "/healthz", headers: undefined },
      { url: "/api/healthz", headers: authHeaders },
    ];
    for (const target of healthzTargets) {
      const res = await app.inject({
        method: "GET",
        url: target.url,
        headers: target.headers,
      });
      expect([200, 503]).toContain(res.statusCode);
      const body = res.json() as Record<string, unknown>;
      expect(body.raw).toBeUndefined();
      expect(typeof body.status).toBe("string");
      expect(body.checks).toBeDefined();
    }

    const readyzTargets = [
      { url: "/readyz", headers: undefined },
      { url: "/api/readyz", headers: authHeaders },
    ];
    for (const target of readyzTargets) {
      const res = await app.inject({
        method: "GET",
        url: target.url,
        headers: target.headers,
      });
      expect([200, 503]).toContain(res.statusCode);
      const body = res.json() as Record<string, unknown>;
      expect(body.raw).toBeUndefined();
      expect(typeof body.ready).toBe("boolean");
      expect(body.dependencies).toBeDefined();
    }
  });

  it("streams valid binary PDF payloads without fast-json-stringify corruption across Wave 4A PDF routes", async () => {
    const token = createAdminToken();
    const authHeaders = { authorization: `Bearer ${token}` };

    const lclPdf = await app.inject({
      method: "POST",
      url: "/api/operations/lcl/manifest/cnt-wave4a-smoke",
      headers: { ...authHeaders, "content-type": "application/json" },
      payload: {
        specId: "40HC",
        route: "CNSHA -> ESBCN",
        cargoItems: [],
        totalWeight: 0,
      },
    });
    expect(lclPdf.statusCode).toBe(200);
    expect(lclPdf.headers["content-type"]).toContain("application/pdf");
    expect(lclPdf.rawPayload.subarray(0, 5).toString("utf8")).toBe("%PDF-");

    const settlementsRes = await app.inject({
      method: "GET",
      url: "/api/agent-settlements",
      headers: authHeaders,
    });
    expect(settlementsRes.statusCode).toBe(200);
    const settlements = settlementsRes.json() as Array<{ id: string }>;
    if (settlements.length > 0) {
      const stlPdf = await app.inject({
        method: "GET",
        url: `/api/agent-settlements/${settlements[0].id}/pdf`,
        headers: authHeaders,
      });
      expect(stlPdf.statusCode).toBe(200);
      expect(stlPdf.headers["content-type"]).toContain("application/pdf");
      expect(stlPdf.rawPayload.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    }

    const certsRes = await app.inject({
      method: "GET",
      url: "/api/carbon/certificates",
      headers: authHeaders,
    });
    expect(certsRes.statusCode).toBe(200);
    const certs = certsRes.json() as Array<{ id: string }>;
    if (certs.length > 0) {
      const certPdf = await app.inject({
        method: "GET",
        url: `/api/carbon/certificates/${certs[0].id}/pdf`,
        headers: authHeaders,
      });
      expect(certPdf.statusCode).toBe(200);
      expect(certPdf.headers["content-type"]).toContain("application/pdf");
      expect(certPdf.rawPayload.subarray(0, 5).toString("utf8")).toBe("%PDF-");
    }
  });

  it("allows empty/no-body requests on optional-body POST routes and preserves 503 on unconfigured AIS webhook", async () => {
    const token = createAdminToken();
    const authHeaders = { authorization: `Bearer ${token}` };

    const syncRes = await app.inject({
      method: "POST",
      url: "/api/sync/batch",
      headers: authHeaders,
    });
    expect(syncRes.statusCode).toBe(200);
    expect((syncRes.json() as { success?: boolean }).success).toBe(true);

    const consolidateRes = await app.inject({
      method: "POST",
      url: "/api/operations/lcl/consolidate",
      headers: authHeaders,
    });
    expect(consolidateRes.statusCode).toBe(200);
    expect((consolidateRes.json() as { success?: boolean }).success).toBe(true);

    const invRes = await app.inject({
      method: "POST",
      url: "/api/operations/warehouse/inventory",
      headers: authHeaders,
    });
    expect(invRes.statusCode).toBe(200);
    expect((invRes.json() as { success?: boolean }).success).toBe(true);

    const prevSecret = process.env.AIS_WEBHOOK_SECRET;
    delete process.env.AIS_WEBHOOK_SECRET;
    try {
      const aisRes = await app.inject({
        method: "POST",
        url: "/api/tracking/webhook/ais",
        headers: { "content-type": "application/json" },
        payload: {
          trackingNumber: "sh_demo_01",
          imoNumber: "999",
          latitude: 1,
          longitude: 1,
          status: "IN_TRANSIT",
        },
      });
      expect(aisRes.statusCode).toBe(503);
      expect((aisRes.json() as { error?: string }).error).toContain(
        "not configured",
      );
    } finally {
      if (prevSecret !== undefined) {
        process.env.AIS_WEBHOOK_SECRET = prevSecret;
      }
    }
  });
});
