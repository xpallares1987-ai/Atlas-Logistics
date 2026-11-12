/**
 * @file KpiStrip.tsx
 * @description 4-card KPI summary strip for active port hub congestion, dwell time, anchorage, and gate turn time.
 * @module @atlas/frontend/components/PortCongestion/Banner
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Anchor, Clock, Truck } from "lucide-react";
import type { PortCongestionKpiStripProps } from "../../../types/port-congestion.types";

export function KpiStrip({ activeHub }: PortCongestionKpiStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Índice de Congestión</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              activeHub.congestionIndex >= 75
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : activeHub.congestionIndex >= 50
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {activeHub.congestionIndex >= 75
              ? "CRITICAL"
              : activeHub.congestionIndex >= 50
                ? "URGENT"
                : "OPTIMAL"}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white">
            {activeHub.congestionIndex}%
          </span>
          <span className="text-xs text-slate-400">saturación dársena</span>
        </div>
        <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${
              activeHub.congestionIndex >= 75
                ? "bg-red-500"
                : activeHub.congestionIndex >= 50
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${activeHub.congestionIndex}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Espera Media Fondeadero</span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-amber-400">
            {activeHub.anchorageDwellAvgHours}h
          </span>
          <span className="text-xs text-slate-400">dwell time medio</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Umbral crítico FMC: &gt;24h (warning) / &gt;48h (tolling)
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Buques en Espera / Fondeo</span>
          <Anchor className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-cyan-400">
            {activeHub.vesselsAtAnchorage}
          </span>
          <span className="text-xs text-slate-400">portacontenedores</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          SOG &lt; 0.5 kn telemétrico verificado
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Tiempo Giro Puerta (Gate)</span>
          <Truck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-400">
            {activeHub.gateTurnTimeMinutesAvg} min
          </span>
          <span className="text-xs text-slate-400">drayage turnaround</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Enlaces:{" "}
          {activeHub.landsideFacilities.join(", ") || "Carretera Directa"}
        </p>
      </div>
    </div>
  );
}
