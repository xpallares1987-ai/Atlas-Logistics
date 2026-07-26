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

  // Dashboard KPI stats endpoint
  fastify.get("/financial-stats", async (_request, reply) => {
    try {
      // TODO: Replace with real aggregated queries from Cloud SQL
      return reply.send({
        totalShipments: 1250,
        onTimePercent: 92.5,
        costPerShipment: 450,
        revenueMtd: 1500000,
        costMtd: 1100000,
        marginPercent: 26.7,
        pendingInvoices: 38,
        overdueInvoices: 7,
        totalRevenue: 4200000,
        totalCost: 3100000,
      });
    } catch (error: any) {
      reply.code(500).send({ error: error.message });
    }
  });
};
export default financialRoutes;
