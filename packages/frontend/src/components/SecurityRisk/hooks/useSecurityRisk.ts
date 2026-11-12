/**
 * @file useSecurityRisk.ts
 * @description Custom React hook encapsulating Passkeys/TOTP, WebCrypto digital signatures, Risk Scorer/UNLOCODE, and Offline Queue state.
 * @module @atlas/frontend/components/SecurityRisk/hooks
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { useState, useEffect } from "react";
import {
  generateBase32Secret,
  verifyTOTP,
  generateBackupCodes,
  authenticateWithHardwareToken,
  verifyHardwareSignature,
  digitalSignatureService,
  type DigitalSignaturePayload,
  type DigitalSignatureResult,
  calculateShipmentRisk,
  getRiskBadgeStyles,
  searchUnlocodes,
  offlineDocumentQueue,
  type QueuedDocument,
  type OfflineQueueStats,
} from "@atlas/shared";
import type {
  SecurityRiskTab,
  DocumentSignType,
  RegisteredFidoKey,
} from "../../../types/security-risk.types";

export const INITIAL_REGISTERED_KEYS: RegisteredFidoKey[] = [
  {
    id: "fido2-cred-7a9b1c2d",
    device: "YubiKey 5 NFC (Series FIPS)",
    registeredAt: "2026-09-15 10:20:00",
    status: "Active",
  },
  {
    id: "fido2-cred-99e2f41a",
    device: "Windows Hello / TPM 2.0",
    registeredAt: "2026-10-01 08:45:00",
    status: "Active",
  },
];

export const INITIAL_PEDIMENTO_PAYLOAD = JSON.stringify(
  {
    aduanaDespacho: "480 - Nuevo Laredo",
    patenteAgente: "3001",
    regimenAduanero: "A1 (Importación Definitiva)",
    tipoOperacion: "IMPORTACION",
    valorComercialUSD: 142500,
    pedimentoClave: "26 48 3001 6001889",
    mercancia: "COMPONENTES ELECTRONICOS / CHIPS AUTOMOTRICES",
  },
  null,
  2,
);

export function useSecurityRisk() {
  const [activeTab, setActiveTab] = useState<SecurityRiskTab>("PASSKEYS_TOTP");

  // ============================================================================
  // 1. TAB 1: PASSKEYS & TOTP STATE
  // ============================================================================

  const [userEmail, setUserEmail] = useState(
    "officer.security@atlas-logistics.com",
  );
  const [manifestId, setManifestId] = useState("MNF-2026-X884");
  const [deviceModel, setDeviceModel] = useState(
    "YubiKey 5 NFC / TouchID Biometric",
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [passkeyResult, setPasskeyResult] = useState<any>(null);
  const [registeredKeys] = useState<RegisteredFidoKey[]>(
    INITIAL_REGISTERED_KEYS,
  );

  const [totpSecret, setTotpSecret] = useState(() => generateBase32Secret(16));
  const [totpInputCode, setTotpInputCode] = useState("");
  const [totpVerificationStatus, setTotpVerificationStatus] = useState<
    boolean | null
  >(null);
  const [backupCodes, setBackupCodes] = useState<string[]>(() =>
    generateBackupCodes(5),
  );

  const handleTestPasskeyAuth = async () => {
    setIsAuthenticating(true);
    try {
      const result = await authenticateWithHardwareToken(
        manifestId,
        userEmail,
        {
          simulatedDelayMs: 600,
          deviceModel,
        },
      );
      const isValid = verifyHardwareSignature(result, manifestId);
      setPasskeyResult({ ...result, isValid });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyTotp = () => {
    const valid = verifyTOTP(totpSecret, totpInputCode);
    setTotpVerificationStatus(valid);
  };

  const handleGenerateNewSecret = () => {
    const newSec = generateBase32Secret(16);
    setTotpSecret(newSec);
    setBackupCodes(generateBackupCodes(5));
    setTotpVerificationStatus(null);
  };

  // ============================================================================
  // 2. TAB 2: DIGITAL SIGNATURES (WEBCRYPTO) STATE
  // ============================================================================

  const [docType, setDocType] = useState<DocumentSignType>("PEDIMENTO");
  const [docId, setDocId] = useState("PED-2026-SAT-480-1289");
  const [issuerId] = useState("AGENCIA-ADUANAL-3001");
  const [issuerOrg, setIssuerOrg] = useState(
    "Atlas Cross-Border Customs Brokerage S.A.",
  );
  const [docPayload, setDocPayload] = useState(INITIAL_PEDIMENTO_PAYLOAD);
  const [digitalSeal, setDigitalSeal] = useState<DigitalSignatureResult | null>(
    null,
  );
  const [tamperedPayload, setTamperedPayload] = useState("");
  const [tamperVerificationResult, setTamperVerificationResult] = useState<
    boolean | null
  >(null);

  const handleSignDocument = async () => {
    const payload: DigitalSignaturePayload = {
      documentId: docId,
      documentType: docType as any,
      issuerId,
      issuerOrg,
      content: docPayload,
    };
    const res = await digitalSignatureService.signDocument(payload);
    setDigitalSeal(res);
    setTamperedPayload(docPayload);
    setTamperVerificationResult(null);
  };

  const handleVerifyTampering = async () => {
    if (!digitalSeal) return;
    const testPayload: DigitalSignaturePayload = {
      documentId: docId,
      documentType: docType as any,
      issuerId,
      issuerOrg,
      content: tamperedPayload,
    };
    const valid = await digitalSignatureService.verifyDocumentSignature(
      testPayload,
      digitalSeal,
    );
    setTamperVerificationResult(valid);
  };

  // ============================================================================
  // 3. TAB 3: RISK SCORER & UN/LOCODE STATE
  // ============================================================================

  const [originPort, setOriginPort] = useState("CNSHA");
  const [destinationPort, setDestinationPort] = useState("USLAX");
  const [transportType, setTransportType] = useState("SEA");
  const [isHighPriority, setIsHighPriority] = useState(true);
  const [shipmentStatus, setShipmentStatus] = useState("delayed");
  const [predictedDelay, setPredictedDelay] = useState(4);

  const [unlocodeQuery, setUnlocodeQuery] = useState("");
  const [unlocodeCountry, setUnlocodeCountry] = useState("");
  const [unlocodeResults, setUnlocodeResults] = useState(() =>
    searchUnlocodes(""),
  );

  const riskResult = calculateShipmentRisk({
    originPort,
    destinationPort,
    type: transportType,
    priority: isHighPriority ? "HIGH" : "NORMAL",
    status: shipmentStatus,
    predictedDelayDays: predictedDelay,
  });

  const riskBadge = getRiskBadgeStyles(riskResult.score);

  const handleSearchUnlocodes = (q: string, c: string) => {
    setUnlocodeQuery(q);
    setUnlocodeCountry(c);
    setUnlocodeResults(searchUnlocodes(q, c, 10));
  };

  // ============================================================================
  // 4. TAB 4: OFFLINE QUEUE STATE
  // ============================================================================

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [offlineStats, setOfflineStats] = useState<OfflineQueueStats>(() =>
    offlineDocumentQueue.getStats(),
  );
  const [offlineDocs, setOfflineDocs] = useState<QueuedDocument[]>(() =>
    offlineDocumentQueue.getAll(),
  );
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshOfflineState = () => {
    setOfflineStats(offlineDocumentQueue.getStats());
    setOfflineDocs(offlineDocumentQueue.getAll());
  };

  const handleAddSampleOfflineDoc = () => {
    offlineDocumentQueue.enqueue({
      shipmentId: `SHP-${Math.floor(1000 + Math.random() * 9000)}`,
      documentType: "CUSTOMS_PEDIMENTO_SCAN",
      fileName: `pedimento-scan-${Date.now().toString().slice(-4)}.pdf`,
      fileBase64: "JVBERi0xLjQKJ...",
      fileSize: "1.8 MB",
      comments: "Escaneado offline en garita aduanal fronteriza",
      uploadedBy: "supervisor.patio@atlas-logistics.com",
    });
    refreshOfflineState();
  };

  const handleProcessSyncQueue = async () => {
    setIsSyncingQueue(true);
    try {
      await offlineDocumentQueue.processQueue(async () => {
        await new Promise((r) => setTimeout(r, 400));
        return { success: true };
      });
    } finally {
      setIsSyncingQueue(false);
      refreshOfflineState();
    }
  };

  const handleClearDeadLetter = () => {
    offlineDocumentQueue.clearDeadLetterQueue();
    refreshOfflineState();
  };

  return {
    activeTab,
    setActiveTab,
    userEmail,
    setUserEmail,
    manifestId,
    setManifestId,
    deviceModel,
    setDeviceModel,
    isAuthenticating,
    passkeyResult,
    registeredKeys,
    totpSecret,
    totpInputCode,
    setTotpInputCode,
    totpVerificationStatus,
    backupCodes,
    handleTestPasskeyAuth,
    handleVerifyTotp,
    handleGenerateNewSecret,
    docType,
    setDocType,
    docId,
    setDocId,
    issuerOrg,
    setIssuerOrg,
    docPayload,
    setDocPayload,
    digitalSeal,
    tamperedPayload,
    setTamperedPayload,
    tamperVerificationResult,
    handleSignDocument,
    handleVerifyTampering,
    originPort,
    setOriginPort,
    destinationPort,
    setDestinationPort,
    transportType,
    setTransportType,
    isHighPriority,
    setIsHighPriority,
    shipmentStatus,
    setShipmentStatus,
    predictedDelay,
    setPredictedDelay,
    riskResult,
    riskBadge,
    unlocodeQuery,
    unlocodeCountry,
    unlocodeResults,
    handleSearchUnlocodes,
    isOnline,
    offlineStats,
    offlineDocs,
    isSyncingQueue,
    handleAddSampleOfflineDoc,
    handleProcessSyncQueue,
    handleClearDeadLetter,
  };
}
