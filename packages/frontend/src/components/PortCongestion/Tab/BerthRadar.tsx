/**
 * @file BerthRadar.tsx
 * @description Deterministic berth collision radar and scheduled berth calls table tab.
 * @module @atlas/frontend/components/PortCongestion/Tab
 * @see {@link docs/adr/0020-modular-decomposition-guardrails.md}
 */

import { Button } from "@atlas/ui";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import type { BerthRadarTabProps } from "../../../types/port-congestion.types";

export function BerthRadar({
  activeHub,
  activeCollisions,
  berthCalls,
  selectedPortCode,
  onResolveCollision,
}: BerthRadarTabProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>
              Radar Determinista de Colisiones de Atraque (Buffer: 120 min)
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Monitorea ventanas de ocupación de muelle y solapamientos operativos
            que provocan desvíos en cadena y demoras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Total conflictos detectados:
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-red-900/60 text-red-300 border border-red-700">
            {activeCollisions.length}
          </span>
        </div>
      </div>

      {/* Active Collision Alert Banners */}
      {activeCollisions.length > 0 ? (
        <div className="space-y-4">
          {activeCollisions.map((col) => (
            <div
              key={col.collisionId}
              className="bg-red-950/30 border border-red-800/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="font-bold text-red-300 text-sm">
                    Conflicto en {col.terminalName} ({col.berthId}) ·
                    Solapamiento: {col.overlapMinutes} min (+
                    {col.projectedDelayHours}h demora)
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Buque Precedente:{" "}
                  <strong className="text-white">
                    {col.vesselA.vesselName}
                  </strong>{" "}
                  (ETD:{" "}
                  {new Date(col.vesselA.etdPlanned).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  ) vs Buque Entrante:{" "}
                  <strong className="text-white">
                    {col.vesselB.vesselName}
                  </strong>{" "}
                  (ETA:{" "}
                  {new Date(col.vesselB.etaPlanned).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  )
                </p>
                <p className="text-[11px] text-amber-300 font-mono">
                  Recomendación: {col.resolutionRecommendation}
                </p>
              </div>
              <Button
                onClick={() => onResolveCollision(col.collisionId)}
                className="bg-red-600 hover:bg-red-500 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap self-start md:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resolver y Reasignar</span>
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-800/50 rounded-xl p-4 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          <span>
            No existen colisiones de atraque activas en {activeHub.name}. La
            operativa transcurre dentro de los márgenes de seguridad.
          </span>
        </div>
      )}

      {/* Scheduled Berth Calls Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
            <tr>
              <th className="p-3">Terminal / Muelle</th>
              <th className="p-3">Buque & Naviera</th>
              <th className="p-3">ETA Prevista</th>
              <th className="p-3">ETD Prevista</th>
              <th className="p-3">Movimientos TEU</th>
              <th className="p-3">Grúas (Gangs)</th>
              <th className="p-3">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {berthCalls
              .filter((c) => c.portCode === selectedPortCode)
              .map((call) => (
                <tr key={call.callId} className="hover:bg-slate-800/50">
                  <td className="p-3 font-semibold text-white">
                    {call.terminalName} · {call.berthId}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-200">
                      {call.vesselName}
                    </span>{" "}
                    <span className="text-slate-500 font-mono text-[10px]">
                      ({call.carrier})
                    </span>
                  </td>
                  <td className="p-3 font-mono">
                    {new Date(call.etaPlanned).toLocaleDateString()}{" "}
                    {new Date(call.etaPlanned).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 font-mono">
                    {new Date(call.etdPlanned).toLocaleDateString()}{" "}
                    {new Date(call.etdPlanned).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3 font-mono">
                    {call.movesEstimatedTeu} TEUs
                  </td>
                  <td className="p-3 font-mono">{call.craneGangs} grúas STS</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-800">
                      CONFIRMED
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default BerthRadar;
