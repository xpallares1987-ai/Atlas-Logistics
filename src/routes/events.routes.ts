/**
 * @file events.routes.ts
 * @description Real-time operational event broadcasting via Server-Sent Events (SSE) and WebSockets, including telemetry milestones and batch synchronization.
 * @module @atlas/routes/events
 * @see {@link docs/superpowers/plans/2026-11-15-issue-9-strict-eslint-restoration-routes.md}
 */

import { FastifyPluginAsync } from "fastify";
import EventEmitter from "events";
import { logger } from "../config/logger.js";
import crypto from "crypto";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OperationalEvent {
  id?: string;
  type: string;
  message?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  workItemId?: string;
  shipmentId?: string;
  unlockedWorkItems?: unknown[];
  [key: string]: unknown;
}

interface WebSocketClient {
  readyState: number;
  send: (data: string) => void;
  on: (event: string, cb: (msg: { toString: () => string }) => void) => void;
}

interface SyncBatchBody {
  source?: string;
  entities?: unknown[];
  batchId?: string;
}

// ============================================================================
// EVENT EMITTER
// ============================================================================

const emitter = new EventEmitter();
const MAX_CLIENTS = 100;

export const broadcastEvent = (event: OperationalEvent) => {
  emitter.emit("newEvent", event);
};

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

const eventsRoutes: FastifyPluginAsync = async (fastify, _opts) => {
  // Existing SSE route
  fastify.get("/events", (request, reply) => {
    if (emitter.listenerCount("newEvent") >= MAX_CLIENTS) {
      reply.code(429).send({ error: "Too many active connections" });
      return;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");

    const onEvent = (data: unknown) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    emitter.on("newEvent", onEvent);

    request.raw.on("close", () => {
      emitter.off("newEvent", onEvent);
    });
  });

  // WebSocket route for notifications (Demurrage, etc)
  fastify.get("/ws/notifications", { websocket: true }, (rawSocket, _req) => {
    const socket = rawSocket as WebSocketClient;
    logger.info("New WebSocket connection established");

    // Broadcast function wrapper
    const onEvent = (data: unknown) => {
      if (socket.readyState === 1 /* OPEN */) {
        socket.send(JSON.stringify(data));
      }
    };

    // Listen to global emitter
    emitter.on("newEvent", onEvent);

    // Keepalive ping interval every 25 seconds to prevent proxy idle drop
    const keepAliveTimer = setInterval(() => {
      if (socket.readyState === 1 /* OPEN */) {
        try {
          socket.send(JSON.stringify({ type: "HEARTBEAT" }));
        } catch {}
      }
    }, 25000);

    // Welcome handshake confirmation
    if (socket.readyState === 1 /* OPEN */) {
      socket.send(
        JSON.stringify({
          type: "CONNECTED",
          message: "WebSocket ready for alerts",
        }),
      );
    }

    socket.on("message", (message) => {
      try {
        const raw = message.toString();
        const parsed = JSON.parse(raw);
        if (parsed.type === "PING" && socket.readyState === 1) {
          socket.send(JSON.stringify({ type: "PONG" }));
        }
      } catch {}
    });

    socket.on("close", () => {
      clearInterval(keepAliveTimer);
      logger.info("WebSocket connection closed");
      emitter.off("newEvent", onEvent);
    });
  });

  fastify.post("/demo/trigger-alert", async (_request, _reply) => {
    broadcastEvent({
      id: crypto.randomUUID(),
      type: "ALERT",
      message: "Custom delay in Singapore Hub detected.",
      timestamp: new Date().toISOString(),
      metadata: { location: "SGSIN" },
    });
    return { success: true };
  });

  fastify.post("/demo/trigger-milestone", async (_request, _reply) => {
    broadcastEvent({
      id: crypto.randomUUID(),
      type: "MILESTONE",
      message: "Vessel CMA CGM TITAN has departed Port of Shanghai",
      timestamp: new Date().toISOString(),
      metadata: { milestone: "DEPARTURE", vessel: "CMA CGM TITAN" },
    });
    return { success: true };
  });

  fastify.post<{ Body: SyncBatchBody }>(
    "/sync/batch",
    async (request, reply) => {
      try {
        const { source, entities = [], batchId } = request.body || {};
        logger.info(
          `Received sync batch ${batchId} from ${source} with ${entities.length} entities.`,
        );
        return { success: true, processedCount: entities.length, batchId };
      } catch (error: unknown) {
        logger.error({ err: error }, "Sync batch error");
        const message =
          error instanceof Error ? error.message : "Internal Server Error";
        return reply.code(500).send({ success: false, error: message });
      }
    },
  );
};

// Background simulator for live vessel tracking
const vesselPositions = [
  {
    id: "v-1",
    name: "Maersk Emden",
    lat: 31.2304,
    lng: 121.4737,
    heading: 120,
  }, // Leaving Shanghai
  { id: "v-2", name: "MSC Zoe", lat: 39.4699, lng: -0.3763, heading: 85 }, // Leaving Valencia
];

setInterval(() => {
  if (emitter.listenerCount("newEvent") > 0) {
    vesselPositions.forEach((v) => {
      // Small random movement
      v.lat += (Math.random() - 0.5) * 0.05;
      v.lng += (Math.random() - 0.5) * 0.05;
      broadcastEvent({
        id: crypto.randomUUID(),
        type: "VESSEL_LOCATION_UPDATE",
        message: "Vessel position updated",
        timestamp: new Date().toISOString(),
        metadata: {
          vesselId: v.id,
          name: v.name,
          lat: v.lat,
          lng: v.lng,
          heading: v.heading,
        },
      });
    });
  }
}, 5000);

export default eventsRoutes;
