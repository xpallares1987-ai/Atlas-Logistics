/**
 * @file Header.tsx
 * @description Header hero section, Air Cargo KPIs, and volumetric calculator launcher.
 * @module @atlas/frontend/components/AirCargo
 */

import {
  Plane,
  Calculator,
  FileText,
  Layers,
  Scale,
  Flame,
} from "lucide-react";

export interface HeaderProps {
  onOpenSimulator: () => void;
  totalAwbs: number;
  totalMawbs: number;
  totalChargeableKg: number;
  dgrSpecialCount: number;
}

export function Header({
  onOpenSimulator,
  totalAwbs,
  totalMawbs,
  totalChargeableKg,
  dgrSpecialCount,
}: HeaderProps) {
  return (
    <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
              <Plane className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              IATA e-Freight & Air Cargo (e-AWB)
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                IATA Res 600a / 672
              </span>
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Gestión determinista de Air Waybills (MAWB/HAWB), cálculo
            volumétrico (1:6000), auditoría DGR/TCR y mensajería oficial
            Cargo-XML / Cargo-IMP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSimulator}
            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calculadora Volumétrica y Tarificación
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Air Waybills
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {totalAwbs}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">MAWB + HAWB Activas</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Consolidaciones Master
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {totalMawbs}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Vuelos con Manifiesto e-AWB
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tonelaje Tarifable
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {(totalChargeableKg / 1000).toFixed(2)} Tn
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {totalChargeableKg.toFixed(1)} kg liquidables
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Carga Especial / DGR
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {dgrSpecialCount}
              </h3>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Cold Chain, Litio y DGR</p>
        </div>
      </div>
    </div>
  );
}
