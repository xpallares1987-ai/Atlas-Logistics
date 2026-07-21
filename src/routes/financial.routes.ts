import { FastifyPluginAsync } from "fastify";

const financialRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/financials", async (request, reply) => {
    try {
      // Mock metrics since financialMetrics table was removed or renamed
      return [];
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default financialRoutes;
