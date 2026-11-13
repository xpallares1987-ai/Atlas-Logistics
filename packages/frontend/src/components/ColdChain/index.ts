/**
 * @file index.ts
 * @description Barrel exports for the Cold Chain & Pharma GDP module.
 * @module @atlas/frontend/components/ColdChain
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export { Header } from "./Header";
export type { HeaderProps } from "./Header";

export { Monitor } from "./Tab/Monitor";
export type { MonitorProps } from "./Tab/Monitor";

export { Calculator } from "./Tab/Calculator";
export type { CalculatorProps } from "./Tab/Calculator";

export { AuditGdp } from "./Tab/AuditGdp";
export type { AuditGdpProps } from "./Tab/AuditGdp";

export { GdpRelease } from "./Modal/GdpRelease";
export type { GdpReleaseProps } from "./Modal/GdpRelease";

export { useColdChain, getGdpVerdictBadge } from "./hooks/useColdChain";
