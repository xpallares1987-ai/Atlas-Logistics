/**
 * Core Operations & Execution Domain Module
 * Bookings management, demurrage & detention tracking, LCL consolidation & 3D container packing, warehouse traffic & inventory.
 */

export * from "../../routes/operations/bookings.routes.js";
export * from "../../routes/operations/demurrage.routes.js";
export * from "../../routes/operations/lcl.routes.js";
export * from "../../routes/operations/warehouse-traffic.routes.js";
export * from "../../routes/operations/seed-data.js";
export * from "../../services/pdf/generators/core-operations.pdf.js";
export { default as operationsRoutes } from "../../routes/operations.routes.js";
export * from "../../db/schema/operations.js";
export * from "../../db/seeds/operations.seed.js";
