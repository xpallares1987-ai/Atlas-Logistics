/**
 * @file control-tower-impact.engine.ts
 * @description Alias barrel module for Supply Chain Predictive Exceptions and SLA Impact Engine (ADR 0033).
 * Re-exports the pure domain functions from predictive-exceptions.engine.ts.
 * Strictly decoupled from Drizzle ORM, libSQL, and Fastify HTTP.
 * @module @atlas/scm/engines/control-tower-impact
 * @see {@link docs/adr/0033-supply-chain-visibility-and-predictive-milestone-tracking.md}
 */

export * from "./predictive-exceptions.engine.js";
