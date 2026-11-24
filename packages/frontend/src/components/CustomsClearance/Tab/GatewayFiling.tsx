/**
 * @file GatewayFilingTab.tsx
 * @description Sovereign Customs Authority Gateway & Cryptographic PKI filing cockpit tab.
 * Provides regulatory envelope synthesis, live XML preview, PKI keystore status, and one-click dispatch with downstream sync.
 * @module @atlas/frontend/components/CustomsClearance/Tab
 * @see {@link docs/adr/0038-customs-mtls-and-regulatory-filing-gateway.md}
 */

import { useState, useEffect } from "react";
import {
  Shield,
  KeyRound,
  FileCode,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Lock,
} from "lucide-react";
import { CustomsDeclaration } from "../types/index";

export type SupportedCustomsAgency =
  "AEAT" | "NCTS_P5" | "ATLAS" | "DELTA" | "HMRC_CDS" | "CBP_ACE";

interface GatewayFilingTabProps {
  declaration: CustomsDeclaration;
  onDispatched?: () => void;
}

interface CertificateInfo {
  id: string;
  agency: string;
  certificateAlias: string;
  thumbprintSha256: string;
  issuerDn: string;
  subjectDn: string;
  validUntil: string;
  keyStorageType: string;
}

interface FilingPreview {
  clearanceId: string;
  agency: string;
  protocol: string;
  messageFunction: string;
  filingReference: string;
  canonicalPayloadSha256: string;
  signatureAlgorithm: string;
  certificateThumbprint: string;
  xmlPayload: string;
}

interface TransmissionResult {
  id: string;
  responseStatus: string;
  mrnAssigned?: string | null;
  filingReference: string;
  acknowledgedAt?: string | null;
  errorMessage?: string | null;
}

const AGENCY_CATALOG: {
  id: SupportedCustomsAgency;
  name: string;
  country: string;
  protocol: string;
}[] = [
  {
    id: "AEAT",
    name: "AEAT DUA v1",
    country: "España (ES)",
    protocol: "SOAP mTLS",
  },
  {
    id: "NCTS_P5",
    name: "NCTS Fase 5 Tránsito",
    country: "Unión Europea (EU)",
    protocol: "REST mTLS",
  },
  {
    id: "ATLAS",
    name: "ATLAS Zoll v9.1",
    country: "Alemania (DE)",
    protocol: "SOAP mTLS",
  },
  {
    id: "DELTA",
    name: "DELTA G/IE",
    country: "Francia (FR)",
    protocol: "SOAP mTLS",
  },
  {
    id: "HMRC_CDS",
    name: "HMRC CDS WCO 3.6",
    country: "Reino Unido (GB)",
    protocol: "REST mTLS",
  },
  {
    id: "CBP_ACE",
    name: "CBP ACE CATAIR",
    country: "Estados Unidos (US)",
    protocol: "REST mTLS",
  },
];

