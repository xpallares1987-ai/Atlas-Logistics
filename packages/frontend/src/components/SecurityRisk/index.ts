/**
 * @file index.ts
 * @description Barrel export for Security, Risk & Resilience Center components.
 * @module @atlas/frontend/components/SecurityRisk
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

export { Header } from "./Header";
export { Navigation } from "./Navigation";
export { PasskeysTotp } from "./Tab/PasskeysTotp";
export { DigitalSignatures } from "./Tab/DigitalSignatures";
export { RiskUnlocode } from "./Tab/RiskUnlocode";
export { OfflineResilience } from "./Tab/OfflineResilience";
export {
  useSecurityRisk,
  INITIAL_REGISTERED_KEYS,
  INITIAL_PEDIMENTO_PAYLOAD,
} from "./hooks/useSecurityRisk";
