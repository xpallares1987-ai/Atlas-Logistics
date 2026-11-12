/**
 * @file SummaryKpi.tsx
 * @description Operational metric summary strip displaying live work item counts and SLA statuses.
 * @module @atlas/frontend/components/Cockpit/Banner/SummaryKpi
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import type { CockpitSummaryMetrics } from "../../../types/cockpit.types";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface SummaryKpiProps {
  summary: CockpitSummaryMetrics;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const SummaryKpi: React.FC<SummaryKpiProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Open Actionable
        </span>
        <div className="text-2xl font-bold text-emerald-400 mt-1">
          {summary.openActionableCount}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          Unblocked & ready
        </span>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Immediate Action
        </span>
        <div className="text-2xl font-bold text-rose-400 mt-1">
          {summary.criticalUrgencyCount}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          Critical attention
        </span>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Due Today
        </span>
        <div className="text-2xl font-bold text-amber-400 mt-1">
          {summary.dueTodayCount}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          SLA cutoff window
        </span>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Blocked Tasks
        </span>
        <div className="text-2xl font-bold text-purple-400 mt-1">
          {summary.blockedCount}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          Awaiting predecessor
        </span>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Active Exceptions
        </span>
        <div className="text-2xl font-bold text-rose-300 mt-1">
          {summary.activeExceptionsCount ?? 0}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          Requires resolution
        </span>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Active Workflows
        </span>
        <div className="text-2xl font-bold text-indigo-400 mt-1">
          {summary.activeWorkflowsCount}
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          Live DAG execution
        </span>
      </div>
    </div>
  );
};
