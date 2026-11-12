/**
 * @file Action.tsx
 * @description Operational triage detail panel implementing the Explain → Decide → Act in-situ execution pattern.
 * @module @atlas/frontend/components/Cockpit/Panel/Action
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Info,
  Layers,
  Lock,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { CockpitWorkItem } from "../../../types/cockpit.types";
import { ModeTaskBadge, PriorityBadge, UrgencyBadge } from "../Queue/badges";

// ============================================================================
// 1. COMPONENT PROPS
// ============================================================================

interface ActionProps {
  item: CockpitWorkItem;
  formData: Record<string, any>;
  submitting: boolean;
  onInputChange: (field: string, value: any) => void;
  onExecute: (e: React.FormEvent) => void;
  onInvestigateIn360: (item: CockpitWorkItem) => void;
}

// ============================================================================
// 2. COMPONENT IMPLEMENTATION
// ============================================================================

export const Action: React.FC<ActionProps> = ({
  item,
  formData,
  submitting,
  onInputChange,
  onExecute,
  onInvestigateIn360,
}) => {
  const isException = item.itemType === "EXCEPTION";

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-6 shadow-xl sticky top-6">
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            {isException ? (
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />{" "}
                OPERATIONAL EXCEPTION
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> OPERATIONAL
                TASK
              </span>
            )}
            <span className="text-xs font-mono text-slate-400">
              ID: {item.workItemId}
            </span>
            <ModeTaskBadge item={item} />
          </div>
          <h2 className="text-xl font-bold text-white mt-1">{item.title}</h2>
        </div>

        <button
          onClick={() => onInvestigateIn360(item)}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-white transition px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900 rounded-xl border border-indigo-700/60 shadow-md shadow-indigo-950/50"
          title="Open full shipment topology with auto-focused action drawer"
        >
          <span>Investigate & Resolve in 360</span>
          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
        </button>
      </div>

      {/* UX Step 1: EXPLAIN */}
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-400" /> 1. EXPLAIN — Context &
            Impact
          </span>
          <UrgencyBadge urgency={item.urgencyBucket} />
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {item.description}
        </p>

        {/* Where details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase">
              Shipment
            </span>
            <div className="font-mono font-semibold text-slate-200">
              {item.shipmentReference}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">
              Service
            </span>
            <div className="font-semibold text-slate-200">
              {item.serviceType}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">
              Priority
            </span>
            <div>
              <PriorityBadge
                priority={item.priority}
                isBlocked={item.isBlocked}
              />
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase">
              Workflow
            </span>
            <div className="font-mono text-xs text-slate-300">
              {item.workflowInfo?.definitionCode || "CORE_LOGISTICS"}
            </div>
          </div>
        </div>

        {/* Predecessor Blockers if blocked */}
        {item.isBlocked && item.blockedByTasks.length > 0 && (
          <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 flex items-start gap-2">
            <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong>Blocked by predecessor:</strong>{" "}
              {item.blockedByTasks.join(", ")}. Complete upstream task to
              unlock.
            </div>
          </div>
        )}

        {/* WHY NOW: Transparent Score Breakdown */}
        {item.scoreBreakdown && item.scoreBreakdown.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-800/60">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Attention Scoring Breakdown:</span>
              <span className="font-bold text-white">
                {item.attentionScore}/100 Total
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {item.scoreBreakdown.map((factor, idx) => (
                <div
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1"
                  title={factor.explanation}
                >
                  <span className="text-indigo-400 font-mono font-bold">
                    {factor.points >= 0 ? `+${factor.points}` : factor.points}
                  </span>
                  <span>{factor.factor.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* UX Step 2: DECIDE */}
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40">
        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-400" /> 2. DECIDE —
          Recommended Action
        </span>
        <div className="text-sm font-bold text-white">
          {item.primaryAction?.actionLabel || "Resolve Operational Requirement"}
        </div>
        <p className="text-xs text-slate-300">
          {isException
            ? "Resolve the operational discrepancy or record a formal waiver to unblock downstream workflow gates."
            : `Execute domain command '${item.primaryAction?.command || "COMPLETE_TASK"}' to progress the shipment lifecycle.`}
        </p>
      </div>

      {/* UX Step 3: ACT (In-Situ Form) */}
      <form
        onSubmit={onExecute}
        className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800"
      >
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3. ACT — Execute
          In-Situ
        </span>

        {/* If Exception: Resolution Notes & Status */}
        {isException ? (
          <div className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="cockpit-resolution-notes"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Resolution Notes <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="cockpit-resolution-notes"
                name="resolutionNotes"
                aria-label="Resolution Notes"
                required
                rows={3}
                value={formData.resolutionNotes || ""}
                onChange={(e) =>
                  onInputChange("resolutionNotes", e.target.value)
                }
                placeholder="Detail the operational corrective action, inspector clearance, or carrier rebooking confirmation..."
                className="w-full p-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="font-semibold text-slate-300">
                Resolution Outcome:
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="resolutionStatus"
                  value="RESOLVED"
                  checked={formData.resolutionStatus !== "WAIVED"}
                  onChange={() => onInputChange("resolutionStatus", "RESOLVED")}
                  className="text-indigo-600 focus:ring-0"
                />
                Fully Resolved
              </label>
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="resolutionStatus"
                  value="WAIVED"
                  checked={formData.resolutionStatus === "WAIVED"}
                  onChange={() => onInputChange("resolutionStatus", "WAIVED")}
                  className="text-indigo-600 focus:ring-0"
                />
                Waived by Authority
              </label>
            </div>
          </div>
        ) : (
          /* If Task: Dynamically render input fields */
          <div className="flex flex-col gap-3">
            {item.primaryAction?.inputFields?.map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={`task-field-${field.name}`}
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  {field.label}{" "}
                  {field.required && <span className="text-rose-400">*</span>}
                </label>
                <input
                  id={`task-field-${field.name}`}
                  name={field.name}
                  aria-label={field.label}
                  type={field.type === "number" ? "number" : "text"}
                  required={field.required}
                  value={formData[field.name] ?? ""}
                  onChange={(e) =>
                    onInputChange(
                      field.name,
                      field.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    )
                  }
                  placeholder={`Enter ${field.label}...`}
                  className="w-full p-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => onInvestigateIn360(item)}
            className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
            Investigate in 360
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Executing
                Command...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {item.primaryAction?.actionLabel || "Execute In-Situ"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
