/**
 * @file efirma-hub.types.ts
 * @description Domain types and tab identifiers for the SAT e.firma Cryptographic Vault & Signing Hub.
 * @module @atlas/frontend/types/efirma-hub
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import type {
  EFirmaCertificateMetadata,
  EFirmaSigningPayload,
  EFirmaDigitalSealResult,
  EFirmaAuditStamp,
} from "@atlas/shared";

export type EFirmaHubTab = "VAULT_CERT" | "SIGNING_STUDIO" | "PUBLIC_VERIFIER";

export interface EFirmaVerificationFeedback {
  tested: boolean;
  valid: boolean;
  message: string;
}

export type {
  EFirmaCertificateMetadata,
  EFirmaSigningPayload,
  EFirmaDigitalSealResult,
  EFirmaAuditStamp,
};
