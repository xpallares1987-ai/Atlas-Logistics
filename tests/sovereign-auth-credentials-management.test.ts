/**
 * @file sovereign-auth-credentials-management.test.ts
 * @description Integration test suite for Sovereign Credentials Management (Passkeys list/revoke, TOTP disable, QR SVG, audit logs).
 * @module @atlas/tests/auth-credentials-management
 * @see {@link docs/adr/0031-sovereign-native-identity-and-authentication-engine.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../src/db/index.js";
import {
  users,
  userPasskeys,
  userTotpCredentials,
  authAuditLogs,
} from "../src/db/schema/index.js";
import {
  hashPassword,
  createSession,
  createSessionCookie,
} from "../src/lib/auth.js";
import { getJWTConfig } from "../src/config/jwt.js";
import app from "../src/app.js";

describe("Sovereign Credentials Management & Security API (ADR 0031 Phase 4)", () => {
  const testUserId = `usr_cred_${randomBytes(6).toString("hex")}`;
  const testUserEmail = `credentials_test_${Date.now()}@atlas.local`;
  const plainPassword = "SovereignPasskey123!";
  let authToken = "";
  let sessionCookieHeader = "";

  beforeAll(async () => {
    await app.ready();

    const hashedPassword = await hashPassword(plainPassword);

    // Seed test user with known password
    await db.insert(users).values({
      id: testUserId,
      email: testUserEmail,
      hashedPassword,
      role: "OPERATOR",
    });

    const session = await createSession(testUserId);
    const cookie = createSessionCookie(session.id);
    sessionCookieHeader = `${cookie.name}=${cookie.value}`;

    const { secret } = getJWTConfig();
    authToken = jwt.sign(
      {
        id: testUserId,
        email: testUserEmail,
        role: "OPERATOR",
        companyId: null,
      },
      secret,
      { expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    // Clean up test records
    await db.delete(userPasskeys).where(eq(userPasskeys.userId, testUserId));
    await db
      .delete(userTotpCredentials)
      .where(eq(userTotpCredentials.userId, testUserId));
    await db.delete(authAuditLogs).where(eq(authAuditLogs.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  // ==========================================================================
  // 1. PASSKEYS LISTING & REVOCATION
  // ==========================================================================
  describe("WebAuthn Passkeys Management", () => {
    const testPasskeyId = `pk_${randomBytes(8).toString("hex")}`;
    const testCredId = Buffer.from(randomBytes(16)).toString("base64url");

    beforeAll(async () => {
      // Seed a test passkey
      await db.insert(userPasskeys).values({
        id: testPasskeyId,
        userId: testUserId,
        credentialId: testCredId,
        publicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtestpublickey",
        counter: 1,
        deviceType: "singleDevice",
        name: "YubiKey 5 NFC (Hardware Token)",
      });
    });

    it("GET /api/auth/passkeys returns list of registered credentials", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/passkeys",
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.devices)).toBe(true);
      expect(data.devices.length).toBeGreaterThanOrEqual(1);

      const found = data.devices.find(
        (d: { id: string }) => d.id === testPasskeyId,
      );
      expect(found).toBeDefined();
      expect(found.deviceName).toBe("YubiKey 5 NFC (Hardware Token)");
      expect(found.deviceType).toBe("singleDevice");
    });

    it("DELETE /api/auth/passkeys/:id rejects invalid step-up password", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/auth/passkeys/${testPasskeyId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
        payload: {
          password: "WrongPassword999!",
        },
      });

      expect(res.statusCode).toBe(401);
      const data = res.json();
      expect(data.error).toContain("Invalid password");
    });

    it("DELETE /api/auth/passkeys/:id revokes passkey with valid password and writes audit trail", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/auth/passkeys/${testPasskeyId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
        payload: {
          password: plainPassword,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);

      // Verify passkey deleted from DB
      const remaining = await db
        .select()
        .from(userPasskeys)
        .where(eq(userPasskeys.id, testPasskeyId));
      expect(remaining.length).toBe(0);

      // Verify PASSKEY_REVOKED audit log written
      const auditRows = await db
        .select()
        .from(authAuditLogs)
        .where(eq(authAuditLogs.userId, testUserId));
      const revokeLog = auditRows.find(
        (l) => l.eventType === "PASSKEY_REVOKED",
      );
      expect(revokeLog).toBeDefined();
      expect(revokeLog?.status).toBe("SUCCESS");
    });

    it("DELETE /api/auth/passkeys/:id returns 404 for non-existent passkey", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/auth/passkeys/pk_non_existent",
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
        payload: {
          password: plainPassword,
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // 2. TOTP MFA SETUP WITH QR SVG & DEACTIVATION
  // ==========================================================================
  describe("TOTP MFA Setup & Deactivation", () => {
    it("POST /api/auth/totp/setup returns secret, otpauthUri, backupCodes and qrSvgDataUrl", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/totp/setup",
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(data.secret).toBeDefined();
      expect(data.otpauthUri).toContain("otpauth://totp/");
      expect(data.qrSvgDataUrl).toBeDefined();
      expect(data.qrSvgDataUrl).toContain("data:image/svg+xml");
      expect(Array.isArray(data.backupCodes)).toBe(true);
      expect(data.backupCodes.length).toBe(8);
    });

    it("DELETE /api/auth/totp rejects with 401 when step-up password is wrong", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/auth/totp",
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
        payload: {
          password: "InvalidPassword!",
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it("DELETE /api/auth/totp disables MFA with correct password and writes audit trail", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/api/auth/totp",
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
        payload: {
          password: plainPassword,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);

      // Verify MFA disabled in DB
      const totpRows = await db
        .select()
        .from(userTotpCredentials)
        .where(eq(userTotpCredentials.userId, testUserId));
      expect(totpRows[0]?.enabled).toBe(false);

      // Verify MFA_DISABLED audit log
      const auditRows = await db
        .select()
        .from(authAuditLogs)
        .where(eq(authAuditLogs.userId, testUserId));
      const disableLog = auditRows.find((l) => l.eventType === "MFA_DISABLED");
      expect(disableLog).toBeDefined();
      expect(disableLog?.status).toBe("SUCCESS");
    });
  });

  // ==========================================================================
  // 3. SECURITY AUDIT LOGS INTROSPECTION
  // ==========================================================================
  describe("Security Audit Logs Introspection", () => {
    it("GET /api/auth/audit-logs returns recent security events for user", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/auth/audit-logs",
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: sessionCookieHeader,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.logs.length).toBeGreaterThanOrEqual(2);

      const eventTypes = data.logs.map(
        (l: { eventType: string }) => l.eventType,
      );
      expect(eventTypes).toContain("PASSKEY_REVOKED");
      expect(eventTypes).toContain("MFA_DISABLED");
    });
  });
});
