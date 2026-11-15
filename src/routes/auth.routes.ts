import { FastifyPluginAsync, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { users } from "../db/schema/core.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure";

interface LoginBody {
  email?: string;
  password?: string;
}

const authRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.post<{ Body: LoginBody }>(
    "/login",
    {
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

        // In a real app we'd bcrypt.compare(password, user.passwordHash)
        // For this demo/ERP prototype, we'll allow mock passwords if they match 'password123' or their role
        if (password !== "password123" && password !== "admin") {
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

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            name: userName,
          },
          JWT_SECRET,
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
        const decoded = jwt.verify(token, JWT_SECRET);

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

  fastify.post("/logout", async (_request, reply) => {
    try {
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
  });
};

export default authRoutes;
