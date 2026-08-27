import { useState, useMemo } from "react";
import { useApiQuery, useQueryClient } from "../hooks/useApiQuery";
import {
  Receipt,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { ReportsDashboard } from "../features/invoicing/ReportsDashboard";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@atlas/ui";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "AR" | "AP" | "CN" | "DN";
  party: string;
  amount: number;
  currency: string;
  status: "Draft" | "Issued" | "Pending" | "Paid" | "Overdue" | "Cancelled";
  dueDate: string;
  shipmentId?: string;
  partyId: string;
}

interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
}

const API_URL = import.meta.env.VITE_API_URL || "/api";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function InvoicingModule() {
  const [activeTab, setActiveTab] = useState<"Invoices" | "Reports">(
    "Invoices",
  );
  const [activeFilter, setActiveFilter] = useState<
    "All" | "AR" | "AP" | "Overdue"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const queryClient = useQueryClient();

  const { data: invoicesData, isLoading } = useApiQuery<Invoice[]>(
    ["invoices"],
    "/invoices",
  );

  const { data: invoiceDetail } = useApiQuery<InvoiceDetail>(
    ["invoice-detail", selectedInvoice?.id ?? ""],
    `/invoices/${selectedInvoice?.id}`,
    { enabled: !!selectedInvoice },
  );
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.party &&
          inv.party.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter =
        activeFilter === "All"
          ? true
          : activeFilter === "Overdue"
            ? inv.status === "Overdue"
            : inv.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [invoices, searchQuery, activeFilter]);

  // Set initial selected invoice
  useMemo(() => {
    if (!selectedInvoice && filteredInvoices.length > 0) {
      setSelectedInvoice(filteredInvoices[0]);
    } else if (filteredInvoices.length === 0) {
      setSelectedInvoice(null);
    }
  }, [filteredInvoices, selectedInvoice]);

  const totalAR = invoices
    .filter((i) => i.type === "AR")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalAP = invoices
    .filter((i) => i.type === "AP")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalOverdue = invoices
    .filter((i) => i.status === "Overdue")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case "Paid":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
        };
      case "Overdue":
        return {
          icon: AlertCircle,
          color: "text-rose-400",
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        };
      case "Pending":
      case "Issued":
        return {
          icon: Clock,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
        };
      default:
        return {
          icon: FileText,
          color: "text-slate-400",
          bg: "bg-slate-500/10",
          border: "border-slate-500/20",
          glow: "",
        };
    }
  };

  const downloadPdf = async (invoice: Invoice) => {
    try {
      window.open(`${API_URL}/invoices/${invoice.id}/pdf`, "_blank");
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error generating PDF. Please try again.");
    }
  };

  const markAsPaid = async (inv: Invoice) => {
    try {
      await fetch(`${API_URL}/invoices/${inv.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Paid" }),
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      // Optimitically update local selection
      setSelectedInvoice({ ...inv, status: "Paid" });
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header & Metrics */}
      <div className="px-8 py-8 shrink-0 z-10 relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                <Landmark className="w-7 h-7" />
              </div>
              Financials & Billing
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Manage accounts receivable, payables, and settlement workflows.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <Button
                onClick={() => setActiveTab("Invoices")}
                variant={activeTab === "Invoices" ? "default" : "ghost"}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold ${activeTab === "Invoices" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"}`}
              >
                Invoices
              </Button>
              <Button
                onClick={() => setActiveTab("Reports")}
                variant={activeTab === "Reports" ? "default" : "ghost"}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold ${activeTab === "Reports" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white"}`}
              >
                Reports
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-white/5 text-slate-300 rounded-lg uppercase tracking-wider border border-white/5">
                  Receivables
                </span>
              </div>
              <p className="text-sm font-medium text-slate-400 mb-1">
                Total A/R
              </p>
              <h3 className="text-3xl font-bold text-white">
                ${totalAR.toLocaleString()}
              </h3>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-rose-400" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-white/5 text-slate-300 rounded-lg uppercase tracking-wider border border-white/5">
                  Payables
                </span>
              </div>
              <p className="text-sm font-medium text-slate-400 mb-1">
                Total A/P
              </p>
              <h3 className="text-3xl font-bold text-white">
                ${totalAP.toLocaleString()}
              </h3>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-gradient-to-br from-indigo-500/10 to-rose-500/10 backdrop-blur-xl border border-white/10 p-6 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/20 to-rose-500/20 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-rose-500/20 text-rose-300 rounded-lg uppercase tracking-wider border border-rose-500/20">
                  At Risk
                </span>
              </div>
              <p className="text-sm font-medium text-rose-200/70 mb-1">
                Overdue Amount
              </p>
              <h3 className="text-3xl font-bold text-white">
                ${totalOverdue.toLocaleString()}
              </h3>
            </div>
          </motion.div>
        </div>
      </div>

      {activeTab === "Reports" ? (
        <div className="flex-1 px-4 md:px-8 pb-8 z-10 relative overflow-y-auto">
          <ReportsDashboard invoices={invoices as any} />
        </div>
      ) : (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Pane: Invoice List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Search invoices or parties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search size={16} />}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(["All", "AR", "AP", "Overdue"] as const).map((filter) => (
                  <Button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    variant={activeFilter === filter ? "outline" : "ghost"}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap h-auto border ${
                      activeFilter === filter
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {filter === "AR"
                      ? "Receivables"
                      : filter === "AP"
                        ? "Payables"
                        : filter}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="text-center p-8 text-slate-500">Loading...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center p-8 text-slate-500 flex flex-col items-center">
                  <Receipt className="w-8 h-8 opacity-50 mb-2" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeFilter + searchQuery} // re-trigger animation on filter change
                >
                  {filteredInvoices.map((inv) => {
                    const visuals = getStatusVisuals(inv.status);
                    const StatusIcon = visuals.icon;
                    const isSelected = selectedInvoice?.id === inv.id;

                    return (
                      <motion.button
                        key={inv.id}
                        variants={itemVariants}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-xl ${visuals.bg} ${visuals.border} border ${visuals.glow}`}
                            >
                              <StatusIcon
                                className={`w-4 h-4 ${visuals.color}`}
                              />
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm">
                                {inv.invoiceNumber}
                              </p>
                              <p className="text-xs text-slate-400 truncate w-32">
                                {inv.party || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white text-sm">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: inv.currency,
                                maximumFractionDigits: 0,
                              }).format(inv.amount)}
                            </p>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${inv.type === "AR" ? "text-emerald-400" : "text-rose-400"}`}
                            >
                              {inv.type}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Pane: Invoice Preview */}
          <div className="w-full lg:w-2/3 bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative min-h-[600px] lg:min-h-0">
            {!selectedInvoice ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <FileText className="w-16 h-16 opacity-20 mb-4" />
                <p>Select an invoice to preview</p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getStatusVisuals(selectedInvoice.status).bg} ${getStatusVisuals(selectedInvoice.status).border} ${getStatusVisuals(selectedInvoice.status).color}`}
                    >
                      {selectedInvoice.status}
                    </span>
                    <span className="text-sm text-slate-400">
                      Due{" "}
                      {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {selectedInvoice.status !== "Paid" && (
                      <Button
                        onClick={() => markAsPaid(selectedInvoice)}
                        className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/30"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Paid
                      </Button>
                    )}
                    <Button
                      onClick={() => downloadPdf(selectedInvoice)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white border border-white/10 text-sm font-medium hover:bg-white/20"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                  </div>
                </div>

                {/* PDF Preview Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#0f172a] flex justify-center custom-scrollbar">
                  {/* The Paper Document */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={selectedInvoice.id}
                    className="bg-white w-full max-w-[800px] min-h-[1056px] shadow-2xl rounded-sm p-6 md:p-12 text-slate-800 relative"
                  >
                    {selectedInvoice.status === "Paid" && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none rotate-[-30deg]">
                        <span className="text-9xl font-black text-emerald-600 border-8 border-emerald-600 p-8 rounded-3xl">
                          PAID
                        </span>
                      </div>
                    )}
                    {selectedInvoice.status === "Overdue" && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none rotate-[-30deg]">
                        <span className="text-9xl font-black text-rose-600 border-8 border-rose-600 p-8 rounded-3xl">
                          OVERDUE
                        </span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-16 gap-6">
                      <div>
                        <div className="flex items-center gap-2 text-indigo-600 mb-4">
                          <GlobeIcon className="w-8 h-8 shrink-0" />
                          <span className="text-xl sm:text-2xl font-black tracking-tighter">
                            ATLAS LOGISTICS
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm">
                          123 Maritime Blvd.
                          <br />
                          Rotterdam, 3011 AL
                          <br />
                          Netherlands
                        </p>
                      </div>
                      <div className="text-right">
                        <h2 className="text-4xl font-black text-slate-200 tracking-widest uppercase">
                          Invoice
                        </h2>
                        <p className="text-slate-900 font-bold mt-2">
                          {selectedInvoice.invoiceNumber}
                        </p>
                        <p className="text-slate-500 text-sm">
                          Issued: {new Date().toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Bill To */}
                    <div className="mb-12 flex flex-col sm:flex-row justify-between gap-6">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Billed To
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {selectedInvoice.party || "Unknown Client"}
                        </p>
                        <p className="text-slate-500 text-sm">
                          Client ID:{" "}
                          {selectedInvoice.partyId?.substring(0, 8) || "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                          Details
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          Type:{" "}
                          <span className="font-bold">
                            {selectedInvoice.type}
                          </span>
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          Due Date:{" "}
                          <span className="font-bold">
                            {new Date(
                              selectedInvoice.dueDate,
                            ).toLocaleDateString()}
                          </span>
                        </p>
                        {selectedInvoice.shipmentId && (
                          <p className="text-sm font-medium text-slate-700">
                            Shipment Ref:{" "}
                            <span className="font-bold text-indigo-600">
                              {selectedInvoice.shipmentId.substring(0, 8)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Line Items */}
                    <Table className="mb-12">
                      <TableHeader>
                        <TableRow className="border-b-2 border-slate-900">
                          <TableHead className="text-left py-3 font-bold text-slate-900">
                            Description
                          </TableHead>
                          <TableHead className="text-center py-3 font-bold text-slate-900">
                            Qty
                          </TableHead>
                          <TableHead className="text-right py-3 font-bold text-slate-900">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right py-3 font-bold text-slate-900">
                            Amount
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-200">
                        {(invoiceDetail?.items ?? []).length > 0 ? (
                          invoiceDetail!.items.map((item) => (
                            <TableRow key={item.id} className="border-0">
                              <TableCell className="py-4">
                                <p className="font-bold text-slate-900">
                                  {item.description}
                                </p>
                              </TableCell>
                              <TableCell className="text-center py-4 text-slate-700">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right py-4 text-slate-700">
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: selectedInvoice.currency,
                                }).format(item.unitPrice)}
                              </TableCell>
                              <TableCell className="text-right py-4 font-bold text-slate-900">
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: selectedInvoice.currency,
                                }).format(item.total)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow className="border-0">
                            <TableCell colSpan={4} className="py-4 text-center text-slate-500">
                              No line items
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Totals */}
                    <div className="flex justify-end">
                      <div className="w-72">
                        <div className="flex justify-between py-2 text-slate-600">
                          <span>Subtotal</span>
                          <span>
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: selectedInvoice.currency,
                            }).format(selectedInvoice.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-slate-600">
                          <span>Tax (0%)</span>
                          <span>
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: selectedInvoice.currency,
                            }).format(0)}
                          </span>
                        </div>
                        <div className="flex justify-between py-4 border-t-2 border-slate-900 text-xl font-black text-slate-900">
                          <span>Total Due</span>
                          <span>
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: selectedInvoice.currency,
                            }).format(selectedInvoice.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="absolute bottom-12 left-12 right-12 pt-8 border-t border-slate-200 text-center">
                      <p className="text-sm text-slate-500 font-medium">
                        Thank you for your business.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Payment is due within 30 days. Please include the
                        invoice number on your check or wire transfer.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function GlobeIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" x2="22" y1="12" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
