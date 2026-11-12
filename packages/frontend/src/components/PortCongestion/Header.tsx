/**
 * @file Header.tsx
 * @description Top header and Iberian port hub switcher for Port Congestion Control module.
 * @module @atlas/frontend/components/PortCongestion
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Compass, MapPin } from "lucide-react";
import { IBERIAN_PORT_HUBS } from "@atlas/shared";
import type { PortCongestionHeaderProps } from "../../types/port-congestion.types";

export function Header({
  selectedPortCode,
  onSelectPort,
}: PortCongestionHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase tracking-widest">
          <Compass className="w-4 h-4 animate-spin-slow" />
          <span>Atlas Maritime Control Tower · AIS Telemetry</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
          <span>
            Predictive Port Congestion & AIS Berth Delay Early Warning Engine
          </span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Geofenced Anchorage Dwell Times · Deterministic Berth Collision
          Forecasting · Landside Drayage Interlock
        </p>
      </div>

      {/* Port Hub Switcher */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
        {IBERIAN_PORT_HUBS.map((hub) => (
          <button
            key={hub.portCode}
            onClick={() => onSelectPort(hub.portCode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedPortCode === hub.portCode
                ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{hub.portCode}</span>
            <span className="hidden sm:inline">
              ({hub.name.replace("Port de ", "").replace("Puerto de ", "")})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
