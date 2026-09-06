/**
 * Customs & TARIC Domain Module
 * EU DUA / SAD 54-box declarations, TARIC classification, VAT/duty calculation and trade sanctions compliance.
 */

export * from "./compliance.service.js";
export * from "./tariff.service.js";
export * from "./dua-xml.service.js";
export * from "./customs.pdf.js";
export * from "./customs.routes.js";
export { default as customsRoutes } from "./customs.routes.js";
