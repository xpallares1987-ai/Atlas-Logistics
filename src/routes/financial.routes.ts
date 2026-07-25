import { FastifyPluginAsync } from "fastify";
import NodeCache from "node-cache";

// Cache for 12 hours (43200 seconds)
const currencyCache = new NodeCache({ stdTTL: 43200 });

const financialRoutes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get("/financials", async (request, reply) => {
    try {
      // Mock metrics since financialMetrics table was removed or renamed
      return [];
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });

  fastify.get("/exchange-rates", async (request, reply) => {
    try {
      const cachedRates = currencyCache.get("rates");
      if (cachedRates) {
        return reply.send({ data: cachedRates, source: "cache" });
      }

      const response = await fetch(
        "https://api.frankfurter.app/latest?to=USD,GBP,JPY,CNY",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch exchange rates");
      }
      const data = await response.json();
      currencyCache.set("rates", data.rates);

      return reply.send({ data: data.rates, source: "api" });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};

export default financialRoutes;
