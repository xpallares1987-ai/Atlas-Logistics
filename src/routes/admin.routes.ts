import { FastifyInstance } from "fastify";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { workflowQueue } from "../bpm/workflow-engine.service.js";
import { logger } from "../config/logger.js";

export default async function adminRoutes(app: FastifyInstance) {
  logger.info("Initializing BullMQ Dashboard on /admin/queues");

  const serverAdapter = new FastifyAdapter();

  // Define base path for the UI. Note that the Fastify plugin prefix is handled automatically by Bull Board
  // But we still need to set it on the adapter.
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(workflowQueue)],
    serverAdapter,
  });

  // Since we are registering it in app.ts, we use the serverAdapter's plugin directly
  app.register(serverAdapter.registerPlugin(), {
    prefix: "/admin/queues",
    basePath: "/",
  });
}
