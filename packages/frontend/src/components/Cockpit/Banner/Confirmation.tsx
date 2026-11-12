/**
 * @file Confirmation.tsx
 * @description Operational execution confirmation banner providing immediate feedback and next unlocked action pills.
 * @module @atlas/frontend/components/Cockpit/Banner/Confirmation
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import type {
  CockpitWorkItem,
  ExecutionResult,
} from "../../../types/cockpit.types";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface ConfirmationProps {
  result: ExecutionResult;
  onNavigateShipmentTasks: (shipmentId: string) => void;
  onSelectNextItem: (item: CockpitWorkItem) => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const Confirmation: React.FC<ConfirmationProps> = ({
  result,
  onNavigateShipmentTasks,
  onSelectNextItem,
}) => {
  return (
    <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-200">
              Action Confirmed in Transactional Core
            </div>
            <div className="text-xs text-emerald-400/90 mt-0.5 flex flex-wrap gap-2 items-center">
              <span>
                {result.resolvedException
                  ? `Incident ${result.executedWorkItemId} resolved`
                  : `Task ${result.executedWorkItemId} completed`}
              </span>
              <span>•</span>
              <span>
                {result.unlockedWorkItems.length > 0
                  ? `${result.unlockedWorkItems.length} successor task(s) unlocked`
                  : "No immediate blockers"}
              </span>
              <span>•</span>
              <span>
                Shipment Health:{" "}
                <strong className="text-white">
                  {result.shipment360?.health?.status} (
                  {result.shipment360?.health?.score}/100)
                </strong>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onNavigateShipmentTasks(result.shipment360?.shipmentId || "")
            }
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center gap-1 shadow-sm"
          >
            Open in Shipment 360 (DAG) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Next Action Dispatch Pills */}
      {result.unlockedWorkItems.length > 0 && (
        <div className="pt-2 border-t border-emerald-800/40 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Next Actions
            Unlocked:
          </span>
          {result.unlockedWorkItems.map((nextItem) => (
            <button
              key={nextItem.workItemId}
              onClick={() => {
                onSelectNextItem(nextItem);
                window.scrollTo({ top: 380, behavior: "smooth" });
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600/60 text-white flex items-center gap-1.5 transition-all shadow-sm"
              title="Select immediately in execution queue"
            >
              <span>{nextItem.title}</span>
              <span className="text-[10px] text-emerald-300 font-mono">
                [{nextItem.urgencyBucket || "ACTIONABLE"}]
              </span>
              <ChevronRight className="w-3 h-3 text-emerald-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
