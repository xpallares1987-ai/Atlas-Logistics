/**
 * @file AllocateBooking.tsx
 * @description Dialog modal for allocating PO line items and SKU quantities into downstream freight bookings (ADR 0032).
 * @module @atlas/frontend/components/PurchaseOrders/Modal/AllocateBooking
 */

import React, { useState } from "react";
import { X, Ship, AlertCircle } from "lucide-react";
import { PurchaseOrderDetail } from "../Drawer/Detail";

interface AllocateBookingProps {
  order: PurchaseOrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onAllocate: (
    bookingId: string,
    allocations: Array<{ lineItemId: string; quantityToAllocate: number }>,
  ) => Promise<void>;
}

export const AllocateBooking: React.FC<AllocateBookingProps> = ({
  order,
  isOpen,
  onClose,
  onAllocate,
}) => {
  const [bookingId, setBookingId] = useState("bkg_demo_01");
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleQtyChange = (
    itemId: string,
    val: string,
    maxRemaining: number,
  ) => {
    const num = parseFloat(val) || 0;
    setAllocations((prev) => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(num, maxRemaining)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const allocList = Object.entries(allocations)
      .filter(([_, qty]) => qty > 0)
      .map(([lineItemId, quantityToAllocate]) => ({
        lineItemId,
        quantityToAllocate,
      }));

    if (!bookingId.trim()) {
      setError("Please specify a valid Freight Booking ID.");
      return;
    }

    if (allocList.length === 0) {
      setError("Please allocate at least one SKU quantity greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      await onAllocate(bookingId.trim(), allocList);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Allocation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
              <Ship className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Allocate to Freight Booking
              </h3>
              <p className="text-xs text-slate-400">
                PO:{" "}
                <span className="text-slate-200 font-mono">
                  {order.poNumber}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="p-5 space-y-4 overflow-y-auto flex-1"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-900/30 border border-rose-700 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Booking ID Selector / Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Downstream Booking Identifier
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. bkg_demo_01 (BK-2026-67116)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Canonical demo booking:{" "}
              <span className="text-slate-400 font-mono">bkg_demo_01</span> (MSC
              ISABELLA)
            </p>
          </div>

          {/* SKU Line Items Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Allocate Quantities by SKU
            </label>
            <div className="border border-slate-700/60 rounded-xl divide-y divide-slate-800 bg-slate-800/40 overflow-hidden">
              {order.lineItems.map((item) => {
                const remaining = parseFloat(item.remainingQuantity) || 0;
                const isFull = remaining <= 0;
                const allocated = allocations[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-semibold text-blue-400 block truncate">
                        {item.skuCode}
                      </span>
                      <span className="text-slate-400 truncate block">
                        {item.description}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Remaining:{" "}
                        <span className="text-slate-300 font-medium">
                          {item.remainingQuantity} {item.uom}
                        </span>
                      </span>
                    </div>

                    <div className="w-32 flex-shrink-0">
                      <input
                        type="number"
                        disabled={isFull}
                        min={0}
                        max={remaining}
                        step="any"
                        placeholder="0.00"
                        value={allocated || ""}
                        onChange={(e) =>
                          handleQtyChange(item.id, e.target.value, remaining)
                        }
                        className="w-full bg-slate-900 border border-slate-700 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg px-2.5 py-1.5 text-right font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Ship className="w-4 h-4" />
              <span>
                {submitting ? "Allocating..." : "Confirm Booking Allocation"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
