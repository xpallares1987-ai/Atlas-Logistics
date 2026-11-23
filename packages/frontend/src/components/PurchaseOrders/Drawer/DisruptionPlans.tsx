/**
 * @file DisruptionPlans.tsx
 * @description Sub-component for evaluating, synthesizing, and executing autonomous disruption
 * resolution and automated rerouting plans (ADR 0036).
 * Renders multi-criteria trade-offs (ETA, Cost, Carbon, Reliability) and 1-click execution.
 * @module @atlas/frontend/components/PurchaseOrders/Drawer/DisruptionPlans
 * @see {@link docs/adr/0036-autonomous-disruption-resolution-and-automated-rerouting-engine.md}
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Clock,
  DollarSign,
  Leaf,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plane,
  Ship,
  Truck,
  Train,
} from "lucide-react";

export interface DisruptionPlanDto {
  id: string;
  tenantId: string;
  exceptionId: string;
  poId: string;
  bookingId?: string | null;
  shipmentId?: string | null;
  planType: string;
  status: string;
  confidenceScore: string;
  recommendationRank: number;
  estimatedTransitDays: number;
  transitTimeDeltaHours: number;
  costDeltaAmount: string;
  costDeltaCurrency: string;
  carbonDeltaKgCo2?: string | null;
  justification: string;
  policyEvaluationJson?: Record<string, unknown> | null;
  actionPayloadJson?: Record<string, unknown> | null;
  executionError?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | number | null;
  executedAt?: string | number | null;
  createdAt?: string | number;
}

export interface ExecutionLogDto {
  id: string;
  stepIndex: number;
  stepName: string;
  status: string;
  detailsJson?: Record<string, unknown> | null;
  errorMessage?: string | null;
  executedAt?: string | number | null;
}

interface DisruptionPlansProps {
  exceptionId: string;
  poId?: string;
  isResolved?: boolean;
  onPlanExecuted?: () => void;
}

const STRATEGY_LABELS: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  NEXT_SAILING: { label: "Next Scheduled Sailing", icon: Ship },
  CARRIER_REROUTE: { label: "Carrier Reroute", icon: Ship },
  MODAL_SHIFT: { label: "Air Freight Modal Shift", icon: Plane },
  MODE_SHIFT_AIR: { label: "Mode Shift to Air", icon: Plane },
  MODE_SHIFT_RAIL: { label: "Intermodal Rail Shift", icon: Train },
  EXPEDITED_DRAYAGE: { label: "Expedited Bonded Drayage", icon: Truck },
  TRANSSHIPMENT_BYPASS: { label: "Direct Call Bypass", icon: Ship },
  SPLIT_EXPEDITE: { label: "Split-Shipment Expedite", icon: Plane },
  SPLIT_SHIPMENT: { label: "Split Shipment Allocation", icon: Plane },
  BUFFER_ADJUSTMENT: { label: "Buffer Window Calibration", icon: Clock },
};

export const DisruptionPlans: React.FC<DisruptionPlansProps> = ({
  exceptionId,
  isResolved = false,
  onPlanExecuted,
}) => {
  const [plans, setPlans] = useState<DisruptionPlanDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [executingPlanId, setExecutingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rejection modal / input
  const [rejectingPlanId, setRejectingPlanId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Trace logs expansion
  const [expandedTracePlanId, setExpandedTracePlanId] = useState<string | null>(
    null,
  );
  const [traceLogs, setTraceLogs] = useState<Record<string, ExecutionLogDto[]>>(
    {},
  );
  const [loadingTrace, setLoadingTrace] = useState(false);

  // 1. Fetch plans
  const fetchPlans = useCallback(async () => {
    if (!exceptionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/scm/disruptions/plans?exceptionId=${exceptionId}`,
      );
      if (!res.ok) {
        throw new Error(`Failed to load resolution plans: HTTP ${res.status}`);
      }
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading disruption plans",
      );
    } finally {
      setLoading(false);
    }
  }, [exceptionId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // 2. Synthesize plans on-demand
  const handleSynthesize = async () => {
    setSynthesizing(true);
    setError(null);
    try {
      const res = await fetch("/api/scm/disruptions/plans/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exceptionId, forceReevaluation: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Synthesis failed: HTTP ${res.status}`);
      }
      const data = await res.json();
      setPlans(Array.isArray(data) ? data : []);
      if (onPlanExecuted) onPlanExecuted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Synthesis failed");
    } finally {
      setSynthesizing(false);
    }
  };

  // 3. Execute plan
  const handleExecutePlan = async (planId: string) => {
    setExecutingPlanId(planId);
    setError(null);
    try {
      const res = await fetch(`/api/scm/disruptions/plans/${planId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: "Operator approved via Exception Control Tower",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Execution failed: HTTP ${res.status}`);
      }
      await fetchPlans();
      if (onPlanExecuted) onPlanExecuted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setExecutingPlanId(null);
    }
  };

  // 4. Reject plan
  const handleRejectPlan = async (planId: string) => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejecting the plan");
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/scm/disruptions/plans/${planId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Rejection failed: HTTP ${res.status}`);
      }
      setRejectingPlanId(null);
      setRejectionReason("");
      await fetchPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    }
  };

  // 5. Fetch Execution Logs
  const handleToggleTrace = async (planId: string) => {
    if (expandedTracePlanId === planId) {
      setExpandedTracePlanId(null);
      return;
    }
    setExpandedTracePlanId(planId);
    if (!traceLogs[planId]) {
      setLoadingTrace(true);
      try {
        const res = await fetch(`/api/scm/disruptions/plans/${planId}`);
        if (res.ok) {
          const data = await res.json();
          setTraceLogs((prev) => ({
            ...prev,
            [planId]: data.executionLogs || [],
          }));
        }
      } catch (err) {
        console.error("Error fetching trace:", err);
      } finally {
        setLoadingTrace(false);
      }
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Autonomous Disruption Resolution Plans (ADR 0036)
          </h4>
        </div>

        <button
          type="button"
          onClick={handleSynthesize}
          disabled={synthesizing || isResolved}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors disabled:opacity-40"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${synthesizing ? "animate-spin" : ""}`}
          />
          <span>{plans.length > 0 ? "Re-evaluate" : "Synthesize Plans"}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="p-6 text-center text-slate-500 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-400" />
          Analyzing alternative carrier routes and multi-modal schedules...
        </div>
      ) : plans.length === 0 ? (
        /* Empty State */
        <div className="p-5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center space-y-2">
          <p className="text-xs text-slate-400">
            No disruption resolution plans generated for this exception yet.
          </p>
          <button
            type="button"
            onClick={handleSynthesize}
            disabled={synthesizing || isResolved}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40"
          >
            <Zap className="w-3.5 h-3.5" />
            Synthesize Candidate Plans
          </button>
        </div>
      ) : (
        /* Plans List */
        <div className="space-y-3">
          {plans.map((plan) => {
            const isRank1 = plan.recommendationRank === 1;
            const isExecuted =
              plan.status === "EXECUTED" || plan.status === "AUTO_EXECUTED";
            const isAutoExecuted = plan.status === "AUTO_EXECUTED";
            const isRejected = plan.status === "REJECTED";
            const isPending =
              plan.status === "PROPOSED" ||
              plan.status === "AUTO_APPROVED" ||
              plan.status === "PENDING_APPROVAL" ||
              plan.status === "GENERATED";

            const strategyMeta = STRATEGY_LABELS[plan.planType] || {
              label: plan.planType,
              icon: Ship,
            };
            const StrategyIcon = strategyMeta.icon;

            const isTraceOpen = expandedTracePlanId === plan.id;
            const logs = traceLogs[plan.id] || [];

            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-4 space-y-3 transition-colors ${
                  isRank1 && !isRejected
                    ? "bg-slate-900/90 border-indigo-700/60 ring-1 ring-indigo-500/20"
                    : isExecuted
                      ? "bg-emerald-950/20 border-emerald-800/40"
                      : isRejected
                        ? "bg-slate-950/50 border-slate-800 opacity-60"
                        : "bg-slate-950/70 border-slate-800"
                }`}
              >
                {/* Plan Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isRank1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          ★ Pareto Rank #1
                        </span>
                      )}
                      {!isRank1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                          Rank #{plan.recommendationRank}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800/80 text-slate-200 border border-slate-700">
                        <StrategyIcon className="w-3 h-3 text-indigo-400" />
                        {strategyMeta.label}
                      </span>

                      {isAutoExecuted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Auto-Executed
                        </span>
                      )}
                      {plan.status === "EXECUTED" && !isAutoExecuted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Executed
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60">
                          Ready for Approval
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-snug">
                      {plan.justification}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Score: {plan.confidenceScore}
                    </span>
                  </div>
                </div>

                {/* Quantitative Metric Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
                  {/* Transit Delta */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-sans uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      Recovery
                    </span>
                    <span
                      className={`font-bold block ${
                        plan.transitTimeDeltaHours <= 0
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {plan.transitTimeDeltaHours <= 0 ? "" : "+"}
                      {plan.transitTimeDeltaHours}h
                    </span>
                  </div>

                  {/* Cost Delta */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-sans uppercase flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      Cost Delta
                    </span>
                    <span
                      className={`font-bold block ${
                        Number(plan.costDeltaAmount) <= 0
                          ? "text-emerald-400"
                          : "text-slate-200"
                      }`}
                    >
                      {Number(plan.costDeltaAmount) > 0 ? "+" : ""}
                      {plan.costDeltaAmount} {plan.costDeltaCurrency}
                    </span>
                  </div>

                  {/* Carbon Delta */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-sans uppercase flex items-center gap-1">
                      <Leaf className="w-3 h-3 text-teal-400" />Δ CO₂
                    </span>
                    <span
                      className={`font-bold block ${
                        Number(plan.carbonDeltaKgCo2 || 0) <= 0
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      {Number(plan.carbonDeltaKgCo2 || 0) > 0 ? "+" : ""}
                      {plan.carbonDeltaKgCo2 || "0"} kg
                    </span>
                  </div>
                </div>

                {/* Rejection Form Input */}
                {rejectingPlanId === plan.id && (
                  <div className="p-3 bg-slate-950 border border-slate-700 rounded-lg space-y-2">
                    <label
                      htmlFor={`reject-reason-${plan.id}`}
                      className="block text-[11px] font-semibold text-slate-300"
                    >
                      Reason for Rejection *
                    </label>
                    <input
                      id={`reject-reason-${plan.id}`}
                      type="text"
                      placeholder="e.g. Higher cost not approved by customer, customer accepted delay"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingPlanId(null);
                          setRejectionReason("");
                        }}
                        className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectPlan(plan.id)}
                        className="px-3 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Plan Footer Actions */}
                <div className="flex items-center justify-between pt-1">
                  {/* Trace Log Toggle for executed plans */}
                  {isExecuted ? (
                    <button
                      type="button"
                      onClick={() => handleToggleTrace(plan.id)}
                      className="text-[11px] font-medium text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1"
                    >
                      {isTraceOpen ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Hide Audit Trace</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>View Execution Logs</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div />
                  )}

                  {/* Execution / Rejection Actions */}
                  {isPending && rejectingPlanId !== plan.id && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectingPlanId(plan.id)}
                        className="px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecutePlan(plan.id)}
                        disabled={executingPlanId === plan.id}
                        className="px-3 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>
                          {executingPlanId === plan.id
                            ? "Executing Reroute..."
                            : "Execute Reroute"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Execution Logs Drawer / Expansion */}
                {isTraceOpen && (
                  <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 space-y-2 text-xs">
                    <span className="font-semibold text-slate-300 block uppercase text-[10px] tracking-wider">
                      Atomic Rerouting Execution Trace
                    </span>
                    {loadingTrace ? (
                      <p className="text-slate-500 italic text-[11px]">
                        Loading trace logs...
                      </p>
                    ) : logs.length === 0 ? (
                      <p className="text-slate-500 italic text-[11px]">
                        No log entries found.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-start justify-between gap-2 p-2 bg-slate-900 rounded border border-slate-800/80 font-mono text-[11px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {log.stepIndex}
                              </span>
                              <span className="text-slate-200">
                                {log.stepName}
                              </span>
                            </div>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                log.status === "SUCCESS"
                                  ? "bg-emerald-950 text-emerald-400"
                                  : "bg-rose-950 text-rose-400"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
