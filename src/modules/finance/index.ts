/**
 * Financial Management & Accounting Domain Module
 * Invoicing (AR/AP), agent settlements, financial analytics, FX caching, and statement PDFs.
 */

export * from "../../routes/financial/invoices.routes.js";
export * from "../../routes/financial/settlements.routes.js";
export * from "../../routes/financial/analytics.routes.js";
export * from "../../routes/financial/seed-data.js";
export type {
  InvoiceData,
  AgentSettlementData,
} from "../../services/pdf/generators/core-operations.pdf.js";
export { default as financialRoutes } from "../../routes/financial.routes.js";
export * from "../../db/schema/finance.js";
export * from "../../db/seeds/finance.seed.js";
