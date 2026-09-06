import { FastifyPluginAsync } from "fastify";
import { bookingOperationsRoutes } from "./operations/bookings.routes.js";
import { demurrageOperationsRoutes } from "./operations/demurrage.routes.js";
import { lclOperationsRoutes } from "./operations/lcl.routes.js";
import { warehouseTrafficOperationsRoutes } from "./operations/warehouse-traffic.routes.js";

const operationsRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(bookingOperationsRoutes);
  await fastify.register(demurrageOperationsRoutes);
  await fastify.register(lclOperationsRoutes);
  await fastify.register(warehouseTrafficOperationsRoutes);
};

export {
  bookingOperationsRoutes,
  demurrageOperationsRoutes,
  lclOperationsRoutes,
  warehouseTrafficOperationsRoutes,
};
export default operationsRoutes;
