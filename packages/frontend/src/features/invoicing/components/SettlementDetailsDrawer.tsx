import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, CheckCircle2, Clock, Printer } from "lucide-react";
import { Button } from "@atlas/ui";
import { useApiQuery } from "../../../hooks/useApiQuery";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@atlas/ui";

interface SettlementDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settlement: any;
}

export function SettlementDetailsDrawer({
  isOpen,
  onClose,
  settlement,
}: SettlementDetailsDrawerProps) {
  const { data: invoices, isLoading } = useApiQuery<any[]>(
    ["settlement-invoices", settlement?.id],
    `/agent-settlements/${settlement?.id}/invoices`,
    { enabled: !!settlement },
  );

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case "Paid":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
        };
      case "Draft":
        return {
          icon: Clock,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
        };
      default:
        return {
          icon: FileText,
          color: "text-slate-400",
          bg: "bg-slate-500/10",
          border: "border-slate-500/20",
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && settlement && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-slate-900 border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-start relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Settlement Details
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold uppercase rounded-lg border ${getStatusVisuals(settlement.status).bg} ${getStatusVisuals(settlement.status).color} ${getStatusVisuals(settlement.status).border}`}
                  >
                    {settlement.status}
                  </span>
                </div>
                <p className="text-slate-400 font-medium">
                  Statement: {settlement.statementNumber}
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors relative z-10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                    Agent Name
                  </p>
                  <p className="text-white font-medium">
                    {settlement.agentName || "Unknown"}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                    Total Net Balance
                  </p>
                  <p className="text-2xl font-black text-white">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: settlement.currency,
                    }).format(settlement.netBalance)}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                    Period Start
                  </p>
                  <p className="text-white font-medium">
                    {new Date(settlement.periodStart).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">
                    Period End
                  </p>
                  <p className="text-white font-medium">
                    {new Date(settlement.periodEnd).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">
                  Underlying AP Invoices
                </h3>
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                  onClick={() =>
                    window.open(
                      `${import.meta.env.VITE_API_URL || ""}/api/agent-settlements/${settlement.id}/pdf`,
                      "_blank",
                    )
                  }
                >
                  <Printer size={14} className="mr-2" /> Export PDF
                </Button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-white/10 hover:bg-transparent">
                      <TableHead className="text-xs font-bold text-slate-400 uppercase py-3">
                        Invoice #
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-400 uppercase py-3">
                        Shipment Ref
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-400 uppercase py-3 text-right">
                        Amount
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-400 uppercase py-3 text-center">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-white/5">
                    {isLoading ? (
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-slate-500 font-medium"
                        >
                          Loading invoices...
                        </TableCell>
                      </TableRow>
                    ) : invoices && invoices.length > 0 ? (
                      invoices.map((inv) => {
                        const style = getStatusVisuals(inv.status);
                        const Icon = style.icon;
                        return (
                          <TableRow
                            key={inv.id}
                            className="border-0 hover:bg-white/5 transition-colors"
                          >
                            <TableCell className="py-3">
                              <p className="font-bold text-slate-200">
                                {inv.invoiceNumber}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </p>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="text-indigo-400 font-medium">
                                {inv.shipmentId?.substring(0, 8) || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 text-right">
                              <span className="font-bold text-white">
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: inv.currency,
                                }).format(inv.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex justify-center">
                                <div
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${style.bg} ${style.border} ${style.color}`}
                                >
                                  <Icon className="w-3 h-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">
                                    {inv.status}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-slate-500 font-medium"
                        >
                          No AP invoices found for this settlement.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 shrink-0 bg-slate-950 flex justify-end gap-3">
              <Button
                onClick={onClose}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                Close
              </Button>
              {settlement.status !== "Paid" && (
                <Button className="bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border-0 transition-all">
                  Approve & Pay
                </Button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
