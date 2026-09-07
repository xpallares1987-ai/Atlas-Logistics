import Fastify from "fastify";
import fs from "fs";
import path from "path";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import fastifyRedis from "@fastify/redis";
import fastifyWebsocket from "@fastify/websocket";
import fastifyMultipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import metrics from "fastify-metrics";
import { redis, USE_MOCK } from "./config/redis.js";
import "./cron/backup-scheduler.js"; // start cron scheduler
import { logger } from "./config/logger.js";
import { authMiddleware } from "./middleware/auth.js";
import { registerAllRoutes } from "./routes/index.js";
import { tenancyPlugin } from "./lib/tenancy/index.js";

const app = Fastify({ loggerInstance: logger });

// Security Middlewares
const isProduction = process.env.NODE_ENV === "production";
app.register(fastifyHelmet, {
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'nonce-%{nonce}'"],
          styleSrc: ["'self'", "'nonce-%{nonce}'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Configure Redis (Using shared client when real Redis is active)
if (!USE_MOCK) {
  app.register(fastifyRedis, {
    client: redis,
    closeClient: false, // don't let fastify close the shared client
  });
}

// Configure WebSockets
app.register(fastifyWebsocket, {
  options: { maxPayload: 1048576 },
});

// Configure Multipart
app.register(fastifyMultipart, {
  attachFieldsToBody: true,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, SSE)
    if (!origin) return cb(null, true);
    const allowed = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : ["http://localhost:3000", "http://localhost:5173"];
    // Whitelist specific domains; avoid broad wildcard matches
    const googleAllowed = [
      "https://atlas-logistics.web.app",
      "https://atlas-logistics.firebaseapp.com",
    ];
    if (allowed.includes(origin) || googleAllowed.includes(origin)) {
      return cb(null, true);
    }
    cb(null, false);
  },
  credentials: true,
});

app.register(fastifyRateLimit, {
  max: process.env.CI || process.env.NODE_ENV === "test" ? 1000 : 5000,
  timeWindow: "15 minutes",
  allowList: ["127.0.0.1", "::1"],
  redis: redis, // Use shared Redis (or mock) for rate limiting
});

app.register(metrics, { endpoint: "/metrics" });
app.register(swagger, {
  openapi: {
    info: { title: "Atlas Logistics API", version: "1.0.0" },
  },
  exposeRoute: true,
});
app.register(swaggerUI, { routePrefix: "/docs", exposeRoute: true });

// REQUIRED: COOKIE_SECRET and JWT_SECRET must be provided via environment
app.register(fastifyCookie, {
  secret:
    process.env.COOKIE_SECRET || (() => {
      throw new Error("COOKIE_SECRET environment variable is required");
    })(),
  parseOptions: {},
});

app.register(fastifyJwt, {
  secret:
    process.env.JWT_SECRET || (() => {
      throw new Error("JWT_SECRET environment variable is required");
    })(),
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
    request.url.startsWith("/api/warehouse/ws") ||
    request.url === "/api/health" ||
    request.url === "/health" ||
    request.url === "/metrics" ||
    request.url === "/favicon.ico" ||
    request.url === "/favicon.png" ||
    request.url.startsWith("/docs")
  ) {
    return;
  }
  if (request.url.startsWith("/api/")) {
    await authMiddleware(request, reply);
  }
});

const faviconPath = path.resolve(
  process.cwd(),
  "packages/frontend/public/favicon.png",
);

app.get("/favicon.ico", async (_request, reply) => {
  if (fs.existsSync(faviconPath)) {
    return reply.type("image/png").send(fs.readFileSync(faviconPath));
  }
  return reply.status(204).send();
});

app.get("/favicon.png", async (_request, reply) => {
  if (fs.existsSync(faviconPath)) {
    return reply.type("image/png").send(fs.readFileSync(faviconPath));
  }
  return reply.status(204).send();
});

// Multi-Tenancy Scoping Plugin
app.register(tenancyPlugin);

// Register all application routes
app.register(registerAllRoutes);

export default app;
