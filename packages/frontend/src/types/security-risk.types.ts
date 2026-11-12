/**
 * @file security-risk.types.ts
 * @description Types and interfaces for the Security, Risk & Resilience Center module.
 * @module @atlas/frontend/types
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import type {
  DigitalSignatureResult,
  QueuedDocument,
  OfflineQueueStats,
  calculateShipmentRisk,
  getRiskBadgeStyles,
  searchUnlocodes,
} from "@atlas/shared";

export type SecurityRiskTab =
  | "PASSKEYS_TOTP"
  | "DIGITAL_SIGNATURES"
  | "RISK_UNLOCODE"
  | "OFFLINE_RESILIENCE";

export type DocumentSignType =
  "PEDIMENTO" | "BILL_OF_LADING" | "E_CMR" | "CUSTOMS_DECLARATION";

export interface RegisteredFidoKey {
  id: string;
  device: string;
  registeredAt: string;
  status: string;
}

export interface PasskeysTotpTabProps {
  userEmail: string;
  setUserEmail: (v: string) => void;
  manifestId: string;
  setManifestId: (v: string) => void;
  deviceModel: string;
  setDeviceModel: (v: string) => void;
  isAuthenticating: boolean;
  passkeyResult: any;
  registeredKeys: RegisteredFidoKey[];
  onTestPasskeyAuth: () => void;
  totpSecret: string;
  totpInputCode: string;
  setTotpInputCode: (v: string) => void;
  totpVerificationStatus: boolean | null;
  backupCodes: string[];
  onVerifyTotp: () => void;
  onGenerateNewSecret: () => void;
}

export interface DigitalSignaturesTabProps {
  docType: DocumentSignType;
  setDocType: (v: DocumentSignType) => void;
  docId: string;
  setDocId: (v: string) => void;
  issuerOrg: string;
  setIssuerOrg: (v: string) => void;
  docPayload: string;
  setDocPayload: (v: string) => void;
  digitalSeal: DigitalSignatureResult | null;
  tamperedPayload: string;
  setTamperedPayload: (v: string) => void;
  tamperVerificationResult: boolean | null;
  onSignDocument: () => void;
  onVerifyTampering: () => void;
}

export interface RiskUnlocodeTabProps {
  originPort: string;
  setOriginPort: (v: string) => void;
  destinationPort: string;
  setDestinationPort: (v: string) => void;
  transportType: string;
  setTransportType: (v: string) => void;
  isHighPriority: boolean;
  setIsHighPriority: (v: boolean) => void;
  shipmentStatus: string;
  setShipmentStatus: (v: string) => void;
  predictedDelay: number;
  setPredictedDelay: (v: number) => void;
  riskResult: ReturnType<typeof calculateShipmentRisk>;
  riskBadge: ReturnType<typeof getRiskBadgeStyles>;
  unlocodeQuery: string;
  unlocodeCountry: string;
  unlocodeResults: ReturnType<typeof searchUnlocodes>;
  onSearchUnlocodes: (q: string, c: string) => void;
}

export interface OfflineResilienceTabProps {
  isOnline: boolean;
  offlineStats: OfflineQueueStats;
  offlineDocs: QueuedDocument[];
  isSyncingQueue: boolean;
  onAddSampleOfflineDoc: () => void;
  onProcessSyncQueue: () => void;
  onClearDeadLetter: () => void;
}
