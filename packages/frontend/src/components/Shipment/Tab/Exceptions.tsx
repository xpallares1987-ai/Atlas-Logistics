/**
 * @file Exceptions.tsx
 * @description Operational exceptions portfolio and resolution triage for shipment 360 view.
 * Enables operators to inspect root causes, log incidents, and execute justified resolutions.
 * @module @atlas/frontend/components/Shipment/Tab
 */

import React from "react";
import { AlertTriangle, CheckCircle2, PlusCircle } from "lucide-react";
import { ShipmentExceptionsTabProps } from "../../../types/shipment-workspace360.types";

export const Exceptions: React.FC<ShipmentExceptionsTabProps> = ({
  shipmentDetail,
  highlightId,
  onOpenRaiseExceptionModal,
  onOpenResolveExceptionModal,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Operational Exceptions ({shipmentDetail.exceptions.length})
          </h3>
          <p className="text-xs text-slate-400">
            Exceptions trigger domain events, degrade health score, and halt
            downstream workflow steps.
          </p>
        </div>

        <button
          onClick={onOpenRaiseExceptionModal}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Raise Exception
        </button>
      </div>

      {shipmentDetail.exceptions.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
          Zero operational exceptions logged for this shipment.
        </div>
      ) : (
        <div className="space-y-3">
          {shipmentDetail.exceptions.map((ex) => {
            const isResolved = ex.status === "RESOLVED";
            const hId = highlightId ?? "";
            const isHighlighted =
              Boolean(hId) &&
              (hId === ex.exceptionId ||
                hId === `exc_${ex.exceptionId}` ||
                hId.replace("exc_", "") === ex.exceptionId);

            return (
              <div
                key={ex.exceptionId}
                id={`highlight-${ex.exceptionId}`}
                data-highlight-id={ex.exceptionId}
                className={`p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isHighlighted
                    ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-amber-500/20 bg-amber-950/20 border-amber-400"
                    : isResolved
                      ? "bg-slate-900/30 border-slate-800 opacity-70"
                      : ex.severity === "CRITICAL"
                        ? "bg-rose-500/10 border-rose-500/30"
                        : "bg-amber-500/10 border-amber-500/30"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-200">
                      {ex.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        ex.severity === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {ex.severity}
                    </span>
                    {ex.isBlocking && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-red-950 text-red-400 border border-red-700">
                        BLOCKING
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {ex.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{ex.description}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>
                      Raised:{" "}
                      {ex.raisedAt || ex.createdAt
                        ? new Date(
                            ex.raisedAt || ex.createdAt!,
                          ).toLocaleString()
                        : "Recently"}
                    </span>
                    {(ex.assignedTo ||
                      ex.assignedToUserId ||
                      ex.assignedTeam) && (
                      <span>
                        • Assigned:{" "}
                        {ex.assignedTo ||
                          ex.assignedToUserId ||
                          ex.assignedTeam}
                      </span>
                    )}
                    {isResolved &&
                      (ex.resolutionNote || ex.resolutionNotes) && (
                        <span className="text-emerald-400">
                          • Note: {ex.resolutionNote || ex.resolutionNotes}
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex items-center justify-end shrink-0">
                  {isResolved ? (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => onOpenResolveExceptionModal(ex)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve Exception
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ExceptionsTab = Exceptions;
export const ShipmentExceptionsTab = Exceptions;
