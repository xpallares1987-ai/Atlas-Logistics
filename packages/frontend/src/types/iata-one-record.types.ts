/**
 * @file iata-one-record.types.ts
 * @description Domain types for IATA ONE Record Hub, Cargo iQ SLA Milestones, e-DGD Dangerous Goods Studio, and e-AWB Resolution 600b.
 * @module @atlas/frontend/types/iata-one-record
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

export type IataOneRecordTabKey =
  | "JSON_LD_EXPLORER"
  | "CARGO_IQ_TIMELINE"
  | "EDGD_STUDIO"
  | "EAWB_DIGITAL_POUCH";