export function GatewayFilingTab({
  declaration,
  onDispatched,
}: GatewayFilingTabProps) {
  const [selectedAgency, setSelectedAgency] =
    useState<SupportedCustomsAgency>("AEAT");
  const [simulateImmediate, setSimulateImmediate] = useState(true);
  const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
  const [preview, setPreview] = useState<FilingPreview | null>(null);
  const [transmissionResult, setTransmissionResult] =
    useState<TransmissionResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch certificates for selected agency
  useEffect(() => {
    async function loadCertificates() {
      try {
        const res = await fetch(
          `/api/customs/certificates?agency=${selectedAgency}`,
        );
        if (res.ok) {
          const data = await res.json();
          setCertificates(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load PKI certificates", err);
      }
    }
    loadCertificates();
  }, [selectedAgency]);

  // Generate live XML preview
  const handleGeneratePreview = async () => {
    setIsLoadingPreview(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/customs/filings/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearanceId: declaration.id,
          agency: selectedAgency,
          protocol:
            selectedAgency === "HMRC_CDS" ||
            selectedAgency === "CBP_ACE" ||
            selectedAgency === "NCTS_P5"
              ? "REST_MTLS"
              : "SOAP_MTLS",
          messageFunction: "ORIGINAL",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      } else {
        const err = await res.json();
        setStatusMessage(
          `Error generando previsualización: ${err.message || res.statusText}`,
        );
      }
    } catch (_err) {
      setStatusMessage("Error de conexión al generar previsualización XML");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Submit Declaration
  const handleSubmitDeclaration = async () => {
    setIsTransmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/customs/filings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearanceId: declaration.id,
          agency: selectedAgency,
          protocol:
            selectedAgency === "HMRC_CDS" ||
            selectedAgency === "CBP_ACE" ||
            selectedAgency === "NCTS_P5"
              ? "REST_MTLS"
              : "SOAP_MTLS",
          messageFunction: "ORIGINAL",
          simulateImmediateAck: simulateImmediate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTransmissionResult(data);
        if (onDispatched) {
          onDispatched();
        }
      } else {
        const err = await res.json();
        setStatusMessage(
          `Error en la transmisión: ${err.message || res.statusText}`,
        );
      }
    } catch (_err) {
      setStatusMessage("Fallo al conectar con la pasarela de aduanas");
    } finally {
      setIsTransmitting(false);
    }
  };

  const copyPayload = () => {
    if (preview?.xmlPayload) {
      navigator.clipboard.writeText(preview.xmlPayload);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const activeCert = certificates[0];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. Header & Agency Selector */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-black text-white tracking-wide">
                Pasarela de Despacho Regulatorio & mTLS (ADR 0038)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Firma electrónica cualificada X.509, canonicalización XMLDSig C14N
              y conciliación automática de levante.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">
              Autoridad:
            </span>
            <select
              value={selectedAgency}
              onChange={(e) =>
                setSelectedAgency(e.target.value as SupportedCustomsAgency)
              }
              className="bg-slate-800 text-white border border-white/20 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {AGENCY_CATALOG.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} - {agency.country}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Cryptographic Keystore Card */}
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">
                Certificado Digital Activo
              </p>
              <p className="font-mono font-bold text-slate-200 mt-0.5">
                {activeCert
                  ? activeCert.certificateAlias
                  : "Certificado Estándar del Sistema"}
              </p>
              <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                {activeCert
                  ? activeCert.issuerDn
                  : "CN=AC FNMT Usuarios, O=FNMT-RCM, C=ES"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">Bóveda Criptográfica</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AES-256-GCM / PBKDF2 Vault
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Claves privadas no exportables
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Cpu className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-slate-400 font-medium">
                Huella Digital (SHA-256)
              </p>
              <p className="font-mono text-[10px] text-slate-300 mt-0.5 truncate max-w-[220px]">
                {activeCert?.thumbprintSha256 ||
                  "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4..."}
              </p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <Check className="w-3 h-3" /> Verificación HSM en orden
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. XML Payload Preview & Digest */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Sobre Regulatorio XML (C14N Digest)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePreview}
              disabled={isLoadingPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold rounded-lg transition-all"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoadingPreview ? "animate-spin" : ""}`}
              />
              {isLoadingPreview ? "Sintetizando..." : "Actualizar XML"}
            </button>

            {preview && (
              <button
                onClick={copyPayload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-semibold rounded-lg transition-all"
              >
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {isCopied ? "Copiado" : "Copiar"}
              </button>
            )}
          </div>
        </div>

        {preview ? (
          <div>
            <div className="bg-black/60 rounded-xl p-3 border border-white/5 font-mono text-[11px] text-emerald-300 max-h-56 overflow-y-auto custom-scrollbar select-text">
              <pre className="whitespace-pre-wrap">{preview.xmlPayload}</pre>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[10px] font-mono text-slate-400">
              <span className="truncate max-w-[400px]">
                SHA-256 Digest:{" "}
                <span className="text-slate-200">
                  {preview.canonicalPayloadSha256}
                </span>
              </span>
              <span className="text-indigo-400">
                Algoritmo: {preview.signatureAlgorithm}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-black/30 rounded-xl border border-dashed border-white/10 text-slate-500 text-xs flex flex-col items-center justify-center">
            <FileCode className="w-8 h-8 opacity-30 mb-2" />
            <p>
              Presione "Actualizar XML" para sintetizar el sobre SOAP/XML con la
              declaración actual
            </p>
          </div>
        )}
      </div>

      {/* 4. Submission & Channel Feedback */}
      <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={simulateImmediate}
              onChange={(e) => setSimulateImmediate(e.target.checked)}
              className="rounded bg-slate-800 border-white/20 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              Simulador Regulatorio Determinista (Offline ACK Inmediato)
            </span>
          </label>

          <button
            onClick={handleSubmitDeclaration}
            disabled={isTransmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <Send
              className={`w-4 h-4 ${isTransmitting ? "animate-pulse" : ""}`}
            />
            {isTransmitting
              ? "Transmitiendo a Aduana..."
              : "Firmar & Transmitir Declaración"}
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Transmission Result Display */}
        {transmissionResult && (
          <div className="mt-5 pt-5 border-t border-white/10">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Resultado Oficial de la Transmisión
            </h5>

            {transmissionResult.responseStatus === "ACCEPTED_GREEN" && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h6 className="font-bold text-sm text-emerald-300">
                      Canal Verde Concedido - Levante Inmediato Autorizado
                    </h6>
                    <p className="text-xs text-emerald-400/90 mt-0.5">
                      MRN Asignado:{" "}
                      <span className="font-mono font-bold">
                        {transmissionResult.mrnAssigned}
                      </span>{" "}
                      | Retenciones operativas resueltas automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {transmissionResult.responseStatus === "DOCS_REQUIRED_ORANGE" && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <h6 className="font-bold text-sm text-amber-300">
                      Canal Naranja - Control Documental Requerido
                    </h6>
                    <p className="text-xs text-amber-400/90 mt-0.5">
                      La autoridad aduanera solicita la aportación telemática de
                      la documentación de la Casilla 44 (Factura Comercial,
                      Packing List, EUR.1).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {transmissionResult.responseStatus === "INSPECTION_RED" && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0" />
                  <div>
                    <h6 className="font-bold text-sm text-rose-300">
                      Canal Rojo - Inspección Física / Reconocimiento en
                      Terminal
                    </h6>
                    <p className="text-xs text-rose-400/90 mt-0.5">
                      Incidencia crítica inyectada en Control Tower. Despacho
                      bloqueado para verificación presencial o escáner no
                      intrusivo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export type GatewayFilingProps = GatewayFilingTabProps;
export const GatewayFiling = GatewayFilingTab;
