import { FastifyPluginAsync } from "fastify";
import { db } from "../db/index.js";
import { tasks } from "../db/schema/support.js";
import { eq } from "drizzle-orm";

const tasksRoutes: FastifyPluginAsync = async (fastify, opts) => {
  // Get all tasks
  fastify.get("/", async (request, reply) => {
    try {
      const records = await db.select().from(tasks).limit(50);
      return reply.send(records);
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  // Update task state
  fastify.put("/:id/state", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { state } = request.body as { state: string };

      if (!["TODO", "IN_PROGRESS", "DONE"].includes(state)) {
        return reply.code(400).send({ error: "Invalid state" });
      }

      await db
        .update(tasks)
        .set({ status: state, updatedAt: new Date() })
        .where(eq(tasks.id, id));

      return reply.send({ success: true, id, state });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default tasksRoutes;
