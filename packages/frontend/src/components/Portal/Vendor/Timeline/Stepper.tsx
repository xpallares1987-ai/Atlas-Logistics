/**
 * @file Stepper.tsx
 * @description Interactive factory milestone stepper for B2B Vendor Portal (ADR 0035).
 * Visualizes factory stages (Order, Fabrication, QA Inspection, Packaging, Cargo Ready)
 * and allows authorized suppliers to record timestamps.
 * @module @atlas/frontend/components/Portal/Vendor/Timeline/Stepper
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import React from "react";
import { CheckCircle2, Clock, Circle, PlusCircle } from "lucide-react";
import type { PortalMilestone } from "../types";

interface StepperProps {
  milestones: PortalMilestone[];
  onOpenRecordModal?: () => void;
  canRecord?: boolean;
}

interface StandardStage {
  code: string;
  label: string;
  description: string;
}

const STANDARD_STAGES: StandardStage[] = [
  {
    code: "ORDER_PLACED",
    label: "Order Placed",
    description: "Commercial PO established with agreed terms",
  },
  {
    code: "FABRICATION_STARTED",
    label: "Fabrication Started",
    description: "Raw material allocation & factory line setup",
  },
  {
    code: "QC_PASSED",
    label: "Quality Certified",
    description: "Factory quality inspection certified (AQL standard)",
  },
  {
    code: "PACKED",
    label: "Packed & Crating",
    description: "Goods packaged, labeled, and palletized for export",
  },
  {
    code: "CARGO_READY_EXW",
    label: "Cargo Ready (EXW)",
    description: "Goods staged at factory dock ready for carrier pickup",
  },
];

export const Stepper: React.FC<StepperProps> = ({
  milestones,
  onOpenRecordModal,
  canRecord = true,
}) => {
  // Map recorded milestones by code
  const recordedMap = new Map<string, PortalMilestone>();
  for (const m of milestones) {
    recordedMap.set(m.milestoneCode, m);
  }

  // Find the index of the last completed stage
  let lastCompletedIndex = -1;
  STANDARD_STAGES.forEach((stage, idx) => {
    const rec = recordedMap.get(stage.code);
    if (
      rec &&
      (rec.status === "ACTUAL" ||
        rec.status === "COMPLETED" ||
        rec.actualTimestamp)
    ) {
      lastCompletedIndex = idx;
    }
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
            Factory Production Milestones
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Decentralized factory milestones recorded directly by supplier
          </p>
        </div>

        {canRecord && onOpenRecordModal && (
          <button
            type="button"
            onClick={onOpenRecordModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Record Milestone
          </button>
        )}
      </div>

      {/* Stepper Progress */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STANDARD_STAGES.map((stage, idx) => {
            const recorded = recordedMap.get(stage.code);
            const isCompleted =
              Boolean(
                recorded &&
                (recorded.status === "ACTUAL" ||
                  recorded.status === "COMPLETED" ||
                  recorded.actualTimestamp),
              ) || stage.code === "ORDER_PLACED"; // Order placed is always completed once PO exists
            const isCurrent = idx === lastCompletedIndex + 1;

            return (
              <div
                key={stage.code}
                className={`relative rounded-lg p-3 border transition-colors ${
                  isCompleted
                    ? "bg-slate-950/80 border-emerald-900/60"
                    : isCurrent
                      ? "bg-indigo-950/30 border-indigo-700/60 ring-1 ring-indigo-500/30"
                      : "bg-slate-950/40 border-slate-800/60 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold truncate ${
                      isCompleted
                        ? "text-emerald-300"
                        : isCurrent
                          ? "text-indigo-300 font-bold"
                          : "text-slate-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                  {stage.description}
                </p>

                {recorded?.actualTimestamp && (
                  <div className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-900/40 rounded px-1.5 py-0.5 mt-auto">
                    {new Date(recorded.actualTimestamp).toLocaleDateString()}{" "}
                    {new Date(recorded.actualTimestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}

                {recorded?.notes && (
                  <p className="text-[10px] text-slate-400 italic mt-1 line-clamp-2">
                    &ldquo;{recorded.notes}&rdquo;
                  </p>
                )}

                {isCurrent && !recorded && (
                  <span className="inline-block text-[10px] text-indigo-400 font-medium bg-indigo-950/50 border border-indigo-800/40 rounded px-1.5 py-0.5 mt-auto">
                    In Progress
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
