/**
 * @file CreatePo.tsx
 * @description Dialog modal for creating a new Supply Chain Purchase Order with SKU items (ADR 0032).
 * @module @atlas/frontend/components/PurchaseOrders/Modal/CreatePo
 */

import React, { useState } from "react";
import { X, Plus, Trash2, Package, AlertCircle } from "lucide-react";

export interface CreatePoPayload {
  poNumber: string;
  buyerId: string;
  supplierId: string;
  incoterm: string;
  expectedCargoReadyDate: string;
  notes?: string;
  lineItems: Array<{
    skuCode: string;
    description: string;
    quantity: number;
    uom: string;
    originalUnitPrice: number;
  }>;
}

interface CreatePoProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreatePoPayload) => Promise<void>;
}

interface ItemLine {
  skuCode: string;
  description: string;
  quantity: string;
  uom: string;
  originalUnitPrice: string;
}

export const CreatePo: React.FC<CreatePoProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [poNumber, setPoNumber] = useState("");
  const [buyerId, setBuyerId] = useState("c-1");
  const [supplierId, setSupplierId] = useState("comp_top_apex_asia");
  const [incoterm, setIncoterm] = useState("FOB");
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemLine[]>([
    {
      skuCode: "SKU-AUTO-01",
      description: "Automotive Sensor Assembly",
      quantity: "500",
      uom: "PCS",
      originalUnitPrice: "45.00",
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        skuCode: "",
        description: "",
        quantity: "100",
        uom: "PCS",
        originalUnitPrice: "10.00",
      },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemLine, val: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!poNumber.trim()) {
      setError("Purchase Order number is required.");
      return;
    }

    if (items.length === 0 || items.some((i) => !i.skuCode.trim())) {
      setError("Please specify at least one SKU with a valid code.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        poNumber: poNumber.trim(),
        buyerId,
        supplierId,
        incoterm,
        expectedCargoReadyDate: expectedDate,
        notes: notes.trim() || undefined,
        lineItems: items.map((i) => ({
          skuCode: i.skuCode.trim(),
          description: i.description.trim() || i.skuCode.trim(),
          quantity: parseFloat(i.quantity) || 1,
          uom: i.uom,
          originalUnitPrice: parseFloat(i.originalUnitPrice) || 0,
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Create Purchase Order
              </h3>
              <p className="text-xs text-slate-400">
                Upstream Manufacturing PO & Line Item Register
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
          className="p-5 space-y-4 overflow-y-auto flex-1 text-xs"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-900/30 border border-rose-700 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PO Header Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold uppercase">
                PO Number
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-2026-VAL-9001"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold uppercase">
                Incoterm
              </label>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="FOB">FOB (Free on Board)</option>
                <option value="EXW">EXW (Ex Works)</option>
                <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                <option value="DAP">DAP (Delivered at Place)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold uppercase">
                Cargo Ready Date
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold uppercase">
                Buyer ID
              </label>
              <input
                type="text"
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold uppercase">
                Supplier ID
              </label>
              <input
                type="text"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold uppercase">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Operational notes"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold uppercase">
                SKU Line Items
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add SKU</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60"
                >
                  <input
                    type="text"
                    value={item.skuCode}
                    onChange={(e) => updateItem(idx, "skuCode", e.target.value)}
                    placeholder="SKU Code"
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-slate-200"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(idx, "description", e.target.value)
                    }
                    placeholder="Description"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(idx, "quantity", e.target.value)
                    }
                    placeholder="Qty"
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-right font-mono text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>
                {submitting ? "Creating..." : "Create Purchase Order"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
