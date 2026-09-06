import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { client } from "../db/index.js";
import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

const startTime = Date.now();

export default async function healthRoutes(app: FastifyInstance) {
  /**
   * Liveness/Health Check: Detailed status of system and dependencies
   * Returns 200 as long as the service is running (even if degraded)
   * Used for: Monitoring dashboards, manual health checks
   */
  app.get("/health", { logLevel: "silent" }, async (_request, reply) => {
    const startCheck = Date.now();
    const uptime = process.uptime();

    // Database check
    const dbPath = path.resolve(process.cwd(), "atlas-erp-v2.db");
    const dbExists = fs.existsSync(dbPath);
    let dbSize = null;
    let dbLatency = null;
    let dbHealthy = false;
    let dbError: string | null = null;

    if (dbExists) {
      try {
        const stats = fs.statSync(dbPath);
        dbSize = Math.round(stats.size / (1024 * 1024)); // MB
      } catch (err) {
        dbError = `Failed to stat database: ${err instanceof Error ? err.message : 'unknown error'}`;
      }

      try {
        const dbStart = Date.now();
        await client.execute("SELECT 1");
        dbLatency = Date.now() - dbStart;
        dbHealthy = true;
      } catch (err) {
        dbError = err instanceof Error ? err.message : "Unknown database error";
        logger.warn({ err }, "Database health check failed:");
      }
    }

    // Redis check
    let redisHealthy = false;
    let redisLatency = null;
    let redisError: string | null = null;

    try {
      const redisStart = Date.now();
      await redis.ping();
      redisLatency = Date.now() - redisStart;
      redisHealthy = true;
    } catch (err) {
      redisError = err instanceof Error ? err.message : "Unknown redis error";
      logger.warn({ err }, "Redis health check failed:");
    }

    // System metrics
    const memory = process.memoryUsage();
    const loadAvg = os.loadavg(); // [1,5,15]
    const cpu = process.cpuUsage(); // microseconds

    // Event loop lag (measures responsiveness)
    const lagStart = process.hrtime.bigint();
    await new Promise((res) => setImmediate(res));
    const eventLoopDelayMs = Number(process.hrtime.bigint() - lagStart) / 1e6;

    // Determine overall health
    const healthyCount = [dbHealthy, redisHealthy].filter(Boolean).length;
    const status =
      healthyCount === 2
        ? "healthy"
        : healthyCount === 1
          ? "degraded"
          : "unhealthy";

    const checkDuration = Date.now() - startCheck;

    const response = {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || "1.0.0",
      checks: {
        database: {
          status: dbHealthy ? "up" : "down",
          exists: dbExists,
          sizeMB: dbSize,
          latencyMs: dbLatency,
          error: dbError,
        },
        redis: {
          status: redisHealthy ? "up" : "down",
          latencyMs: redisLatency,
          error: redisError,
        },
      },
      db: {
        status: dbHealthy ? "up" : "down",
        exists: dbExists,
        sizeMB: dbSize,
        latencyMs: dbLatency,
        error: dbError,
      },
      system: {
        memory: {
          rss: Math.round(memory.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
          external: Math.round(memory.external / 1024 / 1024), // MB
        },
        loadAvg: {
          "1min": loadAvg[0].toFixed(2),
          "5min": loadAvg[1].toFixed(2),
          "15min": loadAvg[2].toFixed(2),
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
        eventLoopDelayMs: Number(eventLoopDelayMs.toFixed(2)),
        env: process.env.NODE_ENV || "development",
      },
      checkDurationMs: checkDuration,
    };

    // Return 200 for healthy/degraded, 503 for unhealthy
    const statusCode = status === "unhealthy" ? 503 : 200;
    return reply.status(statusCode).send(response);
  });

  /**
   * Readiness Check: Lightweight check for orchestrators (K8s, Docker, ECS)
   * Returns 200 only when all critical dependencies are ready
   * Used for: Load balancer routing, startup probes, readiness gates
   */
  app.get(
    "/ready",
    { logLevel: "silent" },
    async (_request, reply) => {
      try {
        // Check database readiness
        let dbReady = false;
        let dbLatency: number | null = null;
        try {
          const dbStart = Date.now();
          await client.execute("SELECT 1");
          dbLatency = Date.now() - dbStart;
          dbReady = true;
        } catch (err) {
          logger.warn({ err }, "Database not ready:");
        }

        // Check redis readiness
        let redisReady = false;
        let redisLatency: number | null = null;
        try {
          const redisStart = Date.now();
          await redis.ping();
          redisLatency = Date.now() - redisStart;
          redisReady = true;
        } catch (err) {
          logger.warn({ err }, "Redis not ready:");
        }

        const ready = dbReady && redisReady;

        const response = {
          ready,
          timestamp: new Date().toISOString(),
          dependencies: {
            database: {
              ready: dbReady,
              latencyMs: dbLatency,
            },
            redis: {
              ready: redisReady,
              latencyMs: redisLatency,
            },
          },
        };

        return reply.status(ready ? 200 : 503).send(response);
      } catch (error) {
        logger.error({ error }, "Readiness check failed:");
        return reply.status(503).send({
          ready: false,
          error: "Internal readiness check error",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Kubernetes-style aliases
  app.get("/healthz", { logLevel: "silent" }, (request, reply) =>
    request.server.inject({
      method: "GET",
      url: "/health",
    })
  );

  app.get("/readyz", { logLevel: "silent" }, (request, reply) =>
    request.server.inject({
      method: "GET",
      url: "/ready",
    })
  );

  logger.info("Health check routes registered: /health, /ready, /healthz, /readyz");
}
