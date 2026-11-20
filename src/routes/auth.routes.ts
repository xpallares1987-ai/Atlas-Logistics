/**
 * @file auth.routes.ts
 * @description Authentication endpoints for JWT login, session introspection, and logout.
 * @module @atlas/api/routes/auth
 */

import { FastifyPluginAsync, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { users } from "../db/schema/core.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { getJWTConfig } from "../config/jwt.js";
import {
  verifyPassword,
  invalidateSession,
  SESSION_COOKIE_NAME,
} from "../lib/auth.js";
import {
  OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
  OPENAPI_SUCCESS_FLAG_SCHEMA,
  buildErrorResponses,
} from "./openapi.schemas.js";

const AUTH_TAG = ["Authentication"] as const;

interface LoginBody {
  email?: string;
  password?: string;
}

const authRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.post<{ Body: LoginBody }>(
    "/login",
    {
      schema: {
        tags: [...AUTH_TAG],
        summary: "Authenticate user credentials and issue a signed JWT token",
        body: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([400, 401, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === "test" || process.env.CI ? 10000 : 20,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body || {};

      if (!email || !password) {
        return reply
          .code(400)
          .send({ error: "Email and password are required" });
      }

      try {
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (userResult.length === 0) {
          return reply.code(401).send({ error: "Invalid credentials" });
        }

        const user = userResult[0];

        if (!user.hashedPassword) {
          return reply.code(401).send({ error: "Invalid credentials" });
        }

        const isPasswordValid = await verifyPassword(
          password,
          user.hashedPassword,
        );
        if (!isPasswordValid) {
          return reply.code(401).send({ error: "Invalid credentials" });
        }

        const userRecord = user as unknown as Record<string, unknown>;
        const firstName =
          typeof userRecord.firstName === "string"
            ? userRecord.firstName
            : undefined;
        const lastName =
          typeof userRecord.lastName === "string"
            ? userRecord.lastName
            : undefined;
        const userName =
          firstName && lastName
            ? `${firstName} ${lastName}`
            : user.email.split("@")[0];

        const { secret } = getJWTConfig();
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            name: userName,
            companyId: user.companyId,
          },
          secret,
          { expiresIn: "24h" },
        );

        return reply.send({
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: userName,
            role: user.role,
            companyId: user.companyId,
          },
        });
      } catch (error: unknown) {
        request.log.error(error);
        return reply.code(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.get(
    "/me",
    {
      schema: {
        tags: [...AUTH_TAG],
        summary: "Inspect current authenticated user session from Bearer token",
        response: {
          200: OPENAPI_FLEXIBLE_OBJECT_SCHEMA,
          ...buildErrorResponses([401, 500]),
        },
      },
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === "test" || process.env.CI ? 10000 : 500,
          timeWindow: "1 minute",
          allowList: ["127.0.0.1", "::1"],
        },
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return reply.code(200).send({
            success: true,
            authenticated: false,
            user: null,
          });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, getJWTConfig().secret);

        return reply.send({
          success: true,
          authenticated: true,
          user: decoded,
        });
      } catch (_err: unknown) {
        return reply.code(401).send({ error: "Invalid token" });
      }
    },
  );

  fastify.post(
    "/logout",
    {
      schema: {
        tags: [...AUTH_TAG],
        summary: "Clear session cookies and log out current user",
        response: {
          200: OPENAPI_SUCCESS_FLAG_SCHEMA,
          ...buildErrorResponses([500]),
        },
      },
    },
    async (request, reply) => {
      try {
        const sessionToken = request.cookies?.[SESSION_COOKIE_NAME];
        if (sessionToken) {
          await invalidateSession(sessionToken);
        }
        const replyWithCookie = reply as FastifyReply & {
          clearCookie?: (name: string) => void;
        };
        if (typeof replyWithCookie.clearCookie === "function") {
          replyWithCookie.clearCookie("token");
          replyWithCookie.clearCookie("auth_session");
        }
        return reply.send({
          success: true,
          message: "Logged out successfully",
        });
      } catch {
        return reply.send({ success: true });
      }
    },
  );
};

export default authRoutes;
