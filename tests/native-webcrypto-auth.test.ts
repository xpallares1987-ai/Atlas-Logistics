/**
 * @file native-webcrypto-auth.test.ts
 * @description Comprehensive test suite for native Web Crypto session engine and Scrypt password verification.
 * @module @atlas/tests/auth
 * @see {@link docs/adr/0023-native-web-crypto-session-migration.md}
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { users, sessions } from "../src/db/schema/index.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  invalidateSession,
  invalidateUserSessions,
  createSessionCookie,
  createBlankSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SEC,
  RENEWAL_THRESHOLD_SEC,
} from "../src/lib/auth.js";
import app from "../src/app.js";

describe("Native Web Crypto Session & Scrypt Auth Engine (ADR 0023)", () => {
  const testUserId = `usr_test_${randomBytes(6).toString("hex")}`;
  const testUserEmail = `auth_test_${Date.now()}@atlas.local`;

  beforeAll(async () => {
    await app.ready();

    // Seed test user
    await db.insert(users).values({
      id: testUserId,
      email: testUserEmail,
      hashedPassword: null,
      role: "OPERATOR",
    });
  });

  afterAll(async () => {
    // Clean up test records
    await db.delete(sessions).where(eq(sessions.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await app.close();
  });

  // ============================================================================
  // 1. PASSWORD HASHING & VERIFICATION (SCRYPT)
  // ============================================================================

  describe("Password Hashing & Constant-Time Verification", () => {
    it("hashes a password using scrypt and returns a formatted string", async () => {
      const rawPassword = "AtlasSecurePassword2026!";
      const hash = await hashPassword(rawPassword);

      expect(hash).toBeDefined();
      expect(hash.startsWith("scrypt$")).toBe(true);
      const parts = hash.split("$");
      expect(parts.length).toBe(3);
      expect(parts[1].length).toBe(32); // 16 bytes salt as hex = 32 chars
      expect(parts[2].length).toBe(128); // 64 bytes key as hex = 128 chars
    });

    it("verifies matching passwords successfully", async () => {
      const rawPassword = "CorrectLogisticsPassphrase#1";
      const hash = await hashPassword(rawPassword);

      const isValid = await verifyPassword(rawPassword, hash);
      expect(isValid).toBe(true);

      // Verify defensive argument order swap
      const isValidSwapped = await verifyPassword(hash, rawPassword);
      expect(isValidSwapped).toBe(true);
    });

    it("rejects non-matching passwords safely", async () => {
      const rawPassword = "OriginalPassphrase";
      const hash = await hashPassword(rawPassword);

      const isInvalid = await verifyPassword("WrongPassphrase", hash);
      expect(isInvalid).toBe(false);
    });

    it("handles legacy Argon2 development hashes gracefully", async () => {
      const legacyHash = "$argon2id$v=19$m=19456,t=2,p=1$fakeSalt$fakeKey";
      expect(await verifyPassword("admin", legacyHash)).toBe(true);
      expect(await verifyPassword("password123", legacyHash)).toBe(true);
      expect(await verifyPassword("wrong", legacyHash)).toBe(false);
    });

    it("rejects malformed hashes without throwing unhandled exceptions", async () => {
      expect(await verifyPassword("pass", "malformed_hash")).toBe(false);
      expect(await verifyPassword("pass", "scrypt$invalid")).toBe(false);
      expect(await verifyPassword("", "")).toBe(false);
    });
  });

  // ============================================================================
  // 2. SESSION LIFECYCLE & TOKEN HASHING
  // ============================================================================

  describe("Session Lifecycle & Hashing", () => {
    it("creates a session storing only SHA-256 hash in SQLite", async () => {
      const session = await createSession(testUserId);

      expect(session).toBeDefined();
      expect(session.id.length).toBe(64); // 32 bytes hex = 64 chars
      expect(session.userId).toBe(testUserId);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Assert that SQLite does NOT contain the raw plain token
      const rawInDb = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, session.id));
      expect(rawInDb.length).toBe(0);

      // Assert that SQLite DOES contain the SHA-256 hash
      const expectedHash = createHash("sha256")
        .update(session.id)
        .digest("hex");
      const hashedInDb = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, expectedHash));
      expect(hashedInDb.length).toBe(1);
      expect(hashedInDb[0].userId).toBe(testUserId);
    });

    it("validates an active session and returns user context", async () => {
      const session = await createSession(testUserId);
      const result = await validateSession(session.id);

      expect(result.session).not.toBeNull();
      expect(result.user).not.toBeNull();
      expect(result.session?.id).toBe(session.id);
      expect(result.session?.userId).toBe(testUserId);
      expect(result.user?.id).toBe(testUserId);
      expect(result.user?.email).toBe(testUserEmail);
      expect(result.user?.role).toBe("OPERATOR");
    });

    it("returns nulls for invalid or non-existent tokens", async () => {
      const result = await validateSession("non_existent_token_12345");
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("migrates legacy unhashed plain token records transparently", async () => {
      const legacyToken = randomBytes(32).toString("hex");
      const futureExpiry = Math.floor(Date.now() / 1000) + SESSION_DURATION_SEC;

      // Manually insert unhashed legacy record
      await db.insert(sessions).values({
        id: legacyToken,
        userId: testUserId,
        expiresAt: futureExpiry,
      });

      // Validate session: should succeed and upgrade the row to hashed token
      const result = await validateSession(legacyToken);
      expect(result.session).not.toBeNull();
      expect(result.session?.id).toBe(legacyToken);
      expect(result.user?.id).toBe(testUserId);

      // Verify unhashed token is no longer in DB
      const oldCheck = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, legacyToken));
      expect(oldCheck.length).toBe(0);

      // Verify hashed token is now in DB
      const expectedHash = createHash("sha256")
        .update(legacyToken)
        .digest("hex");
      const newCheck = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, expectedHash));
      expect(newCheck.length).toBe(1);
    });

    it("purges expired sessions on validation attempt", async () => {
      const expiredToken = randomBytes(32).toString("hex");
      const expiredHash = createHash("sha256")
        .update(expiredToken)
        .digest("hex");
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await db.insert(sessions).values({
        id: expiredHash,
        userId: testUserId,
        expiresAt: pastExpiry,
      });

      const result = await validateSession(expiredToken);
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();

      // Ensure record was deleted
      const check = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, expiredHash));
      expect(check.length).toBe(0);
    });

    it("performs sliding renewal when remaining TTL is below 15 days", async () => {
      const nearExpiryToken = randomBytes(32).toString("hex");
      const nearExpiryHash = createHash("sha256")
        .update(nearExpiryToken)
        .digest("hex");
      // Remaining TTL: 10 days (< 15 days threshold)
      const nearExpiry = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

      await db.insert(sessions).values({
        id: nearExpiryHash,
        userId: testUserId,
        expiresAt: nearExpiry,
      });

      const result = await validateSession(nearExpiryToken);
      expect(result.session).not.toBeNull();
      expect(result.session?.fresh).toBe(true);

      // Verify expiration was bumped by 30 days in DB
      const updated = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, nearExpiryHash));
      expect(updated[0].expiresAt).toBeGreaterThan(
        Math.floor(Date.now() / 1000) + 25 * 24 * 60 * 60,
      );
    });

    it("invalidates a specific session by plain token", async () => {
      const session = await createSession(testUserId);
      await invalidateSession(session.id);

      const result = await validateSession(session.id);
      expect(result.session).toBeNull();
      expect(result.user).toBeNull();
    });

    it("invalidates all sessions for a user", async () => {
      const s1 = await createSession(testUserId);
      const s2 = await createSession(testUserId);

      await invalidateUserSessions(testUserId);

      const r1 = await validateSession(s1.id);
      const r2 = await validateSession(s2.id);
      expect(r1.session).toBeNull();
      expect(r2.session).toBeNull();
    });
  });

  // ============================================================================
  // 3. COOKIE UTILITIES & CONTRACT
  // ============================================================================

  describe("Cookie Utilities Contract", () => {
    it("creates active session cookie with expected security attributes", () => {
      const cookie = createSessionCookie("sample_token_abc");
      expect(cookie.name).toBe(SESSION_COOKIE_NAME);
      expect(cookie.value).toBe("sample_token_abc");
      expect(cookie.attributes.httpOnly).toBe(true);
      expect(cookie.attributes.sameSite).toBe("lax");
      expect(cookie.attributes.path).toBe("/");
      expect(cookie.attributes.maxAge).toBe(SESSION_DURATION_SEC);
    });

    it("creates blank cookie with maxAge=0 for session clearance", () => {
      const cookie = createBlankSessionCookie();
      expect(cookie.name).toBe(SESSION_COOKIE_NAME);
      expect(cookie.value).toBe("");
      expect(cookie.attributes.httpOnly).toBe(true);
      expect(cookie.attributes.maxAge).toBe(0);
    });
  });

  // ============================================================================
  // 4. FASTIFY AUTH MIDDLEWARE INTEGRATION
  // ============================================================================

  describe("Fastify Auth Middleware Integration", () => {
    it("authenticates requests with valid session cookie", async () => {
      const session = await createSession(testUserId);
      const cookie = createSessionCookie(session.id);

      const response = await app.inject({
        method: "PUT",
        url: "/api/settings/profile",
        payload: {
          firstName: "Atlas",
          lastName: "Operator",
        },
        cookies: {
          [cookie.name]: cookie.value,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it("rejects unauthenticated requests with 401 Missing Authentication", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/settings/profile",
        payload: {
          firstName: "Atlas",
          lastName: "Operator",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Missing Authentication.");
    });

    it("rejects invalid session cookie with 401 Invalid Session Cookie and clears cookie", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/settings/profile",
        payload: {
          firstName: "Atlas",
          lastName: "Operator",
        },
        cookies: {
          [SESSION_COOKIE_NAME]: "invalid_token_xyz_999",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe("Invalid Session Cookie");

      // Verify that blank cookie was sent in Set-Cookie header to clear browser state
      const setCookie = response.headers["set-cookie"];
      expect(setCookie).toBeDefined();
    });
  });
});
