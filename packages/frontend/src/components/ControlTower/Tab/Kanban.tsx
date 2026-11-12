/**
 * @file Kanban.tsx
 * @description Four-column operational Kanban board for Control Tower incident lifecycle tracking.
 * Groups incidents into Detected, In Analysis, Auto-Resolved, and Manually Approved states.
 * @module @atlas/frontend/components/ControlTower/Tab
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import type { ControlTowerKanbanTabProps } from "../../../types/control-tower.types.js";

export const Kanban: React.FC<ControlTowerKanbanTabProps> = ({
  incidents,
  onSelectIncident,
}) => {
  const columns = [
    {
      title: "1. Detectados / Abiertos",
      status: "OPEN",
      color: "border-rose-500/40 bg-rose-950/10",
    },
    {
      title: "2. En Análisis con IA",
      status: "ANALYZING",
      color: "border-indigo-500/40 bg-indigo-950/10",
    },
    {
      title: "3. Auto-Resueltos",
      status: "AUTO_RESOLVED",
      color: "border-cyan-500/40 bg-cyan-950/10",
    },
    {
      title: "4. Aprobados / Resueltos",
      status: "RESOLVED",
      color: "border-emerald-500/40 bg-emerald-950/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {columns.map((col) => {
        const colIncidents = incidents.filter((i) =>
          col.status === "AUTO_RESOLVED"
            ? i.autoResolved || i.status === "AUTO_RESOLVED"
            : col.status === "RESOLVED"
              ? i.status === "RESOLVED" && !i.autoResolved
              : i.status === col.status,
        );

        return (
          <div
            key={col.status}
            className="flex flex-col gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
              <span className="text-xs font-bold text-slate-200">
                {col.title}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {colIncidents.length}
              </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px]">
              {colIncidents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Sin incidentes
                </div>
              ) : (
                colIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => onSelectIncident(inc)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer hover:border-slate-500 transition-all ${col.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400">
                        {inc.incidentNumber}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        +{inc.delayHours}h
                      </span>
                    </div>
                    <h4 className="font-semibold text-white mt-1 line-clamp-1">
                      {inc.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {inc.description}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-700/50">
                      <span>📍 {inc.locationName}</span>
                      <span className="font-bold text-slate-300">
                        €{inc.impactAmountEur}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const KanbanTab = Kanban;
export const ControlTowerKanbanTab = Kanban;
