import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  FileCheck,
  Scale,
  Shield,
  Download,
  Search,
  Calculator,
  Building,
  Calendar,
  Layers,
  FileSignature,
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

export default function IncotermsContractsModule() {
  const [activeTab, setActiveTab] = useState<"CONTRACTS" | "MATRIX">(
    "CONTRACTS",
  );
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Simulator Modal State
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simIncoterm, setSimIncoterm] = useState("CIP");
  const [simMode, setSimMode] = useState("AIR");
  const [simContainerized, setSimContainerized] = useState(false);
  const [simGoodsValue, setSimGoodsValue] = useState(150000);
  const [simFreight, setSimFreight] = useState(3800);
  const [simInsurance, setSimInsurance] = useState(338);
  const [simPreCarriage, setSimPreCarriage] = useState(450);
  const [simExportCosts, setSimExportCosts] = useState(120);
  const [simImportDuty, setSimImportDuty] = useState(0);
  const [simImportVat, setSimImportVat] = useState(0);
  const [simDestTransport, setSimDestTransport] = useState(0);
  const [simModeResult, setSimModeResult] = useState<any>(null);
  const [simInsResult, setSimInsResult] = useState<any>(null);
  const [simCustomsResult, setSimCustomsResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch Incoterms Rules
  const { data: rulesData } = useApiQuery<any>(
    ["incoterm-rules"],
    "/incoterms/rules",
  );
  const incotermRules = rulesData?.rules || [];

  // Fetch Commercial Contracts
  const { data: contracts = [], isLoading } = useApiQuery<any[]>(
    ["commercial-contracts", activeFilter, searchQuery],
    `/incoterms/contracts?incoterm=${activeFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Auto-select first contract
  React.useEffect(() => {
    if (contracts.length > 0 && !selectedContract) {
      setSelectedContract(contracts[0]);
    }
  }, [contracts, selectedContract]);

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

  const calculateSimulator = async () => {
    try {
      setIsCalculating(true);
      const headers = getAuthHeaders();

      // 1. Mode validation
      const modeRes = await fetch("/api/incoterms/validate-mode", {
        method: "POST",
        headers,
        body: JSON.stringify({
          incotermCode: simIncoterm,
          transportMode: simMode,
          isContainerized: simContainerized,
        }),
      });
      if (modeRes.ok) {
        const modeData = await modeRes.json();
        setSimModeResult(modeData.validation);
      }

      // 2. Insurance calculation
      const insRes = await fetch("/api/incoterms/calculate-insurance", {
        method: "POST",
        headers,
        body: JSON.stringify({
          incotermCode: simIncoterm,
          goodsValue: Number(simGoodsValue),
          freightCost: Number(simFreight),
          currency: "EUR",
        }),
      });
      if (insRes.ok) {
        const insData = await insRes.json();
        setSimInsResult(insData.insurance);
      }

      // 3. Customs Normalization
      const custRes = await fetch("/api/incoterms/normalize-customs-value", {
        method: "POST",
        headers,
        body: JSON.stringify({
          incotermCode: simIncoterm,
          invoiceValue: Number(simGoodsValue),
          preCarriageCost: Number(simPreCarriage),
          exportFormalitiesCost: Number(simExportCosts),
          internationalFreightCost: Number(simFreight),
          insuranceCost: Number(simInsurance),
          destinationHandlingCost: Number(simDestTransport),
          importDutyCost: Number(simImportDuty),
          importVatCost: Number(simImportVat),
        }),
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        setSimCustomsResult(custData.normalization);
      }
    } catch (err) {
      console.error("Incoterms simulator error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  // KPIs
  const totalContracts = contracts.length;
  const totalContractValue = contracts.reduce(
    (acc, c) => acc + (c.goodsValue || 0),
    0,
  );
  const multimodalCount = contracts.filter(
    (c) => c.transportMode !== "OCEAN",
  ).length;
  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[300px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                <FileSignature className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Incoterms® 2020 & Contratación Comercial
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  ICC Official Standard
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Matriz determinista de transferencia de costes y riesgos en 10
              etapas, validación de compatibilidad multimodal y contratos PDF
              certificados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab("CONTRACTS")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "CONTRACTS"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Contratos Comerciales
              </button>
              <button
                onClick={() => setActiveTab("MATRIX")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "MATRIX"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Matriz 11 Incoterms®
              </button>
            </div>

            <button
              onClick={() => {
                setShowSimulatorModal(true);
                if (!simCustomsResult) calculateSimulator();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Simulador & Validador
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contratos Comerciales
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalContracts}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {activeCount} activos bajo Incoterms 2020
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Valor Total Mercancías
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {(totalContractValue / 1000).toFixed(1)} k€
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {totalContractValue.toLocaleString()} € asegurados
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Operaciones Multimodal
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {multimodalCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Aéreo, Carretera y Contenedores
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Reglas Oficiales ICC
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  11 Reglas
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              7 Multimodal + 4 Marítimas
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "CONTRACTS" ? (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Contracts List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Contrato, Incoterm, Empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(["ALL", "CIP", "FOB", "DDP", "FCA", "EXW"] as const).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                        activeFilter === filter
                          ? "bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                          : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                      }`}
                    >
                      {filter === "ALL" ? "Todos" : filter}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron contratos comerciales.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeFilter + searchQuery}
                >
                  {contracts.map((contract) => {
                    const isSelected = selectedContract?.id === contract.id;
                    return (
                      <motion.div
                        key={contract.id}
                        variants={itemVariants}
                        onClick={() => setSelectedContract(contract)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-white/10 border-white/20 shadow-lg"
                            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-0.5">
                              <FileCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-white text-sm tracking-wide">
                                  {contract.contractNumber}
                                </p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  {contract.incotermCode}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                                {contract.title}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                                {contract.sellerData?.name} ➔{" "}
                                {contract.buyerData?.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-white">
                              {contract.goodsValue?.toLocaleString()}{" "}
                              {contract.currency}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              {contract.transportMode}
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

          {/* Right Column: Contract Inspector */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {selectedContract ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        {selectedContract.incotermCode} 2020
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {selectedContract.contractNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      {selectedContract.title}
                    </p>
                  </div>

                  <div>
                    <a
                      href={`/api/incoterms/contracts/${selectedContract.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/25 transition-all flex items-center gap-2"
                    >
                      <Download size={14} />
                      Descargar Contrato PDF (Bilingual)
                    </a>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Parties 2-Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[10px] font-black tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                        <Building size={12} /> Parte Vendedora (Seller /
                        Exporter)
                      </span>
                      <p className="text-sm font-bold text-white">
                        {selectedContract.sellerData?.name || "N/A"}
                      </p>
                      <p className="text-xs text-slate-300">
                        {selectedContract.sellerData?.address}
                      </p>
                      <p className="text-xs text-slate-400">
                        NIF: {selectedContract.sellerData?.taxId || "N/A"} |{" "}
                        {selectedContract.sellerData?.contact}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                      <span className="text-[10px] font-black tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                        <Building size={12} /> Parte Compradora (Buyer /
                        Importer)
                      </span>
                      <p className="text-sm font-bold text-white">
                        {selectedContract.buyerData?.name || "N/A"}
                      </p>
                      <p className="text-xs text-slate-300">
                        {selectedContract.buyerData?.address}
                      </p>
                      <p className="text-xs text-slate-400">
                        VAT/ID: {selectedContract.buyerData?.taxId || "N/A"} |{" "}
                        {selectedContract.buyerData?.contact}
                      </p>
                    </div>
                  </div>

                  {/* Delivery Clause Box */}
                  <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 space-y-2">
                    <span className="text-[10px] font-black tracking-wider text-sky-300 uppercase">
                      Cláusula Contractual de Entrega y Transmisión de Riesgos
                    </span>
                    <p className="text-sm font-bold text-white">
                      {selectedContract.namedPlace}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-xs">
                      <div>
                        <span className="text-slate-400">Modo:</span>
                        <p className="font-bold text-white">
                          {selectedContract.transportMode}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Transitario:</span>
                        <p className="font-bold text-white">
                          {selectedContract.forwarderData?.name ||
                            "Atlas Logistics SL"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Jurisdicción:</span>
                        <p className="font-bold text-white">
                          {selectedContract.disputeJurisdiction}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Ley Aplicable:</span>
                        <p className="font-bold text-white">
                          {selectedContract.governingLaw}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      Resumen Económico Contractual
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">
                          Valor Mercancías:
                        </span>
                        <p className="text-sm font-bold text-white">
                          {selectedContract.goodsValue?.toLocaleString()}{" "}
                          {selectedContract.currency}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Flete Estimado:</span>
                        <p className="text-sm font-bold text-sky-400">
                          {selectedContract.freightEstimatedCost?.toLocaleString()}{" "}
                          {selectedContract.currency}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Seguro Estimado:</span>
                        <p className="text-sm font-bold text-emerald-400">
                          {selectedContract.insuranceEstimatedCost?.toLocaleString()}{" "}
                          {selectedContract.currency}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          Arancel Estimado:
                        </span>
                        <p className="text-sm font-bold text-amber-400">
                          {selectedContract.customsEstimatedDuty?.toLocaleString()}{" "}
                          {selectedContract.currency}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Risk Timeline */}
                  {selectedContract.milestonesData &&
                    selectedContract.milestonesData.length > 0 && (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                          <Calendar size={12} /> Hitos de Operativa y
                          Transferencia de Riesgos
                        </span>
                        <div className="space-y-2">
                          {selectedContract.milestonesData.map(
                            (m: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      m.status === "COMPLETED"
                                        ? "bg-emerald-400"
                                        : m.status === "IN_PROGRESS"
                                          ? "bg-sky-400 animate-pulse"
                                          : "bg-slate-600"
                                    }`}
                                  />
                                  <div>
                                    <p className="font-bold text-white">
                                      {m.name}
                                    </p>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(m.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    m.status === "COMPLETED"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : m.status === "IN_PROGRESS"
                                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                        : "bg-white/10 text-slate-400"
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <FileSignature className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione un contrato para inspeccionar las cláusulas y
                obligaciones Incoterms® 2020
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: 11 Incoterms 10-Stage Responsibility Matrix */
        <div className="flex-1 px-4 md:px-8 pb-8 overflow-y-auto z-10 relative">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-lg font-black text-white">
                Matriz Oficial ICC Incoterms® 2020 (11 Reglas × 10 Etapas)
              </h2>
              <p className="text-xs text-slate-400">
                Distribución obligatoria de costes y riesgos entre Parte
                Vendedora (Azul) y Parte Compradora (Verde).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-3 px-3 font-semibold">Regla</th>
                    <th className="py-3 px-3 font-semibold">Categoría</th>
                    <th className="py-3 px-3 font-semibold">
                      Punto de Entrega (Riesgo)
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      Seguro Obligatorio
                    </th>
                    <th className="py-3 px-3 font-semibold">
                      Aduana Exp / Imp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {incotermRules.map((rule: any) => (
                    <tr
                      key={rule.code}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-lg font-black text-sm bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {rule.code}
                        </span>
                        <p className="text-[11px] text-slate-300 font-medium mt-1">
                          {rule.name}
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            rule.transportCategory === "ANY_MODE"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {rule.transportCategory === "ANY_MODE"
                            ? "Multimodal"
                            : "Marítimo"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 text-[11px] max-w-[280px]">
                        {rule.riskTransferPoint}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            rule.insuranceRequirement === "MANDATORY_CLAUSE_A"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : rule.insuranceRequirement ===
                                  "MANDATORY_CLAUSE_C"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {rule.insuranceRequirement === "MANDATORY_CLAUSE_A"
                            ? "Clause A (All Risks)"
                            : rule.insuranceRequirement === "MANDATORY_CLAUSE_C"
                              ? "Clause C (Min Cover)"
                              : "Opcional"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[11px] text-slate-300">
                        {rule.customsExportBy === "SELLER"
                          ? "Exp: Vendedor"
                          : "Exp: Comprador"}{" "}
                        /{" "}
                        {rule.customsImportBy === "SELLER"
                          ? "Imp: Vendedor"
                          : "Imp: Comprador"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Simulator & Validator Modal */}
      <AnimatePresence>
        {showSimulatorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Simulador y Validador Incoterms® 2020
                    </h3>
                    <p className="text-xs text-slate-400">
                      Normalización Aduanera DUA Box 46 / TARIC y validación de
                      compatibilidad multimodal
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSimulatorModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              {/* Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Regla Incoterms® 2020
                  </label>
                  <select
                    value={simIncoterm}
                    onChange={(e) => setSimIncoterm(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {[
                      "EXW",
                      "FCA",
                      "CPT",
                      "CIP",
                      "DAP",
                      "DPU",
                      "DDP",
                      "FAS",
                      "FOB",
                      "CFR",
                      "CIF",
                    ].map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Modo de Transporte
                  </label>
                  <select
                    value={simMode}
                    onChange={(e) => setSimMode(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="AIR">Aéreo (AIR)</option>
                    <option value="OCEAN">Marítimo (OCEAN)</option>
                    <option value="ROAD">Carretera (ROAD)</option>
                    <option value="RAIL">Ferrocarril (RAIL)</option>
                    <option value="MULTIMODAL">Multimodal (MULTIMODAL)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="simContainer"
                  checked={simContainerized}
                  onChange={(e) => setSimContainerized(e.target.checked)}
                  className="rounded border-white/20 bg-slate-950 text-sky-500 focus:ring-sky-400"
                />
                <label
                  htmlFor="simContainer"
                  className="text-xs text-slate-300 font-medium"
                >
                  Carga Contenedorizada (FCL/LCL)
                </label>
              </div>

              {/* Economic Inputs */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Valor Factura (€)
                  </label>
                  <Input
                    type="number"
                    value={simGoodsValue}
                    onChange={(e) => setSimGoodsValue(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Flete Principal (€)
                  </label>
                  <Input
                    type="number"
                    value={simFreight}
                    onChange={(e) => setSimFreight(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Seguro (€)
                  </label>
                  <Input
                    type="number"
                    value={simInsurance}
                    onChange={(e) => setSimInsurance(Number(e.target.value))}
                  />
                </div>
              </div>

              {simIncoterm === "EXW" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Transporte Interior Origen (€)
                    </label>
                    <Input
                      type="number"
                      value={simPreCarriage}
                      onChange={(e) =>
                        setSimPreCarriage(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Gastos Despacho Exportación (€)
                    </label>
                    <Input
                      type="number"
                      value={simExportCosts}
                      onChange={(e) =>
                        setSimExportCosts(Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              )}

              {simIncoterm === "DDP" && (
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Arancel Importación (€)
                    </label>
                    <Input
                      type="number"
                      value={simImportDuty}
                      onChange={(e) => setSimImportDuty(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      IVA Importación (€)
                    </label>
                    <Input
                      type="number"
                      value={simImportVat}
                      onChange={(e) => setSimImportVat(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Transporte en Destino (€)
                    </label>
                    <Input
                      type="number"
                      value={simDestTransport}
                      onChange={(e) =>
                        setSimDestTransport(Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              )}

              <button
                onClick={calculateSimulator}
                disabled={isCalculating}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isCalculating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Scale size={16} />
                    Validar Modo y Normalizar Valor en Aduana
                  </>
                )}
              </button>

              {/* Results */}
              {simModeResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    simModeResult.isValid
                      ? simModeResult.isOptimal
                        ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                        : "bg-amber-950/30 border-amber-500/30 text-amber-200"
                      : "bg-rose-950/30 border-rose-500/30 text-rose-200"
                  }`}
                >
                  <p className="font-bold">{simModeResult.explanation}</p>
                  {simModeResult.warnings.map((w: string, idx: number) => (
                    <p key={idx} className="text-[11px] opacity-90">
                      ⚠️ {w}
                    </p>
                  ))}
                </div>
              )}

              {simCustomsResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2 pb-2 border-b border-white/10">
                    <div>
                      <span className="text-slate-400">Valor Factura:</span>
                      <p className="text-sm font-bold text-white">
                        {simCustomsResult.invoiceValue.toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Ajustes (+ / -):</span>
                      <p className="text-sm font-bold text-sky-400">
                        + {simCustomsResult.totalAdditions.toFixed(2)} / -{" "}
                        {simCustomsResult.totalDeductions.toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Base DUA Box 46 (CIF):
                      </span>
                      <p className="text-sm font-bold text-emerald-400">
                        {simCustomsResult.customsValueCif.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {simCustomsResult.explanation}
                  </p>
                </div>
              )}

              {simInsResult && simInsResult.isMandatory && (
                <div className="bg-sky-950/30 p-3.5 rounded-2xl border border-sky-500/30 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sky-300">
                      Seguro Contractual Obligatorio:
                    </span>
                    <span className="font-bold text-white">
                      Mínimo Asegurado (110%):{" "}
                      {simInsResult.minimumInsuredValue.toFixed(2)} €
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {simInsResult.coverageDetails}
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
