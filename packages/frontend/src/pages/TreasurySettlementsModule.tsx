import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  BadgeDollarSign,
  Download,
  Search,
  Calculator,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { useApiQuery } from "../hooks/useApiQuery";
import { Input } from "@atlas/ui";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function TreasurySettlementsModule() {
  const [activeTab, setActiveTab] = useState<
    "3WAY_MATCH" | "FX_TREASURY" | "DISPUTES"
  >("3WAY_MATCH");
  const [activeModeFilter, setActiveModeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Reconciliation Simulator Modal
  const [showSimModal, setShowSimModal] = useState(false);
  const [simChargeCode, setSimChargeCode] = useState("DEMURRAGE");
  const [simDescription, setSimDescription] = useState(
    "Demurrage Puerto de Valencia",
  );
  const [simDocNumber, setSimDocNumber] = useState("MSK99482015");
  const [simBilledAmount, setSimBilledAmount] = useState(1250);
  const [simExpectedAmount, setSimExpectedAmount] = useState(750);
  const [simResult, setSimResult] = useState<any>(null);

  // Fetch Invoices
  const {
    data: invoices = [],
    isLoading: loadingInvoices,
    refetch: refetchInvoices,
  } = useApiQuery<any[]>(
    ["treasury-invoices", activeModeFilter, searchQuery],
    `/treasury/invoices?mode=${activeModeFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Fetch Detailed Selected Invoice
  const { data: invoiceDetails } = useApiQuery<any>(
    ["treasury-invoice-details", selectedInvoice?.id],
    selectedInvoice?.id ? `/treasury/invoices/${selectedInvoice.id}` : "",
  );

  // Fetch FX Exposure & Cash Flow Forecast
  const { data: fxData } = useApiQuery<any>(
    ["treasury-fx-exposure"],
    "/treasury/fx-exposure",
  );

  const { data: cashFlowData } = useApiQuery<any>(
    ["treasury-cash-flow-forecast"],
    "/treasury/cash-flow-forecast",
  );

  // Auto-select first invoice
  React.useEffect(() => {
    if (invoices.length > 0 && !selectedInvoice) {
      setSelectedInvoice(invoices[0]);
    }
  }, [invoices, selectedInvoice]);

  const getAuthHeaders = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("atlas_token") || localStorage.getItem("token")
        : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/treasury/invoices/${invoiceId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        refetchInvoices();
      }
    } catch (err) {
      console.error("Error approving invoice:", err);
    }
  };

  const handleDisputeInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/treasury/invoices/${invoiceId}/dispute`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          disputeReason: "Reclamación formal por recargos de demora indebidos.",
        }),
      });
      if (res.ok) {
        refetchInvoices();
      }
    } catch (err) {
      console.error("Error disputing invoice:", err);
    }
  };

  const runSimulation = async () => {
    try {
      const res = await fetch("/api/treasury/reconcile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          lines: [
            {
              chargeCode: simChargeCode,
              description: simDescription,
              documentNumber: simDocNumber,
              billedQuantity: 1,
              billedRate: Number(simBilledAmount),
              billedAmount: Number(simBilledAmount),
              expectedQuantity: 1,
              expectedRate: Number(simExpectedAmount),
              expectedAmount: Number(simExpectedAmount),
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data.summary);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  // KPIs
  const totalInvoicesCount = invoices.length;
  const totalBilledEur = invoices.reduce((acc, inv) => {
    const rate =
      fxData?.rates?.find((r: any) => r.toCurrency === inv.currency)
        ?.spotRate || 1.0;
    return (
      acc + (inv.currency === "EUR" ? inv.totalAmount : inv.totalAmount / rate)
    );
  }, 0);

  const totalDisputedEur = invoices.reduce((acc, inv) => {
    const rate =
      fxData?.rates?.find((r: any) => r.toCurrency === inv.currency)
        ?.spotRate || 1.0;
    return (
      acc +
      (inv.currency === "EUR" ? inv.disputedAmount : inv.disputedAmount / rate)
    );
  }, 0);

  const matchedCount = invoices.filter(
    (i) =>
      i.reconciliationStatus === "AUTO_MATCHED" ||
      i.reconciliationStatus === "APPROVED_FOR_PAYMENT",
  ).length;

  const currentInvoice = invoiceDetails || selectedInvoice;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-sky-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <BadgeDollarSign className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Tesorería Multidivisa & CASS / Navieras
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  3-Way Match & Riesgo FX
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Reconciliación de facturas de porteadores (CASS, Navieras,
              Carretera), casación 3-Way Match con tolerancia configurable (±1%
              o ±5€), monitor de exposición FX y Notas de Cargo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowSimModal(true);
                if (!simResult) runSimulation();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Simulador 3-Way Match
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Facturas Porteadores
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalInvoicesCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              CASS, Navieras & Carretera
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Volumen Facturado
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalBilledEur.toLocaleString("es-ES", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <BadgeDollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Total en base EUR consolidada
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tasa de Casación OK
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalInvoicesCount > 0
                    ? ((matchedCount / totalInvoicesCount) * 100).toFixed(0)
                    : 0}
                  %
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              3-Way Match dentro de tolerancia
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Sobrecargos en Disputa
                </p>
                <h3 className="text-2xl font-black text-rose-400 mt-1">
                  {totalDisputedEur.toLocaleString("es-ES", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  €
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Notas de cargo emitidas / pendientes
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
          {(
            [
              {
                id: "3WAY_MATCH",
                label: "Conciliador 3-Way Match (CASS & Navieras)",
              },
              {
                id: "FX_TREASURY",
                label: "Monitor de Riesgo FX & Flujo de Caja",
              },
              { id: "DISPUTES", label: "Centro de Disputas & Notas de Cargo" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: 3-Way Match Reconciliation */}
      {activeTab === "3WAY_MATCH" && (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Invoice List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Factura, Naviera, CASS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(
                  ["ALL", "OCEAN_FCL", "AIR_CARGO", "ROAD_FREIGHT"] as const
                ).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActiveModeFilter(mode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeModeFilter === mode
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {mode === "ALL"
                      ? "Todos"
                      : mode === "OCEAN_FCL"
                        ? "Marítimo (Navieras)"
                        : mode === "AIR_CARGO"
                          ? "Aéreo (IATA CASS)"
                          : "Carretera"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingInvoices ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron facturas de porteadores.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeModeFilter + searchQuery}
                >
                  {invoices.map((inv) => {
                    const isSelected = selectedInvoice?.id === inv.id;
                    return (
                      <motion.div
                        key={inv.id}
                        variants={itemVariants}
                        onClick={() => setSelectedInvoice(inv)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-white/10 border-white/20 shadow-lg"
                            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm tracking-wide">
                                {inv.invoiceNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  inv.reconciliationStatus === "AUTO_MATCHED"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : inv.reconciliationStatus ===
                                        "APPROVED_FOR_PAYMENT"
                                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {inv.reconciliationStatus}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {inv.carrierName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Vencimiento: {inv.dueDate} | {inv.mode}
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-white">
                              {inv.totalAmount?.toLocaleString()} {inv.currency}
                            </span>
                            {inv.disputedAmount > 0 && (
                              <span className="text-[10px] text-rose-400 font-bold mt-1">
                                Disputa: +{inv.disputedAmount} {inv.currency}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column: 3-Way Match Line Inspector */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {currentInvoice ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {currentInvoice.mode}
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {currentInvoice.invoiceNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <Building size={12} className="text-emerald-400" />
                      {currentInvoice.carrierName} (
                      {currentInvoice.carrierVat || "N/A"})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/treasury/invoices/${currentInvoice.id}/settlement-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Estado de Liquidación (PDF)
                    </a>
                    {currentInvoice.disputedAmount > 0 && (
                      <a
                        href={`/api/treasury/invoices/${currentInvoice.id}/dispute-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={14} />
                        Nota de Cargo / Disputa (PDF)
                      </a>
                    )}
                  </div>
                </div>

                {/* Body: Line-by-Line Match Comparison */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Total Facturado
                      </span>
                      <p className="text-base font-bold text-white">
                        {currentInvoice.totalAmount?.toLocaleString()}{" "}
                        {currentInvoice.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Importe Casado (OK)
                      </span>
                      <p className="text-base font-bold text-emerald-400">
                        {currentInvoice.matchedAmount?.toLocaleString()}{" "}
                        {currentInvoice.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Sobrecargo Disputado
                      </span>
                      <p className="text-base font-bold text-rose-400">
                        {currentInvoice.disputedAmount?.toLocaleString()}{" "}
                        {currentInvoice.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Acción / Estado
                      </span>
                      <div className="flex gap-1.5 mt-0.5">
                        <button
                          onClick={() =>
                            handleApproveInvoice(currentInvoice.id)
                          }
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg"
                        >
                          Aprobar Pago
                        </button>
                        <button
                          onClick={() =>
                            handleDisputeInvoice(currentInvoice.id)
                          }
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-lg"
                        >
                          Disputar
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lines Table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Doc. Transporte</th>
                          <th className="p-3">Concepto</th>
                          <th className="p-3 text-right">Facturado</th>
                          <th className="p-3 text-right">Pactado</th>
                          <th className="p-3 text-right">Varianza</th>
                          <th className="p-3 text-center">Estado 3-Way</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(currentInvoice.lines || []).map((line: any) => (
                          <tr
                            key={line.id}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="p-3 font-bold text-white">
                              {line.documentNumber}
                              {line.bookingNumber && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {line.bookingNumber}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-300">
                              {line.description}
                              {line.disputeReason && (
                                <span className="block text-[10px] text-rose-300 italic mt-0.5">
                                  {line.disputeReason}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-medium text-white">
                              {line.billedAmount?.toLocaleString()}{" "}
                              {currentInvoice.currency}
                            </td>
                            <td className="p-3 text-right text-slate-400">
                              {line.expectedAmount?.toLocaleString()}{" "}
                              {currentInvoice.currency}
                            </td>
                            <td
                              className={`p-3 text-right font-bold ${
                                line.varianceAmount > 0
                                  ? "text-rose-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {line.varianceAmount > 0
                                ? `+${line.varianceAmount}`
                                : "0.00"}{" "}
                              {currentInvoice.currency}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  line.isWithinTolerance
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {line.isWithinTolerance
                                  ? "VERIFICADO"
                                  : "SOBRECARGO"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <FileSpreadsheet className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione una factura de porteador para inspeccionar el 3-Way
                Match
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: FX Risk & Treasury Monitor */}
      {activeTab === "FX_TREASURY" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          {/* FX Rates Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" />
                  Matriz de Tipos de Cambio Oficiales (Base EUR)
                </h3>
                <span className="text-xs text-slate-400">
                  Fuente: BCE / Bancos Centrales
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(fxData?.rates || []).map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1"
                  >
                    <span className="text-[10px] text-slate-400 font-bold block">
                      EUR / {r.toCurrency}
                    </span>
                    <p className="text-lg font-black text-white">
                      {r.spotRate}
                    </p>
                    <span className="text-[9px] text-emerald-400 block">
                      Fwd 90d: {r.forward90Rate || r.spotRate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cash Flow Forecast Card */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-sky-400" />
                Proyección de Flujo de Caja
              </h3>

              <div className="space-y-3">
                {(cashFlowData?.forecasts || []).map((fc: any) => (
                  <div
                    key={fc.periodDays}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">
                        {fc.periodDays} Días
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Cobros: {fc.projectedReceivablesEur?.toLocaleString()} €
                        | Pagos: {fc.projectedPayablesEur?.toLocaleString()} €
                      </p>
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      +{fc.netCashFlowEur?.toLocaleString()} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Currency Exposure Table */}
          <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Percent size={18} className="text-amber-400" />
              Posiciones de Divisas & Ganancias/Pérdidas Latentes
            </h3>

            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="p-3">Moneda</th>
                    <th className="p-3 text-right">Cobros Pendientes</th>
                    <th className="p-3 text-right">Pagos Pendientes</th>
                    <th className="p-3 text-right">Exposición Neta</th>
                    <th className="p-3 text-right">Importe Cobertura</th>
                    <th className="p-3 text-right">G/P No Realizada (EUR)</th>
                    <th className="p-3 text-center">Nivel de Riesgo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(fxData?.evaluations || []).map((ev: any) => (
                    <tr
                      key={ev.currency}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="p-3 font-black text-white">
                        {ev.currency}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-medium">
                        +{ev.receivablesAmount?.toLocaleString()} {ev.currency}
                      </td>
                      <td className="p-3 text-right text-rose-400 font-medium">
                        -{ev.payablesAmount?.toLocaleString()} {ev.currency}
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        {ev.netExposure?.toLocaleString()} {ev.currency}
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {ev.hedgedAmount?.toLocaleString()} {ev.currency}
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${
                          ev.unrealizedGainLossEur >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {ev.unrealizedGainLossEur >= 0 ? "+" : ""}
                        {ev.unrealizedGainLossEur?.toLocaleString()} €
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            ev.riskLevel === "LOW"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : ev.riskLevel === "MODERATE"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {ev.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Disputes Center */}
      {activeTab === "DISPUTES" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-4 overflow-y-auto z-10 relative">
          <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-400" />
              Expedientes de Disputa & Cartas de Reclamación a Porteadores
            </h3>

            <div className="space-y-3">
              {invoices
                .filter(
                  (inv) =>
                    inv.disputedAmount > 0 ||
                    inv.reconciliationStatus === "DISPUTED",
                )
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-rose-300">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          SOBRECARGO: {inv.disputedAmount} {inv.currency}
                        </span>
                      </div>
                      <p className="text-xs text-white font-bold mt-1">
                        {inv.carrierName} ({inv.mode})
                      </p>
                      <p className="text-xs text-slate-400 italic mt-0.5">
                        {inv.notes}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/treasury/invoices/${inv.id}/dispute-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all flex items-center gap-1.5"
                      >
                        <Download size={14} />
                        Descargar Carta de Reclamación (PDF)
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Simulator Modal */}
      <AnimatePresence>
        {showSimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-xl w-full space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white">
                  Simulador de Casación 3-Way Match
                </h3>
                <button
                  onClick={() => setShowSimModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Tipo de Cargo
                  </label>
                  <select
                    value={simChargeCode}
                    onChange={(e) => setSimChargeCode(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DEMURRAGE">DEMURRAGE (Demoras)</option>
                    <option value="BASIC_FREIGHT">
                      BASIC_FREIGHT (Flete Base)
                    </option>
                    <option value="BAF_FUEL">BAF_FUEL (Combustible)</option>
                    <option value="THC_ORIGIN">
                      THC_ORIGIN (Terminal Origen)
                    </option>
                    <option value="IATA_COMMISSION">
                      IATA_COMMISSION (Comisión)
                    </option>
                    <option value="OTHER_SURCHARGE">
                      OTHER_SURCHARGE (Otros)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Doc. Embarque (B/L / AWB)
                  </label>
                  <Input
                    type="text"
                    value={simDocNumber}
                    onChange={(e) => setSimDocNumber(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">
                    Descripción Concepto
                  </label>
                  <Input
                    type="text"
                    value={simDescription}
                    onChange={(e) => setSimDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Importe Facturado (€/$)
                  </label>
                  <Input
                    type="number"
                    value={simBilledAmount}
                    onChange={(e) => setSimBilledAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Importe Pactado (€/$)
                  </label>
                  <Input
                    type="number"
                    value={simExpectedAmount}
                    onChange={(e) =>
                      setSimExpectedAmount(Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <button
                onClick={runSimulation}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Evaluar Casación con Tolerancia ±1% / ±5€
              </button>

              {simResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resultado Casación:</span>
                    <span
                      className={`font-bold ${simResult.reconciliationStatus === "AUTO_MATCHED" ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {simResult.reconciliationStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Varianza:</span>
                    <span className="font-bold text-white">
                      {simResult.totalVarianceAmount} €
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 italic pt-1">
                    {simResult.auditNotes}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
