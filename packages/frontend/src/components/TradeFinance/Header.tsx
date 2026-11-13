/**
 * @file Header.tsx
 * @description Header, Gemini UCP 600 pre-audit banner, KPI cards, and tab selector for Trade Finance.
 * @module @atlas/frontend/components/TradeFinance/Header
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import {
  Landmark,
  Scale,
  Download,
  Building2,
  Coins,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import {
  GeminiUcpAuditResult,
  TradeFinanceTabId,
  TradeInstrument,
} from "../../types/trade-finance.types";

export interface HeaderProps {
  activeTab: TradeFinanceTabId;
  setActiveTab: (tab: TradeFinanceTabId) => void;
  currentInst: TradeInstrument | null;
  isAuditingGeminiUcp: boolean;
  onRunGeminiUcpAudit: () => void;
  geminiUcpAudit: GeminiUcpAuditResult | null;
  onCloseGeminiAudit: () => void;
  stats: {
    activeCount: number;
    totalFinancedVolume: number;
    complianceRate: number;
    urdgCount: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentInst,
  isAuditingGeminiUcp,
  onRunGeminiUcpAudit,
  geminiUcpAudit,
  onCloseGeminiAudit,
  stats,
}) => {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Landmark className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Financiación Internacional & Créditos Documentarios
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                UCP 600 • URDG 758 • SWIFT MT700
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Gestión de Cartas de Crédito Comerciales, Garantías a Primera
            Demanda, Auditoría de Discrepancias UCP 600 / ISBP 745 y Mensajería
            SWIFT MT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRunGeminiUcpAudit}
            disabled={isAuditingGeminiUcp}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
          >
            <Scale className="w-4 h-4" />
            {isAuditingGeminiUcp
              ? "Auditando UCP 600 con Gemini..."
              : "✨ Pre-Auditar Discrepancias UCP 600 (Gemini AI)"}
          </button>
          {currentInst && (
            <a
              href={`/api/trade-finance/instruments/${currentInst.id}/presentation-dossier-pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Dossier de Presentación Bancaria (PDF)
            </a>
          )}
        </div>
      </div>

      {geminiUcpAudit && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white">
                Pre-Auditoría Bancaria ICC UCP 600 — Ref:{" "}
                {geminiUcpAudit.instrumentReference}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono text-[10px]">
                {geminiUcpAudit.source} · {geminiUcpAudit.model}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 font-mono text-[10px]">
                Riesgo Presentación:{" "}
                {geminiUcpAudit.audit.presentationRiskLevel}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
              <span>{geminiUcpAudit.latencyMs}ms</span>
              <span>RPM Libre: {geminiUcpAudit.quotaRemainingRpm}/12</span>
              <button
                type="button"
                onClick={onCloseGeminiAudit}
                className="text-slate-400 hover:text-white underline font-sans"
              >
                Cerrar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {geminiUcpAudit.audit.discrepanciesFound.map((d, i) => (
              <div
                key={i}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1"
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-emerald-400 font-bold">
                    {d.article} · {d.field}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    {d.status}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{d.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Instrumentos Vivos
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {stats.activeCount} Activos
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Créditos L/C, Standby & Remesas
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Volumen Financiado
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {(stats.totalFinancedVolume / 1000).toFixed(1)}k{" "}
                <span className="text-xs font-normal text-slate-300">
                  EUR/USD
                </span>
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Garantía bancaria internacional
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Conformidad UCP 600
              </p>
              <h3 className="text-2xl font-black text-cyan-400 mt-1">
                {stats.complianceRate.toFixed(0)}%
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Presentaciones sin discrepancias
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Garantías a 1ª Demanda
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                {stats.urdgCount} URDG 758
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Performance & Advance Payment Bonds
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
        {(
          [
            {
              id: "INSTRUMENTS_DOCS",
              label:
                "Instrumentos de Crédito & Documentación (UCP 600 / URDG 758)",
            },
            {
              id: "UCP_DISCREPANCIES",
              label: "Auditor de Discrepancias UCP 600 & Avisos SWIFT MT734",
            },
            {
              id: "FEE_SIMULATOR",
              label: "Calculadora de Comisiones Bancarias & Coste Financiero",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === tab.id
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-lg shadow-blue-500/10"
                : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
