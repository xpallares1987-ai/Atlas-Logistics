/**
 * @file demurrage.types.ts
 * @description TypeScript contracts for Demurrage & Detention Control Tower, FMC § 541 audits, and dispute dossiers.
 * @module @atlas/frontend/types/demurrage
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import type { SuspensionReasonCode } from "@atlas/shared";

export type DemurrageTabKey = "RADAR" | "SUSPENSIONS" | "AUDIT" | "DOSSIER";

export interface GeminiFmcDraftResult {
  draftText: string;
  source: "gemini-live" | "gemini-cache" | "deterministic-fallback";
  model: string;
  latencyMs: number;
  quotaRemainingRpm: number;
  reason?: string;
}

export interface DispatchReceipt {
  confirmationCode: string;
  messageId: string;
  dispatchedAt?: string;
}

export interface NewSuspensionInput {
  reasonCode: SuspensionReasonCode;
  reasonText: string;
  startDate: string;
  endDate: string;
  noticeRef: string;
}

export interface FmcChecklistItem {
  name: string;
  valid: boolean;
}
