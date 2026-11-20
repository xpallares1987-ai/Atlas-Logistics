/**
 * @file index.ts
 * @description Canonical barrel for domain services in `@atlas/rate-comparer`.
 * @module @atlas/rate-comparer/services
 * @see {@link docs/adr/0020-modular-frontend-decomposition-and-naming-standards.md}
 */

export * from "./carbon.service";
export * from "./currency.service";
export * from "./drizzle-rate.service";
export * from "./gemini.service";
export * from "./pdf.service";
export { generateExecutiveReport as generateSummaryReport } from "./report.service";
