/**
 * @file Header.tsx
 * @description KPI summary cards and tab navigation for the Unified Maritime Decarbonization & CBAM Financial Ledger.
 * @module @atlas/frontend/components/CbamLedger/Header
 * @see {@link docs/adr/0042-maritime-decarbonization-and-cbam-financial-ledger.md}
 */

import React from "react";
import {
  Scale,
  ShieldCheck,
  Ship,
  TrendingUp,
  FileSpreadsheet,
  Coins,
  CheckCircle2,
} from "lucide-react";

export type CbamLedgerTabId =
  "CBAM_DECLARATIONS" | "FUELEU_POOLING" | "BOOK_AND_CLAIM";

export interface CbamLedgerHeaderProps {
  activeTab: CbamLedgerTabId;
  setActiveTab: (tab: CbamLedgerTabId) => void;
  kpis: {
    totalNetLiabilityEur: number;
    totalEmbeddedEmissionsTco2e: number;
    fuelEuComplianceBalanceMj: number;
    retiredInsettingTco2e: number;
    activeDeclarationsCount: number;
    pooledVesselsCount: number;
  };
}

export const Header: React.FC<CbamLedgerHeaderProps> = ({
  activeTab,
  setActiveTab,
  kpis,
}) => {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Scale className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Maritime Decarbonization & CBAM Ledger
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ADR 0042 • EU Reg. 2023/956 & 2023/1805
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Unified financial ledger for EU CBAM carbon liabilities, FuelEU
            Maritime compliance pooling (Art. 21), and ISO 14083 / GLEC v3.0
            cryptographic book-and-claim insetting.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 text-emerald-400 bg-emerald-950/60 rounded-xl border border-emerald-800/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Zero Floating-Point Drift ($0.00)
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Net Carbon Liability (CBAM)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            €
            {kpis.totalNetLiabilityEur.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Art. 9 foreign credits deducted
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Embedded Emissions
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {kpis.totalEmbeddedEmissionsTco2e.toLocaleString("en-US", {
              maximumFractionDigits: 1,
            })}{" "}
            <span className="text-sm font-normal text-slate-400">tCO₂e</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across {kpis.activeDeclarationsCount} active declarations
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              FuelEU Compliance Pool
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Ship className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black ${kpis.fuelEuComplianceBalanceMj >= 0 ? "text-emerald-400" : "text-rose-400"}`}
          >
            {kpis.fuelEuComplianceBalanceMj >= 0 ? "+" : ""}
            {kpis.fuelEuComplianceBalanceMj.toLocaleString("en-US")}{" "}
            <span className="text-sm font-normal text-slate-400">MJ</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {kpis.pooledVesselsCount} vessels pooled (Art. 21)
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 border border-slate-800/80 hover:border-emerald-500/40 transition-all shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cryptographic Insets
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-300">
            {kpis.retiredInsettingTco2e.toLocaleString("en-US", {
              maximumFractionDigits: 1,
            })}{" "}
            <span className="text-sm font-normal text-slate-400">tCO₂e</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            SHA-256 Book-and-Claim chain
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("CBAM_DECLARATIONS")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "CBAM_DECLARATIONS"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          CBAM Financial Declarations
        </button>
        <button
          onClick={() => setActiveTab("FUELEU_POOLING")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "FUELEU_POOLING"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Ship className="w-4 h-4" />
          FuelEU Compliance Pooling (Art. 21)
        </button>
        <button
          onClick={() => setActiveTab("BOOK_AND_CLAIM")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === "BOOK_AND_CLAIM"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Cryptographic Book & Claim
        </button>
      </div>
    </div>
  );
};
