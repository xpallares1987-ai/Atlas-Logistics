/**
 * @file Integrations.tsx
 * @description ERP, B2B EDI and Google Gemini AI Studio on-demand integration connectors tab.
 * @module @atlas/frontend/components/SystemPanel/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import { Cpu, Sparkles, RefreshCw, Key } from "lucide-react";
import { Button } from "@atlas/ui";
import type {
  GeminiAiStatusState,
  CopilotResponseState,
  ExecutiveBriefingState,
} from "../../../types/system-panel.types";

interface IntegrationsProps {
  aiStatus: GeminiAiStatusState | null;
  apiKeyInput: string;
  onApiKeyInputChange: (val: string) => void;
  isSavingKey: boolean;
  keySaveFeedback: { success: boolean; message: string } | null;
  onConfigureGeminiKey: (e: React.FormEvent) => void;
  copilotPrompt: string;
  onCopilotPromptChange: (val: string) => void;
  isRunningCopilot: boolean;
  copilotResponse: CopilotResponseState | null;
  onRunOnDemandCopilot: () => void;
  isGeneratingBriefing: boolean;
  executiveBriefing: ExecutiveBriefingState | null;
  onGenerateExecutiveBriefing: (bypassCache?: boolean) => void;
  onCloseExecutiveBriefing: () => void;
  onPurgeAiCache: () => void;
}

export function Integrations({
  aiStatus,
  apiKeyInput,
  onApiKeyInputChange,
  isSavingKey,
  keySaveFeedback,
  onConfigureGeminiKey,
  copilotPrompt,
  onCopilotPromptChange,
  isRunningCopilot,
  copilotResponse,
  onRunOnDemandCopilot,
  isGeneratingBriefing,
  executiveBriefing,
  onGenerateExecutiveBriefing,
  onCloseExecutiveBriefing,
  onPurgeAiCache,
}: IntegrationsProps) {
  return (
    <div className="space-y-6">
      {/* Google AI Studio (Gemini Free-Tier On-Demand) Gateway Card */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">
                  Google AI Studio · Gemini API (Free-Tier On-Demand)
                </h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    aiStatus?.configured
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {aiStatus?.configured
                    ? `ACTIVE (${aiStatus.maskedKey})`
                    : "FALLBACK DETERMINÍSTICO (SIN CLAVE)"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ejecución estrictamente bajo petición directa del usuario (0
                llamadas en segundo plano). Protegido con límite de 12 RPM,
                caché SHA-256 (30 min) y fallback determinístico.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300">
              Modelo: {aiStatus?.defaultModel || "gemini-2.5-flash"}
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300">
              RPM: {aiStatus?.quota.rpmUsed ?? 0}/
              {aiStatus?.quota.rpmLimit ?? 12}
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300">
              RPD: {aiStatus?.quota.rpdUsed ?? 0}/
              {aiStatus?.quota.rpdLimit ?? 1400}
            </span>
            <span className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-300">
              Cache Hits: {aiStatus?.cache.hits ?? 0}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => onGenerateExecutiveBriefing(false)}
              disabled={isGeneratingBriefing}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-sans font-bold px-3 py-1 rounded-xl flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              {isGeneratingBriefing
                ? "Consolidando..."
                : "📊 Executive Briefing (1-Clic)"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onPurgeAiCache}
              className="border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs font-sans font-bold px-3 py-1 rounded-xl"
            >
              Purgar Caché L1
            </Button>
          </div>
        </div>

        {executiveBriefing && (
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles size={15} className="text-indigo-400" />
                <span className="font-bold text-white">
                  {executiveBriefing.briefing.shiftHeadline}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-mono text-[10px]">
                  {executiveBriefing.source === "gemini-live"
                    ? "Gemini Live"
                    : executiveBriefing.source === "gemini-cache"
                      ? "Caché SQLite/L1 (0-Tokens)"
                      : "Fallback Determinista"}{" "}
                  · {executiveBriefing.model}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  Valor Protegido Est.: $
                  {executiveBriefing.briefing.estimatedProtectedValueUsd.toLocaleString()}{" "}
                  USD
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onGenerateExecutiveBriefing(true)}
                  disabled={isGeneratingBriefing}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 font-bold text-[10px] flex items-center gap-1"
                >
                  <RefreshCw size={10} />
                  Regenerar en vivo (1 RPM)
                </button>
                <button
                  type="button"
                  onClick={onCloseExecutiveBriefing}
                  className="text-slate-400 hover:text-white underline text-[11px]"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-indigo-300">
                  3 Focos Críticos del Turno:
                </div>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {executiveBriefing.briefing.topPriorities.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-emerald-300">
                  3 Acciones Inmediatas Recomendadas:
                </div>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {executiveBriefing.briefing.immediateActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Key Linking & On-Demand Copilot Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: API Key Configuration (.env.local) */}
          <form
            onSubmit={onConfigureGeminiKey}
            className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Key size={14} className="text-indigo-400" />
                Vincular API Key de Google AI Studio (Gratuita)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Persistencia local: .env.local (Ignorado en Git)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Introduce tu clave generada en Google AI Studio (comienza por{" "}
              <code className="text-indigo-300">AIzaSy...</code>) para activar
              respuestas en vivo en los botones On-Demand de la aplicación.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="off"
                value={apiKeyInput}
                onChange={(e) => onApiKeyInputChange(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSavingKey || !apiKeyInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4"
              >
                {isSavingKey ? "Vinculando..." : "Vincular Clave"}
              </Button>
            </div>
            {keySaveFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs border ${
                  keySaveFeedback.success
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/30 text-rose-300"
                }`}
              >
                {keySaveFeedback.message}
              </div>
            )}
          </form>

          {/* Right: Interactive On-Demand Test Copilot */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-400" />
                Consola On-Demand: Copiloto Operativo SQLite
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                Contexto: sh_demo_01 (BK-2026-67116)
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={copilotPrompt}
                onChange={(e) => onCopilotPromptChange(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <Button
                type="button"
                size="sm"
                onClick={onRunOnDemandCopilot}
                disabled={isRunningCopilot}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 flex items-center gap-1.5 shrink-0"
              >
                <Sparkles size={13} />
                {isRunningCopilot ? "Consultando..." : "Ejecutar On-Demand"}
              </Button>
            </div>
            {copilotResponse && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold">
                    Origen: {copilotResponse.source} ({copilotResponse.model})
                  </span>
                  <span>
                    {copilotResponse.latencyMs}ms · RPM libre:{" "}
                    {copilotResponse.quotaRemainingRpm}/12
                  </span>
                </div>
                <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {copilotResponse.reply}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Enterprise ERP
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CONNECTED
            </span>
          </div>
          <h4 className="text-base font-bold text-white">
            SAP S/4HANA OData / IDoc
          </h4>
          <p className="text-xs text-slate-400">
            Synchronizes purchase orders, sales bills, and billing documents
            with central corporate SAP enterprise instance.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            Endpoint: https://sap.atlas-logistics.internal/odata/v4/
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Cloud Financials
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ACTIVE
            </span>
          </div>
          <h4 className="text-base font-bold text-white">
            Oracle NetSuite SuiteTalk
          </h4>
          <p className="text-xs text-slate-400">
            Real-time multi-currency exchange rates, carrier AP invoices, and
            general ledger journal posting.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            REST Web Services: Token-Based Auth (TBA)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              B2B Interchanges
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              5 PARTNERS
            </span>
          </div>
          <h4 className="text-base font-bold text-white">
            ANSI X12 & UN/EDIFACT Hub
          </h4>
          <p className="text-xs text-slate-400">
            EDI 300 (Booking Request), EDI 301 (Confirmation), EDI 310 (Vessel
            Manifest), and IFTMIN instructions.
          </p>
          <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
            Protocol: AS2 Encrypted / SFTP Mailbox
          </div>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
