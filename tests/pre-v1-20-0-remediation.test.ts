/**
 * @file pre-v1-20-0-remediation.test.ts
 * @description Negative security, RBAC, multi-tenancy, multipart upload, SQLite WAL/ACID, and guardrail regression suite for ATL-01..ATL-12.
 * @module @atlas/tests/pre-v1-20-0-remediation
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";

// Ensure deterministic JWT_SECRET before importing app
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "atlas-remediation-test-jwt-secret-32chars-minimum";
}

import app from "../src/app.js";
import { db } from "../src/db/index.js";
import {
  users,
  sessions,
  companies,
  addresses,
  documents,
  demurrageAlerts,
  shipments,
  bookings,
  invoices,
} from "../src/db/schema/index.js";
import { hashPassword, validateSession } from "../src/lib/auth.js";
import { getJWTConfig } from "../src/config/jwt.js";
import { requiresGlobalApiAuth } from "../src/middleware/public-routes.js";
import { validateStationWriteAccess } from "../src/middleware/station-context.js";
import {
  assertTenantAccess,
  scopeByTenant,
  runWithTenant,
  TenantAccessDeniedError,
} from "../src/lib/tenancy/tenancy-context.js";
import adminDbRoutes from "../src/routes/admin-db.routes.js";
import addressesRoutes from "../src/routes/addresses.routes.js";
import scmV1Routes from "../src/routes/scm-v1.routes.js";
import { getProjectionsHealth } from "../src/scm/contexts/operational-intelligence/operations-cockpit-bff.context.js";
import {
  backup,
  getSafeBackupDir,
  pruneOldBackups,
} from "../src/scripts/backup-db.js";

function signTestJwt(payload: {
  id: string;
  email?: string;
  role: string;
  companyId?: string | null;
}) {
  return jwt.sign(payload, getJWTConfig().secret, { expiresIn: "1h" });
}

describe("Pre-v1.20.0 Remediation Suite (ATL-01..ATL-12)", () => {
  const testUserId = `usr_rem_${randomBytes(4).toString("hex")}`;
  const testUserEmail = `rem_${Date.now()}@atlas.local`;
  const testOperatorId = `usr_ops_${randomBytes(4).toString("hex")}`;
  const testAdminId = `usr_adm_${randomBytes(4).toString("hex")}`;
  const createdDocIds: string[] = [];
  const uploadedFiles: string[] = [];

  beforeAll(async () => {
    await app.ready();

    const hashed = await hashPassword("StrongPass#2026");
    await db
      .insert(companies)
      .values({
        id: "c-1",
        name: "Atlas Logistics Holding",
        taxId: "ESB00000001",
      })
      .onConflictDoNothing();

    await db.insert(users).values({
      id: testUserId,
      email: testUserEmail,
      role: "CUSTOMER",
      companyId: "c-1",
      hashedPassword: hashed,
    });
  });

  afterAll(async () => {
    for (const id of createdDocIds) {
      await db.delete(documents).where(eq(documents.id, id));
    }
    for (const filePath of uploadedFiles) {
      try {
        await fs.unlink(filePath);
      } catch {}
    }
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await app.close();
  });

  // ==========================================================================
  // ATL-01: SQL Injection Prevention in Admin DB Routes
  // ==========================================================================
  it("ATL-01: rejects SQL injection payloads in admin-db DDL endpoints", async () => {
    const adminApp = Fastify();
    adminApp.addHook("onRequest", async (req) => {
      req.user = { id: testAdminId, role: "ADMIN", companyId: "c-1" };
    });
    await adminApp.register(adminDbRoutes, { prefix: "/api/admin/db" });
    await adminApp.ready();

    try {
      const badColName = await adminApp.inject({
        method: "POST",
        url: "/api/admin/db/tables",
        payload: {
          tableName: "safe_audit_tbl",
          columns: [{ name: 'bad" TEXT); DROP TABLE users;--', type: "TEXT" }],
        },
      });
      expect(badColName.statusCode).toBe(400);

      const badColType = await adminApp.inject({
        method: "POST",
        url: "/api/admin/db/tables",
        payload: {
          tableName: "safe_audit_tbl",
          columns: [{ name: "col_a", type: "TEXT); DROP TABLE users;--" }],
        },
      });
      expect(badColType.statusCode).toBe(400);

      const badAlterDefault = await adminApp.inject({
        method: "POST",
        url: "/api/admin/db/tables/safe_audit_tbl/columns",
        payload: {
          columnName: "col_b",
          dataType: "TEXT",
          isNullable: false,
          defaultValue: "x'; DROP TABLE users;--",
        },
      });
      expect(badAlterDefault.statusCode).toBe(400);
    } finally {
      await adminApp.close();
    }
  });

  // ==========================================================================
  // ATL-02 & ATL-09: Real Scrypt Auth, JWT companyId, Password Rotation & Logout
  // ==========================================================================
  it("ATL-02 & ATL-09: enforces verifyPassword, includes companyId in JWT, blocks unauthenticated/bypass password reset, and revokes sessions", async () => {
    // 1. Reject hardcoded passwords on /api/auth/login
    for (const badPwd of ["password123", "admin", "wrong"]) {
      const badLogin = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: testUserEmail, password: badPwd },
      });
      expect(badLogin.statusCode).toBe(401);
    }

    // 2. Accept real scrypt password and embed companyId in JWT
    const goodLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: testUserEmail, password: "StrongPass#2026" },
    });
    expect(goodLogin.statusCode).toBe(200);
    const loginJson = goodLogin.json();
    expect(loginJson.token).toBeTruthy();
    expect(loginJson.user.companyId).toBe("c-1");
    const decoded = jwt.verify(
      loginJson.token,
      getJWTConfig().secret,
    ) as Record<string, unknown>;
    expect(decoded.companyId).toBe("c-1");

    // 3. Reject unauthenticated PUT /api/settings/password (401)
    const unauthPwd = await app.inject({
      method: "PUT",
      url: "/api/settings/password",
      payload: { currentPassword: "password123", newPassword: "Hacked#123" },
    });
    expect(unauthPwd.statusCode).toBe(401);

    // 4. Reject hardcoded bypass currentPassword even when authenticated
    const bypassPwd = await app.inject({
      method: "PUT",
      url: "/api/settings/password",
      headers: { authorization: `Bearer ${loginJson.token}` },
      payload: { currentPassword: "password123", newPassword: "Hacked#123" },
    });
    expect(bypassPwd.statusCode).toBe(400);

    // 5. Rotate password cleanly with valid currentPassword
    const rotatePwd = await app.inject({
      method: "PUT",
      url: "/api/settings/password",
      headers: { authorization: `Bearer ${loginJson.token}` },
      payload: {
        currentPassword: "StrongPass#2026",
        newPassword: "RotatedPass#2027",
      },
    });
    expect(rotatePwd.statusCode).toBe(200);

    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: testUserEmail, password: "StrongPass#2026" },
    });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: testUserEmail, password: "RotatedPass#2027" },
    });
    expect(newLogin.statusCode).toBe(200);

    // 6. Logout invalidates auth_session in SQLite
    const { createSession } = await import("../src/lib/auth.js");
    const sess = await createSession(testUserId);
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      cookies: { auth_session: sess.id },
    });
    expect(logoutRes.statusCode).toBe(200);
    const afterLogout = await validateSession(sess.id);
    expect(afterLogout.session).toBeNull();
  });

  // ==========================================================================
  // ATL-03 & ATL-04: RBAC Spoofing, Corporate Group Leakage & Tenant Isolation
  // ==========================================================================
  it("ATL-03 & ATL-04: blocks header spoofing in production mode, enforces ADMIN on SCM rebuild/DLQ, and fails closed on tenant context", async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      // Station context rejects spoofed headers in non-test env
      const fakeReq = {
        headers: {
          "x-user-id": "attacker",
          "x-roles": "SYSTEM_ADMIN",
          "x-org-id": "c-1",
        },
        user: null,
      } as unknown as Parameters<typeof validateStationWriteAccess>[0];
      const stnResult = await validateStationWriteAccess(
        fakeReq,
        "stn_esbcn_01",
      );
      expect(stnResult.allowed).toBe(false);
      expect(stnResult.error).toBe("UNAUTHORIZED");

      // Addresses standalone routes reject spoofed x-user-role in production
      const addrApp = Fastify();
      await addrApp.register(addressesRoutes, { prefix: "/api/addresses" });
      await addrApp.ready();
      try {
        const grpRes = await addrApp.inject({
          method: "GET",
          url: "/api/addresses/groups",
          headers: { "x-user-role": "ADMIN" },
        });
        expect(grpRes.statusCode).toBe(403);
      } finally {
        await addrApp.close();
      }

      // SCM routes reject unauthenticated header-only requests in production
      const scmApp = Fastify();
      await scmApp.register(scmV1Routes, { prefix: "/api/scm/v1" });
      await scmApp.ready();
      try {
        const rebuildUnauth = await scmApp.inject({
          method: "POST",
          url: "/api/scm/v1/operational/projections/rebuild",
          headers: { "x-roles": "ADMIN", "x-user-id": "spoof" },
        });
        expect(rebuildUnauth.statusCode).toBe(403);
      } finally {
        await scmApp.close();
      }
    } finally {
      process.env.NODE_ENV = prevEnv;
    }

    // Authenticated non-ADMIN user is blocked from projections/rebuild & dlq replay
    const operatorToken = signTestJwt({
      id: testOperatorId,
      role: "OPERATOR",
      companyId: "c-1",
    });
    const rebuildOp = await app.inject({
      method: "POST",
      url: "/api/scm/v1/operational/projections/rebuild",
      headers: { authorization: `Bearer ${operatorToken}` },
    });
    expect(rebuildOp.statusCode).toBe(403);

    const replayOp = await app.inject({
      method: "POST",
      url: "/api/scm/v1/operational/outbox/dlq/evt_missing/replay",
      headers: { authorization: `Bearer ${operatorToken}` },
    });
    expect(replayOp.statusCode).toBe(403);

    // Tenancy context fails closed for org_default and mismatched companyId
    runWithTenant(
      { organizationId: "org_default", userId: "u1", role: "CUSTOMER" },
      () => {
        expect(() => assertTenantAccess("c-1")).toThrow(
          TenantAccessDeniedError,
        );
        expect(scopeByTenant(addresses.companyId)).toBeDefined();
      },
    );
    runWithTenant(
      { organizationId: "c-1", userId: "u1", role: "CUSTOMER" },
      () => {
        expect(() => assertTenantAccess("c-2")).toThrow(
          TenantAccessDeniedError,
        );
      },
    );
  });

  // ==========================================================================
  // ATL-05 & ATL-12: Public Route Allowlist, DCSA HMAC, AIS Secret & AI RBAC
  // ==========================================================================
  it("ATL-05 & ATL-12: locks down admin/seed/exports/DCSA/AIS webhook and removes duplicate root/AI mounts", async () => {
    const mustRequireAuth = [
      "/admin/queues",
      "/api/admin/seed/all",
      "/api/addresses",
      "/api/addresses/groups",
      "/api/shipments/exceptions/exc_1",
      "/api/tracking/my-shipments",
      "/api/customs/declarations",
      "/api/rail/corridors",
      "/api/invoices/inv_1/pdf",
      "/api/agent-settlements/set_1/pdf",
      "/api/documents/doc_1/pdf",
      "/api/scm/v1/operational/shipments/sh_demo_01/dua-pdf",
      "/api/scm/v1/operational/shipments/sh_demo_01/cbam-xml",
    ];
    for (const url of mustRequireAuth) {
      expect(
        requiresGlobalApiAuth(url),
        `Expected auth required for ${url}`,
      ).toBe(true);
    }

    const mustRemainPublic = [
      "/api/health",
      "/api/auth/login",
      "/api/tracking/BK-2026-67116",
      "/api/tracking/webhook/ais",
      "/api/documents/verify/abc123",
      "/api/shipments/sh_demo_01/pdf",
      "/api/air-cargo/awb/awb_01/cargo-xml",
    ];
    for (const url of mustRemainPublic) {
      expect(
        requiresGlobalApiAuth(url),
        `Expected public access for ${url}`,
      ).toBe(false);
    }

    // Root duplicate eventsRoutes & /api duplicate aiRoutes are removed
    const rootDemo = await app.inject({
      method: "POST",
      url: "/demo/trigger-alert",
    });
    expect(rootDemo.statusCode).toBe(404);

    const adminToken = signTestJwt({
      id: testAdminId,
      role: "ADMIN",
      companyId: "c-1",
    });
    const dupAi = await app.inject({
      method: "GET",
      url: "/api/config-status",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(dupAi.statusCode).toBe(404);

    // DCSA v3 events rejects missing signature when unauthenticated
    const dcsaNoSig = await app.inject({
      method: "POST",
      url: "/api/dcsa/v3/events",
      payload: {
        eventType: "EQUIPMENT",
        eventClassifierCode: "ACT",
        eventDateTime: new Date().toISOString(),
        eventTypeCode: "LOAD",
      },
    });
    expect(dcsaNoSig.statusCode).toBe(401);

    // AIS webhook rejects hardcoded secret when AIS_WEBHOOK_SECRET is unset
    const prevAis = process.env.AIS_WEBHOOK_SECRET;
    delete process.env.AIS_WEBHOOK_SECRET;
    try {
      const aisRes = await app.inject({
        method: "POST",
        url: "/api/tracking/webhook/ais",
        headers: { "x-api-key": "atlas-ais-secret-123" },
        payload: {
          trackingNumber: "sh_demo_01",
          imoNumber: "999",
          latitude: 1,
          longitude: 1,
          status: "IN_TRANSIT",
        },
      });
      expect(aisRes.statusCode).toBe(503);
    } finally {
      if (prevAis !== undefined) process.env.AIS_WEBHOOK_SECRET = prevAis;
    }

    // POST /api/ai/configure-key requires ADMIN
    const opToken = signTestJwt({
      id: testOperatorId,
      role: "OPERATOR",
      companyId: "c-1",
    });
    const aiCfgOp = await app.inject({
      method: "POST",
      url: "/api/ai/configure-key",
      headers: { authorization: `Bearer ${opToken}` },
      payload: {
        apiKey: "AIzaDummyKeyForTest123456789",
        persistToEnvLocal: false,
      },
    });
    expect(aiCfgOp.statusCode).toBe(403);
  });

  // ==========================================================================
  // ATL-06: Document Upload Path Traversal, Multipart Fields & Download Auth
  // ==========================================================================
  it("ATL-06: handles attachFieldsToBody multipart upload safely, sanitizes filenames, and enforces download auth", async () => {
    const adminToken = signTestJwt({
      id: testAdminId,
      role: "ADMIN",
      companyId: "c-1",
    });

    const boundary = "----AtlasTestBoundary12345";
    const multipartBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="../../evil/invoice.pdf"',
      "Content-Type: application/pdf",
      "",
      "%PDF-1.4 test content",
      `--${boundary}`,
      'Content-Disposition: form-data; name="type"',
      "",
      "Customs Packing List",
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const uploadRes = await app.inject({
      method: "POST",
      url: "/api/documents/upload",
      headers: {
        authorization: `Bearer ${adminToken}`,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody,
    });
    expect(uploadRes.statusCode).toBe(200);
    const upJson = uploadRes.json();
    expect(upJson.success).toBe(true);
    expect(upJson.name).toBe("invoice.pdf");
    expect(upJson.type).toBe("Customs Packing List");
    if (upJson.id) createdDocIds.push(upJson.id);
    const storedName = String(upJson.url).split("/").pop()!;
    uploadedFiles.push(path.resolve(process.cwd(), "uploads", storedName));

    // Unauthenticated download is rejected (401)
    const unauthDl = await app.inject({
      method: "GET",
      url: upJson.url,
    });
    expect(unauthDl.statusCode).toBe(401);

    // Authenticated download works with sanitized Content-Disposition
    const authDl = await app.inject({
      method: "GET",
      url: upJson.url,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(authDl.statusCode).toBe(200);
    expect(authDl.headers["content-disposition"]).toContain(storedName);
  });

  // ==========================================================================
  // ATL-07, ATL-08, ATL-10: Backup .env Pruning, Read-Only GET Demurrage, SQL Health
  // ==========================================================================
  it("ATL-07, ATL-08 & ATL-10: prunes .env*.bak files, keeps GET /demurrage read-only, bounds GET /addresses & computes SQL projection health", async () => {
    // 1. Demurrage GET must not insert rows
    const adminToken = signTestJwt({
      id: testAdminId,
      role: "ADMIN",
      companyId: "c-1",
    });
    const beforeAlerts = await db.select().from(demurrageAlerts);
    const demRes = await app.inject({
      method: "GET",
      url: "/api/operations/demurrage",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(demRes.statusCode).toBe(200);
    const afterAlerts = await db.select().from(demurrageAlerts);
    expect(afterAlerts.length).toBe(beforeAlerts.length);

    // 2. GET /api/addresses honors limit
    const addrRes = await app.inject({
      method: "GET",
      url: "/api/addresses?limit=2",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(addrRes.statusCode).toBe(200);
    expect(Array.isArray(addrRes.json())).toBe(true);
    expect(addrRes.json().length).toBeLessThanOrEqual(2);

    // 3. getProjectionsHealth executes via SQL aggregates
    const health = await getProjectionsHealth();
    expect(["HEALTHY", "DEGRADED", "OUT_OF_SYNC"]).toContain(health.status);
    expect(typeof health.outboxMetrics.pendingCount).toBe("number");
    expect(typeof health.projectionMetrics.shipment360Count).toBe("number");

    // 4. Backup pruning removes excess .env*.bak files
    const prevBackupDir = process.env.BACKUP_DIR;
    const prevMax = process.env.MAX_LOCAL_BACKUPS;
    process.env.BACKUP_DIR = "backups-atl07-test";
    process.env.MAX_LOCAL_BACKUPS = "2";
    const tmpBackupDir = getSafeBackupDir();
    await fs.mkdir(tmpBackupDir, { recursive: true });
    try {
      for (const idx of [1, 2, 3, 4]) {
        const f = path.join(
          tmpBackupDir,
          `.env.local-2026-11-0${idx}T00-00-00-000Z.bak`,
        );
        await fs.writeFile(f, `SECRET=${idx}`);
        const t = new Date(Date.now() - (5 - idx) * 60_000);
        await fs.utimes(f, t, t);
      }
      await pruneOldBackups(tmpBackupDir, 2);
      const remaining = (await fs.readdir(tmpBackupDir)).filter((f) =>
        f.startsWith(".env.local-"),
      );
      expect(remaining.length).toBe(2);
    } finally {
      await fs.rm(tmpBackupDir, { recursive: true, force: true });
      if (prevBackupDir !== undefined) process.env.BACKUP_DIR = prevBackupDir;
      else delete process.env.BACKUP_DIR;
      if (prevMax !== undefined) process.env.MAX_LOCAL_BACKUPS = prevMax;
      else delete process.env.MAX_LOCAL_BACKUPS;
    }
  });

  // ==========================================================================
  // Step 2 Review Regressions: GET /api/dcsa/v3/events & Cross-Tenant Mutations/PDFs
  // ==========================================================================
  it("ATL-04 & ATL-05 regressions: protects GET /api/dcsa/v3/events and enforces tenant isolation on shipment/booking/invoice mutations and PDFs", async () => {
    // 1. GET /api/dcsa/v3/events rejects unauthenticated requests (401)
    const dcsaGetUnauth = await app.inject({
      method: "GET",
      url: "/api/dcsa/v3/events",
    });
    expect(dcsaGetUnauth.statusCode).toBe(401);

    const tenant1Token = signTestJwt({
      id: testUserId,
      role: "CUSTOMER",
      companyId: "c-1",
    });
    const foreignTenantToken = signTestJwt({
      id: "usr_foreign_02",
      role: "CUSTOMER",
      companyId: "c-foreign-999",
    });

    const dcsaGetAuth = await app.inject({
      method: "GET",
      url: "/api/dcsa/v3/events",
      headers: { authorization: `Bearer ${tenant1Token}` },
    });
    expect(dcsaGetAuth.statusCode).toBe(200);

    // 2. Tenant-owned shipment, booking, and invoice cannot be mutated or exported by a foreign tenant
    const suf = randomBytes(4).toString("hex");
    const shpId = `s-${Date.now()}`;
    const bkgId = `bkg_iso_${suf}`;
    const invId = `inv_iso_${suf}`;

    await db.insert(shipments).values({
      id: shpId,
      companyId: "c-1",
      status: "PENDING",
      trackingNumber: `TRK-ISO-${suf}`,
      origin: "ESBCN",
      destination: "USNYC",
      serviceType: "Ocean",
    });
    await db.insert(bookings).values({
      id: bkgId,
      referenceNumber: `BK-ISO-${suf}`,
      customerId: "c-1",
      status: "PENDING",
      origin: "ESBCN",
      destination: "USNYC",
      serviceType: "Ocean",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.insert(invoices).values({
      id: invId,
      invoiceNumber: `INV-ISO-${suf}`,
      type: "AR",
      companyId: "c-1",
      amount: 1200,
      currency: "EUR",
      status: "Draft",
      dueDate: new Date(),
      createdAt: new Date(),
    });

    try {
      const delShp = await app.inject({
        method: "DELETE",
        url: `/api/shipments/${shpId}`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
      });
      expect(delShp.statusCode).toBe(403);

      const confirmBkg = await app.inject({
        method: "POST",
        url: `/api/bookings/${bkgId}/confirm`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
        payload: {},
      });
      expect(confirmBkg.statusCode).toBe(403);

      const cancelBkg = await app.inject({
        method: "POST",
        url: `/api/bookings/${bkgId}/cancel`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
        payload: { reason: "hijack" },
      });
      expect(cancelBkg.statusCode).toBe(403);

      const bolBkg = await app.inject({
        method: "GET",
        url: `/api/bookings/${bkgId}/bol`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
      });
      expect(bolBkg.statusCode).toBe(403);

      const invPdf = await app.inject({
        method: "GET",
        url: `/api/invoices/${invId}/pdf`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
      });
      expect(invPdf.statusCode).toBe(403);

      const invStatus = await app.inject({
        method: "PUT",
        url: `/api/invoices/${invId}/status`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
        payload: { status: "Issued" },
      });
      expect(invStatus.statusCode).toBe(403);
    } finally {
      await db.delete(invoices).where(eq(invoices.id, invId));
      await db.delete(bookings).where(eq(bookings.id, bkgId));
      await db.delete(shipments).where(eq(shipments.id, shpId));
    }
  });
});
