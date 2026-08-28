import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Building2,
  Download,
  Search,
  Calculator,
  ShieldCheck,
  FileCode2,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  FileText,
  Boxes,
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

export default function CustomsWarehouseModule() {
  const [activeTab, setActiveTab] = useState<
    "LOTS_LEDGER" | "GUARANTEES_TAX" | "FACILITIES_HANDLING"
  >("LOTS_LEDGER");
  const [activeRegimeFilter, setActiveRegimeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLot, setSelectedLot] = useState<any>(null);

  // Discharge Simulator State
  const [simDischargeRegime, setSimDischargeRegime] = useState<
    "4071" | "3171" | "7171" | "5171" | "DOMESTIC_COMMERCE_DDA"
  >("4071");
  const [simDischargedPkgs, setSimDischargedPkgs] = useState(20);
  const [dischargeResult, setDischargeResult] = useState<any>(null);

  // Usual Handling Validator State
  const [selectedHandlingType, setSelectedHandlingType] = useState<
    | "LABELING_MARKING"
    | "REPACKING_SORTING"
    | "VENTILATION_DRYING"
    | "TESTING_SAMPLING"
    | "PRESERVATION_CLEANING"
    | "ALTERATION_MANUFACTURING"
  >("LABELING_MARKING");

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] = useState<
    "ACTIVE" | "PARTIALLY_DISCHARGED" | "CLOSED_DISCHARGED" | "EXPIRED_ALERT"
  >("ACTIVE");
  const [remarksInput, setRemarksInput] = useState("");

  // Fetch Inventory Lots
  const {
    data: lots = [],
    isLoading: loadingLots,
    refetch: refetchLots,
  } = useApiQuery<any[]>(
    ["customs-warehouse-lots", activeRegimeFilter, searchQuery],
    `/customs-warehouse/lots?regime=${activeRegimeFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  // Fetch Facilities
  const { data: facilities = [] } = useApiQuery<any[]>(
    ["customs-facilities"],
    "/customs-warehouse/facilities",
  );

  // Fetch Guarantees
  const { data: guarantees = [] } = useApiQuery<any[]>(
    ["customs-guarantees"],
    "/customs-warehouse/guarantees",
  );

  // Fetch Lot Detail
  const { data: lotDetails } = useApiQuery<any>(
    ["customs-lot-details", selectedLot?.id],
    selectedLot?.id ? `/customs-warehouse/lots/${selectedLot.id}` : "",
  );

  // Auto-select first lot
  React.useEffect(() => {
    if (lots.length > 0 && !selectedLot) {
      setSelectedLot(lots[0]);
    }
  }, [lots, selectedLot]);

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

  const handleRunDischargeCalc = async () => {
    if (!currentLot) return;
    try {
      const res = await fetch("/api/customs-warehouse/calculate-discharge", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          totalLotCustomsValueEur: currentLot.customsValueEur,
          totalLotDutyAmountEur: currentLot.suspendedDutyAmountEur,
          totalLotVatAmountEur: currentLot.suspendedVatAmountEur,
          initialPackagesCount: currentLot.initialPackageCount,
          dischargedPackagesCount: Number(simDischargedPkgs),
          dischargeRegimeCode: simDischargeRegime,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDischargeResult(data.result);
      }
    } catch (err) {
      console.error("Discharge calculation error:", err);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedLot) return;
    try {
      const res = await fetch(
        `/api/customs-warehouse/lots/${selectedLot.id}/status`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            remarks:
              remarksInput ||
              "Estado del lote actualizado conforme al registro de inspección de aduanas.",
          }),
        },
      );
      if (res.ok) {
        setShowStatusModal(false);
        refetchLots();
      }
    } catch (err) {
      console.error("Error updating lot status:", err);
    }
  };

  // KPIs
  const totalSuspendedDebtSum = lots.reduce(
    (acc, l) => acc + (l.totalSuspendedDebtEur || 0),
    0,
  );
  const totalPackagesSum = lots.reduce(
    (acc, l) => acc + (l.currentPackageCount || 0),
    0,
  );
  const totalAvailableCreditSum = guarantees.reduce(
    (acc, g) => acc + (g.availableCreditEur || 0),
    0,
  );

  const currentLot = lotDetails || selectedLot;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-amber-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Building2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Depósito Aduanero, Zona Franca & Regímenes Especiales
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  CAU (Arts. 210–242) & AEAT
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Gestión de Depósito Aduanero (DA 7100), Depósito Distinto del
              Aduanero (DDA 7600), Depósito Temporal (ADT 90 días), Libro
              Oficial de Existencias AEAT y Avales Globales.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/customs-warehouse/stock-certificate-pdf"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-600/25 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Certificado Oficial de Existencias (PDF)
            </a>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Partidas Vinculadas
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {lots.length} Lotes
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {totalPackagesSum} bultos bajo custodia
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Deuda Aduanera Suspendida
                </p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">
                  {totalSuspendedDebtDebtSumFormat(totalSuspendedDebtSum)} €
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Arancel + IVA diferido sin devengo
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Aval Global Disponible (AEAT)
                </p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {totalSuspendedDebtDebtSumFormat(totalAvailableCreditSum)} €
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Landmark className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {guarantees.length} avales bancarios activos
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Instalaciones Autorizadas
                </p>
                <h3 className="text-2xl font-black text-blue-400 mt-1">
                  {facilities.length} Recintos
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              DA, DDA, ADT & Zona Franca
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
          {(
            [
              {
                id: "LOTS_LEDGER",
                label: "Libro Oficial de Existencias & Lotes Aduaneros",
              },
              {
                id: "GUARANTEES_TAX",
                label: "Gestión de Avales & Liquidación Fiscal (4071 vs 3171)",
              },
              {
                id: "FACILITIES_HANDLING",
                label: "Instalaciones & Manipulaciones Usuales (Art. 220 CAU)",
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-lg shadow-amber-500/10"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Customs Inventory Lots & Official Stock Ledger */}
      {activeTab === "LOTS_LEDGER" && (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Lots List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Nº Lote, DVD, TARIC, Titular..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {["ALL", "7100", "7600", "ADT_STAY"].map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setActiveRegimeFilter(reg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeRegimeFilter === reg
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                    }`}
                  >
                    {reg === "ALL"
                      ? "Todos los Regímenes"
                      : reg === "7100"
                        ? "DA (7100)"
                        : reg === "7600"
                          ? "DDA (7600)"
                          : "ADT (90 días)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingLots ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
                </div>
              ) : lots.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron partidas aduaneras registradas.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeRegimeFilter + searchQuery}
                >
                  {lots.map((l) => {
                    const isSelected = selectedLot?.id === l.id;
                    return (
                      <motion.div
                        key={l.id}
                        variants={itemVariants}
                        onClick={() => setSelectedLot(l)}
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
                                {l.lotNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  l.status === "ACTIVE"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : l.status === "PARTIALLY_DISCHARGED"
                                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {l.customsRegimeCode === "7100"
                                  ? "DA 7100"
                                  : l.customsRegimeCode === "7600"
                                    ? "DDA 7600"
                                    : l.customsRegimeCode}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {l.ownerCompanyName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              TARIC: {l.taricCommodityCode} |{" "}
                              {l.currentPackageCount} bultos
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-amber-400">
                              {(l.totalSuspendedDebtEur || 0).toLocaleString(
                                "es-ES",
                              )}{" "}
                              €
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              Deuda Suspendida
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

          {/* Right Column: Detailed Lot & Ledger */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {currentLot ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {currentLot.status}
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {currentLot.lotNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <FileText size={12} className="text-amber-400" />
                      Documento Vinculación: {
                        currentLot.inclusionDvdNumber
                      }{" "}
                      (MRN: {currentLot.inclusionDuaMrn || "N/A"})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setStatusInput(currentLot.status || "ACTIVE");
                        setRemarksInput(currentLot.remarks || "");
                        setShowStatusModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                    >
                      <ShieldCheck size={14} className="text-amber-400" />
                      Estado Partida
                    </button>
                    <a
                      href={`/api/customs-warehouse/lots/${currentLot.id}/dvd-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Documento DVD (PDF)
                    </a>
                  </div>
                </div>

                {/* Body: Customs Financial & Goods Summary */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Financial Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Valor en Aduana
                      </span>
                      <p className="text-lg font-black text-white">
                        {(currentLot.customsValueEur || 0).toLocaleString(
                          "es-ES",
                        )}{" "}
                        €
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Arancel Suspendido ({currentLot.dutyTariffRatePercent}%)
                      </span>
                      <p className="text-lg font-bold text-amber-400">
                        {(
                          currentLot.suspendedDutyAmountEur || 0
                        ).toLocaleString("es-ES")}{" "}
                        €
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        IVA Suspendido ({currentLot.importVatRatePercent}%)
                      </span>
                      <p className="text-lg font-bold text-blue-400">
                        {(currentLot.suspendedVatAmountEur || 0).toLocaleString(
                          "es-ES",
                        )}{" "}
                        €
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Total Deuda en Custodia
                      </span>
                      <p className="text-lg font-black text-emerald-400">
                        {(currentLot.totalSuspendedDebtEur || 0).toLocaleString(
                          "es-ES",
                        )}{" "}
                        €
                      </p>
                    </div>
                  </div>

                  {/* Physical & Tariff Characteristics */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                    <span className="font-bold text-slate-300 block">
                      Identificación Arancelaria y Logística:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                      <div>
                        <p>
                          <strong className="text-slate-400">
                            Código TARIC:
                          </strong>{" "}
                          {currentLot.taricCommodityCode}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Descripción:
                          </strong>{" "}
                          {currentLot.goodsDescription}
                        </p>
                        <p>
                          <strong className="text-slate-400">Origen:</strong>{" "}
                          {currentLot.originCountryCode}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong className="text-slate-400">
                            Bultos en Custodia:
                          </strong>{" "}
                          {currentLot.currentPackageCount} /{" "}
                          {currentLot.initialPackageCount}
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Masa Neta / Bruta:
                          </strong>{" "}
                          {currentLot.currentNetMassKg} kg /{" "}
                          {currentLot.currentGrossMassKg} kg
                        </p>
                        <p>
                          <strong className="text-slate-400">
                            Ubicación Rack:
                          </strong>{" "}
                          {currentLot.warehouseLocationRack || "General"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stock Ledger Entries Table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden space-y-1">
                    <div className="p-3 bg-slate-900/90 border-b border-white/10 flex justify-between items-center">
                      <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                        <FileCode2 size={14} className="text-amber-400" />
                        Asientos del Libro Oficial de Registro de Existencias
                        (AEAT)
                      </span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Asiento</th>
                          <th className="p-3">Tipo Movimiento</th>
                          <th className="p-3">Referencia Documental</th>
                          <th className="p-3 text-right">Variación Bultos</th>
                          <th className="p-3 text-right">Saldo Bultos</th>
                          <th className="p-3 text-right">Deuda Liberada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(currentLot.entries || []).map((entry: any) => (
                          <tr
                            key={entry.id}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="p-3 text-slate-300 font-bold">
                              #{entry.entrySequentialNumber}
                            </td>
                            <td className="p-3 text-slate-200">
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                {entry.movementType}
                              </span>
                            </td>
                            <td className="p-3 text-white font-medium">
                              {entry.documentReference}
                            </td>
                            <td
                              className={`p-3 text-right font-bold ${entry.packagesDelta < 0 ? "text-rose-400" : "text-emerald-400"}`}
                            >
                              {entry.packagesDelta > 0
                                ? `+${entry.packagesDelta}`
                                : entry.packagesDelta}
                            </td>
                            <td className="p-3 text-right text-slate-300">
                              {entry.packagesBalanceAfter}
                            </td>
                            <td className="p-3 text-right font-black text-amber-400">
                              {(
                                entry.releasedSuspendedDebtEur || 0
                              ).toLocaleString("es-ES")}{" "}
                              €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Remarks & Officer Sign-off */}
                  {currentLot.remarks && (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                      <span className="text-slate-400 font-bold block">
                        Observaciones de Inspección y Custodia:
                      </span>
                      <p className="text-slate-200 italic">
                        "{currentLot.remarks}"
                      </p>
                      <span className="text-[10px] text-amber-400 block pt-1">
                        Agente de Aduanas Responsable:{" "}
                        {currentLot.responsibleCustomsAgent}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <Building2 className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione una partida para examinar los asientos del Libro de
                Existencias y el estado de la deuda aduanera
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Bank Guarantees & Tax Settlement Simulator */}
      {activeTab === "GUARANTEES_TAX" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tax Settlement Simulator */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calculator size={18} className="text-amber-400" />
                Simulador de Salida & Despacho Fiscal
              </h3>
              <p className="text-xs text-slate-400">
                Calcula los tributos a liquidar y el importe liberado del aval
                bancario ante la AEAT según el régimen de salida.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Régimen Aduanero de Desvinculación
                  </label>
                  <select
                    value={simDischargeRegime}
                    onChange={(e: any) => setSimDischargeRegime(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="4071">
                      4071 — Despacho a Libre Práctica (Entrada a consumo)
                    </option>
                    <option value="3171">
                      3171 — Reexportación a Tercer País (Exención total)
                    </option>
                    <option value="7171">
                      7171 — Transferencia a otro Depósito Aduanero
                    </option>
                    <option value="5171">
                      5171 — Inclusión en Perfeccionamiento Activo
                    </option>
                    <option value="DOMESTIC_COMMERCE_DDA">
                      DDA — Entrega asimilada con exención IVA
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    Bultos a Desvincular
                  </label>
                  <Input
                    type="number"
                    value={simDischargedPkgs}
                    onChange={(e) =>
                      setSimDischargedPkgs(Number(e.target.value))
                    }
                  />
                </div>

                <button
                  onClick={handleRunDischargeCalc}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-md shadow-amber-600/20"
                >
                  Calcular Liquidación de Tributos
                </button>

                {dischargeResult && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Arancel Liquidado:</span>
                      <span className="font-bold text-white">
                        {dischargeResult.settledDutyAmountEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IVA Liquidado:</span>
                      <span className="font-bold text-white">
                        {dischargeResult.settledVatAmountEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/10">
                      <span className="text-slate-400 font-bold">
                        Total a Pagar en DUA:
                      </span>
                      <span className="font-black text-amber-400">
                        {dischargeResult.totalSettledTaxesEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Crédito Liberado en Aval:
                      </span>
                      <span className="font-black text-emerald-400">
                        {dischargeResult.releasedGuaranteeCreditEur.toLocaleString(
                          "es-ES",
                          { minimumFractionDigits: 2 },
                        )}{" "}
                        €
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/10">
                      {dischargeResult.taxExemptionRationale}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Comprehensive Guarantees List */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Landmark size={18} className="text-emerald-400" />
                Avales Globales Bancarios & Límite de Garantía AEAT
              </h3>
              <div className="space-y-4 overflow-y-auto max-h-[360px] pr-1">
                {guarantees.map((g) => {
                  const utilPercent = Math.round(
                    ((g.committedSuspendedDebtEur || 0) /
                      g.totalGuaranteeAmountEur) *
                      100,
                  );
                  return (
                    <div
                      key={g.id}
                      className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-sm">
                              {g.guaranteeReferenceNumber}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                              {g.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {g.guarantorFinancialInstitution} | Aduana:{" "}
                            {g.customsOfficeCode}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-emerald-400">
                            {(g.availableCreditEur || 0).toLocaleString(
                              "es-ES",
                            )}{" "}
                            € Disp.
                          </span>
                          <p className="text-[10px] text-slate-400">
                            de{" "}
                            {g.totalGuaranteeAmountEur.toLocaleString("es-ES")}{" "}
                            €
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${utilPercent > 80 ? "bg-rose-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.min(100, utilPercent)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>
                          Comprometido en Deuda:{" "}
                          {(g.committedSuspendedDebtEur || 0).toLocaleString(
                            "es-ES",
                          )}{" "}
                          €
                        </span>
                        <span>Utilización: {utilPercent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Facilities & Usual Handlings Validator */}
      {activeTab === "FACILITIES_HANDLING" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usual Handling Validator */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-400" />
                Validador de Manipulaciones Usuales (Art. 220 CAU)
              </h3>
              <p className="text-xs text-slate-400">
                Audita si una operación de reacondicionamiento o conservación
                está permitida en Depósito Aduanero sin requerir autorización de
                Perfeccionamiento Activo (Anexo 71-03).
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Tipo de Manipulación Solicitada
                  </label>
                  <select
                    value={selectedHandlingType}
                    onChange={(e: any) =>
                      setSelectedHandlingType(e.target.value)
                    }
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="LABELING_MARKING">
                      Etiquetado, precintado y marcado CE (Pto. 11)
                    </option>
                    <option value="REPACKING_SORTING">
                      Reenvasado, clasificación y paletizado (Pto. 3)
                    </option>
                    <option value="PRESERVATION_CLEANING">
                      Conservación, limpieza y tratamiento anti-polvo (Pto. 1)
                    </option>
                    <option value="TESTING_SAMPLING">
                      Toma de muestras y ensayos de calidad (Pto. 8)
                    </option>
                    <option value="VENTILATION_DRYING">
                      Ventilación y secado higrométrico
                    </option>
                    <option value="ALTERATION_MANUFACTURING">
                      Transformación industrial / Fabricación (Prohibido en DA)
                    </option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2">
                    {selectedHandlingType !== "ALTERATION_MANUFACTURING" ? (
                      <>
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="font-bold text-emerald-400 text-xs">
                          MANIPULACIÓN USUAL AUTORIZADA (ART. 220 CAU)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} className="text-rose-400" />
                        <span className="font-bold text-rose-400 text-xs">
                          NO AUTORIZADO EN DEPÓSITO ADUANERO ORDINARIO
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    {selectedHandlingType !== "ALTERATION_MANUFACTURING"
                      ? "La operación no altera la clasificación arancelaria ni el valor de la mercancía. Se puede ejecutar con asiento previo en el Libro de Existencias."
                      : "Esta operación implica una transformación sustancial de la partida arancelaria. Requiere autorización expresa de Perfeccionamiento Activo (Régimen 5100)."}
                  </p>
                </div>
              </div>
            </div>

            {/* Customs Facilities Catalog */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Building2 size={18} className="text-purple-400" />
                Red de Instalaciones Aduaneras Autorizadas ({facilities.length})
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
                {facilities.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-white">{f.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300">
                        {f.facilityType}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      Aut: {f.customsAuthorityAuthorizationRef} | {f.city}
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>
                        Capacidad: {f.totalPalletCapacity.toLocaleString()}{" "}
                        pallets ({f.totalVolumeM3} m3)
                      </span>
                      <span>
                        {f.maxStayDaysLimit
                          ? `Límite: ${f.maxStayDaysLimit} días`
                          : "Estancia Ilimitada"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-400" />
                  Actualización de Estado de la Partida Aduanera
                </h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Estado del Lote
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e: any) => setStatusInput(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ACTIVE">
                      ACTIVE (Vinculada en Custodia Completa)
                    </option>
                    <option value="PARTIALLY_DISCHARGED">
                      PARTIALLY_DISCHARGED (Desvinculación Parcial Realizada)
                    </option>
                    <option value="CLOSED_DISCHARGED">
                      CLOSED_DISCHARGED (Lote Totalmente Cancelado / Salida)
                    </option>
                    <option value="EXPIRED_ALERT">
                      EXPIRED_ALERT (Alerta de Plazo ADT Excedido)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Observaciones de Inspección
                  </label>
                  <textarea
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="Detalles sobre el control físico, recuento de bultos o actas de desvinculación..."
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveStatus}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Guardar Estado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function totalSuspendedDebtDebtSumFormat(val: number): string {
  return val.toLocaleString("es-ES", { minimumFractionDigits: 2 });
}
