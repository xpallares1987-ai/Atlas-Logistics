/**
 * @file useEFirmaHub.ts
 * @description Custom state and WebCrypto hook for the SAT e.firma Cryptographic Vault & Signing Hub.
 * @module @atlas/frontend/components/EFirmaHub/hooks
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import { useState, useEffect, useCallback } from "react";
import { useApiMutation, useApiQuery } from "../../../hooks/useApiQuery";
import { useShipments } from "../../../hooks/useShipments";
import {
  generateCanonicalCadenaOriginal,
  signCadenaOriginalWebCrypto,
  verifyDigitalSealWebCrypto,
  generateSandboxRsaKeyPair,
  extractCertificateMetadata,
} from "@atlas/shared";
import type {
  EFirmaHubTab,
  EFirmaCertificateMetadata,
  EFirmaSigningPayload,
  EFirmaDigitalSealResult,
  EFirmaAuditStamp,
  EFirmaVerificationFeedback,
} from "../../../types/efirma-hub.types";

// ============================================================================
// 1. HOOK DEFINITION & STATE
// ============================================================================

export function useEFirmaHub() {
  const [activeTab, setActiveTab] = useState<EFirmaHubTab>("SIGNING_STUDIO");
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>("sh_demo_01");
  const [selectedDocId, setSelectedDocId] = useState<string>("");

  const { data: shipments = [] } = useShipments();
  const activeShipment =
    shipments.find((s) => s.id === selectedShipmentId) || shipments[0];

  const { data: documentsData, refetch: refetchDocuments } = useApiQuery<{
    success: boolean;
    data: any[];
  }>(
    ["documents-shipment", selectedShipmentId],
    `/documents?shipmentId=${selectedShipmentId}`,
  );
  const documents = documentsData?.data || [];
  const activeDocument =
    documents.find((d) => d.id === selectedDocId) || documents[0];

  const { data: stampsData, refetch: refetchStamps } = useApiQuery<{
    success: boolean;
    stamps: any[];
  }>(
    ["efirma-stamps", selectedShipmentId],
    `/efirma/stamps?shipmentId=${selectedShipmentId}`,
  );
  const stamps = stampsData?.stamps || [];
  const matchingStamp = stamps.find(
    (s: any) => s.documentId === activeDocument?.id,
  );

  // Volatile In-Memory Key & Certificate State
  const [cryptoKeyPair, setCryptoKeyPair] = useState<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  } | null>(null);
  const [activeCertificate, setActiveCertificate] =
    useState<EFirmaCertificateMetadata | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultExpiresInMinutes, setVaultExpiresInMinutes] = useState(15);

  // File Upload State
  const [cerFileName, setCerFileName] = useState<string | null>(null);
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [loadingUnlock, setLoadingUnlock] = useState(false);

  // Signing Studio State
  const [signingPayload, setSigningPayload] = useState<EFirmaSigningPayload>({
    documentType: "PEDIMENTO_ADUANAL",
    documentId: "doc_dua_demo_01",
    rfcEmisor: "IGE260101XYZ",
    rfcReceptor: "ALH260202ABC",
    declaredAmountUsd: 145000,
    declaredAmountMxn: 2610000,
    rawContent: "Documento oficial aduanero para despacho de importación",
  });

  const [generatedCadenaOriginal, setGeneratedCadenaOriginal] =
    useState<string>(generateCanonicalCadenaOriginal(signingPayload));
  const [activeSealResult, setActiveSealResult] =
    useState<EFirmaDigitalSealResult | null>(null);
  const [activeAuditStamp, setActiveAuditStamp] =
    useState<EFirmaAuditStamp | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const [copiedCadena, setCopiedCadena] = useState(false);
  const [copiedSello, setCopiedSello] = useState(false);

  // Public Verifier Form State
  const [verifierCadena, setVerifierCadena] = useState("");
  const [verifierSello, setVerifierSello] = useState("");
  const [verifierSerial, setVerifierSerial] = useState("30001000000508192011");
  const [verifierRfc, setVerifierRfc] = useState("AAN940112XX1");
  const [verificationFeedback, setVerificationFeedback] =
    useState<EFirmaVerificationFeedback | null>(null);

  // ============================================================================
  // 2. MUTATIONS & HANDLERS
  // ============================================================================

  const verifyMutation = useApiMutation<
    { success: boolean; isValid: boolean },
    any
  >("/efirma/verify", "POST");

  const auditStampMutation = useApiMutation<
    { success: boolean; auditStamp: EFirmaAuditStamp },
    any
  >("/efirma/audit-stamp", "POST", {
    onSuccess: (res) => {
      setActiveAuditStamp(res.auditStamp);
      refetchStamps();
      refetchDocuments();
    },
  });

  const handleLoadSandboxCredentials = useCallback(async () => {
    try {
      setLoadingUnlock(true);
      const sandbox = await generateSandboxRsaKeyPair();
      setCryptoKeyPair({
        publicKey: sandbox.publicKey,
        privateKey: sandbox.privateKey,
      });
      setActiveCertificate(sandbox.metadata);
      setIsVaultUnlocked(true);
      setCerFileName("SAT_SANDBOX_AAN940112XX1.cer");
      setKeyFileName("SAT_SANDBOX_AAN940112XX1.key");
      setPassphrase("••••••••••••");
      setVaultExpiresInMinutes(15);
    } finally {
      setLoadingUnlock(false);
    }
  }, []);

  useEffect(() => {
    handleLoadSandboxCredentials();
  }, [handleLoadSandboxCredentials]);

  useEffect(() => {
    const cadena = generateCanonicalCadenaOriginal(signingPayload);
    setGeneratedCadenaOriginal(cadena);
  }, [signingPayload]);

  useEffect(() => {
    if (activeDocument) {
      const docTypeMapping: Record<string, any> = {
        CUSTOMS_DECLARATION: "PEDIMENTO_ADUANAL",
        CARTA_PORTE: "CARTA_PORTE",
        BILL_OF_LADING: "BILL_OF_LADING",
        INSURANCE: "POLIZA_SEGURO",
        INVOICE: "PEDIMENTO_ADUANAL",
      };
      const mappedType =
        docTypeMapping[activeDocument.type] || "PEDIMENTO_ADUANAL";
      const newPayload: EFirmaSigningPayload = {
        documentType: mappedType,
        documentId: activeDocument.id,
        rfcEmisor: "IGE260101XYZ",
        rfcReceptor: "ALH260202ABC",
        declaredAmountUsd: 145000,
        declaredAmountMxn: 2610000,
        rawContent: activeDocument.payloadData || activeDocument.name,
      };
      setSigningPayload(newPayload);
      setGeneratedCadenaOriginal(generateCanonicalCadenaOriginal(newPayload));

      if (matchingStamp) {
        setActiveAuditStamp(matchingStamp);
        setVerifierCadena(matchingStamp.cadenaOriginalSha256 || "");
        setVerifierSello(matchingStamp.selloDigitalBase64 || "");
      } else {
        setActiveSealResult(null);
        setActiveAuditStamp(null);
      }
    }
  }, [activeDocument, matchingStamp]);

  const handleLockVault = () => {
    setCryptoKeyPair(null);
    setIsVaultUnlocked(false);
    setActiveSealResult(null);
  };

  const handleCerFileUpload = (file: File) => {
    setCerFileName(file.name);
    setActiveCertificate(
      extractCertificateMetadata(
        file.name,
        "AAN940112XX1",
        "AGENCIA ADUANAL DEL NORTE S.C.",
      ),
    );
  };

  const handleExecuteSign = async () => {
    if (!cryptoKeyPair?.privateKey || !activeCertificate) {
      setActiveTab("VAULT_CERT");
      return;
    }

    try {
      setIsSigning(true);
      const cadena = generateCanonicalCadenaOriginal(signingPayload);
      const seal = await signCadenaOriginalWebCrypto(
        cadena,
        cryptoKeyPair.privateKey,
        activeCertificate,
      );

      setActiveSealResult(seal);
      setVerifierCadena(cadena);
      setVerifierSello(seal.selloDigitalBase64);

      auditStampMutation.mutate({
        shipmentId: selectedShipmentId,
        documentId: signingPayload.documentId,
        documentType: signingPayload.documentType,
        sealResult: seal,
      });
    } catch (err: any) {
      console.error("Error signing with WebCrypto:", err);
    } finally {
      setIsSigning(false);
    }
  };

  const handleCopyCadena = () => {
    navigator.clipboard.writeText(generatedCadenaOriginal);
    setCopiedCadena(true);
    setTimeout(() => setCopiedCadena(false), 2000);
  };

  const handleCopySello = () => {
    if (activeSealResult?.selloDigitalBase64) {
      navigator.clipboard.writeText(activeSealResult.selloDigitalBase64);
      setCopiedSello(true);
      setTimeout(() => setCopiedSello(false), 2000);
    }
  };

  const handleTestVerify = async () => {
    if (!verifierCadena || !verifierSello) {
      setVerificationFeedback({
        tested: true,
        valid: false,
        message:
          "Por favor proporcione la Cadena Original y el Sello Digital a validar.",
      });
      return;
    }

    if (cryptoKeyPair?.publicKey) {
      const isValid = await verifyDigitalSealWebCrypto(
        verifierCadena,
        verifierSello,
        cryptoKeyPair.publicKey,
      );

      if (isValid) {
        setVerificationFeedback({
          tested: true,
          valid: true,
          message:
            "¡Sello Digital Auténtico! La firma coincide matemáticamente con la clave pública del certificado.",
        });
        return;
      }
    }

    verifyMutation.mutate(
      {
        cadenaOriginal: verifierCadena,
        selloDigitalBase64: verifierSello,
        certificateSerial: verifierSerial,
        rfcTitular: verifierRfc,
      },
      {
        onSuccess: (res) => {
          setVerificationFeedback({
            tested: true,
            valid: res.isValid,
            message: res.isValid
              ? "Sello digital validado por el motor criptográfico dual (RSASSA-PKCS1-v1_5 / SHA-256)."
              : "Firma inválida o documento alterado.",
          });
        },
        onError: () => {
          setVerificationFeedback({
            tested: true,
            valid: false,
            message:
              "Error al verificar la firma. El formato de la cadena o el sello es inválido.",
          });
        },
      },
    );
  };

  return {
    activeTab,
    setActiveTab,
    selectedShipmentId,
    setSelectedShipmentId,
    selectedDocId,
    setSelectedDocId,
    shipments,
    activeShipment,
    documents,
    activeDocument,
    stamps,
    matchingStamp,
    activeCertificate,
    isVaultUnlocked,
    vaultExpiresInMinutes,
    cerFileName,
    keyFileName,
    setKeyFileName,
    passphrase,
    setPassphrase,
    loadingUnlock,
    signingPayload,
    setSigningPayload,
    generatedCadenaOriginal,
    activeSealResult,
    activeAuditStamp,
    isSigning,
    copiedCadena,
    copiedSello,
    verifierCadena,
    setVerifierCadena,
    verifierSello,
    setVerifierSello,
    verifierSerial,
    setVerifierSerial,
    verifierRfc,
    setVerifierRfc,
    verificationFeedback,
    isVerifying: verifyMutation.isPending,
    handleLoadSandboxCredentials,
    handleLockVault,
    handleCerFileUpload,
    handleExecuteSign,
    handleCopyCadena,
    handleCopySello,
    handleTestVerify,
  };
}
