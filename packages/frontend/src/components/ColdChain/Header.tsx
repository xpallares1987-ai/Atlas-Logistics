/**
 * @file Header.tsx
 * @description Header, KPI cards, and tab navigation for the Cold Chain & Pharma GDP module.
 * @module @atlas/frontend/components/ColdChain/Header
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import React from "react";
import {
  ThermometerSnowflake,
  Calculator,
  Snowflake,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { ColdChainTabId } from "../../types/cold-chain.types";

export interface HeaderProps {
  activeTab: ColdChainTabId;
  setActiveTab: (tab: ColdChainTabId) => void;
  onOpenCalculator: () => void;
  stats: {
    totalShipmentsCount: number;
    compliantCount: number;
    quarantineCount: number;
    criticalDryIceCount: number;
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
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <ThermometerSnowflake className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Cadena de Frío & Farma GDP / Reefer
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                EN 12830 & MKT Arrhenius
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Control térmico de productos biológicos, vacunas (-80°C / +2°C a
            +8°C) y contenedores Reefer, cálculo cinético MKT, autonomía de
            hielo seco y Certificados Oficiales de Liberación GDP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCalculator}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/25 transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Cálculo Térmico & Autonomía (MKT / Hielo Seco)
          </button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Envíos Activos Frío
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {stats.totalShipmentsCount}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Snowflake className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Dataloggers EN 12830 conectados
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Conformidad GDP (Liberados)
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {stats.totalShipmentsCount > 0
                  ? (
                      (stats.compliantCount / stats.totalShipmentsCount) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            MKT y estabilidad conformes
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Lotes en Cuarentena
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                {stats.quarantineCount}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Excursiones bajo análisis CAPA
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Alerta Hielo Seco
              </p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">
                {stats.criticalDryIceCount}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Reserva crítica (&lt; 10 kg)
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
        {(
          [
            {
              id: "MONITOR",
              label: "Monitor de Envíos & Dataloggers (EN 12830)",
            },
            {
              id: "CALCULATOR",
              label: "Calculadora Térmica (MKT / Hielo Seco / Genset)",
            },
            {
              id: "AUDIT_GDP",
              label: "Auditoría de Calidad GDP & Liberación de Lotes",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTab === tab.id
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
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
