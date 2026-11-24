/**
 * @file index.ts
 * @description Main library barrel export for @atlas/client-sdk.
 * @module @atlas/client-sdk
 * @see {@link docs/architecture/atlas-monorepo-structure.md}
 */

// Core client and factory
export { AtlasClient, createAtlasClient } from "./client.js";

// Errors
export {
  AtlasApiError,
  type AtlasApiErrorData,
} from "./errors/atlas-api.error.js";

// Base resource interface
export { BaseResource, type IHttpClient } from "./resources/base.resource.js";

// Domain resources
export { ShipmentsResource } from "./resources/shipments.resource.js";
export { BookingsResource } from "./resources/bookings.resource.js";
export { FinancialResource } from "./resources/financial.resource.js";
export { CustomsResource } from "./resources/customs.resource.js";
export { WarehouseResource } from "./resources/warehouse.resource.js";
export { TelemetryResource } from "./resources/telemetry.resource.js";

// Re-export all type contracts
export * from "./types/index.js";
