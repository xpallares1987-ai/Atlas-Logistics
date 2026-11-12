/**
 * @file Attention.tsx
 * @description Urgent signals and blocking exception radar for operational shipment 360 view.
 * Highlights SLA deadlines, FMC detention risks, customs holds, and deep-linked alerts.
 * @module @atlas/frontend/components/Shipment/Tab
 */

import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { ShipmentAttentionTabProps } from "../../../types/shipment-workspace360.types";

export const Attention: React.FC<ShipmentAttentionTabProps> = ({
  shipmentDetail,
  highlightId,
}) => {
  return (
    <div className="space-y-6">
      {/* Attention Scoring Breakdown */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Explainable Attention Telemetry
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Calculated from live invariants & open exceptions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {shipmentDetail.explainability?.attentionScoreBreakdown?.map(
            (factor, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>{factor.factor}</span>
                  <span className="text-indigo-400">+{factor.points} pts</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {factor.explanation}
                </p>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Signals Feed */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Real-Time Operational Signals ({shipmentDetail.signals?.length || 0})
        </h4>
        {!shipmentDetail.signals || shipmentDetail.signals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
            No active anomalies or warning signals detected.
          </div>
        ) : (
          <div className="space-y-2">
            {shipmentDetail.signals.map((sig) => {
              const isHighlighted = highlightId === sig.signalId;
              return (
                <div
                  key={sig.signalId}
                  id={`highlight-${sig.signalId}`}
                  data-highlight-id={sig.signalId}
                  className={`p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 ${
                    isHighlighted
                      ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-amber-500/20 bg-amber-950/30 border-amber-400"
                      : sig.severity === "CRITICAL"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : sig.severity === "MAJOR"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : "bg-slate-900 border-slate-800 text-slate-300"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{sig.title}</span>
                      <span className="text-[10px] font-mono opacity-75">
                        {sig.source}
                      </span>
                    </div>
                    <p className="text-xs opacity-90">{sig.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const AttentionTab = Attention;
export const ShipmentAttentionTab = Attention;
