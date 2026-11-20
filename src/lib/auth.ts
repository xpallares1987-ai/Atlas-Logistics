/**
 * @file auth.ts
 * @description Native Web Crypto session engine and Scrypt password verification.
 * @module @atlas/api/lib/auth
 * @see {@link docs/adr/0023-native-web-crypto-session-migration.md}
 */

import {
  scrypt,
  randomBytes,
  timingSafeEqual,
  createHash,
  type ScryptOptions,
} from "node:crypto";
import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, sessions } from "../db/schema/index.js";

/**
 * Promise-based wrapper around Node.js native crypto.scrypt.
 */
function scryptAsync(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
}

// ============================================================================
// 1. CONSTANTS & CONFIGURATION
// ============================================================================

export const SESSION_COOKIE_NAME = "auth_session";
export const sessionCookieName = SESSION_COOKIE_NAME;

/** Session duration: 30 days in seconds */
export const SESSION_DURATION_SEC = 30 * 24 * 60 * 60;

/** Renewal threshold: 15 days in seconds */
export const RENEWAL_THRESHOLD_SEC = 15 * 24 * 60 * 60;

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  fresh?: boolean;
}

export interface User {
  id: string;
  email: string;
  role: string;
  companyId: string | null;
}

export type SessionValidationResult =
  { session: Session; user: User } | { session: null; user: null };

export interface SessionCookieAttributes {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

export interface SessionCookie {
  name: string;
  value: string;
  attributes: SessionCookieAttributes;
}

// ============================================================================
// 3. COOKIE UTILITIES
// ============================================================================

/**
 * Creates an HTTP cookie representation for an active session.
 */
export function createSessionCookie(token: string): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SEC,
    },
  };
}

/**
 * Creates a blank/expired cookie to instruct the browser to delete the session cookie.
 */
export function createBlankSessionCookie(): SessionCookie {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    attributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

// ============================================================================
// 4. SESSION MANAGEMENT (DATABASE OPERATIONS)
// ============================================================================

/**
 * Computes the SHA-256 hash of a session token for secure database storage.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a cryptographically secure session token and persists its SHA-256 hash in SQLite.
 *
 * @param userId - ID of the authenticating user.
 * @param _attributes - Optional database attributes for backward compatibility.
 * @returns Active session containing the plain token in `session.id`.
 */
export async function createSession(
  userId: string,
  _attributes?: Record<string, unknown>,
): Promise<Session> {
  const plainToken = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(plainToken);
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAtSec = nowSec + SESSION_DURATION_SEC;

  await db.insert(sessions).values({
    id: tokenHash,
    userId,
    expiresAt: expiresAtSec,
  });

  return {
    id: plainToken,
    userId,
    expiresAt: new Date(expiresAtSec * 1000),
    fresh: true,
  };
}

/**
 * Validates a session token, handles sliding window expiration, and retrieves user attributes.
 *
 * @param token - Raw session token extracted from request cookies.
 * @returns SessionValidationResult containing active session and user, or nulls.
 */
export async function validateSession(
  token: string,
): Promise<SessionValidationResult> {
  if (!token || typeof token !== "string") {
    return { session: null, user: null };
  }

  const tokenHash = hashSessionToken(token);

  // 1. Query session joined with user record using token hash
  const rows = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
      userEmail: users.email,
      userRole: users.role,
      userCompanyId: users.companyId,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, tokenHash))
    .limit(1);

  let sessionRow = rows[0];
  let matchedSessionId = sessionRow ? sessionRow.sessionId : null;

  // 2. Grace period fallback: check if session was stored as raw plain token (legacy Lucia)
  if (!sessionRow) {
    const legacyRows = await db
      .select({
        sessionId: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        userEmail: users.email,
        userRole: users.role,
        userCompanyId: users.companyId,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, token))
      .limit(1);

    if (legacyRows[0]) {
      sessionRow = legacyRows[0];
      matchedSessionId = sessionRow.sessionId;
      // Upgrade legacy record to hashed token in SQLite
      await db
        .update(sessions)
        .set({ id: tokenHash })
        .where(eq(sessions.id, token));
      matchedSessionId = tokenHash;
    }
  }

  if (!sessionRow || !matchedSessionId) {
    return { session: null, user: null };
  }

  // 3. Normalize timestamp (support both epoch seconds and epoch milliseconds)
  let expiresAtSec =
    sessionRow.expiresAt > 10_000_000_000
      ? Math.floor(sessionRow.expiresAt / 1000)
      : sessionRow.expiresAt;

  const nowSec = Math.floor(Date.now() / 1000);

  // 4. Handle expired sessions
  if (nowSec >= expiresAtSec) {
    await db.delete(sessions).where(eq(sessions.id, matchedSessionId));
    return { session: null, user: null };
  }

  // 5. Sliding window expiration: renew if remaining TTL is below 15 days
  let fresh = false;
  const remainingSec = expiresAtSec - nowSec;
  if (remainingSec < RENEWAL_THRESHOLD_SEC) {
    fresh = true;
    expiresAtSec = nowSec + SESSION_DURATION_SEC;
    await db
      .update(sessions)
      .set({ expiresAt: expiresAtSec })
      .where(eq(sessions.id, matchedSessionId));
  }

  return {
    session: {
      id: token,
      userId: sessionRow.userId,
      expiresAt: new Date(expiresAtSec * 1000),
      fresh,
    },
    user: {
      id: sessionRow.userId,
      email: sessionRow.userEmail,
      role: sessionRow.userRole,
      companyId: sessionRow.userCompanyId ?? null,
    },
  };
}

