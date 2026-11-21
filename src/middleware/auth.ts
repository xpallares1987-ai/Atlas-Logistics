/**
 * @file auth.ts
 * @description Authentication and authorization middleware supporting JWT and native Web Crypto session validation.
 * @module @atlas/api/middleware/auth
 * @see {@link docs/adr/0018-cross-tenant-security-and-jwt-rbac-contracts.md}
 * @see {@link docs/adr/0023-native-web-crypto-session-migration.md}
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../config/logger.js";
import { getJWTConfig } from "../config/jwt.js";
import {
  validateSession,
  createSessionCookie,
  createBlankSessionCookie,
  SESSION_COOKIE_NAME,
  type Session,
} from "../lib/auth.js";
import jwt from "jsonwebtoken";

export interface AuthUserContext {
  id: string;
  email?: string;
  role?: string;
  name?: string;
  companyId?: string | null;
  company_id?: string | null;
  [key: string]: unknown;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUserContext;
    user: AuthUserContext | null;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    session?: Session | null;
  }
}

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | void> => {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, getJWTConfig().secret);
        if (typeof decoded === "object" && decoded !== null) {
          request.user = decoded as unknown as AuthUserContext;
        }
        return;
      } catch (tokenErr) {
        logger.debug(
          { err: tokenErr },
          "JWT verification failed, falling back to session cookie",
        );
        // Fall back to session cookie if token is invalid
      }
    }

    const sessionId = request.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return reply.code(401).send({ error: "Missing Authentication." });
    }

    const { session, user } = await validateSession(sessionId);

    if (!session) {
      const sessionCookie = createBlankSessionCookie();
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
      return reply.code(401).send({ error: "Invalid Session Cookie" });
    }

    if (session && session.fresh) {
      const sessionCookie = createSessionCookie(session.id);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
    }

    request.user = user
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId ?? null,
        }
      : null;
    request.session = session;
  } catch (error) {
    logger.error(error, "Error during session validation:");
    return reply.code(401).send({ error: "Invalid Session" });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply | void> => {
    const userRole = request.user?.role || "USER";
    if (!allowedRoles.includes(userRole)) {
      return reply
        .code(403)
        .send({ error: "Forbidden: Insufficient permissions" });
    }
  };
};
