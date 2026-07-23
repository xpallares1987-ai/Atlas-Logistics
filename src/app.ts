import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";

import { logger } from "./config/logger.js";
import { authMiddleware } from "./middleware/auth.js";

// Import routers
import shipmentsRoutes from "./routes/shipments.routes.js";
import quotesRoutes from "./routes/quotes.routes.js";
import invoicesRoutes from "./routes/invoices.routes.js";
import financialRoutes from "./routes/financial.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import authRoutes from "./routes/auth.routes.js";

import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./trpc/routers/_app.js";
import { createContext } from "./trpc/trpc.js";

const app = Fastify({ loggerInstance: logger });

// Security Middlewares
app.register(fastifyHelmet);
app.register(fastifyCors, { origin: process.env.CORS_ORIGIN || "http://localhost:5173" });
app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: "15 minutes",
});

app.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET || "atlas-logistics-super-secret-cookie-key-2026", 
  parseOptions: {}
});

app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "atlas-logistics-jwt-secret-key-super-secure"
});

// Protect API routes with an onRequest hook
app.addHook("onRequest", async (request, reply) => {
  if (
    request.url.startsWith("/api/events") ||
    request.url === "/api/demo/trigger-alert" ||
    request.url === "/api/sync/batch" ||
    request.url.startsWith("/api/tracking/") ||
    request.url.startsWith("/api/auth/")
  ) {
    return;
  }
  if (request.url.startsWith("/api/")) {
    await authMiddleware(request, reply);
  }
});

// Register routes as plugins
app.register(shipmentsRoutes, { prefix: "/api/shipments" });
app.register(shipmentsRoutes, { prefix: "/api/tracking" });
app.register(quotesRoutes, { prefix: "/api/quotes" });
app.register(quotesRoutes, { prefix: "/api/rates" });
app.register(invoicesRoutes, { prefix: "/api/invoices" });
app.register(financialRoutes, { prefix: "/api" });
app.register(eventsRoutes, { prefix: "/api" });
app.register(aiRoutes, { prefix: "/api/ai" });
app.register(documentsRoutes, { prefix: "/api/documents" });
app.register(authRoutes, { prefix: "/api/auth" });

// Register tRPC
app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: {
    router: appRouter,
    createContext,
    onError({ path, error }: any) {
      logger.error(`Error in tRPC on path '${path}':`, error);
    },
  },
});

export default app;
