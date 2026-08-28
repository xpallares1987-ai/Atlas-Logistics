import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Leaf,
  Factory,
  Download,
  Search,
  Calculator,
  ShieldCheck,
  Globe2,
  FileCode2,
  TrendingDown,
  Scale,
  DollarSign,
  Box,
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

export default function CbamModule() {
  const [activeTab, setActiveTab] = useState<
    "DECLARATIONS" | "CALCULATOR" | "FINANCE_ETS"
  >("DECLARATIONS");
  const [activePeriodFilter, setActivePeriodFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeclaration, setSelectedDeclaration] = useState<any>(null);

  // Emissions Simulator State
  const [calcNetWeight, setCalcNetWeight] = useState(1000.0);
  const [calcDirectFactor, setCalcDirectFactor] = useState(1.85);
  const [calcIndirectFactor, setCalcIndirectFactor] = useState(0.42);
  const [calcEuDefaultDirect, setCalcEuDefaultDirect] = useState(2.15);
  const [calcEuDefaultIndirect, setCalcEuDefaultIndirect] = useState(0.55);
  const [emissionsResult, setEmissionsResult] = useState<any>(null);

  // Financial ETS Simulator State
  const [simEmissionsTotal, setSimEmissionsTotal] = useState(5000.0);
  const [simEtsPrice, setSimEtsPrice] = useState(85.5);
  const [simForeignPricePaid, setSimForeignPricePaid] = useState(75000.0);
  const [liabilityResult, setLiabilityResult] = useState<any>(null);

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] = useState<
    "VALIDATED" | "SUBMITTED_REGISTRY" | "AMENDED" | "DRAFT"
  >("SUBMITTED_REGISTRY");
  const [remarksInput, setRemarksInput] = useState("");

  // Fetch Declarations
  const {
    data: declarations = [],
    isLoading: loadingDeclarations,
    refetch: refetchDeclarations,
  } = useApiQuery<any[]>(
    ["cbam-declarations", activePeriodFilter, searchQuery],
    `/cbam/declarations?period=${activePeriodFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  // Fetch Goods Catalog
  const { data: catalog = [] } = useApiQuery<any[]>(
    ["cbam-catalog"],
    "/cbam/catalog",
  );

  // Fetch Verified Installations
  const { data: installations = [] } = useApiQuery<any[]>(
    ["cbam-installations"],
    "/cbam/installations",
  );

  // Fetch Selected Declaration Details
  const { data: declarationDetails } = useApiQuery<any>(
    ["cbam-declaration-details", selectedDeclaration?.id],
    selectedDeclaration?.id
      ? `/cbam/declarations/${selectedDeclaration.id}`
      : "",
  );

  // Auto-select first declaration
  React.useEffect(() => {
    if (declarations.length > 0 && !selectedDeclaration) {
      setSelectedDeclaration(declarations[0]);
    }
  }, [declarations, selectedDeclaration]);

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

  const handleRunEmissionsCalc = async () => {
    try {
      const res = await fetch("/api/cbam/calculate-emissions", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          netWeightTonnes: Number(calcNetWeight),
          directEmissionFactor: Number(calcDirectFactor),
          indirectEmissionFactor: Number(calcIndirectFactor),
          euDefaultDirectFactor: Number(calcEuDefaultDirect),
          euDefaultIndirectFactor: Number(calcEuDefaultIndirect),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmissionsResult(data.result);
      }
    } catch (err) {
      console.error("Emissions calculation error:", err);
    }
  };

  const handleRunLiabilityCalc = async () => {
    try {
      const res = await fetch("/api/cbam/calculate-liability", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          totalEmbeddedEmissionsTco2e: Number(simEmissionsTotal),
          euEtsBenchmarkPriceEur: Number(simEtsPrice),
          foreignCarbonPricePaidEur: Number(simForeignPricePaid),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiabilityResult(data.result);
      }
    } catch (err) {
      console.error("Liability calculation error:", err);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedDeclaration) return;
    try {
      const res = await fetch(
        `/api/cbam/declarations/${selectedDeclaration.id}/status`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            remarks:
              remarksInput ||
              "Estado actualizado conforme al Registro Transitorio de la Comisión Europea.",
          }),
        },
      );
      if (res.ok) {
        setShowStatusModal(false);
        refetchDeclarations();
      }
    } catch (err) {
      console.error("Error updating declaration status:", err);
    }
  };

  // KPIs
  const totalNetMassSum = declarations.reduce(
    (acc, d) => acc + (d.totalNetMassTonnes || 0),
    0,
  );
  const totalDirectEmissionsSum = declarations.reduce(
    (acc, d) => acc + (d.totalDirectEmissionsTco2e || 0),
    0,
  );
  const totalIndirectEmissionsSum = declarations.reduce(
    (acc, d) => acc + (d.totalIndirectEmissionsTco2e || 0),
    0,
  );
  const totalNetLiabilitySum = declarations.reduce(
    (acc, d) => acc + (d.netCarbonLiabilityEur || 0),
    0,
  );

  const currentDeclaration = declarationDetails || selectedDeclaration;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-teal-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Leaf className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Ajuste en Frontera por Carbono (CBAM)
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Reglamento (UE) 2023/956 & EU ETS
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Cálculo de emisiones integradas directas/indirectas, precursores
              complejos, deducción del precio del carbono en origen (Art. 9) e
              informes oficiales XML/PDF para la Comisión Europea.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab("CALCULATOR");
                if (!emissionsResult) handleRunEmissionsCalc();
                if (!liabilityResult) handleRunLiabilityCalc();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Simuladores de Emisiones
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Masa Neta Importada
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalNetMassSum.toLocaleString()} t
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Sectores regulados CBAM
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Emisiones Directas (Alc. 1)
                </p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">
                  {totalDirectEmissionsSum.toLocaleString()} tCO2e
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Factory className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Combustión y proceso químico
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Emisiones Indirectas (Alc. 2)
                </p>
                <h3 className="text-2xl font-black text-teal-400 mt-1">
                  {totalIndirectEmissionsSum.toLocaleString()} tCO2e
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Globe2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Electricidad y precursores
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Deuda Neta EU ETS
                </p>
                <h3 className="text-2xl font-black text-rose-400 mt-1">
                  {totalNetLiabilitySum.toLocaleString()} €
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Con deducciones Art. 9 aplicadas
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
          {(
            [
              {
                id: "DECLARATIONS",
                label: "Declaraciones Trimestrales & Registro CBAM",
              },
              {
                id: "CALCULATOR",
                label: "Calculadora de Emisiones & Precursores",
              },
              {
                id: "FINANCE_ETS",
                label:
                  "Auditoría Financiera EU ETS & Deducciones Origen (Art. 9)",
              },
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

      {/* Tab 1: Quarterly Declarations & Registry */}
      {activeTab === "DECLARATIONS" && (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Declarations List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Nº Declaración, Importador, EORI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {["ALL", "2026-Q3", "2026-Q2", "2026-Q1"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setActivePeriodFilter(period)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activePeriodFilter === period
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                    }`}
                  >
                    {period === "ALL" ? "Todos los Periodos" : period}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingDeclarations ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                </div>
              ) : declarations.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron declaraciones CBAM registradas.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activePeriodFilter + searchQuery}
                >
                  {declarations.map((d) => {
                    const isSelected = selectedDeclaration?.id === d.id;
                    return (
                      <motion.div
                        key={d.id}
                        variants={itemVariants}
                        onClick={() => setSelectedDeclaration(d)}
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
                                {d.declarationNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  d.status === "SUBMITTED_REGISTRY"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : d.status === "VALIDATED"
                                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {d.status === "SUBMITTED_REGISTRY"
                                  ? "REGISTRADO UE"
                                  : d.status === "VALIDATED"
                                    ? "VALIDADO"
                                    : d.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {d.importerName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Periodo: {d.reportingPeriod} | Masa:{" "}
                              {d.totalNetMassTonnes?.toLocaleString()} t
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-emerald-400">
                              {d.totalEmbeddedEmissionsTco2e?.toLocaleString()}{" "}
                              tCO2e
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              Deuda: {d.netCarbonLiabilityEur?.toLocaleString()}{" "}
                              €
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

          {/* Right Column: Detailed Lines & Actions */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {currentDeclaration ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {currentDeclaration.reportingPeriod}
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {currentDeclaration.declarationNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <Box size={12} className="text-emerald-400" />
                      Importador: {currentDeclaration.importerName} (
                      {currentDeclaration.importerVat})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setStatusInput(
                          currentDeclaration.status || "VALIDATED",
                        );
                        setRemarksInput(currentDeclaration.remarks || "");
                        setShowStatusModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                    >
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Validar Registro
                    </button>
                    <a
                      href={`/api/cbam/declarations/${currentDeclaration.id}/xml`}
                      download={`CBAM_${currentDeclaration.declarationNumber}.xml`}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <FileCode2 size={14} />
                      XML Registro UE
                    </a>
                    <a
                      href={`/api/cbam/declarations/${currentDeclaration.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Certificado (PDF)
                    </a>
                  </div>
                </div>

                {/* Body: Emissions Overview & Itemized Customs Lines */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Masa Neta Total
                      </span>
                      <p className="text-lg font-black text-white">
                        {currentDeclaration.totalNetMassTonnes?.toLocaleString()}{" "}
                        t
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Emisiones Directas
                      </span>
                      <p className="text-lg font-bold text-amber-400">
                        {currentDeclaration.totalDirectEmissionsTco2e?.toLocaleString()}{" "}
                        tCO2e
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Emisiones Indirectas
                      </span>
                      <p className="text-lg font-bold text-teal-400">
                        {currentDeclaration.totalIndirectEmissionsTco2e?.toLocaleString()}{" "}
                        tCO2e
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Deuda Neta Liquidable
                      </span>
                      <p className="text-lg font-black text-emerald-400">
                        {currentDeclaration.netCarbonLiabilityEur?.toLocaleString()}{" "}
                        €
                      </p>
                    </div>
                  </div>

                  {/* Itemized Goods Table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Código CN / DUA</th>
                          <th className="p-3">Descripción Mercancía</th>
                          <th className="p-3 text-center">Origen</th>
                          <th className="p-3 text-right">Masa (t)</th>
                          <th className="p-3 text-right">Emisiones (tCO2e)</th>
                          <th className="p-3 text-right">Crédito Origen</th>
                          <th className="p-3 text-right">Deuda Neta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(currentDeclaration.lines || []).map((line: any) => (
                          <tr
                            key={line.id}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="p-3 text-slate-300 font-medium">
                              <span className="font-bold text-white block">
                                {line.duaBox33HsCode}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {line.duaNumber || "N/A"}
                              </span>
                            </td>
                            <td className="p-3 text-slate-200">
                              {line.goodDescription}
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-white/10 font-bold text-xs">
                                {line.originCountry}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-white">
                              {line.netWeightTonnes?.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-black text-emerald-400">
                              {line.totalLineEmissionsTco2e?.toLocaleString()}
                            </td>
                            <td className="p-3 text-right text-slate-400">
                              {line.effectiveForeignPricePaidEur?.toLocaleString()}{" "}
                              €
                            </td>
                            <td className="p-3 text-right font-black text-white">
                              {line.lineNetLiabilityEur?.toLocaleString()} €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Remarks & Legal Notice */}
                  {currentDeclaration.remarks && (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                      <span className="text-slate-400 font-bold block">
                        Observaciones de Auditoría & Conformidad Oficial:
                      </span>
                      <p className="text-slate-200 italic">
                        "{currentDeclaration.remarks}"
                      </p>
                      <span className="text-[10px] text-emerald-400 block pt-1">
                        Declarante Responsable:{" "}
                        {currentDeclaration.responsibleDeclarant ||
                          "Carlos Vega (Responsable Técnico CBAM)"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <Leaf className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione una declaración trimestral para inspeccionar las
                líneas de importación CBAM
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Emissions & Precursors Simulator */}
      {activeTab === "CALCULATOR" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulator 1: Direct & Indirect Emissions */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Factory size={18} className="text-emerald-400" />
                Simulador de Emisiones Integradas (SE)
              </h3>
              <p className="text-xs text-slate-400">
                Calcula las emisiones específicas directas (Alcance 1) e
                indirectas (Alcance 2) para cualquier lote de importación.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Masa Neta Importada (t)
                  </label>
                  <Input
                    type="number"
                    value={calcNetWeight}
                    onChange={(e) => setCalcNetWeight(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Factor Directo (tCO2e/t)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={calcDirectFactor}
                      onChange={(e) =>
                        setCalcDirectFactor(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Factor Indirecto (tCO2e/t)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={calcIndirectFactor}
                      onChange={(e) =>
                        setCalcIndirectFactor(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Default Directo UE
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={calcEuDefaultDirect}
                      onChange={(e) =>
                        setCalcEuDefaultDirect(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Default Indirecto UE
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={calcEuDefaultIndirect}
                      onChange={(e) =>
                        setCalcEuDefaultIndirect(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunEmissionsCalc}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  Calcular Emisiones Integradas
                </button>

                {emissionsResult && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Total Emisiones Integradas:
                      </span>
                      <span className="font-black text-emerald-400 text-sm">
                        {emissionsResult.totalEmbeddedEmissionsTco2e} tCO2e
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Factor Específico Total:
                      </span>
                      <span className="font-bold text-white">
                        {emissionsResult.totalSpecificFactor} tCO2e / t
                      </span>
                    </div>
                    {emissionsResult.comparisonWithEuDefaults && (
                      <div className="pt-1 border-t border-white/10 space-y-1">
                        <div className="flex justify-between text-emerald-400">
                          <span>Ahorro vs. Valores por Defecto UE:</span>
                          <span className="font-black">
                            {
                              emissionsResult.comparisonWithEuDefaults
                                .percentageSavingsVsDefault
                            }
                            % (
                            {Math.abs(
                              emissionsResult.comparisonWithEuDefaults
                                .deltaTco2e,
                            )}{" "}
                            tCO2e)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Catalog Reference Box */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Scale size={18} className="text-teal-400" />
                Catálogo de Bienes Regulados CBAM
              </h3>
              <p className="text-xs text-slate-400">
                Factores por defecto de la Comisión Europea para los 6 sectores
                bajo el Reglamento (UE) 2023/956.
              </p>

              <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
                {catalog.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-white">
                        {cat.cnCode}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        {cat.sector}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] truncate">
                      {cat.description}
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>
                        Directo: {cat.defaultDirectEmissionFactor} t/t
                      </span>
                      <span>
                        Indirecto: {cat.defaultIndirectEmissionFactor} t/t
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Installations Reference Box */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Globe2 size={18} className="text-blue-400" />
                Instalaciones Productoras Verificadas
              </h3>
              <p className="text-xs text-slate-400">
                Plantas industriales con certificación de emisiones auditada por
                verificadores acreditados en la UE.
              </p>

              <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
                {installations.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white truncate max-w-[180px]">
                        {inst.installationName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                        {inst.countryCode}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px]">
                      {inst.operatorName}
                    </p>
                    <p className="text-[10px] text-teal-400 truncate">
                      Verificador: {inst.verifierName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: EU ETS Financial Valuation & Article 9 Foreign Deductions */}
      {activeTab === "FINANCE_ETS" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Simulator */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-400" />
                Simulador de Deuda de Certificados CBAM & Deducción Art. 9
              </h3>
              <p className="text-xs text-slate-400">
                Calcula la liquidación neta monetaria tras acreditar precios de
                carbono satisfechos efectivamente en origen.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Total Emisiones Integradas (tCO2e)
                  </label>
                  <Input
                    type="number"
                    value={simEmissionsTotal}
                    onChange={(e) =>
                      setSimEmissionsTotal(Number(e.target.value))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Precio Cotización EU ETS (€/t)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={simEtsPrice}
                      onChange={(e) => setSimEtsPrice(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Precio Abonado en Origen (€)
                    </label>
                    <Input
                      type="number"
                      value={simForeignPricePaid}
                      onChange={(e) =>
                        setSimForeignPricePaid(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunLiabilityCalc}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
                >
                  Estimar Liquidación Neta CBAM
                </button>

                {liabilityResult && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Obligación Bruta EU ETS:
                      </span>
                      <span className="font-bold text-white">
                        {liabilityResult.grossCarbonLiabilityEur?.toLocaleString()}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Deducción Precio en Origen (Art. 9):
                      </span>
                      <span className="font-bold text-teal-400">
                        -
                        {liabilityResult.foreignCarbonPricePaidEur?.toLocaleString()}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/10">
                      <span className="text-slate-300 font-bold">
                        Deuda Neta Liquidable:
                      </span>
                      <span className="font-black text-emerald-400 text-base">
                        {liabilityResult.netCarbonLiabilityEur?.toLocaleString()}{" "}
                        €
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic pt-1">
                      {liabilityResult.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Regulatory Guidance Box */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <TrendingDown size={18} className="text-teal-400" />
                Marco Legal del Artículo 9 (Reglamento UE 2023/956)
              </h3>
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  El <strong>Artículo 9</strong> del Reglamento (UE) 2023/956
                  establece que el declarante autorizado puede solicitar una
                  reducción del número de certificados CBAM a entregar para
                  tener en cuenta el{" "}
                  <strong>precio del carbono efectivamente pagado</strong> en el
                  país de origen por las emisiones integradas declaradas.
                </p>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                  <span className="font-bold text-emerald-400 block">
                    Requisitos de Elegibilidad:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li>
                      El gravamen debe ser un precio legal de carbono (tasa o
                      derechos ETS en origen).
                    </li>
                    <li>
                      No debe haberse concedido ninguna devolución o
                      compensación a la exportación en origen.
                    </li>
                    <li>
                      La prueba debe ser certificada por una entidad auditora
                      independiente.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Validation Modal */}
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
                  <ShieldCheck size={18} className="text-emerald-400" />
                  Validación y Estado de Declaración CBAM
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
                    Estado de Tramitación
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e: any) => setStatusInput(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="SUBMITTED_REGISTRY">
                      SUBMITTED_REGISTRY (Presentada en el Registro Transitorio
                      de la UE)
                    </option>
                    <option value="VALIDATED">
                      VALIDATED (Auditada y Validada por Declarante Autorizado)
                    </option>
                    <option value="AMENDED">
                      AMENDED (Rectificada / Modificación de Datos de Emisiones)
                    </option>
                    <option value="DRAFT">
                      DRAFT (Borrador Interno en Preparación)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Observaciones de Auditoría
                  </label>
                  <textarea
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Detalles sobre certificados de instalación, verificación de datos y referencias aduaneras..."
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
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
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
