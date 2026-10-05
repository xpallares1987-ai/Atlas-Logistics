import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  KeyRound,
  Fingerprint,
  FileCheck2,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Zap,
  Globe2,
  Trash2,
  FileText,
  Activity,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  generateBase32Secret,
  generateTOTP,
  verifyTOTP,
  generateBackupCodes,
  authenticateWithHardwareToken,
  verifyHardwareSignature,
  digitalSignatureService,
  DigitalSignaturePayload,
  DigitalSignatureResult,
  calculateShipmentRisk,
  getRiskBadgeStyles,
  searchUnlocodes,
  getUnlocodeStats,
  offlineDocumentQueue,
  QueuedDocument,
  OfflineQueueStats,
} from "@atlas/shared";
import { Button, Input } from "@atlas/ui";

export default function SecurityRiskResilienceModule() {
  const [activeTab, setActiveTab] = useState<
    "PASSKEYS_TOTP" | "DIGITAL_SIGNATURES" | "RISK_UNLOCODE" | "OFFLINE_RESILIENCE"
  >("PASSKEYS_TOTP");

  // ==========================================
  // TAB 1: PASSKEYS & TOTP STATE
  // ==========================================
  const [userEmail, setUserEmail] = useState("officer.security@atlas-logistics.com");
  const [manifestId, setManifestId] = useState("MNF-2026-X884");
  const [deviceModel, setDeviceModel] = useState("YubiKey 5 NFC / TouchID Biometric");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [passkeyResult, setPasskeyResult] = useState<any>(null);
  const [registeredKeys, setRegisteredKeys] = useState<any[]>([
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
  ]);

  // TOTP Live Simulator
  const [totpSecret, setTotpSecret] = useState(() => generateBase32Secret(16));
  const [currentTotpCode, setCurrentTotpCode] = useState(() => generateTOTP(totpSecret));
  const [totpSecondsRemaining, setTotpSecondsRemaining] = useState(30);
  const [totpInputCode, setTotpInputCode] = useState("");
  const [totpVerificationStatus, setTotpVerificationStatus] = useState<boolean | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>(() => generateBackupCodes(5));

  useEffect(() => {
    const interval = setInterval(() => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const remaining = 30 - (nowSeconds % 30);
      setTotpSecondsRemaining(remaining);
      if (remaining === 30 || remaining === 1) {
        setCurrentTotpCode(generateTOTP(totpSecret));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [totpSecret]);

  const handleTestPasskeyAuth = async () => {
    setIsAuthenticating(true);
    try {
      const result = await authenticateWithHardwareToken(manifestId, userEmail, {
        simulatedDelayMs: 600,
        deviceModel,
      });
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
    setCurrentTotpCode(generateTOTP(newSec));
    setBackupCodes(generateBackupCodes(5));
    setTotpVerificationStatus(null);
  };

  // ==========================================
  // TAB 2: DIGITAL SIGNATURES (WEBCRYPTO) STATE
  // ==========================================
  const [docType, setDocType] = useState<
    "PEDIMENTO" | "BILL_OF_LADING" | "E_CMR" | "CUSTOMS_DECLARATION"
  >("PEDIMENTO");
  const [docId, setDocId] = useState("PED-2026-SAT-480-1289");
  const [issuerId, setIssuerId] = useState("AGENCIA-ADUANAL-3001");
  const [issuerOrg, setIssuerOrg] = useState("Atlas Cross-Border Customs Brokerage S.A.");
  const [docPayload, setDocPayload] = useState(
    JSON.stringify(
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
    ),
  );
  const [digitalSeal, setDigitalSeal] = useState<DigitalSignatureResult | null>(null);
  const [tamperedPayload, setTamperedPayload] = useState("");
  const [tamperVerificationResult, setTamperVerificationResult] = useState<boolean | null>(null);

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
    const valid = await digitalSignatureService.verifyDocumentSignature(testPayload, digitalSeal);
    setTamperVerificationResult(valid);
  };

  // ==========================================
  // TAB 3: RISK SCORER & UN/LOCODE STATE
  // ==========================================
  const [originPort, setOriginPort] = useState("CNSHA");
  const [destinationPort, setDestinationPort] = useState("USLAX");
  const [transportType, setTransportType] = useState("SEA");
  const [isHighPriority, setIsHighPriority] = useState(true);
  const [shipmentStatus, setShipmentStatus] = useState("delayed");
  const [predictedDelay, setPredictedDelay] = useState(4);

  const [unlocodeQuery, setUnlocodeQuery] = useState("");
  const [unlocodeCountry, setUnlocodeCountry] = useState("");
  const [unlocodeResults, setUnlocodeResults] = useState(() => searchUnlocodes(""));

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

  // ==========================================
  // TAB 4: OFFLINE QUEUE STATE
  // ==========================================
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

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 shadow-2xl text-white">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles size={14} className="text-indigo-400" />
              Advanced Security & Edge Computing
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <ShieldCheck className="text-indigo-400" size={32} />
              Security, Risk & Resilience Center
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Centro unificado de autenticación biométrica Passkeys (FIDO2), doble factor TOTP, sellado criptográfico de documentos con WebCrypto, radar predictivo de riesgo multimodal y motor de resiliencia offline.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">WebAuthn FIDO2</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 size={14} /> Listo
              </span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">SubtleCrypto</span>
              <span className="text-sm font-bold text-indigo-400 flex items-center justify-center gap-1 mt-0.5">
                SHA-256
              </span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Score de Riesgo</span>
              <span className={`text-sm font-bold flex items-center justify-center gap-1 mt-0.5 ${riskBadge.text}`}>
                {riskResult.score}/100
              </span>
            </div>
            <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-3 text-center">
              <span className="text-[11px] text-slate-400 block font-medium">Cola Offline</span>
              <span className="text-sm font-bold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                {offlineStats.total} Docs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("PASSKEYS_TOTP")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "PASSKEYS_TOTP"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Fingerprint size={16} />
          Passkeys & TOTP 2FA
        </button>
        <button
          onClick={() => setActiveTab("DIGITAL_SIGNATURES")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "DIGITAL_SIGNATURES"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <FileCheck2 size={16} />
          Firma Digital WebCrypto
        </button>
        <button
          onClick={() => setActiveTab("RISK_UNLOCODE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "RISK_UNLOCODE"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Activity size={16} />
          Radar de Riesgo & UN/LOCODE
        </button>
        <button
          onClick={() => setActiveTab("OFFLINE_RESILIENCE")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "OFFLINE_RESILIENCE"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          }`}
        >
          {isOnline ? <Wifi size={16} className="text-emerald-500" /> : <WifiOff size={16} className="text-red-500" />}
          Resiliencia Offline & DLQ
        </button>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {/* ============================================================== */}
        {/* TAB 1: PASSKEYS & TOTP 2FA                                      */}
        {/* ============================================================== */}
        {activeTab === "PASSKEYS_TOTP" && (
          <motion.div
            key="passkeys_totp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left: WebAuthn / Passkeys Hardware Token */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Fingerprint size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Passkeys & Llaves de Hardware (FIDO2)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Liberación de manifiestos y órdenes críticas con firma biométrica o física
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  FIDO2 / WebAuthn
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Usuario Operativo
                  </label>
                  <Input
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      ID Manifiesto / Orden
                    </label>
                    <Input
                      value={manifestId}
                      onChange={(e) => setManifestId(e.target.value)}
                      className="w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Dispositivo FIDO2
                    </label>
                    <select
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
                    >
                      <option value="YubiKey 5 NFC / Series FIPS">YubiKey 5 NFC / Series FIPS</option>
                      <option value="Google Titan Security Key">Google Titan Security Key</option>
                      <option value="Windows Hello (TPM 2.0 Biometric)">Windows Hello (TPM 2.0)</option>
                      <option value="Apple TouchID / FaceID Secure Enclave">Apple TouchID / Secure Enclave</option>
                    </select>
                  </div>
                </div>

                <Button
                  onClick={handleTestPasskeyAuth}
                  disabled={isAuthenticating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-md"
                >
                  {isAuthenticating ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Esperando interacción con llave de hardware...
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      Simular Ceremonia WebAuthn FIDO2
                    </>
                  )}
                </Button>

                {passkeyResult && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={16} /> Handshake Criptográfico Exitoso
                      </span>
                      <span>{passkeyResult.deviceModel}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      <div><strong>Credential ID:</strong> {passkeyResult.credentialId}</div>
                      <div className="truncate"><strong>Signature:</strong> {passkeyResult.signature}</div>
                      <div><strong>Timestamp:</strong> {passkeyResult.timestamp}</div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Llaves FIDO2 Vinculadas
                  </h4>
                  <div className="space-y-2">
                    {registeredKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <KeyRound size={14} className="text-indigo-500" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{key.device}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{key.registeredAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: TOTP 2FA Engine */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Autenticación Doble Factor TOTP (RFC 6238)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Compatible con Google Authenticator, Microsoft Authenticator y Yubico
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGenerateNewSecret}
                  variant="outline"
                  className="text-xs flex items-center gap-1.5 h-8 px-2.5"
                >
                  <RefreshCw size={12} /> Regenerar
                </Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 dark:border-indigo-800/50 text-center">
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block mb-1">
                    CÓDIGO DE 6 DÍGITOS ACTIVO
                  </span>
                  <div className="text-4xl font-extrabold tracking-widest text-slate-900 dark:text-white font-mono my-2">
                    {currentTotpCode.slice(0, 3)} {currentTotpCode.slice(3)}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span>Expira en:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{totpSecondsRemaining}s</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-1000 ease-linear"
                      style={{ width: `${(totpSecondsRemaining / 30) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-mono">
                    <span>Secret Base32:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{totpSecret}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Verificar Código del Dispositivo
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      value={totpInputCode}
                      onChange={(e) => setTotpInputCode(e.target.value.replace(/\D/g, ""))}
                      className="text-center font-mono text-base tracking-widest"
                    />
                    <Button
                      onClick={handleVerifyTotp}
                      disabled={totpInputCode.length !== 6}
                      className="bg-purple-600 hover:bg-purple-700 text-white shrink-0 px-4"
                    >
                      Validar
                    </Button>
                  </div>
                  {totpVerificationStatus !== null && (
                    <div
                      className={`mt-2 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                        totpVerificationStatus
                          ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400"
                      }`}
                    >
                      {totpVerificationStatus ? (
                        <>
                          <CheckCircle2 size={14} /> Código TOTP válido con ventana de tolerancia activa.
                        </>
                      ) : (
                        <>
                          <XCircle size={14} /> Código inválido o expirado. Reintente con el código actual.
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                    Códigos de Respaldo de Emergencia
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {backupCodes.map((code) => (
                      <div
                        key={code}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DIGITAL SIGNATURES (WEBCRYPTO)                           */}
        {/* ============================================================== */}
        {activeTab === "DIGITAL_SIGNATURES" && (
          <motion.div
            key="digital_signatures"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left: Document Signing Studio */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <FileCheck2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Emisor de Sellos Criptográficos (WebCrypto)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Firma en cliente sin transmisión de llaves privadas al servidor
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                  SubtleCrypto SHA-256
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={docType}
                    onChange={(e: any) => setDocType(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
                  >
                    <option value="PEDIMENTO">Pedimento Aduanal SAT</option>
                    <option value="BILL_OF_LADING">Ocean Bill of Lading (B/L)</option>
                    <option value="E_CMR">e-CMR Transporte Terrestre</option>
                    <option value="CUSTOMS_DECLARATION">Declaración Aduanera DUA</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Identificador Oficial
                  </label>
                  <Input
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Agencia Emisora / Certificado
                </label>
                <Input
                  value={issuerOrg}
                  onChange={(e) => setIssuerOrg(e.target.value)}
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Cuerpo del Documento (Payload JSON)
                </label>
                <textarea
                  rows={6}
                  value={docPayload}
                  onChange={(e) => setDocPayload(e.target.value)}
                  className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                />
              </div>

              <Button
                onClick={handleSignDocument}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-md"
              >
                <Zap size={16} />
                Generar Sello Digital con WebCrypto API
              </Button>

              {digitalSeal && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>Sello Digital SHA-256 Emitido</span>
                    <span className="font-mono text-[11px]">{digitalSeal.certificateSerial}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-200/50 dark:bg-slate-800/50 font-mono text-[11px] break-all select-all text-slate-800 dark:text-slate-200">
                    {digitalSeal.digitalSealSha256}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Fecha de Timbrado: {new Date(digitalSeal.verificationTimestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Tamper-Evident Verification Simulator */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Verificador Anti-Manipulación (Tamper-Proof)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Comprueba cómo una sola alteración invalida el sello criptográfico
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <strong>Simulador Forense:</strong> Modifica cualquier valor en el cuadro de abajo (por ejemplo, cambia el valor de la mercancía o la patente) y presiona "Verificar Integridad".
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payload a Verificar
                </label>
                <textarea
                  rows={8}
                  value={tamperedPayload}
                  onChange={(e) => setTamperedPayload(e.target.value)}
                  disabled={!digitalSeal}
                  placeholder="Genera primero un sello digital en el panel izquierdo..."
                  className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                />
              </div>

              <Button
                onClick={handleVerifyTampering}
                disabled={!digitalSeal}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-md dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <FileCheck2 size={16} />
                Verificar Integridad Criptográfica del Sello
              </Button>

              {tamperVerificationResult !== null && (
                <div
                  className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 ${
                    tamperVerificationResult
                      ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800"
                  }`}
                >
                  {tamperVerificationResult ? (
                    <>
                      <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                      <div>
                        <div className="font-bold text-sm">INTEGRIDAD CONFIRMADA</div>
                        <div>El documento coincide bit a bit con el sello original emitido por {digitalSeal?.issuerOrg}.</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={20} className="shrink-0 text-red-600" />
                      <div>
                        <div className="font-bold text-sm">ALTERACIÓN O FRAUDE DETECTADO</div>
                        <div>El contenido actual ha sido modificado. La huella SHA-256 no coincide con el certificado original.</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: RISK SCORER & UN/LOCODE                                  */}
        {/* ============================================================== */}
        {activeTab === "RISK_UNLOCODE" && (
          <motion.div
            key="risk_unlocode"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Left: Dynamic Risk Scorer Simulator */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                    <Activity size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Calculador de Riesgo de Ruta Multimodal (1–100)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ponderación en tiempo real de meteorología, geopolítica, puertos y SLA
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}>
                  Nivel {riskResult.level} ({riskResult.score}/100)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Puerto Origen (UN/LOCODE)
                  </label>
                  <select
                    value={originPort}
                    onChange={(e) => setOriginPort(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
                  >
                    <option value="CNSHA">CNSHA - Shanghai, China</option>
                    <option value="SGSIN">SGSIN - Singapur Hub</option>
                    <option value="NLRTM">NLRTM - Rotterdam, Países Bajos</option>
                    <option value="ESBCN">ESBCN - Barcelona, España</option>
                    <option value="MXVER">MXVER - Veracruz, México</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Puerto Destino (UN/LOCODE)
                  </label>
                  <select
                    value={destinationPort}
                    onChange={(e) => setDestinationPort(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
                  >
                    <option value="USLAX">USLAX - Los Angeles, EE.UU.</option>
                    <option value="USNYC">USNYC - New York, EE.UU.</option>
                    <option value="NLRTM">NLRTM - Rotterdam, Países Bajos</option>
                    <option value="ESVLC">ESVLC - Valencia, España</option>
                    <option value="MXNLD">MXNLD - Nuevo Laredo, México</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Modo
                  </label>
                  <select
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
                  >
                    <option value="SEA">Marítimo (Ocean)</option>
                    <option value="AIR">Aéreo (Air)</option>
                    <option value="ROAD">Carretera (Road)</option>
                    <option value="RAIL">Ferroviario (Rail)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Estado
                  </label>
                  <select
                    value={shipmentStatus}
                    onChange={(e) => setShipmentStatus(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-slate-800 dark:text-slate-200"
                  >
                    <option value="delayed">Con Retraso (Delayed)</option>
                    <option value="intransit">En Tránsito (On Time)</option>
                    <option value="customs_hold">Retenido en Aduana</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Retraso Estimado
                  </label>
                  <Input
                    type="number"
                    value={predictedDelay}
                    onChange={(e) => setPredictedDelay(Number(e.target.value))}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="highPriority"
                  checked={isHighPriority}
                  onChange={(e) => setIsHighPriority(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="highPriority" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Carga de Alta Prioridad / Alto Valor Asegurado (Aplica multiplicador de sensibilidad 1.12x)
                </label>
              </div>

              {/* Breakdown Bars */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Riesgo Meteorológico (Tifones / Oleaje):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{riskResult.weatherRisk} / 30 pts</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full" style={{ width: `${(riskResult.weatherRisk / 30) * 100}%` }} />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">Riesgo Geopolítico (Mar Rojo / Aranceles):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{riskResult.politicalRisk} / 30 pts</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full" style={{ width: `${(riskResult.politicalRisk / 30) * 100}%` }} />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">Congestión de Terminal / Huelgas Portuarias:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{riskResult.portDelayRisk} / 30 pts</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full" style={{ width: `${(riskResult.portDelayRisk / 30) * 100}%` }} />
                </div>
              </div>

              {/* Mitigations */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Mitigaciones Recomendadas:</span>
                {riskResult.mitigations.map((m, i) => (
                  <div key={i} className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                    <ChevronRight size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: UN/LOCODE Prefix Trie & LRU Search */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    <Globe2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Buscador UN/LOCODE (Prefix Trie + LRU Cache)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Indexación en memoria con poda de candidatos a velocidad sub-milisegundo
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Buscar por código (ESBCN) o ciudad (Barcelona)..."
                    value={unlocodeQuery}
                    onChange={(e) => handleSearchUnlocodes(e.target.value, unlocodeCountry)}
                    className="pl-9 text-xs"
                  />
                </div>
                <div>
                  <Input
                    placeholder="País (ES, US...)"
                    maxLength={2}
                    value={unlocodeCountry}
                    onChange={(e) => handleSearchUnlocodes(unlocodeQuery, e.target.value.toUpperCase())}
                    className="text-center text-xs uppercase"
                  />
                </div>
              </div>

              {/* Cache Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Tasa de Aciertos LRU</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{getUnlocodeStats().cache.hitRate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Capacidad Caché</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{getUnlocodeStats().cache.capacity} slots</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Nodos Indexados</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{getUnlocodeStats().trie.indexedLocations}</span>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {unlocodeResults.map((loc) => (
                  <div
                    key={loc.location}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs hover:border-indigo-400 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                          {loc.location}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{loc.name}</span>
                        <span className="text-slate-400">({loc.country})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Coords: {loc.coordinates || "N/A"} | Funciones: {loc.function || "Multimodal"}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setOriginPort(loc.location);
                      }}
                      variant="outline"
                      className="text-[11px] h-7 px-2"
                    >
                      Fijar Origen
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: OFFLINE RESILIENCE & DLQ                                 */}
        {/* ============================================================== */}
        {activeTab === "OFFLINE_RESILIENCE" && (
          <motion.div
            key="offline_resilience"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">Estado de Conexión</span>
                <span className={`text-lg font-bold flex items-center gap-2 mt-1 ${isOnline ? "text-emerald-500" : "text-red-500"}`}>
                  {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                  {isOnline ? "En Línea (Conectado)" : "Sin Conexión (Offline)"}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">Total en Cola</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                  {offlineStats.total}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">Pendientes de Sincronización</span>
                <span className="text-2xl font-black text-amber-500 mt-1 block">
                  {offlineStats.pending}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block">Dead-Letter Queue (Fallidos)</span>
                <span className="text-2xl font-black text-red-500 mt-1 block">
                  {offlineStats.deadLetter}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Gestor de Cola de Documentos y Manifiestos Offline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Almacenamiento persistente en IndexedDB con reintentos con backoff exponencial y limitación de tasa (rate limiting)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleAddSampleOfflineDoc}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-xl"
                  >
                    + Encolar Escaneo Offline
                  </Button>
                  <Button
                    onClick={handleProcessSyncQueue}
                    disabled={isSyncingQueue || offlineStats.total === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} className={isSyncingQueue ? "animate-spin" : ""} />
                    Sincronizar Cola
                  </Button>
                  {offlineStats.deadLetter > 0 && (
                    <Button
                      onClick={handleClearDeadLetter}
                      variant="outline"
                      className="text-xs text-red-500 hover:text-red-700 border-red-300 px-3 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Limpiar DLQ
                    </Button>
                  )}
                </div>
              </div>

              {/* Table of Queued Documents */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    <tr>
                      <th className="p-3">ID Local</th>
                      <th className="p-3">Envío</th>
                      <th className="p-3">Documento</th>
                      <th className="p-3">Tamaño</th>
                      <th className="p-3">Reintentos</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Comentarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {offlineDocs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          No hay documentos pendientes en la cola local. Todas las operaciones están sincronizadas con el servidor.
                        </td>
                      </tr>
                    ) : (
                      offlineDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono text-[11px] text-slate-900 dark:text-slate-100">{doc.id}</td>
                          <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{doc.shipmentId}</td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <FileText size={14} className="text-slate-400" />
                            {doc.fileName}
                          </td>
                          <td className="p-3 font-mono">{doc.fileSize}</td>
                          <td className="p-3 font-mono">{doc.retryCount} / 5</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                doc.status === "pending"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                                  : doc.status === "dead_letter"
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              }`}
                            >
                              {doc.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 truncate max-w-xs">{doc.comments}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
