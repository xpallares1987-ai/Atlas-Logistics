import { FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../config/logger.js";
import { lucia } from "../lib/auth.js";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

declare module "fastify" {
  interface FastifyRequest {
    session: any;
  }
}

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  try {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
          request.user = decoded;
          return;
        }
      } catch {
        // Fall back to session cookie if token is invalid
      }
    }

    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      reply.code(401).send({ error: "Missing Authentication." });
      throw new Error("Unauthorized");
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
      throw new Error("Unauthorized");
    }

    if (session && session.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
      reply.setCookie(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes,
      );
    }

    request.user = user;
    request.session = session;
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      throw error;
    }
    logger.error(error, "Error verificando sesión:");
    reply.code(401).send({ error: "Invalid Session" });
    throw new Error("Unauthorized");
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = (request.user as any)?.role || "USER";
    if (!allowedRoles.includes(userRole)) {
      reply.code(403).send({ error: "Forbidden: Insufficient permissions" });
      throw new Error("Forbidden");
    }
  };
};
