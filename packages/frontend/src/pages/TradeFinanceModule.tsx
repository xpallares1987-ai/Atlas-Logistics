import React, { useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Landmark,
  Download,
  Search,
  Calculator,
  ShieldCheck,
  FileCode2,
  Scale,
  FileCheck2,
  FileX2,
  Building2,
  Coins,
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

export default function TradeFinanceModule() {
  const [activeTab, setActiveTab] = useState<
    "INSTRUMENTS_DOCS" | "UCP_DISCREPANCIES" | "FEE_SIMULATOR"
  >("INSTRUMENTS_DOCS");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstrument, setSelectedInstrument] = useState<any>(null);

  // Fee Simulator State
  const [simAmount, setSimAmount] = useState(250000);
  const [simCurrency, setSimCurrency] = useState("EUR");
  const [simTenorDays, setSimTenorDays] = useState(90);
  const [simOpeningRate, setSimOpeningRate] = useState(0.25);
  const [simConfirmRate, setSimConfirmRate] = useState(0.5);
  const [simDiscrepancyCount, setSimDiscrepancyCount] = useState(1);
  const [simAmendmentCount, setSimAmendmentCount] = useState(0);
  const [feeSimResult, setFeeSimResult] = useState<any>(null);

  // Discrepancy Audit State
  const [auditDateInput, setAuditDateInput] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Fetch Instruments
  const {
    data: instruments = [],
    isLoading: loadingInstruments,
    refetch: refetchInstruments,
  } = useApiQuery<any[]>(
    ["trade-instruments", activeTypeFilter, searchQuery],
    `/trade-finance/instruments?type=${activeTypeFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  // Fetch Instrument Detail
  const { data: instrumentDetail } = useApiQuery<any>(
    ["trade-instrument-detail", selectedInstrument?.id],
    selectedInstrument?.id
      ? `/trade-finance/instruments/${selectedInstrument.id}`
      : "",
  );

  // Auto-select first instrument
  React.useEffect(() => {
    if (instruments.length > 0 && !selectedInstrument) {
      setSelectedInstrument(instruments[0]);
    }
  }, [instruments, selectedInstrument]);

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

  const handleRunFeeSim = async () => {
    try {
      const res = await fetch("/api/trade-finance/calculate-fees", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          creditAmount: Number(simAmount),
          currency: simCurrency,
          tenorDays: Number(simTenorDays),
          openingFeeRatePct: Number(simOpeningRate),
          confirmationFeeRatePct: Number(simConfirmRate),
          discrepanciesCount: Number(simDiscrepancyCount),
          amendmentsCount: Number(simAmendmentCount),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeeSimResult(data.feeCalculation);
      }
    } catch (err) {
      console.error("Fee calculation error:", err);
    }
  };

  const handleRunUcpAudit = async () => {
    if (!selectedInstrument) return;
    setIsAuditing(true);
    try {
      const res = await fetch(
        `/api/trade-finance/instruments/${selectedInstrument.id}/validate-ucp`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            presentationDate: auditDateInput,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        setAuditResult(data.auditResult);
        refetchInstruments();
      }
    } catch (err) {
      console.error("UCP Audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  // KPIs
  const totalFinancedVolume = instruments.reduce(
    (acc, inst) => acc + (inst.creditAmount || 0),
    0,
  );
  const compliantCount = instruments.filter(
    (i) => i.status === "ACCEPTED" || i.status === "DOCUMENTS_PRESENTED",
  ).length;
  const complianceRate =
    instruments.length > 0 ? (compliantCount / instruments.length) * 100 : 100;

  const currentInst = instrumentDetail || selectedInstrument;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-emerald-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Landmark className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Financiación Internacional & Créditos Documentarios
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  UCP 600 • URDG 758 • SWIFT MT700
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Gestión de Cartas de Crédito Comerciales, Garantías a Primera
              Demanda, Auditoría de Discrepancias UCP 600 / ISBP 745 y
              Mensajería SWIFT MT.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {currentInst && (
              <a
                href={`/api/trade-finance/instruments/${currentInst.id}/presentation-dossier-pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Dossier de Presentación Bancaria (PDF)
              </a>
            )}
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Instrumentos Vivos
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {instruments.length} Activos
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Créditos L/C, Standby & Remesas
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Volumen Financiado
                </p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {(totalFinancedVolume / 1000).toFixed(1)}k{" "}
                  <span className="text-xs font-normal text-slate-300">
                    EUR/USD
                  </span>
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Garantía bancaria internacional
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Conformidad UCP 600
                </p>
                <h3 className="text-2xl font-black text-cyan-400 mt-1">
                  {complianceRate.toFixed(0)}%
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Presentaciones sin discrepancias
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Garantías a 1ª Demanda
                </p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">
                  {
                    instruments.filter((i) => i.applicableRules === "URDG758")
                      .length
                  }{" "}
                  URDG 758
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Performance & Advance Payment Bonds
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
          {(
            [
              {
                id: "INSTRUMENTS_DOCS",
                label:
                  "Instrumentos de Crédito & Documentación (UCP 600 / URDG 758)",
              },
              {
                id: "UCP_DISCREPANCIES",
                label: "Auditor de Discrepancias UCP 600 & Avisos SWIFT MT734",
              },
              {
                id: "FEE_SIMULATOR",
                label: "Simulador de Comisiones Bancarias & Coste Financiero",
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === tab.id
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-lg shadow-blue-500/10"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Instruments & Documents */}
      {activeTab === "INSTRUMENTS_DOCS" && (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Instruments List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Referencia, Ordenante, Beneficiario, Banco..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  "ALL",
                  "COMMERCIAL_LC_CONFIRMED",
                  "COMMERCIAL_LC_IRREVOCABLE",
                  "DEMAND_GUARANTEE_URDG758",
                  "DOC_COLLECTION_DP",
                ].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeTypeFilter === t
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                    }`}
                  >
                    {t === "ALL"
                      ? "Todos"
                      : t === "COMMERCIAL_LC_CONFIRMED"
                        ? "L/C Confirmado"
                        : t === "COMMERCIAL_LC_IRREVOCABLE"
                          ? "L/C Irrevocable"
                          : t === "DEMAND_GUARANTEE_URDG758"
                            ? "Garantía URDG"
                            : "Remesa D/P"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingInstruments ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
              ) : instruments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron instrumentos de financiación comercial.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeTypeFilter + searchQuery}
                >
                  {instruments.map((inst) => {
                    const isSelected = selectedInstrument?.id === inst.id;
                    const isOk = inst.status !== "DISCREPANCIES_FOUND";
                    return (
                      <motion.div
                        key={inst.id}
                        variants={itemVariants}
                        onClick={() => setSelectedInstrument(inst)}
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
                                {inst.instrumentReference}
                              </p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {inst.applicableRules}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {inst.beneficiaryName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {inst.issuingBankName} | Exp: {inst.expiryDate}
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-emerald-400">
                              {inst.creditAmount.toLocaleString("es-ES")}{" "}
                              {inst.currency}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 ${
                                isOk
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {inst.status}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column: Instrument Details & Presented Documents */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {currentInst ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {currentInst.instrumentType}
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {currentInst.instrumentReference}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <Landmark size={12} className="text-blue-400" />
                      Banco Emisor: {currentInst.issuingBankName} (
                      {currentInst.issuingBankBic})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/trade-finance/instruments/${currentInst.id}/swift-mt700`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                    >
                      <FileCode2 size={14} className="text-cyan-400" />
                      SWIFT MT700
                    </a>
                    {currentInst.applicableRules === "URDG758" && (
                      <a
                        href={`/api/trade-finance/instruments/${currentInst.id}/guarantee-certificate-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={14} />
                        Garantía URDG (PDF)
                      </a>
                    )}
                    <a
                      href={`/api/trade-finance/instruments/${currentInst.id}/presentation-dossier-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Dossier Bancario (PDF)
                    </a>
                  </div>
                </div>

                {/* Body: Operational & Credit Terms */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Metric Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Importe Nominal
                      </span>
                      <p className="text-lg font-black text-emerald-400">
                        {currentInst.creditAmount.toLocaleString("es-ES")}{" "}
                        {currentInst.currency}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Tolerancia UCP 600
                      </span>
                      <p className="text-lg font-bold text-cyan-400">
                        +/- {currentInst.tolerancePercentage}%
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Fecha Límite Embarque
                      </span>
                      <p className="text-lg font-bold text-amber-400">
                        {currentInst.latestShipmentDate}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Vencimiento del Crédito
                      </span>
                      <p className="text-lg font-black text-white">
                        {currentInst.expiryDate}
                      </p>
                    </div>
                  </div>

                  {/* Parties & Logistics Routing */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                    <span className="font-bold text-slate-300 block">
                      Partes del Crédito & Ruta de Transporte:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                      <div>
                        <p>
                          <strong className="text-slate-400">
                            Ordenante (Applicant):
                          </strong>{" "}
                          {currentInst.applicantName}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Beneficiario:
                          </strong>{" "}
                          {currentInst.beneficiaryName}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Banco Confirmador:
                          </strong>{" "}
                          {currentInst.confirmingBankName || "Sin confirmar"}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Plazo Presentación:
                          </strong>{" "}
                          Max {currentInst.presentationPeriodDays} días
                          naturales tras B/L
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong className="text-slate-400">
                            Puerto de Carga:
                          </strong>{" "}
                          {currentInst.portOfLoading}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Puerto de Destino:
                          </strong>{" "}
                          {currentInst.portOfDischarge}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Términos de Pago:
                          </strong>{" "}
                          {currentInst.paymentTerms} (
                          {currentInst.tenorDays > 0
                            ? `${currentInst.tenorDays} días`
                            : "A la vista"}
                          )
                        </p>
                        <p>
                          <strong className="text-slate-400">Mercancía:</strong>{" "}
                          {currentInst.goodsDescriptionSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Presented Documents Table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden space-y-1">
                    <div className="p-3 bg-slate-900/90 border-b border-white/10 flex justify-between items-center">
                      <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                        <FileCheck2 size={14} className="text-blue-400" />
                        Documentos Exigidos & Presentados para Negociación
                      </span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Tipo de Documento</th>
                          <th className="p-3">Referencia</th>
                          <th className="p-3">Emisor / Fecha</th>
                          <th className="p-3 text-center">Originales</th>
                          <th className="p-3 text-right">Estado UCP 600</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {currentInst.documents &&
                        currentInst.documents.length > 0 ? (
                          currentInst.documents.map((doc: any) => (
                            <tr
                              key={doc.id}
                              className="hover:bg-white/5 transition-colors"
                            >
                              <td className="p-3 text-white font-bold">
                                {doc.documentType.replace(/_/g, " ")}
                              </td>
                              <td className="p-3 text-slate-300">
                                {doc.documentReferenceNumber}
                              </td>
                              <td className="p-3 text-slate-300">
                                {doc.issuerName} ({doc.documentDate})
                              </td>
                              <td className="p-3 text-center text-white">
                                {doc.originalCopiesPresented} /{" "}
                                {doc.originalCopiesRequired}
                              </td>
                              <td className="p-3 text-right">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    doc.complianceStatus === "COMPLIANT"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  }`}
                                >
                                  {doc.complianceStatus}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-4 text-center text-slate-500"
                            >
                              No hay documentos vinculados a este instrumento de
                              crédito.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <Landmark className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione un crédito documentario o garantía para inspeccionar
                su estructura y documentos presentados
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: UCP 600 Discrepancy Auditor */}
      {activeTab === "UCP_DISCREPANCIES" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Audit Trigger & Settings */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Scale size={18} className="text-blue-400" />
                Auditoría UCP 600 & ISBP 745
              </h3>
              <p className="text-xs text-slate-400">
                Evalúa automáticamente la conformidad estricta de documentos
                según los Artículos 14–33 de la UCP 600.
              </p>

              {currentInst ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10">
                    <p className="font-bold text-white">
                      {currentInst.instrumentReference}
                    </p>
                    <p className="text-slate-400">
                      {currentInst.beneficiaryName}
                    </p>
                    <p className="text-emerald-400 font-bold mt-1">
                      {currentInst.creditAmount.toLocaleString("es-ES")}{" "}
                      {currentInst.currency}
                    </p>
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">
                      Fecha de Presentación al Banco
                    </label>
                    <Input
                      type="date"
                      value={auditDateInput}
                      onChange={(e) => setAuditDateInput(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleRunUcpAudit}
                    disabled={isAuditing}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <Scale size={16} />
                    {isAuditing
                      ? "Examinando Documentos..."
                      : "Ejecutar Examen UCP 600"}
                  </button>

                  <div className="flex gap-2 pt-2">
                    <a
                      href={`/api/trade-finance/instruments/${currentInst.id}/discrepancy-report-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] rounded-xl text-center border border-white/10 transition-all"
                    >
                      Informe PDF
                    </a>
                    <a
                      href={`/api/trade-finance/instruments/${currentInst.id}/swift-mt734`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-[11px] rounded-xl text-center border border-rose-500/30 transition-all"
                    >
                      SWIFT MT734
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Seleccione un instrumento en la primera pestaña.
                </p>
              )}
            </div>

            {/* Audit Findings Display */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <FileX2 size={18} className="text-rose-400" />
                Resultados del Examen & Discrepancias Detectadas
              </h3>

              {auditResult && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                  Examen ejecutado:{" "}
                  <strong className="text-white">
                    {auditResult.complianceStatus}
                  </strong>{" "}
                  ({auditResult.totalDiscrepanciesCount} discrepancias). Días
                  transcurridos: {auditResult.presentationDaysElapsed} de{" "}
                  {auditResult.maxAllowedPresentationDays} días permitidos.
                </div>
              )}

              {currentInst?.discrepancies &&
              currentInst.discrepancies.length > 0 ? (
                <div className="space-y-3 overflow-y-auto max-h-[420px]">
                  {currentInst.discrepancies.map((disc: any, index: number) => (
                    <div
                      key={disc.id || index}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-rose-500/30 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {index + 1}. {disc.articleReference}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              disc.severity === "CRITICAL_REFUSAL"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {disc.severity}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {disc.status}
                        </span>
                      </div>

                      <p className="text-slate-300">{disc.description}</p>
                      <p className="text-slate-400 italic pt-1 border-t border-white/10">
                        <strong className="text-cyan-400 not-italic">
                          Subsanación / Waiver:
                        </strong>{" "}
                        {disc.suggestedRemedy}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <FileCheck2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">
                    Presentación Conforme (Clean Presentation)
                  </h4>
                  <p className="text-xs text-slate-300">
                    No se han detectado discrepancias documentarias bajo las
                    reglas de la UCP 600 e ISBP 745. El crédito está listo para
                    pago / negociación.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Bank Fee & Financial Cost Simulator */}
      {activeTab === "FEE_SIMULATOR" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulator Inputs */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calculator size={18} className="text-emerald-400" />
                Simulador de Comisiones Bancarias
              </h3>
              <p className="text-xs text-slate-400">
                Calcula costes de apertura trimestral, diferencial de
                confirmación y recargos por discrepancias.
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Importe Crédito
                    </label>
                    <Input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Divisa</label>
                    <select
                      value={simCurrency}
                      onChange={(e) => setSimCurrency(e.target.value)}
                      className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Plazo Tenor (Días)
                    </label>
                    <Input
                      type="number"
                      value={simTenorDays}
                      onChange={(e) => setSimTenorDays(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Apertura (% Trimestral)
                    </label>
                    <Input
                      type="number"
                      step="0.05"
                      value={simOpeningRate}
                      onChange={(e) =>
                        setSimOpeningRate(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Confirmación (% Anual)
                    </label>
                    <Input
                      type="number"
                      step="0.05"
                      value={simConfirmRate}
                      onChange={(e) =>
                        setSimConfirmRate(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Nº Enmiendas (MT707)
                    </label>
                    <Input
                      type="number"
                      value={simAmendmentCount}
                      onChange={(e) =>
                        setSimAmendmentCount(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Nº Discrepancias UCP 600
                  </label>
                  <Input
                    type="number"
                    value={simDiscrepancyCount}
                    onChange={(e) =>
                      setSimDiscrepancyCount(Number(e.target.value))
                    }
                  />
                </div>

                <button
                  onClick={handleRunFeeSim}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  Calcular Comisiones Bancarias
                </button>
              </div>
            </div>

            {/* Simulator Output */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Coins size={18} className="text-emerald-400" />
                Desglose Liquidativo de Costes Bancarios
              </h3>

              {feeSimResult ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                      <span className="text-slate-400 block">
                        Comisión de Apertura
                      </span>
                      <p className="text-xl font-black text-white mt-1">
                        {feeSimResult.calculatedOpeningFeeEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {feeSimResult.quarterPeriods} trimestre(s) @{" "}
                        {feeSimResult.openingFeeRatePct}%
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                      <span className="text-slate-400 block">
                        Comisión Confirmación
                      </span>
                      <p className="text-xl font-black text-blue-400 mt-1">
                        {feeSimResult.calculatedConfirmationFeeEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </p>
                      <span className="text-[10px] text-slate-400">
                        @ {feeSimResult.confirmationFeeRatePct}% anual
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10">
                      <span className="text-slate-400 block">
                        Total Gastos Bancarios
                      </span>
                      <p className="text-xl font-black text-emerald-400 mt-1">
                        {feeSimResult.totalBankFeesEur.toLocaleString("es-ES", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        €
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Coste efectivo: {feeSimResult.effectiveBankCostPct}%
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
                    <span className="font-bold text-white block">
                      Otros Gastos y Recargos:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                      <p>
                        Recargo por Discrepancias:{" "}
                        <strong>
                          {feeSimResult.calculatedDiscrepancyFeeEur.toFixed(2)}{" "}
                          €
                        </strong>
                      </p>
                      <p>
                        Comisión de Enmiendas:{" "}
                        <strong>
                          {feeSimResult.calculatedAmendmentFeeEur.toFixed(2)} €
                        </strong>
                      </p>
                      <p>
                        Comisión de Pago/Liquidación:{" "}
                        <strong>
                          {feeSimResult.calculatedPaymentFeeEur.toFixed(2)} €
                        </strong>
                      </p>
                      <p>
                        Coste Financiero sobre Valor:{" "}
                        <strong>{feeSimResult.effectiveBankCostPct}%</strong>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm">
                  Ajuste los parámetros financieros del crédito y ejecute el
                  cálculo para visualizar la liquidación bancaria.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
