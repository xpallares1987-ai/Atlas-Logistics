/**
 * @file ConfirmPo.tsx
 * @description Modal for supplier PO confirmation and Promised Cargo Ready Date lock (ADR 0035).
 * Enforces formal commitment of factory readiness with optional notes.
 * @module @atlas/frontend/components/Portal/Vendor/Modal/ConfirmPo
 * @see {@link docs/adr/0035-b2b-customer-and-vendor-portal-architecture.md}
 */

import React, { useState } from "react";
import { X, Calendar, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import type { PortalPoProjectionDto, ConfirmPoPayload } from "../types";

interface ConfirmPoProps {
  isOpen: boolean;
  po: PortalPoProjectionDto | null;
  onClose: () => void;
  onConfirm: (payload: ConfirmPoPayload) => Promise<void>;
}

export const ConfirmPo: React.FC<ConfirmPoProps> = ({
  isOpen,
  po,
  onClose,
  onConfirm,
}) => {
  const [promisedDate, setPromisedDate] = useState(
    po?.promisedCargoReadyDate || po?.expectedCargoReadyDate || "",
  );
  const [notes, setNotes] = useState(po?.confirmationNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !po) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promisedDate) {
      setError("Please specify the Promised Cargo Ready Date");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        promisedCargoReadyDate: promisedDate,
        confirmationNotes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm purchase order",
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
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-slate-100">
              Confirm Purchase Order {po.poNumber}
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

          {/* Context Info */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Buyer:</span>
              <span className="font-medium text-slate-200">{po.buyerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Incoterm:</span>
              <span className="font-semibold text-slate-200">
                {po.incoterm}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Buyer Expected CRD:</span>
              <span className="font-medium text-amber-300">
                {po.expectedCargoReadyDate}
              </span>
            </div>
          </div>

          {/* Promised Cargo Ready Date Input */}
          <div>
            <label
              htmlFor="promisedCargoReadyDate"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Promised Cargo Ready Date (CRD) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="promisedCargoReadyDate"
                type="date"
                required
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              This date represents the formal factory commitment when finished
              goods are staged for inspection and handover.
            </p>
          </div>

          {/* Confirmation Notes */}
          <div>
            <label
              htmlFor="confirmationNotes"
              className="block text-xs font-semibold text-slate-200 mb-1"
            >
              Confirmation Notes (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3 pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                id="confirmationNotes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Schedule confirmed with manufacturing line 3. Packaging materials in stock."
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
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? "Confirming..." : "Confirm & Lock CRD"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
