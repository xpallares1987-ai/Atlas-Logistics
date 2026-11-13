/**
 * @file Header.tsx
 * @description Header, KPI summary cards, and tab selector for the CBAM (Regulation EU 2023/956) module.
 * @module @atlas/frontend/components/Cbam/Header
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import {
  Leaf,
  Calculator,
  Scale,
  Factory,
  Globe2,
  DollarSign,
} from "lucide-react";
import { CbamTabId } from "../../types/cbam.types";

export interface HeaderProps {
  activeTab: CbamTabId;
  setActiveTab: (tab: CbamTabId) => void;
  onOpenCalculator: () => void;
  stats: {
    totalNetMassSum: number;
    totalDirectEmissionsSum: number;
    totalIndirectEmissionsSum: number;
    totalNetLiabilitySum: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenCalculator,
  stats,
}) => {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Leaf className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Ajuste en Frontera por Carbono (CBAM)
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Reglamento (UE) 2023/956 & EU ETS
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Cálculo de emisiones integradas directas/indirectas, precursores
            complejos, deducción del precio del carbono en origen (Art. 9) e
            informes oficiales XML/PDF para la Comisión Europea.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCalculator}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calculadora de Emisiones & Deuda CBAM
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Masa Neta Importada
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {stats.totalNetMassSum.toLocaleString()} t
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Sectores regulados CBAM</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Emisiones Directas (Alc. 1)
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                {stats.totalDirectEmissionsSum.toLocaleString()} tCO2e
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Combustión y proceso químico
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Emisiones Indirectas (Alc. 2)
              </p>
              <h3 className="text-2xl font-black text-teal-400 mt-1">
                {stats.totalIndirectEmissionsSum.toLocaleString()} tCO2e
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Globe2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Electricidad y precursores
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Deuda Neta EU ETS
              </p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">
                {stats.totalNetLiabilitySum.toLocaleString()} €
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Con deducciones Art. 9 aplicadas
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
        {(
          [
            {
              id: "DECLARATIONS",
              label: "Declaraciones Trimestrales & Registro CBAM",
            },
            {
              id: "CALCULATOR",
              label: "Calculadora de Emisiones & Precursores",
            },
            {
              id: "FINANCE_ETS",
              label:
                "Auditoría Financiera EU ETS & Deducciones Origen (Art. 9)",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === tab.id
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
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
