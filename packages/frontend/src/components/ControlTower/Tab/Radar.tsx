/**
 * @file Radar.tsx
 * @description Incident radar perspective for the Control Tower command center.
 * Renders active supply chain exceptions, severity filtering, economic impact calculations, and resolution actions.
 * @module @atlas/frontend/components/ControlTower/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { ShieldAlert, Zap, Sparkles } from "lucide-react";
import type { ControlTowerRadarTabProps } from "../../../types/control-tower.types.js";

export const Radar: React.FC<ControlTowerRadarTabProps> = ({
  incidents,
  severityFilter,
  onSeverityFilterChange,
  statusFilter,
  onStatusFilterChange,
  onSelectIncident,
}) => {
  const filteredIncidents = incidents.filter((i) => {
    const matchSev = severityFilter === "ALL" || i.severity === severityFilter;
    const matchSt = statusFilter === "ALL" || i.status === statusFilter;
    return matchSev && matchSt;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Severidad:</span>
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => onSeverityFilterChange(sev)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                severityFilter === sev
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {sev === "ALL" ? "Todas" : sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Estado:</span>
          {["ALL", "OPEN", "ANALYZING", "AUTO_RESOLVED", "RESOLVED"].map(
            (st) => (
              <button
                key={st}
                onClick={() => onStatusFilterChange(st)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === st
                    ? "bg-slate-700 text-white font-semibold"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "Todos" : st}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Incidents Cards List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-xl border border-dashed border-slate-800">
            No se encontraron incidencias activas con los filtros seleccionados.
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isCritical = incident.severity === "CRITICAL";
            const isHigh = incident.severity === "HIGH";
            const isResolved =
              incident.status === "RESOLVED" ||
              incident.status === "AUTO_RESOLVED";

            return (
              <div
                key={incident.id}
                className={`bg-slate-800/70 border rounded-xl p-4 transition-all hover:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCritical
                    ? "border-rose-500/40 bg-rose-950/10"
                    : isHigh
                      ? "border-amber-500/40 bg-amber-950/10"
                      : "border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3 max-w-2xl">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      isCritical
                        ? "bg-rose-500/20 text-rose-400"
                        : isHigh
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {incident.incidentNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                          isCritical
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : isHigh
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {incident.severity}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-700/60 text-slate-300">
                        {incident.incidentType}
                      </span>
                      {incident.shipmentId && (
                        <span className="text-xs text-slate-400 font-mono">
                          Envío: {incident.shipmentId}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-sm mt-1">
                      {incident.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      {incident.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-2">
                      <span>📍 {incident.locationName}</span>
                      <span>⏱️ Retraso estimado: +{incident.delayHours}h</span>
                      <span>
                        💶 Impacto económico: €
                        {incident.impactAmountEur?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    {incident.autoResolved && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        <Zap size={11} />
                        AUTO-RESUELTO
                      </span>
                    )}
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isResolved
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : incident.status === "ANALYZING"
                            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {incident.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => onSelectIncident(incident)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
                    >
                      <Sparkles size={13} />
                      {isResolved ? "Ver Detalle" : "Ver Opciones / Resolver"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const RadarTab = Radar;
export const ControlTowerRadarTab = Radar;
