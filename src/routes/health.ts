import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../db/client.js";
import { sql } from "drizzle-orm";
import { zbc } from "../bpm/zeebe-client.js";
import { redis } from "../services/redis-cache.service.js";

const healthRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/api/health",
    {
      schema: {
        description: "Check system and services health status",
        tags: ["System"],
        response: {
          200: z.object({
            status: z.string(),
            timestamp: z.string(),
            services: z.object({
              database: z.string(),
              zeebe: z.string(),
              redis: z.string(),
            }),
          }),
          503: z.object({
            status: z.string(),
            timestamp: z.string(),
            services: z.object({
              database: z.string(),
              zeebe: z.string(),
              redis: z.string(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const status: Record<string, any> = {
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
          database: "unknown",
          zeebe: "unknown",
          redis: "unknown",
        },
      };

      // 1. Check Database
      try {
        await db.execute(sql`SELECT 1`);
        status.services.database = "connected";
      } catch (err) {
        status.status = "error";
        status.services.database = "disconnected";
        server.log.error(err, "Health Check: Database connection failed");
      }

      // 2. Check Zeebe (Simulation/Basic Check)
      try {
        // Basic connectivity check to Zeebe gateway
        const topology = await zbc.topology();
        if (topology) {
          status.services.zeebe = "healthy";
        } else {
          status.services.zeebe = "unreachable";
        }
      } catch (err) {
        status.services.zeebe = "unreachable";
        server.log.warn(err, "Health Check: Zeebe unreachable");
      }

      // 3. Check Redis
      try {
        await redis.ping();
        status.services.redis = "healthy";
      } catch (err) {
        status.status = "error";
        status.services.redis = "disconnected";
        server.log.error(err, "Health Check: Redis ping failed");
      }

      const statusCode = status.status === "ok" ? 200 : 503;
      return reply.status(statusCode).send(status);
    },
  );
};

export default healthRoutes;
