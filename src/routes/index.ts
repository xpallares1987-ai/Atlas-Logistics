import { FastifyPluginAsync } from "fastify";

import shipmentsRoutes from "./shipments.routes.js";
import quotesRoutes from "./quotes.routes.js";
import financialRoutes from "./financial.routes.js";
import eventsRoutes from "./events.routes.js";
import documentsRoutes from "./documents.routes.js";
import authRoutes from "./auth.routes.js";
import trackingRoutes from "./tracking.routes.js";
import healthRoutes from "./health.routes.js";
import operationsRoutes from "./operations.routes.js";
import schedulesRoutes from "./schedules.routes.js";
import tasksRoutes from "./tasks.routes.js";
import exceptionsRoutes from "./exceptions.routes.js";
import aiRoutes from "./ai.routes.js";
import adminDbRoutes from "./admin-db.routes.js";
import adminRoutes from "./admin.routes.js";
import settingsRoutes from "./settings.routes.js";
import customsRoutes from "./customs.routes.js";
import warehouseRoutes from "./warehouse.routes.js";
import airCargoRoutes from "./air-cargo.routes.js";
import { incotermsRoutes } from "./incoterms.routes.js";
import { claimsRoutes } from "./claims.routes.js";
import { roadFreightRoutes } from "./road-freight.routes.js";
import { treasuryRoutes } from "./treasury.routes.js";
import { coldChainRoutes } from "./cold-chain.routes.js";
import { cbamRoutes } from "./cbam.routes.js";
import { railRoutes } from "./rail.routes.js";
import { customsWarehouseRoutes } from "./customs-warehouse.routes.js";
import { fuelEuRoutes } from "./fueleu.routes.js";
import { tradeFinanceRoutes } from "./trade-finance.routes.js";
import { aeoSecurityRoutes } from "./aeo-security.routes.js";
import { charteringLaytimeRoutes } from "./chartering-laytime.routes.js";
import { generalAverageRoutes } from "./general-average.routes.js";
import { dangerousGoodsRoutes } from "./dangerous-goods.routes.js";
import { cargoInsuranceRoutes } from "./cargo-insurance.routes.js";
import { bulkOperationsRoutes } from "./bulk-operations.routes.js";
import { carbonRoutes } from "./carbon.routes.js";
import { telemetryRoutes } from "./telemetry.routes.js";
import bpmnRoutes from "./bpmn.routes.js";
import dashboardRoutes from "./dashboard.routes.js";

export {
  shipmentsRoutes,
  quotesRoutes,
  financialRoutes,
  eventsRoutes,
  documentsRoutes,
  authRoutes,
  trackingRoutes,
  healthRoutes,
  operationsRoutes,
  schedulesRoutes,
  tasksRoutes,
  exceptionsRoutes,
  aiRoutes,
  adminDbRoutes,
  adminRoutes,
  settingsRoutes,
  customsRoutes,
  warehouseRoutes,
  airCargoRoutes,
  incotermsRoutes,
  claimsRoutes,
  roadFreightRoutes,
  treasuryRoutes,
  coldChainRoutes,
  cbamRoutes,
  railRoutes,
  customsWarehouseRoutes,
  fuelEuRoutes,
  tradeFinanceRoutes,
  aeoSecurityRoutes,
  charteringLaytimeRoutes,
  generalAverageRoutes,
  dangerousGoodsRoutes,
  cargoInsuranceRoutes,
  bulkOperationsRoutes,
  carbonRoutes,
  telemetryRoutes,
  bpmnRoutes,
  dashboardRoutes,
};

/**
 * Unified Fastify route registrar plugin.
 * Mounts all core and specialized logistics domain endpoints with their canonical URL prefixes.
 */
export const registerAllRoutes: FastifyPluginAsync = async (fastify) => {
  // Core Operational & Transactional Routes
  await fastify.register(shipmentsRoutes, { prefix: "/api/shipments" });
  await fastify.register(exceptionsRoutes, {
    prefix: "/api/shipments/exceptions",
  });
  await fastify.register(quotesRoutes, { prefix: "/api/quotes" });
  await fastify.register(quotesRoutes, { prefix: "/api/rates" });
  await fastify.register(financialRoutes, { prefix: "/api" });
  await fastify.register(eventsRoutes, { prefix: "/api" });
  await fastify.register(documentsRoutes, { prefix: "/api/documents" });
  await fastify.register(authRoutes, { prefix: "/api/auth" });
  await fastify.register(adminRoutes);
  await fastify.register(settingsRoutes, { prefix: "/api/settings" });
  await fastify.register(adminDbRoutes, { prefix: "/api/admin/db" });
  await fastify.register(operationsRoutes, { prefix: "/api/operations" });
  await fastify.register(trackingRoutes, { prefix: "/api/tracking" });
  await fastify.register(schedulesRoutes, { prefix: "/api/schedules" });
  await fastify.register(tasksRoutes, { prefix: "/api/tasks" });
  await fastify.register(aiRoutes, { prefix: "/api" });
  await fastify.register(bpmnRoutes, { prefix: "/api" });
  await fastify.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await fastify.register(healthRoutes, { prefix: "/api" });

  // Specialized Logistics & Regulatory Domain Routes
  await fastify.register(customsRoutes, { prefix: "/api" });
  await fastify.register(warehouseRoutes, { prefix: "/api/warehouse" });
  await fastify.register(airCargoRoutes, { prefix: "/api" });
  await fastify.register(incotermsRoutes, { prefix: "/api/incoterms" });
  await fastify.register(claimsRoutes, { prefix: "/api/claims" });
  await fastify.register(roadFreightRoutes, { prefix: "/api/road-freight" });
  await fastify.register(treasuryRoutes, { prefix: "/api/treasury" });
  await fastify.register(coldChainRoutes, { prefix: "/api/cold-chain" });
  await fastify.register(cbamRoutes, { prefix: "/api/cbam" });
  await fastify.register(railRoutes, { prefix: "/api/rail" });
  await fastify.register(customsWarehouseRoutes, {
    prefix: "/api/customs-warehouse",
  });
  await fastify.register(fuelEuRoutes, { prefix: "/api/fueleu" });
  await fastify.register(tradeFinanceRoutes, { prefix: "/api/trade-finance" });
  await fastify.register(aeoSecurityRoutes, { prefix: "/api/aeo-security" });
  await fastify.register(charteringLaytimeRoutes, {
    prefix: "/api/chartering",
  });
  await fastify.register(generalAverageRoutes, {
    prefix: "/api/general-average",
  });
  await fastify.register(dangerousGoodsRoutes, {
    prefix: "/api/dangerous-goods",
  });
  await fastify.register(cargoInsuranceRoutes, {
    prefix: "/api/cargo-insurance",
  });
  await fastify.register(bulkOperationsRoutes, {
    prefix: "/api/bulk-operations",
  });
  await fastify.register(carbonRoutes, { prefix: "/api/carbon" });
  await fastify.register(telemetryRoutes, { prefix: "/api/telemetry" });
};

export default registerAllRoutes;
