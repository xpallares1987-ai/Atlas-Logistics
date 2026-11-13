/**
 * @file SigningStudio.tsx
 * @description SAT e.firma WebCrypto document signing studio tab.
 * @module @atlas/frontend/components/EFirmaHub/Tab
 * @see {@link docs/adr/0020-modular-file-size-guardrails.md}
 */

import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Scale,
  Check,
  Copy,
  RefreshCw,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Key,
} from "lucide-react";
import { Button, Input } from "@atlas/ui";
import type {
  EFirmaSigningPayload,
  EFirmaCertificateMetadata,
  EFirmaDigitalSealResult,
  EFirmaAuditStamp,
  EFirmaHubTab,
} from "../../../types/efirma-hub.types";

interface SigningStudioProps {
  signingPayload: EFirmaSigningPayload;
  onChangeSigningPayload: (payload: EFirmaSigningPayload) => void;
  generatedCadenaOriginal: string;
  copiedCadena: boolean;
  onCopyCadena: () => void;
  isVaultUnlocked: boolean;
  activeCertificate: EFirmaCertificateMetadata | null;
  isSigning: boolean;
  onExecuteSign: () => void;
  activeSealResult: EFirmaDigitalSealResult | null;
  copiedSello: boolean;
  onCopySello: () => void;
  activeAuditStamp: EFirmaAuditStamp | null;
  onSelectTab: (tab: EFirmaHubTab) => void;
}

export const SigningStudio: React.FC<SigningStudioProps> = ({
  signingPayload,
  onChangeSigningPayload,
  generatedCadenaOriginal,
  copiedCadena,
  onCopyCadena,
  isVaultUnlocked,
  activeCertificate,
  isSigning,
  onExecuteSign,
  activeSealResult,
  copiedSello,
  onCopySello,
  activeAuditStamp,
  onSelectTab,
}) => {
  return (
    <motion.div
      key="studio"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <div className="lg:col-span-7 space-y-6">
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
              <label className="text-slate-400 block mb-1 font-medium">
                Folio / Identificador
              </label>
              <Input
                value={signingPayload.documentId}
                onChange={(e) =>
                  onChangeSigningPayload({
                    ...signingPayload,
                    documentId: e.target.value,
                  })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                RFC Emisor / Firmante
              </label>
              <Input
                value={signingPayload.rfcEmisor}
                onChange={(e) =>
                  onChangeSigningPayload({
                    ...signingPayload,
                    rfcEmisor: e.target.value,
                  })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs text-emerald-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                RFC Receptor / Cliente
              </label>
              <Input
                value={signingPayload.rfcReceptor}
                onChange={(e) =>
                  onChangeSigningPayload({
                    ...signingPayload,
                    rfcReceptor: e.target.value,
                  })
                }
                className="bg-slate-950 border-slate-800 font-mono text-xs text-cyan-400"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                Valor Declarado
              </label>
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

          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Contenido Estructurado de la Transacción
            </span>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
              <pre>{JSON.stringify(signingPayload.rawContent, null, 2)}</pre>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              Cadena Original Canónica SAT (Delimitadores Oficiales ||)
            </h4>
            <button
              onClick={onCopyCadena}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              {copiedCadena ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
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
              onClick={onExecuteSign}
              disabled={isSigning || !isVaultUnlocked}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {isSigning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Firmar Documento con e.firma (WebCrypto)
            </Button>
          </div>
        </div>
      </div>

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

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Sello Digital RSA-SHA256 (Base64)
                </span>
                <button
                  onClick={onCopySello}
                  className="text-slate-400 hover:text-white text-[10px] flex items-center gap-1"
                >
                  {copiedSello ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedSello ? "Copiado" : "Copiar Sello"}
                </button>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-cyan-300 break-all max-h-28 overflow-y-auto leading-relaxed">
                {activeSealResult.selloDigitalBase64}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">
                  No. Serie Certificado
                </span>
                <span className="font-mono text-slate-200 text-[11px] truncate block">
                  {activeSealResult.certificateSerial}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-slate-500 text-[10px] block">
                  RFC Titular Firmante
                </span>
                <span className="font-mono text-emerald-400 text-[11px] truncate block">
                  {activeSealResult.rfcTitular}
                </span>
              </div>
            </div>

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
                onClick={() => onSelectTab("PUBLIC_VERIFIER")}
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
              <h4 className="text-sm font-semibold text-white">
                Listo para Generar Sello Digital
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Al presionar el botón de firmado, el motor WebCrypto ejecutará
                la firma RSASSA-PKCS1-v1_5 sobre la Cadena Original en su
                navegador.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
