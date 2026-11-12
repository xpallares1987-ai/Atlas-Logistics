/**
 * @file GeospatialMap.tsx
 * @description Interactive SVG harbor canvas, geofence zones legend, and vessel AIS inspector tab.
 * @module @atlas/frontend/components/PortCongestion/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { Navigation as NavigationIcon, ShieldCheck, Ship } from "lucide-react";
import type { GeospatialMapTabProps } from "../../../types/port-congestion.types";

export function GeospatialMap({
  activeHub,
  activeVessels,
  selectedVessel,
  onSelectVessel,
  searchTerm,
  onSearchTermChange,
  onInitiateSuspensionFromVessel,
}: GeospatialMapTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Interactive Geospatial Harbor Canvas / SVG */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NavigationIcon className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-slate-200">
              Carta Náutica Telemétrica: {activeHub.name} ({activeHub.portCode})
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500 inline-block" />{" "}
              Fondeadero
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500 inline-block" />{" "}
              Canal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500 inline-block" />{" "}
              Muelle
            </span>
          </div>
        </div>

        {/* SVG Visualizer */}
        <div className="relative w-full aspect-[16/10] bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
          <svg viewBox="0 0 800 500" className="w-full h-full select-none">
            {/* Background Grid */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgba(51, 65, 85, 0.25)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="800" height="500" fill="url(#grid)" />

            {/* Simulated Coastline */}
            <path
              d="M 0 50 Q 200 80 350 140 T 500 240 T 800 280 L 800 0 L 0 0 Z"
              fill="#090d16"
              stroke="#1e293b"
              strokeWidth="2"
            />

            {/* Geofence Polygons */}
            {/* Anchorage Zone */}
            <polygon
              points="450,320 720,320 720,460 450,460"
              fill="rgba(245, 158, 11, 0.12)"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <text
              x="460"
              y="340"
              fill="#f59e0b"
              fontSize="12"
              fontWeight="bold"
            >
              FONDEADERO EXTERIOR (
              {
                activeHub.zones.find((z) => z.type === "ANCHORAGE")
                  ?.capacityVessels
              }{" "}
              max)
            </text>

            {/* Entry Fairway / Channel */}
            <polygon
              points="360,200 440,200 440,330 360,330"
              fill="rgba(6, 182, 212, 0.12)"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
            <text
              x="365"
              y="270"
              fill="#06b6d4"
              fontSize="11"
              fontWeight="bold"
            >
              CANAL
            </text>

            {/* Terminal Berths */}
            <polygon
              points="220,130 350,130 350,195 220,195"
              fill="rgba(16, 185, 129, 0.15)"
              stroke="#10b981"
              strokeWidth="2"
            />
            <text
              x="230"
              y="150"
              fill="#10b981"
              fontSize="12"
              fontWeight="bold"
            >
              MUELLES DE CONTENEDORES
            </text>
            <text x="230" y="170" fill="#94a3b8" fontSize="10">
              {activeHub.terminals.join(" · ")}
            </text>

            {/* Vessels rendered as interactive pins */}
            {activeVessels.map((v, i) => {
              let x = 520 + (i % 3) * 70;
              let y = 370 + Math.floor(i / 3) * 45;

              if (v.operationalStatus === "AT_BERTH") {
                x = 260 + i * 40;
                y = 160;
              } else if (v.operationalStatus === "UNDERWAY_CHANNEL") {
                x = 400;
                y = 250;
              }

              const isSelected = selectedVessel?.imo === v.imo;

              return (
                <g
                  key={v.imo}
                  onClick={() => onSelectVessel(v)}
                  className="cursor-pointer transition-transform hover:scale-125"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 14 : 9}
                    fill={
                      v.operationalStatus === "AT_BERTH"
                        ? "#10b981"
                        : v.isDwellCritical
                          ? "#ef4444"
                          : v.isDwellWarning
                            ? "#f59e0b"
                            : "#06b6d4"
                    }
                    stroke="#0f172a"
                    strokeWidth="2"
                    className={v.isDwellCritical ? "animate-pulse" : ""}
                  />
                  <path
                    d={`M ${x} ${y - 4} L ${x + 3} ${y + 3} L ${x - 3} ${y + 3} Z`}
                    fill="#ffffff"
                    transform={`rotate(${v.headingDegrees}, ${x}, ${y})`}
                  />
                  <text
                    x={x + 12}
                    y={y + 4}
                    fill="#e2e8f0"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {v.vesselName.slice(0, 14)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Geofence Zones Legend & Coordinates List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {activeHub.zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs"
            >
              <div className="flex items-center justify-between font-bold text-slate-300">
                <span>{zone.name.split("(")[0]}</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {zone.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                {zone.description}
              </p>
              <div className="mt-2 text-[10px] text-slate-500 font-mono">
                Capacidad: {zone.capacityVessels} buques
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vessel Detail Inspector & AIS List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <Ship className="w-4 h-4 text-cyan-400" />
            <span>Buques en Radar ({activeVessels.length})</span>
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Filtrar buque / IMO..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36"
            />
          </div>
        </div>

        {/* Selected Vessel Inspector Card */}
        {selectedVessel ? (
          <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                  {selectedVessel.carrier} · IMO {selectedVessel.imo}
                </span>
                <h4 className="text-base font-bold text-white mt-1">
                  {selectedVessel.vesselName}
                </h4>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  selectedVessel.operationalStatus === "AT_BERTH"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : selectedVessel.isDwellCritical
                      ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse"
                      : selectedVessel.isDwellWarning
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                }`}
              >
                {selectedVessel.operationalStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">
                  Speed Over Ground (SOG)
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {selectedVessel.sogKnots} knots
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">
                  Dwell Time Fondeo
                </span>
                <span
                  className={`font-mono font-bold ${
                    selectedVessel.isDwellCritical
                      ? "text-red-400"
                      : selectedVessel.isDwellWarning
                        ? "text-amber-400"
                        : "text-slate-200"
                  }`}
                >
                  {selectedVessel.dwellHours} horas
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">
                  Terminal Asignada
                </span>
                <span className="font-semibold text-slate-200">
                  {selectedVessel.assignedTerminal || "Sin asignar"}
                </span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">
                  ETA Prevista
                </span>
                <span className="font-mono text-slate-200">
                  {new Date(selectedVessel.eta).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {selectedVessel.isDwellWarning && (
              <Button
                onClick={() => onInitiateSuspensionFromVessel(selectedVessel)}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Emitir Suspensión Reloj D&D</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            Selecciona un buque en la carta náutica o en el listado inferior
            para inspeccionar telemetría AIS.
          </div>
        )}

        {/* Vessel List Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1">
          {activeVessels.map((v) => (
            <div
              key={v.imo}
              onClick={() => onSelectVessel(v)}
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                selectedVessel?.imo === v.imo
                  ? "bg-slate-800 border-cyan-500 text-white"
                  : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{v.vesselName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({v.carrier})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  SOG: {v.sogKnots} kn · {v.assignedTerminal || "Fondeo"}
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded block ${
                    v.isDwellCritical
                      ? "bg-red-500/20 text-red-400"
                      : v.isDwellWarning
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {v.dwellHours > 0 ? `${v.dwellHours}h dwell` : "En tránsito"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default GeospatialMap;
