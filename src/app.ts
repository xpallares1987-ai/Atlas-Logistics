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
import { correlationIdPlugin } from "./middleware/correlation-id.js";
import { registerAllRoutes } from "./routes/index.js";
import { tenancyPlugin } from "./lib/tenancy/index.js";
import {
  registerSecurityHeaders,
  enforceHTTPS,
  logSecurityConfig,
} from "./config/security-headers.js";
import { getJWTConfig } from "./config/jwt.js";
import {
  isEncryptedEnvelope,
  decryptPayloadEnvelope,
  encryptPayloadEnvelope,
} from "@atlas/shared";

const app = Fastify({ loggerInstance: logger });

// Automated Inbound Transaction Decryption (E2EE Zero-Knowledge Envelope)
app.addHook("preValidation", async (request, reply) => {
  if (request.body && isEncryptedEnvelope(request.body)) {
    try {
      const decrypted = await decryptPayloadEnvelope(request.body);
      request.body = decrypted;
      (request as any).wasPayloadEncrypted = true;
    } catch {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message:
          "Failed to decrypt incoming transaction envelope (corrupted payload or invalid signature).",
      });
    }
  }
});

// Automated Outbound Transaction Encryption (E2EE Zero-Knowledge Envelope) — Fail-Closed
app.addHook("onSend", async (request, reply, payload) => {
  const wantsEncryption =
    request.headers["x-atlas-encrypted-payload"] === "true" ||
    (request as any).wasPayloadEncrypted === true;

  if (!wantsEncryption) {
    return payload;
  }

  if (typeof payload === "string") {
    const contentType = reply.getHeader("content-type");
    const isJson =
      typeof contentType === "string" &&
      contentType.includes("application/json");
    if (!isJson) {
      return payload;
    }
    try {
      const parsed = JSON.parse(payload);
      if (isEncryptedEnvelope(parsed)) {
        reply.header("X-Atlas-Encrypted-Payload", "true");
        return payload;
      }
      const encryptedEnvelope = await encryptPayloadEnvelope(parsed);
      reply.header("X-Atlas-Encrypted-Payload", "true");
      return JSON.stringify(encryptedEnvelope);
    } catch (err) {
      request.log.error(
        { err },
        "Fail-closed: Outbound E2EE payload encryption failed; suppressing plaintext response",
      );
      reply.code(500);
      reply.header("content-type", "application/json; charset=utf-8");
      return JSON.stringify({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Failed to encrypt outbound response envelope.",
      });
    }
  }

  return payload;
});

// Gracefully handle empty application/json payloads without throwing 400 FST_ERR_CTP_EMPTY_JSON_BODY
app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (_req, body: string, done) => {
    if (!body || body.trim() === "") {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body));
    } catch (err) {
      done(err as Error, undefined);
    }
  },
);

// Correlation ID middleware for distributed tracing
app.register(correlationIdPlugin);

// Security: Enforce HTTPS in production
const isProduction = process.env.NODE_ENV === "production";
enforceHTTPS(app, isProduction);

// Security: Register security headers middleware
registerSecurityHeaders(app, isProduction);
logSecurityConfig(isProduction);

// Security Middlewares
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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true,
  xFrameOptions: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
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

/**
 * Validate and parse CORS origin whitelist from environment.
 * Returns default list if not configured, validates against wildcards.
 */
function parseAndValidateCorsOrigins(): string[] {
  const defaultOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
  ];
  const googleAllowed = [
    "https://atlas-logistics.web.app",
    "https://atlas-logistics.firebaseapp.com",
  ];

  if (!process.env.CORS_ORIGIN) {
    return [...defaultOrigins, ...googleAllowed];
  }

  const configured = process.env.CORS_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Reject dangerous patterns
  const dangerous = configured.filter(
    (origin) => origin === "*" || origin.includes("*") || origin === "",
  );
  if (dangerous.length > 0) {
    logger.warn(
      { rejected: dangerous },
      "CORS_ORIGIN contains wildcard or empty values. Rejecting for security.",
    );
  }

  // Validate URL format (basic check)
  const validOrigins = configured.filter((origin) => {
    try {
      new URL(origin);
      return true;
    } catch {
      logger.warn(
        { origin },
        "CORS_ORIGIN entry is not a valid URL. Rejecting.",
      );
      return false;
    }
  });

  return [...validOrigins, ...googleAllowed];
}

const corsAllowlist = parseAndValidateCorsOrigins();

app.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, SSE)
    if (!origin) return cb(null, true);
    if (corsAllowlist.includes(origin)) {
      return cb(null, true);
    }
    cb(null, false);
  },
  credentials: true,
});

// Fix rate limit operator precedence: ensure CI/test checks are grouped
app.register(fastifyRateLimit, {
  max: process.env.CI || process.env.NODE_ENV === "test" ? 1000 : 5000,
  timeWindow: "15 minutes",
  allowList: ["127.0.0.1", "::1"],
  redis: redis, // Use shared Redis (or mock) for rate limiting
});

app.register(metrics as any, { endpoint: "/metrics" });
app.register(swagger, {
  openapi: {
    info: { title: "Atlas Logistics API", version: "1.0.0" },
  },
});
app.register(swaggerUI, { routePrefix: "/docs" });

app.register(fastifyCookie, {
  secret: getJWTConfig().secret,
  parseOptions: {
    sameSite: isProduction ? "strict" : "lax",
    secure: isProduction,
    httpOnly: true,
    path: "/",
  },
});

app.register(fastifyJwt, {
  secret: getJWTConfig().secret,
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
    request.url.startsWith("/api/addresses") ||
    request.url.startsWith("/admin/") ||
    request.url.startsWith("/api/admin/seed") ||
    request.url.startsWith("/api/warehouse/ws") ||
    request.url.startsWith("/api/dashboard/live") ||
    request.url.startsWith("/api/edi/inbound") ||
    request.url.startsWith("/api/dcsa/v3/events") ||
    request.url.startsWith("/api/documents/verify/") ||
    request.url.startsWith("/api/ai/config-status") ||
    request.url.startsWith("/api/ai/status") ||
    request.url.includes("/pdf") ||
    request.url.includes("-pdf") ||
    request.url.includes("/xml") ||
    request.url.includes("/xfwb") ||
    request.url.includes("/fwb") ||
    request.url.includes("/csv") ||
    request.url.startsWith("/api/air-cargo/awb/") ||
    request.url.startsWith("/api/road-freight/") ||
    request.url.startsWith("/api/rail/") ||
    request.url.startsWith("/api/bulk-operations/") ||
    request.url.startsWith("/api/bulk/") ||
    request.url.startsWith("/api/chartering/") ||
    request.url.startsWith("/api/customs/") ||
    request.url.startsWith("/api/operations/lcl/manifest/") ||
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

// Graceful shutdown: close Redis and other resources
app.addHook("onClose", async (instance) => {
  logger.info("Shutting down gracefully...");
  const redisStatus = (redis as any).status;
  // Check if Redis is not already closed
  if (redis && redisStatus !== "close" && redisStatus !== "closed") {
    try {
      await redis.quit();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.warn({ err }, "Error closing Redis connection");
    }
  }
});

export default app;
