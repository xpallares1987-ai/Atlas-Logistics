/**
 * @file index.ts
 * @description Canonical barrel exports for CbamLedger semantic Tab components.
 * @module @atlas/frontend/components/CbamLedger/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

export { Declarations } from "./Declarations";
export type { DeclarationsProps, CbamDeclarationRecord } from "./Declarations";

export { Pooling } from "./Pooling";
export type { PoolingProps, PooledVessel } from "./Pooling";

export { BookAndClaim } from "./BookAndClaim";
export type {
  BookAndClaimProps,
  InsettingToken,
  InsettingAllocationBlock,
} from "./BookAndClaim";
