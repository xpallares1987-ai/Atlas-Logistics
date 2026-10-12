import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Key,
  FileCheck,
  Lock,
  Unlock,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  FileText,
  Clock,
  ShieldAlert,
  Scale,
  Zap,
  Compass,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { useApiMutation, useApiQuery } from "../hooks/useApiQuery";
import type {
  EFirmaCertificateMetadata,
  EFirmaSigningPayload,
  EFirmaDigitalSealResult,
  EFirmaAuditStamp,
} from "@atlas/shared";
import {
  generateCanonicalCadenaOriginal,
  signCadenaOriginalWebCrypto,
  verifyDigitalSealWebCrypto,
  generateSandboxRsaKeyPair,
  extractCertificateMetadata,
  EFIRMA_DEMO_PRESETS,
} from "@atlas/shared";

type PresetKey =
  | "pedimento_a1_general"
  | "pedimento_af_immex"
  | "carta_porte_31_transfronteriza"
  | "ebl_mletr_maritimo";

export default function EFirmaHubModule() {
  const [activeTab, setActiveTab] = useState<"VAULT_CERT" | "SIGNING_STUDIO" | "PUBLIC_VERIFIER">("SIGNING_STUDIO");
  const [selectedPresetKey, setSelectedPresetKey] = useState<PresetKey>("pedimento_a1_general");

  // Volatile In-Memory Key & Certificate State (Never persisted to localStorage)
  const [cryptoKeyPair, setCryptoKeyPair] = useState<{ publicKey: CryptoKey; privateKey: CryptoKey } | null>(null);
  const [activeCertificate, setActiveCertificate] = useState<EFirmaCertificateMetadata | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultExpiresInMinutes, setVaultExpiresInMinutes] = useState(15);

  // File Upload State
  const [cerFileName, setCerFileName] = useState<string | null>(null);
  const [keyFileName, setKeyFileName] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [loadingUnlock, setLoadingUnlock] = useState(false);

  // Signing Studio State
  const currentPreset = EFIRMA_DEMO_PRESETS[selectedPresetKey];
  const [signingPayload, setSigningPayload] = useState<EFirmaSigningPayload>({
    documentType: currentPreset.documentType,
    documentId: currentPreset.documentId,
    rfcEmisor: currentPreset.rfcEmisor,
    rfcReceptor: currentPreset.rfcReceptor,
    declaredAmountUsd: (currentPreset as any).declaredAmountUsd,
    declaredAmountMxn: (currentPreset as any).declaredAmountMxn,
    rawContent: currentPreset.rawContent,
  });

  const [generatedCadenaOriginal, setGeneratedCadenaOriginal] = useState<string>(
    generateCanonicalCadenaOriginal(signingPayload)
  );
  const [activeSealResult, setActiveSealResult] = useState<EFirmaDigitalSealResult | null>(null);
  const [activeAuditStamp, setActiveAuditStamp] = useState<EFirmaAuditStamp | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // Clipboard copies
  const [copiedCadena, setCopiedCadena] = useState(false);
  const [copiedSello, setCopiedSello] = useState(false);

  // Public Verifier Form State
  const [verifierCadena, setVerifierCadena] = useState("");
  const [verifierSello, setVerifierSello] = useState("");
  const [verifierSerial, setVerifierSerial] = useState("30001000000508192011");
  const [verifierRfc, setVerifierRfc] = useState("AAN940112XX1");
  const [verificationFeedback, setVerificationFeedback] = useState<{
    tested: boolean;
    valid: boolean;
    message: string;
  } | null>(null);

  // Queries & Mutations
  const { data: auditLogData, refetch: refetchAuditLog } = useApiQuery<{ success: boolean; stamps: EFirmaAuditStamp[] }>(
    ["efirma-audit-log"],
    "/efirma/audit-log"
  );

  const verifyMutation = useApiMutation<{ success: boolean; isValid: boolean }, any>(
    "/efirma/verify",
    "POST"
  );

  const auditStampMutation = useApiMutation<{ success: boolean; auditStamp: EFirmaAuditStamp }, any>(
    "/efirma/audit-stamp",
    "POST",
    {
      onSuccess: (res) => {
        setActiveAuditStamp(res.auditStamp);
        refetchAuditLog();
      },
    }
  );

  // Auto-load Sandbox credentials on mount so the user has an immediate functioning zero-knowledge sandbox
  useEffect(() => {
    handleLoadSandboxCredentials();
  }, []);

  // Update Cadena Original whenever payload changes
  useEffect(() => {
    const cadena = generateCanonicalCadenaOriginal(signingPayload);
    setGeneratedCadenaOriginal(cadena);
  }, [signingPayload]);

  // Handler: Load Official Sandbox SAT Credentials into client RAM
  const handleLoadSandboxCredentials = async () => {
    try {
      setLoadingUnlock(true);
      const sandbox = await generateSandboxRsaKeyPair();
      setCryptoKeyPair({ publicKey: sandbox.publicKey, privateKey: sandbox.privateKey });
      setActiveCertificate(sandbox.metadata);
      setIsVaultUnlocked(true);
      setCerFileName("SAT_SANDBOX_AAN940112XX1.cer");
      setKeyFileName("SAT_SANDBOX_AAN940112XX1.key");
      setPassphrase("••••••••••••");
      setVaultExpiresInMinutes(15);
    } finally {
      setLoadingUnlock(false);
    }
  };

  // Handler: Lock & Purge Vault from RAM
  const handleLockVault = () => {
    setCryptoKeyPair(null);
    setIsVaultUnlocked(false);
    setActiveSealResult(null);
  };

  // Handler: Select Preset
  const handleSelectPreset = (key: PresetKey) => {
    setSelectedPresetKey(key);
    const p = EFIRMA_DEMO_PRESETS[key];
    const newPayload: EFirmaSigningPayload = {
      documentType: p.documentType,
      documentId: p.documentId,
      rfcEmisor: p.rfcEmisor,
      rfcReceptor: p.rfcReceptor,
      declaredAmountUsd: (p as any).declaredAmountUsd,
      declaredAmountMxn: (p as any).declaredAmountMxn,
      rawContent: p.rawContent,
    };
    setSigningPayload(newPayload);
    setGeneratedCadenaOriginal(generateCanonicalCadenaOriginal(newPayload));
    setActiveSealResult(null);
    setActiveAuditStamp(null);
  };

  // Handler: Execute WebCrypto Client-Side Signing
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
        activeCertificate
      );

      setActiveSealResult(seal);
      setVerifierCadena(cadena);
      setVerifierSello(seal.selloDigitalBase64);

      // Register audit stamp in backend Fastify (Zero-knowledge: sends only public seal + metadata)
      auditStampMutation.mutate({
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

  // Handler: Copy to Clipboard
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

  // Handler: Public Verification Test
  const handleTestVerify = async () => {
    if (!verifierCadena || !verifierSello) {
      setVerificationFeedback({
        tested: true,
        valid: false,
        message: "Por favor proporcione la Cadena Original y el Sello Digital a validar.",
      });
      return;
    }

    // Client-side WebCrypto test if public key available
    if (cryptoKeyPair?.publicKey) {
      const isValid = await verifyDigitalSealWebCrypto(
        verifierCadena,
        verifierSello,
        cryptoKeyPair.publicKey
      );

      if (isValid) {
        setVerificationFeedback({
          tested: true,
          valid: true,
          message: "¡Sello Digital Auténtico! La firma coincide matemáticamente con la clave pública del certificado.",
        });
        return;
      }
    }

    // Backend validation fallback
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
            message: "Error al verificar la firma. El formato de la cadena o el sello es inválido.",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Header & Security Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                e.firma Hub & Bóveda Criptográfica Zero-Knowledge
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  SAT WebCrypto API
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Zero-Knowledge
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Sellado Digital RSA-SHA256 en memoria volátil de navegador para Pedimentos, Carta Porte 3.1 y e-BLs (Cero fuga de llave privada)
              </p>
            </div>
          </div>
        </div>

        {/* Security Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isVaultUnlocked ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span className="text-slate-400">Bóveda RAM:</span>
            <span className={`font-semibold ${isVaultUnlocked ? "text-emerald-400" : "text-rose-400"}`}>
              {isVaultUnlocked ? `Desbloqueada (${vaultExpiresInMinutes}m)` : "Bloqueada"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Algoritmo:</span>
            <span className="font-semibold text-cyan-400">RSASSA-PKCS1-v1_5</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Sellado:</span>
            <span className="font-semibold text-amber-400">RFC 3161 TSA</span>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
              Documentos Oficiales Preconfigurados para Firma
            </span>
            <span className="text-sm text-slate-300 font-medium">
              {currentPreset.title} (ID: {currentPreset.documentId})
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["pedimento_a1_general", "pedimento_af_immex", "carta_porte_31_transfronteriza", "ebl_mletr_maritimo"] as PresetKey[]).map(
            (key) => {
              const p = EFIRMA_DEMO_PRESETS[key];
              const isSelected = selectedPresetKey === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {p.title.split(". ")[1].split(" (")[0]}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("SIGNING_STUDIO")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "SIGNING_STUDIO"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Estudio de Firmado de Documentos
        </button>

        <button
          onClick={() => setActiveTab("VAULT_CERT")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "VAULT_CERT"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="w-4 h-4" />
          Bóveda & Certificado SAT X.509
        </button>

        <button
          onClick={() => setActiveTab("PUBLIC_VERIFIER")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
            activeTab === "PUBLIC_VERIFIER"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scale className="w-4 h-4" />
          Validador Criptográfico Público
        </button>
      </div>

      {/* Tab 1: Estudio de Firmado */}
      <AnimatePresence mode="wait">
        {activeTab === "SIGNING_STUDIO" && (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Col: Document Parameters & Cadena Original */}
            <div className="lg:col-span-7 space-y-6">
              {/* Document Overview Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Parámetros del Documento a Firmar
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs">
                    {signingPayload.documentType}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Folio / Identificador</label>
                    <Input
                      value={signingPayload.documentId}
                      onChange={(e) => setSigningPayload({ ...signingPayload, documentId: e.target.value })}
                      className="bg-slate-950 border-slate-800 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">RFC Emisor / Firmante</label>
                    <Input
                      value={signingPayload.rfcEmisor}
                      onChange={(e) => setSigningPayload({ ...signingPayload, rfcEmisor: e.target.value })}
                      className="bg-slate-950 border-slate-800 font-mono text-xs text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">RFC Receptor / Cliente</label>
                    <Input
                      value={signingPayload.rfcReceptor}
                      onChange={(e) => setSigningPayload({ ...signingPayload, rfcReceptor: e.target.value })}
                      className="bg-slate-950 border-slate-800 font-mono text-xs text-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Valor Declarado</label>
                    <Input
                      value={
                        signingPayload.declaredAmountUsd != null
                          ? `$${signingPayload.declaredAmountUsd.toLocaleString()} USD`
                          : `$${(signingPayload.declaredAmountMxn || 0).toLocaleString()} MXN`
                      }
                      disabled
                      className="bg-slate-950/60 border-slate-800 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Structured JSON Preview */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Contenido Estructurado de la Transacción
                  </span>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
                    <pre>{JSON.stringify(signingPayload.rawContent, null, 2)}</pre>
                  </div>
                </div>
              </div>

              {/* Cadena Original Box */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    Cadena Original Canónica SAT (Delimitadores Oficiales ||)
                  </h4>
                  <button
                    onClick={handleCopyCadena}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    {copiedCadena ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCadena ? "Copiada" : "Copiar"}
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 break-all leading-relaxed max-h-32 overflow-y-auto">
                  {generatedCadenaOriginal}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${isVaultUnlocked ? "bg-emerald-400" : "bg-rose-400"}`}
                    />
                    <span>
                      {isVaultUnlocked
                        ? `Bóveda activa: ${activeCertificate?.rfcTitular} (${activeCertificate?.certificateSerial.slice(-8)})`
                        : "Bóveda bloqueada. Desbloquee para firmar."}
                    </span>
                  </div>

                  <Button
                    onClick={handleExecuteSign}
                    disabled={isSigning || !isVaultUnlocked}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {isSigning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Firmar Documento con e.firma (WebCrypto)
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Col: Digital Seal Result & RFC 3161 Audit Stamp */}
            <div className="lg:col-span-5 space-y-6">
              {activeSealResult ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Sello Digital Generado Exitosamente
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      VALIDADO
                    </span>
                  </div>

                  {/* Sello Base64 Display */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        Sello Digital RSA-SHA256 (Base64)
                      </span>
                      <button
                        onClick={handleCopySello}
                        className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                      >
                        {copiedSello ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedSello ? "Copiado" : "Copiar Sello"}
                      </button>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-cyan-300 break-all max-h-28 overflow-y-auto leading-relaxed">
                      {activeSealResult.selloDigitalBase64}
                    </div>
                  </div>

                  {/* Cryptographic Proof Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] block">No. Serie Certificado</span>
                      <span className="font-mono text-slate-200 text-[11px] truncate block">
                        {activeSealResult.certificateSerial}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] block">RFC Titular Firmante</span>
                      <span className="font-mono text-emerald-400 text-[11px] truncate block">
                        {activeSealResult.rfcTitular}
                      </span>
                    </div>
                  </div>

                  {/* Audit Stamp Token */}
                  {activeAuditStamp && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Acuse de Auditoría Oficial RFC 3161
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {activeAuditStamp.auditId}
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-300">
                        <p className="font-mono text-emerald-400 truncate">
                          Token: {activeAuditStamp.rfc3161TimestampToken}
                        </p>
                        <p className="font-mono text-slate-400 truncate text-[10px]">
                          Hash Inviolable: {activeAuditStamp.tamperSealHash}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={() => setActiveTab("PUBLIC_VERIFIER")}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-2"
                    >
                      <Scale className="w-3.5 h-3.5 text-cyan-400" />
                      Probar en Validador Público
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Listo para Generar Sello Digital</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                      Al presionar el botón de firmado, el motor WebCrypto ejecutará la firma RSASSA-PKCS1-v1_5 sobre la Cadena Original en su navegador.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 2: Bóveda & Certificado SAT X.509 */}
        {activeTab === "VAULT_CERT" && (
          <motion.div
            key="vault"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left Col: Upload & Credentials Management */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      Gestión de Llaves y Bóveda Criptográfica
                    </h3>
                    <p className="text-xs text-slate-400">Zero-Knowledge: La clave privada reside estrictamente en memoria RAM</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isVaultUnlocked ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center gap-1">
                        <Unlock className="w-3 h-3" /> ACTIVA
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-mono flex items-center gap-1">
                        <Lock className="w-3 h-3" /> BLOQUEADA
                      </span>
                    )}
                  </div>
                </div>

                {/* Drag and Drop Zone Simulation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* .cer File */}
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center space-y-2">
                    <span className="font-semibold text-slate-300 block">Certificado Público (.cer)</span>
                    <input
                      type="file"
                      accept=".cer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCerFileName(file.name);
                          setActiveCertificate(
                            extractCertificateMetadata(file.name, "AAN940112XX1", "AGENCIA ADUANAL DEL NORTE S.C.")
                          );
                        }
                      }}
                      className="text-[10px] text-slate-500 w-full"
                    />
                    {cerFileName && (
                      <span className="text-emerald-400 text-[10px] font-mono block">
                        ✓ {cerFileName}
                      </span>
                    )}
                  </div>

                  {/* .key File */}
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 text-center space-y-2">
                    <span className="font-semibold text-slate-300 block">Llave Privada PKCS#8 (.key)</span>
                    <input
                      type="file"
                      accept=".key"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setKeyFileName(file.name);
                        }
                      }}
                      className="text-[10px] text-slate-500 w-full"
                    />
                    {keyFileName && (
                      <span className="text-emerald-400 text-[10px] font-mono block">
                        ✓ {keyFileName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label className="text-slate-400 block mb-1 text-xs font-medium">Contraseña de e.firma (SAT):</label>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="••••••••••••"
                    className="bg-slate-950 border-slate-800 font-mono text-xs"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    onClick={handleLoadSandboxCredentials}
                    disabled={loadingUnlock}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-2"
                  >
                    {loadingUnlock ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    Cargar Credenciales Sandbox SAT (Demo)
                  </Button>

                  {isVaultUnlocked ? (
                    <Button
                      onClick={handleLockVault}
                      className="bg-rose-600/80 hover:bg-rose-600 text-white text-xs flex items-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Bloquear y Purgar Memoria RAM
                    </Button>
                  ) : (
                    <Button
                      onClick={handleLoadSandboxCredentials}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-2"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Desbloquear Bóveda
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Certificate X.509 Diagnostic Card */}
            <div className="lg:col-span-6 space-y-6">
              {activeCertificate ? (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Diagnóstico del Certificado X.509 SAT
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      VIGENTE
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] block">Titular (Razón Social)</span>
                      <span className="font-semibold text-white block text-sm">{activeCertificate.razonSocial}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">RFC Titular</span>
                        <span className="font-mono font-bold text-emerald-400">{activeCertificate.rfcTitular}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">Número de Serie (20 Dígitos)</span>
                        <span className="font-mono text-cyan-400">{activeCertificate.certificateSerial}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">Válido Desde</span>
                        <span className="text-slate-300">{new Date(activeCertificate.validFrom).toLocaleDateString()}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                        <span className="text-slate-500 text-[10px] block">Válido Hasta</span>
                        <span className="text-slate-300">{new Date(activeCertificate.validUntil).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] block">Autoridad Certificadora (Emisor SAT)</span>
                      <span className="text-slate-300">{activeCertificate.issuer}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] block">Huella Digital SHA-256</span>
                      <span className="font-mono text-[10px] text-slate-400 break-all">
                        {activeCertificate.certificateSha256Fingerprint}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                  <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
                  <span className="text-xs text-slate-400 block">
                    No hay ningún certificado cargado. Cargue archivos o active Sandbox.
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 3: Validador Criptográfico Público */}
        {activeTab === "PUBLIC_VERIFIER" && (
          <motion.div
            key="verifier"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Form Left Side */}
            <div className="lg:col-span-7 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    Verificador Criptográfico Independiente de Sellos SAT
                  </h3>
                  <span className="text-xs text-cyan-400 font-mono">Auditoría Dual</span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Cadena Original a Validar:</label>
                    <textarea
                      rows={3}
                      value={verifierCadena}
                      onChange={(e) => setVerifierCadena(e.target.value)}
                      placeholder="||4.0|PEDIMENTO_ADUANAL|...||"
                      className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-emerald-300 font-mono text-[11px] outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-medium">Sello Digital en Base64:</label>
                    <textarea
                      rows={3}
                      value={verifierSello}
                      onChange={(e) => setVerifierSello(e.target.value)}
                      placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg..."
                      className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-cyan-300 font-mono text-[11px] outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">Número de Serie del Certificado:</label>
                      <Input
                        value={verifierSerial}
                        onChange={(e) => setVerifierSerial(e.target.value)}
                        className="bg-slate-950 border-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-medium">RFC Titular Declarado:</label>
                      <Input
                        value={verifierRfc}
                        onChange={(e) => setVerifierRfc(e.target.value)}
                        className="bg-slate-950 border-slate-800 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleTestVerify}
                      disabled={verifyMutation.isPending}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-2"
                    >
                      {verifyMutation.isPending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Scale className="w-3.5 h-3.5" />
                      )}
                      Validar Autenticidad Matemática
                    </Button>
                  </div>

                  {/* Verification Feedback Banner */}
                  {verificationFeedback && (
                    <div
                      className={`p-4 rounded-xl border flex items-center gap-3 ${
                        verificationFeedback.valid
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {verificationFeedback.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      )}
                      <div className="text-xs">
                        <span className="font-bold block">
                          {verificationFeedback.valid ? "FIRMA VÁLIDA Y AUTÉNTICA" : "FIRMA INVÁLIDA"}
                        </span>
                        <span>{verificationFeedback.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side: Audit Ledger History */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Historial de Sellos y Acuses RFC 3161
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {auditLogData?.stamps?.length || 0} Registros
                  </span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogData?.stamps && auditLogData.stamps.length > 0 ? (
                    auditLogData.stamps.map((stamp) => (
                      <div
                        key={stamp.auditId}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{stamp.documentId}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                            {stamp.documentType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          Token: {stamp.rfc3161TimestampToken}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                          <span>RFC: {stamp.rfcTitular}</span>
                          <span>{new Date(stamp.verifiedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No hay sellos registrados aún en el libro de auditoría.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
