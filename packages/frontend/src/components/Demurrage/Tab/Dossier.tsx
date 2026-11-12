/**
 * @file Dossier.tsx
 * @description Evidentiary dispute dossier, Gemini AI legal demand drafting, PDF export, and carrier email dispatch.
 * @module @atlas/frontend/components/Demurrage/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { useState } from "react";
import {
  Sparkles,
  Check,
  Copy,
  Download,
  Scale,
  FileText,
  Send,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@atlas/ui";
import type { DisputePack } from "@atlas/shared";
import type {
  GeminiFmcDraftResult,
  DispatchReceipt,
} from "../../../types/demurrage.types";

interface DossierProps {
  disputePack: DisputePack;
  activeLetterBody: string;
  activeDbInvoice: any;
  geminiDraftResult: GeminiFmcDraftResult | null;
  onClearGeminiDraft: () => void;
  isGeneratingGeminiDraft: boolean;
  onGenerateGeminiDraft: () => void;
  isSubmittingDispute: boolean;
  onPresentFmcDispute: () => void;
  onDownloadPdf: () => void;
  isDispatchingEmail: boolean;
  dispatchReceipt: DispatchReceipt | null;
  onDispatchEmail: (emailTo: string) => void;
}

export function Dossier({
  disputePack,
  activeLetterBody,
  activeDbInvoice,
  geminiDraftResult,
  onClearGeminiDraft,
  isGeneratingGeminiDraft,
  onGenerateGeminiDraft,
  isSubmittingDispute,
  onPresentFmcDispute,
  onDownloadPdf,
  isDispatchingEmail,
  dispatchReceipt,
  onDispatchEmail,
}: DossierProps) {
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [dispatchEmailTo, setDispatchEmailTo] = useState(
    disputePack.recipientCarrier.email || "disputes.na@maersk.com",
  );

  const handleCopyLetter = () => {
    navigator.clipboard.writeText(activeLetterBody);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Columns: Formal Letter Preview */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Escrito Formal de Disputa & Demanda Legal
            </h2>
            <p className="text-xs text-slate-400">
              Dossier ID:{" "}
              <span className="font-mono text-blue-400">
                {disputePack.dossierId}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={onGenerateGeminiDraft}
              disabled={isGeneratingGeminiDraft}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGeneratingGeminiDraft
                ? "Redactando con Gemini AI..."
                : "Redactar Alegación con Gemini AI (On-Demand)"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyLetter}
              className="text-xs flex items-center gap-1.5"
            >
              {copiedLetter ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedLetter ? "Copiado!" : "Copiar Texto"}
            </Button>
            <Button
              size="sm"
              onClick={onDownloadPdf}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar PDF Oficial
            </Button>
            <Button
              size="sm"
              onClick={onPresentFmcDispute}
              disabled={
                isSubmittingDispute || activeDbInvoice?.status === "DISPUTED"
              }
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center gap-1.5"
            >
              <Scale className="w-3.5 h-3.5" />
              {isSubmittingDispute
                ? "Registrando..."
                : activeDbInvoice?.status === "DISPUTED"
                  ? "Disputa FMC Presentada"
                  : "Presentar Disputa Legal FMC"}
            </Button>
          </div>
        </div>

        {geminiDraftResult && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">
                Alegación Jurídica Generada por Google Gemini AI (Free Tier)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono text-[10px]">
                {geminiDraftResult.source} · {geminiDraftResult.model}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
              <span>Latencia: {geminiDraftResult.latencyMs}ms</span>
              <span>
                Cuota RPM restante: {geminiDraftResult.quotaRemainingRpm}/12
              </span>
              <button
                type="button"
                onClick={onClearGeminiDraft}
                className="text-slate-400 hover:text-white underline font-sans"
              >
                Restaurar plantilla base
              </button>
            </div>
          </div>
        )}

        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[550px] overflow-y-auto">
          {activeLetterBody}
        </div>

        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>
              Documentos Anexos: {disputePack.evidenceAttachments.join(", ")}
            </span>
          </div>
          <span className="text-amber-400 font-medium">
            {disputePack.statutoryDeadlineNotice}
          </span>
        </div>
      </div>

      {/* Right Column: Dispatch Email to Carrier Desk */}
      <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4 h-fit">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
          <Send className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-white">
            Despacho Telemático de Disputa
          </h3>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Naviera Destinataria
            </label>
            <input
              type="text"
              disabled
              value={disputePack.recipientCarrier.carrierName}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Departamento / Mesa de Reclamaciones
            </label>
            <input
              type="text"
              disabled
              value={disputePack.recipientCarrier.department}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Email Oficial de Disputas Naviera
            </label>
            <input
              type="email"
              value={dispatchEmailTo}
              onChange={(e) => setDispatchEmailTo(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              Asunto
            </label>
            <input
              type="text"
              disabled
              value={disputePack.formalLetterSubject}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-300 font-mono truncate"
            />
          </div>

          <Button
            onClick={() => onDispatchEmail(dispatchEmailTo)}
            disabled={isDispatchingEmail}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isDispatchingEmail
              ? "Transmitiendo..."
              : "Despachar Reclamación a Naviera"}
          </Button>

          {dispatchReceipt && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1 mt-3">
              <div className="font-bold flex items-center gap-1.5 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Expediente Despachado con Éxito
              </div>
              <div>
                Código de Acuse:{" "}
                <strong className="font-mono text-white">
                  {dispatchReceipt.confirmationCode}
                </strong>
              </div>
              <div>
                Mensaje ID:{" "}
                <span className="font-mono text-slate-400">
                  {dispatchReceipt.messageId}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Plazo legal de 30 días naturales iniciado según normativa
                aplicable.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dossier;
