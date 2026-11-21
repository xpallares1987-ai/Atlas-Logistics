/**
 * @file Detail.tsx
 * @description Slide-over Drawer for Purchase Order full relational details, SKU allocation tracking,
 * and manufacturing milestone progression (ADR 0032).
 * @module @atlas/frontend/components/PurchaseOrders/Drawer/Detail
 */

import React, { useState } from "react";
import {
  X,
  Package,
  Building,
  Clock,
  Ship,
  Plus,
  AlertCircle,
} from "lucide-react";

export interface DetailLineItem {
  id: string;
  skuCode: string;
  description: string;
  quantity: string;
  allocatedQuantity: string;
  remainingQuantity: string;
  isFullyAllocated: boolean;
  uom: string;
  hsCode?: string | null;
  grossWeightKg?: string | null;
  volumeCbm?: string | null;
  originalUnitPrice?: string | null;
  originalCurrency?: string | null;
  bookingId?: string | null;
}

export interface DetailMilestone {
  id: string;
  milestoneCode: string;
  plannedDate?: string | null;
  actualDate?: string | null;
  notes?: string | null;
}

export interface PurchaseOrderDetail {
  id: string;
  poNumber: string;
  buyerName: string;
  supplierName: string;
  incoterm: string;
  expectedCargoReadyDate: string;
  status: string;
  notes?: string | null;
  lineItems: DetailLineItem[];
  milestones: DetailMilestone[];
}

interface DetailProps {
  order: PurchaseOrderDetail | null;
  loading: boolean;
  onClose: () => void;
  onOpenAllocateModal: () => void;
  onRecordMilestone: (
    milestoneCode: string,
    actualDate: string,
    notes: string,
  ) => Promise<void>;
}

const MILESTONES_FLOW = [
  { code: "ORDER_RECEIVED", label: "Order Received" },
  { code: "RAW_MATERIALS_READY", label: "Raw Materials Ready" },
  { code: "ASSEMBLY_STARTED", label: "Assembly Started" },
  { code: "QC_PASSED", label: "QC Inspection Passed" },
  { code: "PACKED", label: "Packed & Staged" },
];

export const Detail: React.FC<DetailProps> = ({
  order,
  loading: _loading,
  onClose,
  onOpenAllocateModal,
  onRecordMilestone,
}) => {
  const [selectedMilestone, setSelectedMilestone] = useState("QC_PASSED");
  const [milestoneNotes, setMilestoneNotes] = useState("");
  const [submittingMilestone, setSubmittingMilestone] = useState(false);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  if (!order) return null;

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setMilestoneError(null);
    setSubmittingMilestone(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await onRecordMilestone(selectedMilestone, today, milestoneNotes);
      setMilestoneNotes("");
    } catch (err: unknown) {
      setMilestoneError(
        err instanceof Error ? err.message : "Failed to record milestone",
      );
    } finally {
      setSubmittingMilestone(false);
    }
  };

  const completedCodes = new Set(order.milestones.map((m) => m.milestoneCode));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-700/80 h-full overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-100">
                {order.poNumber}
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-900/30 text-blue-400 border border-blue-700">
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Incoterm:{" "}
              <span className="text-slate-200 font-mono">{order.incoterm}</span>{" "}
              | Ready Date:{" "}
              <span className="text-slate-200 font-mono">
                {order.expectedCargoReadyDate}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Trading Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase mb-1">
                <Building className="w-3.5 h-3.5" />
                <span>Buyer / Importer</span>
              </div>
              <p className="text-slate-200 font-semibold text-sm">
                {order.buyerName}
              </p>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase mb-1">
                <Building className="w-3.5 h-3.5" />
                <span>Supplier / Manufacturer</span>
              </div>
              <p className="text-slate-200 font-semibold text-sm">
                {order.supplierName}
              </p>
            </div>
          </div>

          {/* Line Items Table & Allocation Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span>SKU Line Items ({order.lineItems.length})</span>
              </h3>
              <button
                onClick={onOpenAllocateModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <Ship className="w-3.5 h-3.5" />
                <span>Allocate to Booking</span>
              </button>
            </div>

            <div className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-800/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-700/60 font-medium">
                    <th className="py-2.5 px-3">SKU & Description</th>
                    <th className="py-2.5 px-3 text-right">Total Qty</th>
                    <th className="py-2.5 px-3 text-right">Allocated</th>
                    <th className="py-2.5 px-3 text-right">Remaining</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {order.lineItems.map((item) => {
                    const total = parseFloat(item.quantity) || 1;
                    const allocated = parseFloat(item.allocatedQuantity) || 0;
                    const pct = Math.min(
                      100,
                      Math.round((allocated / total) * 100),
                    );

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/60">
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-semibold text-blue-400 block">
                            {item.skuCode}
                          </span>
                          <span className="text-slate-400 truncate block max-w-xs">
                            {item.description}
                          </span>
                          {item.bookingId && (
                            <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">
                              Linked Booking: {item.bookingId}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200 font-mono">
                          {item.quantity} {item.uom}
                        </td>
                        <td className="py-2.5 px-3 text-right text-cyan-400 font-mono">
                          {item.allocatedQuantity}
                          <div className="w-16 bg-slate-700 h-1 rounded-full mt-1 ml-auto overflow-hidden">
                            <div
                              className="bg-cyan-500 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-mono font-medium">
                          {item.remainingQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isFullyAllocated ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-900/30 text-emerald-300 border border-emerald-700">
                              Booked
                            </span>
                          ) : allocated > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-900/30 text-indigo-300 border border-indigo-700">
                              Partial
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-700 text-slate-300">
                              Unallocated
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manufacturing Milestones Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Production Milestones</span>
            </h3>

            {/* Stepper Timeline */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
              <div className="relative border-l-2 border-slate-700 ml-4 space-y-6">
                {MILESTONES_FLOW.map((m) => {
                  const isDone = completedCodes.has(m.code);
                  const recorded = order.milestones.find(
                    (x) => x.milestoneCode === m.code,
                  );

                  return (
                    <div key={m.code} className="relative pl-6">
                      <div
                        className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                          isDone
                            ? "bg-emerald-500 border-emerald-400"
                            : "bg-slate-900 border-slate-600"
                        }`}
                      />
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs font-semibold ${
                            isDone ? "text-emerald-400" : "text-slate-400"
                          }`}
                        >
                          {m.label}
                        </p>
                        {recorded?.actualDate && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {recorded.actualDate}
                          </span>
                        )}
                      </div>
                      {recorded?.notes && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {recorded.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Record New Milestone Form */}
            <form
              onSubmit={handleAddMilestone}
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3"
            >
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Record Factory Milestone
              </h4>

              {milestoneError && (
                <div className="p-2.5 rounded-lg bg-rose-900/30 border border-rose-700 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{milestoneError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Milestone Stage
                  </label>
                  <select
                    value={selectedMilestone}
                    onChange={(e) => setSelectedMilestone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {MILESTONES_FLOW.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Notes / Factory Inspection
                  </label>
                  <input
                    type="text"
                    value={milestoneNotes}
                    onChange={(e) => setMilestoneNotes(e.target.value)}
                    placeholder="e.g. Certified batch inspection AQL 1.5"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingMilestone}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {submittingMilestone ? "Recording..." : "Record Milestone"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
