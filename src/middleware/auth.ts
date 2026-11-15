/**
 * @file auth.ts
 * @description Authentication and authorization middleware supporting JWT and Lucia session validation.
 * @module @atlas/api/middleware/auth
 * @see {@link docs/adr/0018-cross-tenant-security-and-jwt-rbac-contracts.md}
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../config/logger.js";
import { lucia } from "../lib/auth.js";
import jwt from "jsonwebtoken";
import type { Session } from "lucia";

// JWT_SECRET is guaranteed to exist due to validation in server.ts
const JWT_SECRET = process.env.JWT_SECRET!;

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
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
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

    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      reply.code(401).send({ error: "Missing Authentication." });
      return;
    }

    const { session, user } = await lucia.validateSession(sessionId);

    if (!session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
      reply.code(401).send({ error: "Invalid Session Cookie" });
      return;
    }

    if (session && session.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
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
        }
      : null;
    request.session = session;
  } catch (error) {
    logger.error(error, "Error during session validation:");
    reply.code(401).send({ error: "Invalid Session" });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const userRole = request.user?.role || "USER";
    if (!allowedRoles.includes(userRole)) {
      reply.code(403).send({ error: "Forbidden: Insufficient permissions" });
      return;
    }
  };
};
