/**
 * @file index.ts
 * @description Canonical barrel exports for CbamLedger components.
 * @module @atlas/frontend/components/CbamLedger
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export { Header } from "./Header";
export type { CbamLedgerHeaderProps, CbamLedgerTabId } from "./Header";

export { Declarations, Pooling, BookAndClaim } from "./Tab";
export type {
  DeclarationsProps,
  CbamDeclarationRecord,
  PoolingProps,
  PooledVessel,
  BookAndClaimProps,
  InsettingToken,
  InsettingAllocationBlock,
} from "./Tab";
