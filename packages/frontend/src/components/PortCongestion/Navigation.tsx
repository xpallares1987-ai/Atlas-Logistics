/**
 * @file Navigation.tsx
 * @description Tab navigation bar for Port Congestion Control module.
 * @module @atlas/frontend/components/PortCongestion
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Clock, Layers, ShieldCheck, Truck } from "lucide-react";
import type { PortCongestionNavigationProps } from "../../types/port-congestion.types";

export function Navigation({
  activeTab,
  onSelectTab,
  activeVesselsCount,
  activeCollisionsCount,
  activeDrayageCount,
  certificatesCount,
}: PortCongestionNavigationProps) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
      <button
        onClick={() => onSelectTab("GEOSPATIAL_MAP")}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
          activeTab === "GEOSPATIAL_MAP"
            ? "bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-slate-900"
        }`}
      >
        <Layers className="w-4 h-4" />
        <span>Radar Geoespacial AIS & Zonas</span>
        <span className="bg-cyan-900/60 text-cyan-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
          {activeVesselsCount}
        </span>
      </button>

      <button
        onClick={() => onSelectTab("BERTH_RADAR")}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
          activeTab === "BERTH_RADAR"
            ? "bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-slate-900"
        }`}
      >
        <Clock className="w-4 h-4" />
        <span>Cronograma de Atraques & Colisiones</span>
        {activeCollisionsCount > 0 && (
          <span className="bg-red-900/60 text-red-300 text-xs px-1.5 py-0.5 rounded-full font-mono animate-pulse">
            {activeCollisionsCount} conf
          </span>
        )}
      </button>

      <button
        onClick={() => onSelectTab("LANDSIDE_DRAYAGE")}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
          activeTab === "LANDSIDE_DRAYAGE"
            ? "bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-slate-900"
        }`}
      >
        <Truck className="w-4 h-4" />
        <span>Acarreo Terrestre & Intermodal</span>
        <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
          {activeDrayageCount}
        </span>
      </button>

      <button
        onClick={() => onSelectTab("DD_SUSPENSION")}
        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
          activeTab === "DD_SUSPENSION"
            ? "bg-slate-800 text-cyan-400 border border-cyan-500/40 shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-slate-900"
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Suspensión Reloj D&D (FMC/OSRA)</span>
        <span className="bg-emerald-900/60 text-emerald-300 text-xs px-1.5 py-0.5 rounded-full font-mono">
          {certificatesCount} certs
        </span>
      </button>
    </div>
  );
}