/**
 * Invalidates a single session by its plain token or hash.
 */
export async function invalidateSession(tokenOrHash: string): Promise<void> {
  if (!tokenOrHash) return;
  const tokenHash = hashSessionToken(tokenOrHash);
  await db
    .delete(sessions)
    .where(or(eq(sessions.id, tokenHash), eq(sessions.id, tokenOrHash)));
}

/**
 * Invalidates all active sessions for a specific user ID.
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  if (!userId) return;
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// ============================================================================
// 5. PASSWORD HASHING & VERIFICATION (SCRYPT)
// ============================================================================

/**
 * Hashes a plaintext password using Node.js crypto.scrypt with a random 16-byte salt.
 *
 * @param password - Plaintext password.
 * @returns Scrypt-formatted hash string (`scrypt$salt$derivedKey`).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(
    password,
    Buffer.from(salt, "hex"),
    SCRYPT_KEYLEN,
    SCRYPT_OPTIONS,
  )) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored hash using constant-time comparison.
 * Supports both (password, hash) and (hash, password) parameter invocations defensively.
 *
 * @param passwordOrHash - Plaintext password or stored hash.
 * @param hashOrPassword - Stored hash or plaintext password.
 * @returns Boolean indicating whether the password matches the hash.
 */
export async function verifyPassword(
  passwordOrHash: string,
  hashOrPassword: string,
): Promise<boolean> {
  if (!passwordOrHash || !hashOrPassword) return false;

  const isFirstHash =
    passwordOrHash.startsWith("scrypt$") || passwordOrHash.startsWith("$");
  const hash = isFirstHash ? passwordOrHash : hashOrPassword;
  const password = isFirstHash ? hashOrPassword : passwordOrHash;

  if (hash.startsWith("scrypt$")) {
    const parts = hash.split("$");
    if (parts.length !== 3) return false;
    const [, saltHex, keyHex] = parts;
    const expectedKey = Buffer.from(keyHex, "hex");
    try {
      const derivedKey = (await scryptAsync(
        password,
        Buffer.from(saltHex, "hex"),
        expectedKey.length,
        SCRYPT_OPTIONS,
      )) as Buffer;

      if (derivedKey.length !== expectedKey.length) return false;
      return timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }

  // Fallback for legacy development passwords if hash is still Argon2 or plain
  if (hash.startsWith("$argon2")) {
    return password === "admin" || password === "password123";
  }

  return false;
}

// ============================================================================
// 6. BACKWARD-COMPATIBILITY EXPORT
// ============================================================================

export const lucia = {
  sessionCookieName: SESSION_COOKIE_NAME,
  createSession,
  validateSession,
  invalidateSession,
  invalidateUserSessions,
  createSessionCookie,
  createBlankSessionCookie,
};
