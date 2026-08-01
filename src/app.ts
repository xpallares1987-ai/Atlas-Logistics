import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyRedis from "@fastify/redis";
import fastifyWebsocket from "@fastify/websocket";
import { redis } from "./config/redis.js";

import bpmnRoutes from "./routes/bpmn.routes.js";
import { logger } from "./config/logger.js";
import { authMiddleware } from "./middleware/auth.js";

// Import routers
import shipmentsRoutes from "./routes/shipments.routes.js";
import quotesRoutes from "./routes/quotes.routes.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import financialRoutes from "./routes/financial.routes.js";
import eventsRoutes from "./routes/events.routes.js";

import documentsRoutes from "./routes/documents.routes.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";
import healthRoutes from "./routes/health.routes.js";
import exceptionsRoutes from "./routes/exceptions.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import adminDbRoutes from "./routes/admin-db.routes.js";

// Removed tRPC imports

const app = Fastify({ loggerInstance: logger });

// Security Middlewares
app.register(fastifyHelmet, {
  contentSecurityPolicy:
    process.env.NODE_ENV === "production" ? undefined : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Configure Redis (Using shared client that can be mock)
const USE_MOCK = process.env.NODE_ENV !== "production" && process.env.USE_REDIS_MOCK !== "false";
if (!USE_MOCK) {
  app.register(fastifyRedis, {
    client: redis,
    closeClient: false // don't let fastify close the shared client
  });
}

// Configure WebSockets
app.register(fastifyWebsocket, {
  options: { maxPayload: 1048576 }
});

app.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, SSE)
    if (!origin) return cb(null, true);
    const allowed = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : ["http://localhost:3000", "http://localhost:5173"];
    if (
      allowed.includes(origin) ||
      origin.endsWith(".google.com") ||
      origin.endsWith(".web.app")
    ) {
      return cb(null, true);
    }
    cb(null, false);
  },
  credentials: true,
});
app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: "15 minutes",
  redis: redis // Use shared Redis (or mock) for rate limiting
});

app.register(fastifyCookie, {
  secret:
    process.env.COOKIE_SECRET || "atlas-logistics-super-secret-cookie-key-2026",
  parseOptions: {},
});

app.register(fastifyJwt, {
  secret:
    process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure",
});

// Protect API routes with an onRequest hook
app.addHook("onRequest", async (request, reply) => {
  if (
    request.url.startsWith("/api/events") ||
    request.url.startsWith("/api/shipments/exceptions") ||
    request.url === "/api/demo/trigger-alert" ||
    request.url === "/api/sync/batch" ||
    request.url.startsWith("/api/tracking/") ||
    request.url.startsWith("/api/auth/") ||
    request.url.startsWith("/admin/") ||
    request.url === "/api/health"
  ) {
    return;
  }
  if (request.url.startsWith("/api/")) {
    await authMiddleware(request, reply);
  }
});

// Register routes as plugins
app.register(shipmentsRoutes, { prefix: "/api/shipments" });
app.register(exceptionsRoutes, { prefix: "/api/shipments/exceptions" });
app.register(shipmentsRoutes, { prefix: "/api/tracking" });
app.register(quotesRoutes, { prefix: "/api/quotes" });
app.register(quotesRoutes, { prefix: "/api/rates" });
app.register(invoicesRoutes, { prefix: "/api/invoices" });
app.register(financialRoutes, { prefix: "/api" });
app.register(eventsRoutes, { prefix: "/api" });
app.register(documentsRoutes, { prefix: "/api/documents" });
app.register(authRoutes, { prefix: "/api/auth" });
app.register(adminRoutes);
app.register(adminDbRoutes, { prefix: "/api/admin/db" });
app.register(trackingRoutes, { prefix: "/api/tracking" });
app.register(aiRoutes, { prefix: "/api" });
app.register(bpmnRoutes, { prefix: "/api" });
app.register(healthRoutes, { prefix: "/api" });

export default app;
