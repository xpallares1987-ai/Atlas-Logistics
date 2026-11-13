/**
 * @file SatelliteMap.tsx
 * @description Mediterranean / North Atlantic SVG satellite tracking map tab with geofences and breadcrumbs.
 * @module @atlas/frontend/components/IoTControlTower/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { MapPin } from "lucide-react";
import type { SatelliteMapTabProps } from "../../../types/iot-control-tower.types";
import { toSvgCoords } from "../hooks/useIoTControlTower";

export function SatelliteMap({
  assets,
  geofences,
  selectedAssetId,
  selectedAsset,
  assetDetail,
  onSelectAsset,
}: SatelliteMapTabProps) {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin size={16} className="text-cyan-400" />
          Mapa Satelital Mediterráneo / Atlántico Norte
        </h3>
        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
          Actualización cada 15 min (AIS) · 3 min (GPS)
        </span>
      </div>

      {/* SVG Map Area */}
      <div
        className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden"
        style={{ height: "360px" }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect width="800" height="400" fill="#020817" />
          {[...Array(8)].map((_, i) => (
            <line
              key={`vg-${i}`}
              x1={i * 100}
              y1="0"
              x2={i * 100}
              y2="400"
              stroke="#1e2a3a"
              strokeWidth="0.5"
            />
          ))}
          {[...Array(5)].map((_, i) => (
            <line
              key={`hg-${i}`}
              x1="0"
              y1={i * 100}
              x2="800"
              y2={i * 100}
              stroke="#1e2a3a"
              strokeWidth="0.5"
            />
          ))}

          {/* Geofence zones */}
          {geofences.map((gf) => {
            const c = toSvgCoords(gf.centerLat, gf.centerLng);
            const r = (gf.radiusMeters / 111000) * (800 / 60) * 0.5;
            return (
              <g key={gf.id}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={Math.max(r, 12)}
                  fill="rgba(99,102,241,0.08)"
                  stroke="rgba(99,102,241,0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <text
                  x={c.x}
                  y={c.y + Math.max(r, 12) + 8}
                  fill="rgba(129,140,248,0.8)"
                  fontSize="7"
                  textAnchor="middle"
                >
                  {gf.name.split(" ").slice(0, 2).join(" ")}
                </text>
              </g>
            );
          })}

          {/* Breadcrumb trails */}
          {assetDetail?.readings &&
            assetDetail.readings.length > 1 &&
            (() => {
              const pts = assetDetail.readings.map((r: any) =>
                toSvgCoords(r.lat, r.lng),
              );
              const d = pts
                .map(
                  (p: any, i: number) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
                )
                .join(" ");
              return (
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(34,211,238,0.4)"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              );
            })()}

          {/* Asset markers */}
          {assets.map((asset) => {
            const pos = toSvgCoords(asset.currentLat, asset.currentLng);
            const isSelected = asset.id === selectedAssetId;
            const isCritical = asset.status === "CRITICAL_ALERT";
            const color = isCritical
              ? "#f87171"
              : isSelected
                ? "#22d3ee"
                : "#64748b";

            return (
              <g
                key={asset.id}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectAsset(asset.id)}
              >
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="20"
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.4"
                  />
                )}
                {isCritical && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="16"
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="1.5"
                    opacity="0.5"
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="8"
                  fill={color}
                  fillOpacity="0.2"
                  stroke={color}
                  strokeWidth="1.5"
                />
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={
                    pos.x +
                    Math.sin((asset.currentHeadingDeg * Math.PI) / 180) * 18
                  }
                  y2={
                    pos.y -
                    Math.cos((asset.currentHeadingDeg * Math.PI) / 180) * 18
                  }
                  stroke={color}
                  strokeWidth="1.5"
                  markerEnd="url(#arrow)"
                />
                <text
                  x={pos.x + 12}
                  y={pos.y - 6}
                  fill={color}
                  fontSize="8"
                  fontWeight="bold"
                >
                  {asset.assetCode}
                </text>
                <text
                  x={pos.x + 12}
                  y={pos.y + 5}
                  fill="rgba(148,163,184,0.8)"
                  fontSize="7"
                >
                  {asset.currentSpeedKnots.toFixed(1)}kn
                </text>
              </g>
            );
          })}

          <defs>
            <marker
              id="arrow"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L6,3 z" fill="#22d3ee" />
            </marker>
          </defs>
        </svg>

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 bg-slate-950/80 backdrop-blur-sm p-2.5 rounded-xl border border-slate-800/60">
          {[
            { color: "#22d3ee", label: "Activo seleccionado" },
            { color: "#f87171", label: "Alerta crítica" },
            { color: "#4f46e5", label: "Geocercas" },
            { color: "#64748b", label: "Otros activos" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span
                className="w-3 h-1.5 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              <span className="text-[10px] text-slate-400">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Asset Quick Info */}
      {selectedAsset && (
        <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 grid grid-cols-3 md:grid-cols-5 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Velocidad</span>
            <span className="font-bold text-white">
              {selectedAsset.currentSpeedKnots.toFixed(1)} kn
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Rumbo</span>
            <span className="font-bold text-white">
              {selectedAsset.currentHeadingDeg.toFixed(0)}°
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Altitud</span>
            <span className="font-bold text-white">
              {selectedAsset.currentAltitudeMeters.toFixed(0)} m
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Lat / Lng</span>
            <span className="font-bold text-cyan-400">
              {selectedAsset.currentLat.toFixed(3)}° /{" "}
              {selectedAsset.currentLng.toFixed(3)}°
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">ETA Prevista</span>
            <span className="font-bold text-white">
              {new Date(selectedAsset.predictedEta).toLocaleTimeString(
                "es-ES",
                { hour: "2-digit", minute: "2-digit" },
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
export default SatelliteMap;
