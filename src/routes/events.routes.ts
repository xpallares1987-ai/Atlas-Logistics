import { FastifyPluginAsync } from "fastify";
import EventEmitter from "events";
import { logger } from "../config/logger.js";

const emitter = new EventEmitter();
const MAX_CLIENTS = 100;

export const broadcastEvent = (event: any) => {
  emitter.emit("newEvent", event);
};

const eventsRoutes: FastifyPluginAsync = async (fastify, opts) => {
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

  fastify.post("/sync/batch", async (request, reply) => {
    try {
      const { source, entities, batchId } = request.body as any;
      logger.info(`Received sync batch ${batchId} from ${source} with ${entities.length} entities.`);
      return { success: true, processedCount: entities.length, batchId };
    } catch (error: any) {
      logger.error("Sync batch error:", error);
      reply.code(500).send({ success: false, error: error.message });
    }
  });
};

export default eventsRoutes;
