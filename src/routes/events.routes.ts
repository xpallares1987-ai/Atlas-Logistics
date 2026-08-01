import { FastifyPluginAsync } from "fastify";
import EventEmitter from "events";
import { logger } from "../config/logger.js";

const emitter = new EventEmitter();
const MAX_CLIENTS = 100;

export const broadcastEvent = (event: any) => {
  emitter.emit("newEvent", event);
};

const eventsRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // Existing SSE route
  fastify.get("/events", (request, reply) => {
    if (emitter.listenerCount("newEvent") >= MAX_CLIENTS) {
      reply.code(429).send({ error: "Too many active connections" });
      return;
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");

    const onEvent = (data: any) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    emitter.on("newEvent", onEvent);

    request.raw.on("close", () => {
      emitter.off("newEvent", onEvent);
    });
  });

  // New WebSocket route for notifications (Demurrage, etc)
  fastify.get("/ws/notifications", { websocket: true }, (socket, req) => {
    logger.info("New WebSocket connection established");
    
    // Broadcast function wrapper
    const onEvent = (data: any) => {
      socket.send(JSON.stringify(data));
    };

    // Listen to our global emitter
    emitter.on("newEvent", onEvent);
    
    // Optional: send a welcome ping
    socket.send(JSON.stringify({ type: 'CONNECTED', message: 'WebSocket ready for alerts' }));

    socket.on("message", message => {
      // client could send messages back if needed
    });

    socket.on("close", () => {
      logger.info("WebSocket connection closed");
      emitter.off("newEvent", onEvent);
    });
  });

  fastify.post("/demo/trigger-alert", async (request, reply) => {
    broadcastEvent({
      id: crypto.randomUUID(),
      type: "ALERT",
      message: "Custom delay in Singapore Hub detected.",
      timestamp: new Date().toISOString(),
      metadata: { location: "SGSIN" },
    });
    return { success: true };
  });

  fastify.post("/demo/trigger-milestone", async (request, reply) => {
    broadcastEvent({
      id: crypto.randomUUID(),
      type: "MILESTONE",
      message: "Vessel CMA CGM TITAN has departed Port of Shanghai",
      timestamp: new Date().toISOString(),
      metadata: { milestone: "DEPARTURE", vessel: "CMA CGM TITAN" },
    });
    return { success: true };
  });

  fastify.post("/sync/batch", async (request, reply) => {
    try {
      const { source, entities, batchId } = request.body as any;
      logger.info(
        `Received sync batch ${batchId} from ${source} with ${entities.length} entities.`,
      );
      return { success: true, processedCount: entities.length, batchId };
    } catch (error: any) {
      logger.error("Sync batch error:", error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });
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
}, 5000); // Send updates every 5 seconds

export default eventsRoutes;
