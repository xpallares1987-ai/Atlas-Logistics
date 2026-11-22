/**
 * @file carrier-telemetry-normalizer.engine.ts
 * @description Pure domain engine barrel re-exporting multi-modal carrier telemetry normalizers.
 * Follows monorepo canonical engine naming standards (AGENTS.md §6).
 * @module @atlas/scm/engines/carrier-telemetry-normalizer
 * @see {@link docs/adr/0034-carrier-track-and-trace-async-ingestion-and-predictive-resolution.md}
 */

export * from "./carrier-telemetry.normalizer.js";

import { normalizeCarrierEvent } from "./carrier-telemetry.normalizer.js";

/**
 * Canonical alias for unified telemetry normalization
 */
export const normalizeCarrierTelemetry = normalizeCarrierEvent;
