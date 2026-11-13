/**
 * @file index.ts
 * @description Canonical barrel exports for the SAT e.firma Hub components.
 * @module @atlas/frontend/components/EFirmaHub
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

export { Header } from "./Header";
export { Navigation } from "./Navigation";
export { RelationalDocumentSelector } from "./Banner/RelationalDocumentSelector";
export { SigningStudio } from "./Tab/SigningStudio";
export { VaultCert } from "./Tab/VaultCert";
export { PublicVerifier } from "./Tab/PublicVerifier";
export { useEFirmaHub } from "./hooks/useEFirmaHub";
