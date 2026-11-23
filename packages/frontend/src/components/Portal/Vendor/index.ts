/**
 * @file index.ts
 * @description Canonical barrel exports for B2B Vendor Portal UI components (ADR 0035).
 * Re-exports atomic components and data models following ADR 0020 and AGENTS.md §7.
 * @module @atlas/frontend/components/Portal/Vendor
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

export * from "./types";
export * from "./Banner/Metrics";
export * from "./Queue/Table";
export * from "./Drawer/Detail";
export * from "./Timeline/Stepper";
export * from "./Modal/ConfirmPo";
export * from "./Modal/RecordMilestone";
export * from "./Modal/TokenAuth";
