/**
 * @file security-rbac-negative.test.ts
 * @description Negative IAM/RBAC Fastify .inject() security integration tests verifying 401 Unauthorized, 403 Forbidden role enforcement, and JWT validation boundaries.
 * @module @atlas/tests/security-rbac-negative
 * @see {@link docs/architecture/atlas-joint-improvement-plan.md}
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import jwt from "jsonwebtoken";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  isPublicRoute,
  requiresGlobalApiAuth,
} from "../src/middleware/public-routes.js";

// Ensure deterministic JWT_SECRET before importing auth middleware
const TEST_JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16
    ? process.env.JWT_SECRET
    : "atlas-rbac-negative-test-secret-32chars-min";
process.env.JWT_SECRET = TEST_JWT_SECRET;

// ============================================================================
// 1. TEST APPLICATION FACTORY (FASTIFY .INJECT() HARNESS)
// ============================================================================
async function buildRbacTestApp(): Promise<FastifyInstance> {
  const { authMiddleware, requireRole } =
    await import("../src/middleware/auth.js");

  const app = Fastify({ logger: false });
  await app.register(fastifyCookie, { secret: TEST_JWT_SECRET });

  app.get(
    "/api/secure/finance/gl-export",
    { preHandler: [authMiddleware, requireRole(["FINANCE", "ADMIN"])] },
    async (request) => ({
      success: true,
      data: { actor: request.user?.id, role: request.user?.role },
    }),
  );

  app.post(
    "/api/secure/admin/audit-reset",
    { preHandler: [authMiddleware, requireRole(["ADMIN"])] },
    async (request) => ({
      success: true,
      data: { actor: request.user?.id, role: request.user?.role },
    }),
  );

  app.get(
    "/api/secure/operations/shipments",
    {
      preHandler: [
        authMiddleware,
        requireRole(["OPERATOR", "MANAGER", "ADMIN"]),
      ],
    },
    async (request) => ({
      success: true,
      data: { actor: request.user?.id, role: request.user?.role },
    }),
  );

  await app.ready();
  return app;
}

function signToken(
  payload: { id: string; role?: string; email?: string; companyId?: string },
  secret = TEST_JWT_SECRET,
  expiresIn: jwt.SignOptions["expiresIn"] = "1h",
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

// ============================================================================
// 2. NEGATIVE AUTHENTICATION TESTS (401 UNAUTHORIZED)
// ============================================================================
describe("IAM/RBAC Security Negative Suite (Fastify .inject())", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildRbacTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects unauthenticated requests without Authorization header or cookie (401)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/secure/finance/gl-export",
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "Missing Authentication." });
  });

  it("rejects malformed or tampered JWT signatures (401)", async () => {
    const forgedToken = signToken(
      { id: "attacker-1", role: "ADMIN" },
      "wrong-signing-key-attacker-controlled",
    );

    const res = await app.inject({
      method: "POST",
      url: "/api/secure/admin/audit-reset",
      headers: { authorization: `Bearer ${forgedToken}` },
    });

    expect(res.statusCode).toBe(401);
  });

  it("rejects expired JWT tokens (401)", async () => {
    const expiredToken = signToken(
      { id: "u-admin-1", role: "ADMIN" },
      TEST_JWT_SECRET,
      "-10s",
    );

    const res = await app.inject({
      method: "GET",
      url: "/api/secure/finance/gl-export",
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    expect(res.statusCode).toBe(401);
  });

  // ==========================================================================
  // 3. NEGATIVE AUTHORIZATION / RBAC ROLE ESCALATION TESTS (403 FORBIDDEN)
  // ==========================================================================
  it("blocks OPERATOR from accessing FINANCE-restricted endpoints (403)", async () => {
    const operatorToken = signToken({
      id: "u-ops-01",
      role: "OPERATOR",
      companyId: "c-1",
    });

    const res = await app.inject({
      method: "GET",
      url: "/api/secure/finance/gl-export",
      headers: { authorization: `Bearer ${operatorToken}` },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({
      error: "Forbidden: Insufficient permissions",
    });
  });

  it("blocks FINANCE from accessing ADMIN-only endpoints (403)", async () => {
    const financeToken = signToken({
      id: "u-fin-01",
      role: "FINANCE",
      companyId: "c-1",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/secure/admin/audit-reset",
      headers: { authorization: `Bearer ${financeToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("defaults JWT payloads lacking a role claim to least-privilege USER (403)", async () => {
    const rolelessToken = signToken({ id: "u-minimal-01", companyId: "c-1" });

    const res = await app.inject({
      method: "GET",
      url: "/api/secure/operations/shipments",
      headers: { authorization: `Bearer ${rolelessToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  // ==========================================================================
  // 4. POSITIVE AUTHORIZATION SANITY CHECKS (200 OK)
  // ==========================================================================
  it("permits authorized roles on matching domain routes (200)", async () => {
    const financeToken = signToken({
      id: "u-fin-02",
      role: "FINANCE",
      companyId: "c-1",
    });
    const adminToken = signToken({
      id: "u-admin-02",
      role: "ADMIN",
      companyId: "c-1",
    });

    const finRes = await app.inject({
      method: "GET",
      url: "/api/secure/finance/gl-export",
      headers: { authorization: `Bearer ${financeToken}` },
    });
    expect(finRes.statusCode).toBe(200);
    expect(finRes.json()).toMatchObject({
      success: true,
      data: { actor: "u-fin-02", role: "FINANCE" },
    });

    const adminRes = await app.inject({
      method: "POST",
      url: "/api/secure/admin/audit-reset",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.json()).toMatchObject({
      success: true,
      data: { actor: "u-admin-02", role: "ADMIN" },
    });
  });

  // ==========================================================================
  // 5. T-8 ANTI-BYPASS REGRESSION (QUERY-STRING, SUBSTRING & PATH TRAVERSAL)
  // ==========================================================================
  it("blocks query-string, substring, and path-traversal authentication bypass attempts (CWE-287/863)", () => {
    const attackUrls = [
      "/api/shipments?x=/pdf",
      "/api/invoices?bypass=/csv",
      "/api/bookings?format=/xml",
      "/api/finance/ledger?download=-pdf",
      "/api/shipments/pdf-export/admin",
      "/api/auth-admin/secrets",
      "/api/auth/../shipments",
      "/api/auth/%2e%2e/shipments",
      "/api/tracking/..%5cshipments",
      "/api/health%00/admin",
    ];

    for (const url of attackUrls) {
      expect(isPublicRoute(url), `Expected isPublicRoute(${url}) = false`).toBe(
        false,
      );
      expect(
        requiresGlobalApiAuth(url),
        `Expected requiresGlobalApiAuth(${url}) = true`,
      ).toBe(true);
    }

    // Legitimate public routes and terminal export suffixes remain permitted
    expect(requiresGlobalApiAuth("/api/health")).toBe(false);
    expect(requiresGlobalApiAuth("/api/auth/login")).toBe(false);
    expect(requiresGlobalApiAuth("/api/shipments/sh_demo_01/pdf")).toBe(false);
    expect(requiresGlobalApiAuth("/api/air-cargo/awb/awb_01/cargo-xml")).toBe(
      false,
    );
  });

  // ==========================================================================
  // 6. STATIC SECURITY GUARDRAIL REGRESSION (ZERO-INNERHTML / CWE-79)
  // ==========================================================================
  it("enforces AGENTS.md §4 zero-innerHTML policy across all workspace packages", () => {
    const guardScript = path.resolve(
      process.cwd(),
      "scripts",
      "check-zero-innerhtml.mjs",
    );
    const result = spawnSync(process.execPath, [guardScript], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ZERO-INNERHTML SECURITY GUARD PASSED");
  });
});
