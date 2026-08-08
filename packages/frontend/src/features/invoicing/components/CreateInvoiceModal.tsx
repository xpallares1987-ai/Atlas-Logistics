import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@atlas/ui";
import { useQueryClient } from "../../../hooks/useApiQuery";

const API_URL = import.meta.env.VITE_API_URL || "/api";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
}: CreateInvoiceModalProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<"AR" | "AP">("AR");
  const [partyId, setPartyId] = useState(
    "00000000-0000-0000-0000-000000000001",
  );
  const [shipmentId, setShipmentId] = useState("SHP-001");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  const [lines, setLines] = useState<LineItem[]>([
    { id: "1", description: "Freight Services", quantity: 1, unitPrice: 1500 },
  ]);

  const totalAmount = lines.reduce(
    (acc, curr) => acc + curr.quantity * curr.unitPrice,
    0,
  );

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        id: Math.random().toString(),
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        invoiceNumber: `INV-${Math.floor(Math.random() * 100000)}`,
        type,
        partyId,
        shipmentId,
        currency: "USD",
        dueDate: new Date(dueDate).toISOString(),
        totalAmount,
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.quantity * l.unitPrice,
        })),
      };

      const res = await fetch(`${API_URL}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create invoice");

      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      alert("Invoice created successfully!");
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-50 custom-scrollbar"
          >
            <div className="p-6 md:p-8 relative">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-bold text-white mb-2">
                Create New Invoice
              </h2>
              <p className="text-slate-400 text-sm mb-8">
                Generate a new Accounts Receivable or Payable invoice.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Type
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as "AR" | "AP")}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="AR">Accounts Receivable (A/R)</option>
                      <option value="AP">Accounts Payable (A/P)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Party ID (Client / Vendor)
                    </label>
                    <Input
                      type="text"
                      value={partyId}
                      onChange={(e) => setPartyId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Shipment ID
                    </label>
                    <Input
                      type="text"
                      value={shipmentId}
                      onChange={(e) => setShipmentId(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white">Line Items</h3>
                    <Button
                      type="button"
                      onClick={handleAddLine}
                      variant="outline"
                      className="h-8 px-3 text-xs bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
                    >
                      <Plus size={14} className="mr-1" /> Add Line
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {lines.map((line) => (
                      <div key={line.id} className="flex gap-3 items-start">
                        <div className="flex-1 space-y-1">
                          <Input
                            placeholder="Description"
                            value={line.description}
                            onChange={(e) =>
                              updateLine(line.id, "description", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(
                                line.id,
                                "quantity",
                                Number(e.target.value),
                              )
                            }
                            required
                          />
                        </div>
                        <div className="w-32 space-y-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Price"
                            value={line.unitPrice}
                            onChange={(e) =>
                              updateLine(
                                line.id,
                                "unitPrice",
                                Number(e.target.value),
                              )
                            }
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(line.id)}
                          className="mt-2 p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10"
                          disabled={lines.length === 1}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">
                    Total Amount
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(totalAmount)}
                  </span>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-indigo-500 to-emerald-500 text-white border-0 hover:shadow-lg hover:shadow-indigo-500/20"
                  >
                    {isSubmitting ? "Saving..." : "Create Invoice"}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
