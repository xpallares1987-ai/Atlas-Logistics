import Fastify from "fastify";
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
import { redis } from "./config/redis.js";

import bpmnRoutes from "./routes/bpmn.routes.js";
import "./cron/backup-scheduler.js"; // start cron scheduler
import dashboardRoutes from "./routes/dashboard.routes.js";
import { logger } from "./config/logger.js";
import { authMiddleware } from "./middleware/auth.js";

import shipmentsRoutes from "./routes/shipments.routes.js";
import quotesRoutes from "./routes/quotes.routes.js";
import financialRoutes from "./routes/financial.routes.js";
import eventsRoutes from "./routes/events.routes.js";

import documentsRoutes from "./routes/documents.routes.js";
import authRoutes from "./routes/auth.routes.js";
import trackingRoutes from "./routes/tracking.routes.js";
import healthRoutes from "./routes/health.routes.js";
import operationsRoutes from "./routes/operations.routes.js";
import schedulesRoutes from "./routes/schedules.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import exceptionsRoutes from "./routes/exceptions.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import adminDbRoutes from "./routes/admin-db.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import customsRoutes from "./routes/customs.routes.js";
import warehouseRoutes from "./routes/warehouse.routes.js";
import airCargoRoutes from "./routes/air-cargo.routes.js";
import { incotermsRoutes } from "./routes/incoterms.routes.js";
import { claimsRoutes } from "./routes/claims.routes.js";
import { roadFreightRoutes } from "./routes/road-freight.routes.js";
import { treasuryRoutes } from "./routes/treasury.routes.js";
import { coldChainRoutes } from "./routes/cold-chain.routes.js";
import { cbamRoutes } from "./routes/cbam.routes.js";
import { railRoutes } from "./routes/rail.routes.js";
import { customsWarehouseRoutes } from "./routes/customs-warehouse.routes.js";
import { fuelEuRoutes } from "./routes/fueleu.routes.js";
import { tradeFinanceRoutes } from "./routes/trade-finance.routes.js";
import { aeoSecurityRoutes } from "./routes/aeo-security.routes.js";
import { charteringLaytimeRoutes } from "./routes/chartering-laytime.routes.js";
import { generalAverageRoutes } from "./routes/general-average.routes.js";
import { dangerousGoodsRoutes } from "./routes/dangerous-goods.routes.js";
import { cargoInsuranceRoutes } from "./routes/cargo-insurance.routes.js";
import { bulkOperationsRoutes } from "./routes/bulk-operations.routes.js";
import { carbonRoutes } from "./routes/carbon.routes.js";

// Removed tRPC imports

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
          upgradeInsecureRequests: true,
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// Configure Redis (Using shared client that can be mock)
const USE_MOCK =
  process.env.NODE_ENV !== "production" &&
  process.env.USE_REDIS_MOCK !== "false";
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
    request.url.startsWith("/api/warehouse/ws") ||
    request.url === "/api/health" ||
    request.url === "/health" ||
    request.url === "/metrics" ||
    request.url.startsWith("/docs")
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
// Removed duplicate shipmentsRoutes registration for tracking (trackingRoutes registered separately)
app.register(quotesRoutes, { prefix: "/api/quotes" });
app.register(quotesRoutes, { prefix: "/api/rates" });
app.register(financialRoutes, { prefix: "/api" });
app.register(eventsRoutes, { prefix: "/api" });
app.register(documentsRoutes, { prefix: "/api/documents" });
app.register(authRoutes, { prefix: "/api/auth" });
app.register(adminRoutes);
app.register(settingsRoutes, { prefix: "/api/settings" });
app.register(adminDbRoutes, { prefix: "/api/admin/db" });
app.register(operationsRoutes, { prefix: "/api/operations" });
app.register(trackingRoutes, { prefix: "/api/tracking" });
app.register(schedulesRoutes, { prefix: "/api/schedules" });
app.register(tasksRoutes, { prefix: "/api/tasks" });
app.register(aiRoutes, { prefix: "/api" });
app.register(bpmnRoutes, { prefix: "/api" });
app.register(dashboardRoutes, { prefix: "/api/dashboard" });
app.register(healthRoutes, { prefix: "/api" });
app.register(customsRoutes, { prefix: "/api" });
app.register(warehouseRoutes, { prefix: "/api/warehouse" });
app.register(airCargoRoutes, { prefix: "/api" });
app.register(incotermsRoutes, { prefix: "/api/incoterms" });
app.register(claimsRoutes, { prefix: "/api/claims" });
app.register(roadFreightRoutes, { prefix: "/api/road-freight" });
app.register(treasuryRoutes, { prefix: "/api/treasury" });
app.register(coldChainRoutes, { prefix: "/api/cold-chain" });
app.register(cbamRoutes, { prefix: "/api/cbam" });
app.register(railRoutes, { prefix: "/api/rail" });
app.register(customsWarehouseRoutes, { prefix: "/api/customs-warehouse" });
app.register(fuelEuRoutes, { prefix: "/api/fueleu" });
app.register(tradeFinanceRoutes, { prefix: "/api/trade-finance" });
app.register(aeoSecurityRoutes, { prefix: "/api/aeo-security" });
app.register(charteringLaytimeRoutes, { prefix: "/api/chartering" });
app.register(generalAverageRoutes, { prefix: "/api/general-average" });
app.register(dangerousGoodsRoutes, { prefix: "/api/dangerous-goods" });
app.register(cargoInsuranceRoutes, { prefix: "/api/cargo-insurance" });
app.register(bulkOperationsRoutes, { prefix: "/api/bulk-operations" });
app.register(carbonRoutes, { prefix: "/api/carbon" });

export default app;
