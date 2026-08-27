import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { client } from "../db/index.js";

export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    // DB checks
    const dbPath = path.resolve(process.cwd(), "atlas-erp-v2.db");
    const dbExists = fs.existsSync(dbPath);
    let dbSize = null;
    if (dbExists) {
      try {
        const stats = fs.statSync(dbPath);
        dbSize = Math.round(stats.size / (1024 * 1024)); // MB
      } catch {}
    }
    let dbHealthy = false;
    if (dbExists) {
      try {
        await client.execute("SELECT 1");
        dbHealthy = true;
      } catch {}
    }

    // System metrics
    const memory = process.memoryUsage();
    const loadAvg = os.loadavg(); // [1,5,15]
    const cpu = process.cpuUsage(); // microseconds
    const start = process.hrtime.bigint();
    await new Promise((res) => setImmediate(res));
    const eventLoopDelayMs = Number(process.hrtime.bigint() - start) / 1e6;

    return reply.send({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: {
        exists: dbExists,
        sizeMB: dbSize,
        healthy: dbHealthy,
      },
      system: {
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
          arrayBuffers: memory.arrayBuffers,
        },
        loadAvg: {
          "1min": loadAvg[0],
          "5min": loadAvg[1],
          "15min": loadAvg[2],
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
        eventLoopDelayMs,
        env: process.env.NODE_ENV || "development",
      },
    });
  });
}
