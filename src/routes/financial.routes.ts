import { FastifyPluginAsync } from "fastify";
import { invoicesRoutes } from "./financial/invoices.routes.js";
import { settlementsRoutes } from "./financial/settlements.routes.js";
import { financialAnalyticsRoutes } from "./financial/analytics.routes.js";

const financialRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(financialAnalyticsRoutes);
  await fastify.register(invoicesRoutes);
  await fastify.register(settlementsRoutes);
};

export { invoicesRoutes, settlementsRoutes, financialAnalyticsRoutes };
export default financialRoutes;
