/**
 * @file ExceptionResolution.tsx
 * @description Slide-over Drawer for supply chain predictive exception inspection,
 * AI contextual mitigation assessment, and operator resolution workflow (ADR 0033).
 * @module @atlas/frontend/components/PurchaseOrders/Drawer/ExceptionResolution
 * @see {@link docs/adr/0033-supply-chain-visibility-and-predictive-milestone-tracking.md}
 */

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Clock,
  DollarSign,
  CheckCircle2,
} from "lucide-react";

export interface SuggestedMitigationAction {
  action: string;
  description: string;
  estimatedRecoveryHours?: number;
  costEstimate?: string;
}

export interface AiExceptionAnalysis {
  summary: string;
  riskFactor: "LOW" | "MODERATE" | "SEVERE" | "CATASTROPHIC";
  reasoning: string;
  confidenceScore?: number;
}

export interface DetailedSupplyChainException {
  id: string;
  poId: string;
  poNumber?: string;
  exceptionCode: string;
  exceptionCategory: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "ACKNOWLEDGED" | "IN_MITIGATION" | "RESOLVED" | "IGNORED";
  title: string;
  description: string;
  impactSummary?: string | null;
  delayEstimateHours: number;
  financialRiskAmount?: string | null;
  financialRiskCurrency?: string | null;
  suggestedMitigations?: SuggestedMitigationAction[] | null;
  aiAnalysis?: AiExceptionAnalysis | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
}

interface ExceptionResolutionProps {
  exception: DetailedSupplyChainException | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (
    exceptionId: string,
    newStatus: DetailedSupplyChainException["status"],
    notes: string,
  ) => Promise<void>;
}

const SEVERITY_COLORS = {
  LOW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  CRITICAL: "bg-rose-500/10 text-rose-400 border-rose-500/20",
} as const;

export const ExceptionResolution: React.FC<ExceptionResolutionProps> = ({
  exception,
  isOpen,
  onClose,
  onResolve,
}) => {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !exception) return null;

  const handleAction = async (targetStatus: DetailedSupplyChainException["status"]) => {
    setSubmitting(true);
    setError(null);
    try {
      await onResolve(exception.id, targetStatus, notes);
      setNotes("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating exception");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/90">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                  SEVERITY_COLORS[exception.severity]
                }`}
              >
                {exception.severity}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {exception.exceptionCode}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                {exception.status.replace(/_/g, " ")}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100">{exception.title}</h3>
            {exception.poNumber && (
              <p className="text-xs text-slate-400">
                Affecting Purchase Order:{" "}
                <span className="font-semibold text-slate-200">{exception.poNumber}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-900/30 border border-rose-700 rounded-lg text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Description */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Root Cause & Anomaly Details</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {exception.description}
            </p>
            {exception.impactSummary && (
              <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-800/80">
                Impact: {exception.impactSummary}
              </p>
            )}
          </div>

          {/* Impact Quantitative Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Estimated Delay
              </span>
              <div className="text-xl font-bold font-mono text-slate-100">
                +{exception.delayEstimateHours}h
              </div>
              <span className="text-[10px] text-slate-500">
                Cumulative schedule variance
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Financial Exposure
              </span>
              <div className="text-xl font-bold font-mono text-slate-100">
                {exception.financialRiskAmount || "0.00"}{" "}
                <span className="text-xs font-normal text-slate-400">
                  {exception.financialRiskCurrency || "USD"}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Potential penalty / demurrage
              </span>
            </div>
          </div>

          {/* AI Contextual Assessment (Gemini Gateway) */}
          {exception.aiAnalysis && (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>AI Predictive Assessment (Gemini Free-Tier)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 uppercase">
                  Risk: {exception.aiAnalysis.riskFactor}
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 leading-relaxed">
                {exception.aiAnalysis.summary}
              </p>
              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-indigo-900/40">
                {exception.aiAnalysis.reasoning}
              </div>
            </div>
          )}

          {/* Suggested Mitigations */}
          {Array.isArray(exception.suggestedMitigations) &&
            exception.suggestedMitigations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Recommended Mitigation Actions</span>
                </h4>

                <div className="space-y-2">
                  {exception.suggestedMitigations.map((action, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-200 block">
                          {action.action}
                        </span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {action.estimatedRecoveryHours && (
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold block">
                            Recovers ~{action.estimatedRecoveryHours}h
                          </span>
                        )}
                        {action.costEstimate && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Est: {action.costEstimate}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Operator Action & Resolution Notes */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Resolution Audit Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record mitigation instructions, carrier dispute ticket, or revised delivery commitment..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            onClick={() => handleAction("ACKNOWLEDGED")}
            disabled={submitting || exception.status === "ACKNOWLEDGED"}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Acknowledge
          </button>

          <button
            onClick={() => handleAction("IN_MITIGATION")}
            disabled={submitting || exception.status === "IN_MITIGATION"}
            className="px-4 py-2.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Mark In Mitigation
          </button>

          <button
            onClick={() => handleAction("RESOLVED")}
            disabled={submitting || exception.status === "RESOLVED"}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Resolve Exception
          </button>
        </div>
      </div>
    </div>
  );
};
