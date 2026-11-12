import React from "react";
import { History, RefreshCw } from "lucide-react";
import { ShipmentJourneyTabProps } from "../../types/shipment-workspace360.types";

export const ShipmentJourneyTab: React.FC<ShipmentJourneyTabProps> = ({
  shipmentDetail,
  timelineEvents,
  timelineLoading,
  onRefreshTimeline,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          Operational Event Timeline (CQRS Outbox & Exceptions)
        </h3>
        <button
          onClick={() => onRefreshTimeline(shipmentDetail.shipmentId)}
          disabled={timelineLoading}
          className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
        >
          <RefreshCw
            className={`w-3 h-3 ${timelineLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {timelineLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Loading timeline events...
        </div>
      ) : timelineEvents.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
          No operational events recorded yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {timelineEvents.map((evt) => (
            <div key={evt.timelineId} className="relative group">
              {/* Dot */}
              <div
                className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                  evt.category === "EXCEPTION"
                    ? "bg-rose-500 ring-2 ring-rose-500/20"
                    : evt.category === "PLANNING"
                      ? "bg-indigo-500"
                      : evt.category === "TASK"
                        ? "bg-emerald-500"
                        : "bg-cyan-500"
                }`}
              />

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">
                      {evt.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-400">
                      {evt.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(evt.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{evt.description}</p>

                <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono">
                  <span>Actor: {evt.actor}</span>
                  <span>•</span>
                  <span>Source: {evt.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
