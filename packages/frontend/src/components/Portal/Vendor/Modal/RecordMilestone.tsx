/**
 * @file RecordMilestone.tsx
 * @description Modal for recording decentralized factory production milestones (ADR 0035).
 * Allows suppliers to record real-world factory timestamps directly into the system.
 * @module @atlas/frontend/components/Portal/Vendor/Modal/RecordMilestone
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import React, { useState } from "react";
import { X, CheckCircle, Calendar, FileText, AlertCircle } from "lucide-react";
import type { PortalPoProjectionDto, RecordMilestonePayload } from "../types";

interface RecordMilestoneProps {
  isOpen: boolean;
  po: PortalPoProjectionDto | null;
  onClose: () => void;
  onSubmit: (payload: RecordMilestonePayload) => Promise<void>;
}

const MILESTONE_OPTIONS = [
  {
    code: "FABRICATION_STARTED",
    label: "Fabrication Started",
    desc: "Raw materials staged, production lines activated",
  },
  {
    code: "IN_PRODUCTION",
    label: "In Production / Assembly",
    desc: "Core assembly and component processing ongoing",
  },
  {
    code: "QC_INSPECTION_PENDING",
    label: "QC Inspection Pending",
    desc: "Production completed, awaiting QA testing",
  },
  {
    code: "QC_PASSED",
    label: "Quality Certified (QC Passed)",
    desc: "Factory inspection certified without blocking defects",
  },
  {
    code: "QC_REJECTED",
    label: "Quality Rework Required",
    desc: "Defects identified during inspection, rework initiated",
  },
  {
    code: "PACKED",
    label: "Packed & Palletized",
    desc: "Export packaging, barcodes, and cartons sealed",
  },
  {
    code: "CARGO_READY_EXW",
    label: "Cargo Ready (EXW Factory Dock)",
    desc: "Finished goods ready for freight forwarder / carrier pickup",
  },
];

export const RecordMilestone: React.FC<RecordMilestoneProps> = ({
  isOpen,
  po,
  onClose,
  onSubmit,
}) => {
  const [milestoneCode, setMilestoneCode] = useState(MILESTONE_OPTIONS[0].code);
  const [actualDate, setActualDate] = useState(
    new Date().toISOString().slice(0, 16),
  ); // YYYY-MM-DDTHH:MM
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !po) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneCode || !actualDate) {
      setError("Please select a milestone and specify the timestamp");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        milestoneCode,
        actualDate: new Date(actualDate).toISOString(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to record milestone",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">
              Record Factory Milestone
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-slate-400">
            Recording milestone for PO{" "}
            <span className="font-semibold text-slate-200">{po.poNumber}</span>{" "}
            ({po.buyerName})
          </div>

          {/* Milestone Selection */}
          <div>
            <label
              htmlFor="milestoneCode"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Factory Milestone *
            </label>
            <select
              id="milestoneCode"
              value={milestoneCode}
              onChange={(e) => setMilestoneCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {MILESTONE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              {MILESTONE_OPTIONS.find((m) => m.code === milestoneCode)?.desc}
            </p>
          </div>

          {/* Actual Timestamp Input */}
          <div>
            <label
              htmlFor="actualDate"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Actual Completion Date & Time *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="actualDate"
                type="datetime-local"
                required
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Milestone Notes */}
          <div>
            <label
              htmlFor="milestoneNotes"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Operational Notes (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                id="milestoneNotes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Batch 1 inspection passed with 100% yield. Packing list generated."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? "Saving..." : "Record Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
