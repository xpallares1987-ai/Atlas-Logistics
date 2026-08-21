import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { users } from "../db/schema/core.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "atlas-logistics-super-secret-key-12345";

const authRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: process.env.NODE_ENV === "test" || process.env.CI ? 1000 : 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as any;

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

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            name: `${user.firstName} ${user.lastName}`,
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
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          },
        });
      } catch (error: any) {
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
          max: 100,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return reply.code(401).send({ error: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        return reply.send({ success: true, user: decoded });
      } catch (err) {
        return reply.code(401).send({ error: "Invalid token" });
      }
    },
  );
};

export default authRoutes;
