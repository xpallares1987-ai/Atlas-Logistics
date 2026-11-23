/**
 * @file index.ts
 * @description Root barrel exports for ErpIntegrations components.
 * @module @atlas/frontend/components/ErpIntegrations
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export { Topology, Mapping, Sandbox, Queue } from "./Tab";
export type {
  TopologyProps,
  SandboxProps,
  PresetKey,
  ErpPurchaseOrder,
  QueueProps,
} from "./Tab";
