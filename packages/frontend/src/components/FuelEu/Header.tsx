/**
 * @file Header.tsx
 * @description Top header, KPI summary strip, and tab navigation for FuelEU Maritime & EU ETS module.
 * @module @atlas/frontend/components/FuelEu
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import {
  Ship,
  Download,
  Waves,
  Percent,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { FuelEuHeaderProps, FuelEuTab } from "../../types/fueleu.types";

const TABS: { id: FuelEuTab; label: string }[] = [
  {
    id: "VOYAGES_GHG",
    label: "Monitor de Travesías & Intensidad GEI (gCO2eq/MJ)",
  },
  {
    id: "ETS_GREEN_BAF",
    label: "Liquidación EU ETS & Recargos Green BAF por TEU",
  },
  {
    id: "POOLING_FUELS",
    label: "Pooling de Flota (Art. 21) & Balance Multicombustible",
  },
];

export function Header({
  currentAccount,
  voyagesCount,
  vesselsCount,
  totalFuelEnergySum,
  avgGhgIntensity,
  totalEtsEmissionsSum,
  poolsCount,
  activeTab,
  onSelectTab,
}: FuelEuHeaderProps) {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Ship className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              FuelEU Maritime, EU ETS & Descarbonización de Flota
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Reg. (UE) 2023/1805 & Dir. 2023/959
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Contabilidad de Intensidad de GEI Well-to-Wake (gCO2eq/MJ),
            Liquidación de Derechos de Emisión EU ETS, Conexión OPS en Muelle y
            Pooling de Flota.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentAccount && (
            <a
              href={`/api/fueleu/accounts/${currentAccount.id}/certificate-pdf`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-lg shadow-cyan-600/25 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Certificado Oficial FuelEU & ETS (PDF)
            </a>
          )}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Travesías Auditadas
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {voyagesCount} Viajes
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Waves className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {vesselsCount} buques ({(totalFuelEnergySum / 1_000_000).toFixed(1)}{" "}
            GJ a bordo)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Intensidad GEI Media
              </p>
              <h3 className="text-2xl font-black text-cyan-400 mt-1">
                {avgGhgIntensity.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-300">g/MJ</span>
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Objetivo 2025: 89.34 gCO2eq/MJ (-2%)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Derechos EU ETS Marítimo
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                {totalEtsEmissionsSum.toLocaleString("es-ES", {
                  maximumFractionDigits: 1,
                })}{" "}
                <span className="text-xs font-normal text-slate-300">
                  tCO2eq
                </span>
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {(totalEtsEmissionsSum * 75).toLocaleString("es-ES")} € obligación @
            75€/t
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Agrupaciones (Pools)
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                {poolsCount} Activas
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Compensación neta = 0,00 € multas
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
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
}
