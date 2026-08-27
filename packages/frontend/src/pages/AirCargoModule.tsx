import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Plane,
  Layers,
  FileText,
  FileCode,
  Download,
  Search,
  Flame,
  Calculator,
  ChevronDown,
  ChevronRight,
  Scale,
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

export default function AirCargoModule() {
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "MAWB" | "HAWB" | "DIRECT"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAwb, setSelectedAwb] = useState<any>(null);
  const [expandedMawbs, setExpandedMawbs] = useState<Record<string, boolean>>(
    {},
  );

  // Simulator & New AWB Modal State
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simOrigin, setSimOrigin] = useState("MAD");
  const [simDestination, setSimDestination] = useState("JFK");
  const [simPieces, setSimPieces] = useState([
    { lengthCm: 120, widthCm: 80, heightCm: 100, quantity: 2 },
  ]);
  const [simActualWeight, setSimActualWeight] = useState(250);
  const [simGoods, setSimGoods] = useState(
    "Pharmaceutical reagents & test equipment",
  );
  const [simUnNumber, setSimUnNumber] = useState("");
  const [simTempControlled, setSimTempControlled] = useState(true);
  const [simTempRange, setSimTempRange] = useState("+2C to +8C");
  const [simRatingResult, setSimRatingResult] = useState<any>(null);
  const [simDgrResult, setSimDgrResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch AWBs
  const { data: airwayBills = [], isLoading } = useApiQuery<any[]>(
    ["airway-bills", activeFilter, searchQuery],
    `/air-cargo/awb?type=${activeFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Auto-select first AWB
  React.useEffect(() => {
    if (airwayBills.length > 0 && !selectedAwb) {
      setSelectedAwb(airwayBills[0]);
    }
  }, [airwayBills, selectedAwb]);

  const toggleMawbExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMawbs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

      // 1. Rating calculation
      const rateRes = await fetch("/api/air-cargo/calculate-rating", {
        method: "POST",
        headers,
        body: JSON.stringify({
          originAirport: simOrigin,
          destinationAirport: simDestination,
          pieces: simPieces,
          actualGrossWeightKg: Number(simActualWeight),
        }),
      });
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        setSimRatingResult(rateData);
      }

      // 2. DGR Compliance Screening
      const dgrRes = await fetch("/api/air-cargo/screen-dgr", {
        method: "POST",
        headers,
        body: JSON.stringify({
          natureOfGoods: simGoods,
          unNumber: simUnNumber || undefined,
          grossWeightKg: Number(simActualWeight),
          isTempControlled: simTempControlled,
          tempRange: simTempRange,
        }),
      });
      if (dgrRes.ok) {
        const dgrData = await dgrRes.json();
        setSimDgrResult(dgrData);
      }
    } catch (err) {
      console.error("Simulator error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  // KPI Calculations
  const totalAwbs = airwayBills.reduce(
    (acc, m) => acc + 1 + (m.consolidatedHawbs?.length || 0),
    0,
  );
  const totalMawbs = airwayBills.filter((a) => a.type === "MAWB").length;
  const totalChargeableKg = airwayBills.reduce(
    (acc, a) => acc + (a.chargeableWeightKg || 0),
    0,
  );
  const dgrSpecialCount = airwayBills.filter(
    (a) =>
      a.specialHandlingCodes &&
      a.specialHandlingCodes.some((shc: string) =>
        ["ELI", "ELM", "COL", "ICE", "CAO", "VAL", "PER"].includes(shc),
      ),
  ).length;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-indigo-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
                <Plane className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                IATA e-Freight & Air Cargo (e-AWB)
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  IATA Res 600a / 672
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Gestión determinista de Air Waybills (MAWB/HAWB), cálculo
              volumétrico (1:6000), auditoría DGR/TCR y mensajería oficial
              Cargo-XML / Cargo-IMP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowSimulatorModal(true);
                if (!simRatingResult) calculateSimulator();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-lg shadow-sky-600/25 hover:shadow-sky-600/40 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Simulador Volumétrico y Tarificación
            </button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Air Waybills
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalAwbs}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">MAWB + HAWB Activas</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Consolidaciones Master
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalMawbs}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Vuelos con Manifiesto e-AWB
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tonelaje Tarifable
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {(totalChargeableKg / 1000).toFixed(2)} Tn
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {totalChargeableKg.toFixed(1)} kg liquidables
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Carga Especial / DGR
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {dgrSpecialCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Cold Chain, Litio y DGR
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Pane */}
      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Airway Bills & Consolidation Tree */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
          <div className="p-4 border-b border-white/10 space-y-3">
            <div>
              <Input
                type="text"
                placeholder="Buscar AWB, Aerolínea, Ruta, Mercancía..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(["ALL", "MAWB", "DIRECT", "HAWB"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    activeFilter === filter
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                      : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {filter === "ALL"
                    ? "Todos"
                    : filter === "MAWB"
                      ? "Consolidaciones (MAWB)"
                      : filter === "DIRECT"
                        ? "Directo AWB"
                        : "House (HAWB)"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
              </div>
            ) : airwayBills.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No se encontraron Air Waybills.
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
                key={activeFilter + searchQuery}
              >
                {airwayBills.map((awb) => {
                  const isSelected = selectedAwb?.id === awb.id;
                  const isExpanded = !!expandedMawbs[awb.id];
                  const hasHawbs =
                    awb.consolidatedHawbs && awb.consolidatedHawbs.length > 0;

                  return (
                    <motion.div
                      key={awb.id}
                      variants={itemVariants}
                      className="space-y-1"
                    >
                      <div
                        onClick={() => setSelectedAwb(awb)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-white/10 border-white/20 shadow-lg"
                            : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-0.5">
                              <Plane className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-white text-sm tracking-wide">
                                  {awb.awbNumber}
                                </p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-300">
                                  {awb.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mb-1">
                                {awb.airlineName || "Airline"} |{" "}
                                {awb.flightNumber || "Flight"}
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-sky-300">
                                  {awb.originAirport} ✈ {awb.destinationAirport}
                                </span>
                                <span className="text-slate-500">•</span>
                                <span className="text-slate-400">
                                  {awb.chargeableWeightKg} kg chrg
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-white">
                              {awb.freightCharge?.toFixed(2)}{" "}
                              {awb.currency || "EUR"}
                            </span>
                            {hasHawbs && (
                              <button
                                onClick={(e) => toggleMawbExpand(awb.id, e)}
                                className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={12} />
                                ) : (
                                  <ChevronRight size={12} />
                                )}
                                {awb.consolidatedHawbs.length} HAWB
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Special Handling Badges */}
                        {awb.specialHandlingCodes &&
                          awb.specialHandlingCodes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-white/5">
                              {awb.specialHandlingCodes.map((shc: string) => (
                                <span
                                  key={shc}
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                    shc === "CAO"
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : shc === "COL" || shc === "PER"
                                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                        : shc === "ELI" || shc === "ELM"
                                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                          : "bg-white/10 text-slate-300"
                                  }`}
                                >
                                  {shc}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>

                      {/* Nested HAWB Consolidation Sub-List */}
                      <AnimatePresence>
                        {isExpanded && hasHawbs && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pl-6 space-y-1 overflow-hidden"
                          >
                            {awb.consolidatedHawbs.map((hawb: any) => (
                              <div
                                key={hawb.id}
                                onClick={() => setSelectedAwb(hawb)}
                                className={`p-2.5 rounded-xl border transition-colors cursor-pointer text-xs ${
                                  selectedAwb?.id === hawb.id
                                    ? "bg-sky-500/20 border-sky-500/40 text-white"
                                    : "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-bold">
                                    {hawb.awbNumber}
                                  </span>
                                  <span className="text-slate-400">
                                    {hawb.chargeableWeightKg} kg
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {hawb.natureOfGoods}
                                </p>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive 12-Box IATA AWB Inspector */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
          {selectedAwb ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Inspector Header */}
              <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      {selectedAwb.type}
                    </span>
                    <h2 className="text-xl font-black text-white tracking-wide">
                      {selectedAwb.awbNumber}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedAwb.airlineName || "IATA Airline"} |{" "}
                    {selectedAwb.flightNumber || "Flight"} (
                    {selectedAwb.originAirport} ✈{" "}
                    {selectedAwb.destinationAirport})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/air-cargo/awb/${selectedAwb.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    IATA AWB PDF
                  </a>
                  <a
                    href={`/api/air-cargo/awb/${selectedAwb.id}/cargo-xml`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCode size={14} />
                    Cargo-XML (XFWB)
                  </a>
                  <a
                    href={`/api/air-cargo/awb/${selectedAwb.id}/cargo-imp`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText size={14} />
                    Cargo-IMP (FWB)
                  </a>
                </div>
              </div>

              {/* 12-Box IATA Neutral AWB Grid Layout */}
              <div className="p-4 md:p-6 space-y-4">
                {/* Boxes 1, 2, 3: Shipper, Consignee, Issuing Agent */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Box 1: Shipper */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-sky-400 uppercase">
                      Casilla 1 - Shipper / Expedidor
                    </span>
                    <p className="text-sm font-bold text-white">
                      {selectedAwb.shipperData?.name || "N/A"}
                    </p>
                    <p className="text-xs text-slate-300">
                      {selectedAwb.shipperData?.address || "N/A"}
                    </p>
                    <p className="text-xs text-slate-400">
                      País: {selectedAwb.shipperData?.country || "ES"} | Tel:{" "}
                      {selectedAwb.shipperData?.contact || "N/A"}
                    </p>
                  </div>

                  {/* Box 2: Consignee */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-sky-400 uppercase">
                      Casilla 2 - Consignee / Destinatario
                    </span>
                    <p className="text-sm font-bold text-white">
                      {selectedAwb.consigneeData?.name || "N/A"}
                    </p>
                    <p className="text-xs text-slate-300">
                      {selectedAwb.consigneeData?.address || "N/A"}
                    </p>
                    <p className="text-xs text-slate-400">
                      País: {selectedAwb.consigneeData?.country || "US"} |
                      Contacto: {selectedAwb.consigneeData?.contact || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Boxes 3, 5: Agent & Routing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      Casilla 3 & 4 - Issuing Carrier's Agent
                    </span>
                    <p className="text-sm font-bold text-white">
                      {selectedAwb.issuingAgentData?.name ||
                        "ATLAS AIR CARGO FORWARDING"}
                    </p>
                    <p className="text-xs text-slate-400">
                      IATA Code:{" "}
                      {selectedAwb.issuingAgentData?.iataCode ||
                        "78-4-7291/0014"}{" "}
                      | CASS:{" "}
                      {selectedAwb.issuingAgentData?.cassAddress ||
                        "ES-CASS-8819"}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      Casilla 5 & 6 - Departure, Destination & Flight
                    </span>
                    <p className="text-sm font-bold text-sky-300">
                      {selectedAwb.originAirport} ➔{" "}
                      {selectedAwb.destinationAirport}
                    </p>
                    <p className="text-xs text-slate-400">
                      Vuelo: {selectedAwb.flightNumber || "IB6251"} | Moneda:{" "}
                      {selectedAwb.currency || "EUR"} (Prepaid)
                    </p>
                  </div>
                </div>

                {/* Box 8: Special Handling & Instructions */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                    Casilla 8 - Handling Information & Special Handling Codes
                    (SHC)
                  </span>
                  <p className="text-xs text-white font-medium bg-slate-900/60 p-3 rounded-xl border border-white/5">
                    {selectedAwb.handlingInfo ||
                      "GENERAL CARGO - HANDLE WITH CARE"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedAwb.specialHandlingCodes || ["GEN"]).map(
                      (shc: string) => (
                        <span
                          key={shc}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        >
                          {shc}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {/* Box 9: Standard Rating Table */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                    Casilla 9 - Liquidación de Flete y Tarificación Aérea
                    (Rating Table)
                  </span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="py-2 px-3 font-semibold">Bultos</th>
                          <th className="py-2 px-3 font-semibold">
                            Peso Bruto (kg)
                          </th>
                          <th className="py-2 px-3 font-semibold">Clase</th>
                          <th className="py-2 px-3 font-semibold">
                            Volumen (m³)
                          </th>
                          <th className="py-2 px-3 font-semibold">
                            Peso Tarifable (kg)
                          </th>
                          <th className="py-2 px-3 font-semibold">
                            Tarifa / kg
                          </th>
                          <th className="py-2 px-3 font-semibold">
                            Flete Base
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white">
                        <tr>
                          <td className="py-3 px-3 font-bold">
                            {selectedAwb.pieces}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {selectedAwb.grossWeightKg?.toFixed(1)}
                          </td>
                          <td className="py-3 px-3">
                            {selectedAwb.rateClass || "Q"}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {selectedAwb.volumeCbm?.toFixed(3)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-sky-300">
                            {selectedAwb.chargeableWeightKg?.toFixed(1)}
                          </td>
                          <td className="py-3 px-3 font-mono">
                            {selectedAwb.ratePerKg?.toFixed(2)}{" "}
                            {selectedAwb.currency || "EUR"}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-400">
                            {selectedAwb.freightCharge?.toFixed(2)}{" "}
                            {selectedAwb.currency || "EUR"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Box 10 & 11: Surcharges & Total Liquidation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Surcharges Breakdown */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      Casilla 10 - Recargos IATA Due Carrier
                    </span>
                    <div className="space-y-1.5 text-xs">
                      {(selectedAwb.otherCharges || []).map(
                        (oc: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-slate-300"
                          >
                            <span>
                              <strong className="text-white">{oc.code}</strong>{" "}
                              - {oc.name || oc.code}
                            </span>
                            <span className="font-mono text-white">
                              {Number(oc.amount).toFixed(2)}{" "}
                              {selectedAwb.currency || "EUR"}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Total Prepaid */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-900/30 to-blue-900/30 border border-sky-500/30 space-y-2">
                    <span className="text-[10px] font-black tracking-wider text-sky-300 uppercase">
                      Casilla 11 - Total Liquidación (Total Prepaid)
                    </span>
                    <div className="flex justify-between items-baseline pt-2">
                      <span className="text-sm font-semibold text-slate-300">
                        Total Flete + Recargos:
                      </span>
                      <span className="text-2xl font-black text-white">
                        {(
                          selectedAwb.totalPrepaid ||
                          selectedAwb.freightCharge ||
                          0
                        ).toFixed(2)}{" "}
                        {selectedAwb.currency || "EUR"}
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-300/80">
                      Certificación Electrónica IATA e-AWB Res. 672
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              <Plane className="w-12 h-12 mb-2 stroke-1 opacity-40" />
              Seleccione un Air Waybill para inspeccionar la liquidación e-AWB
            </div>
          )}
        </div>
      </div>

      {/* Simulator Modal */}
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
                      Simulador Volumétrico y Tarificación Aérea IATA
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cálculo de peso tarifable (1:6000), recargos MYC/SCC y
                      screening DGR
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

              {/* Form Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Origen (IATA)
                  </label>
                  <Input
                    type="text"
                    value={simOrigin}
                    onChange={(e) => setSimOrigin(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Destino (IATA)
                  </label>
                  <Input
                    type="text"
                    value={simDestination}
                    onChange={(e) =>
                      setSimDestination(e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>

              {/* Goods & Cold Chain Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Descripción de Mercancía
                  </label>
                  <Input
                    type="text"
                    value={simGoods}
                    onChange={(e) => setSimGoods(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Rango Temperatura TCR
                  </label>
                  <Input
                    type="text"
                    value={simTempRange}
                    onChange={(e) => setSimTempRange(e.target.value)}
                  />
                </div>
              </div>

              {/* Piece Dimensions */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 block">
                  Dimensiones de Bultos (cm) y Peso Real
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500">
                      Largo (cm)
                    </span>
                    <Input
                      type="number"
                      value={simPieces[0].lengthCm}
                      onChange={(e) =>
                        setSimPieces([
                          { ...simPieces[0], lengthCm: Number(e.target.value) },
                        ])
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">
                      Ancho (cm)
                    </span>
                    <Input
                      type="number"
                      value={simPieces[0].widthCm}
                      onChange={(e) =>
                        setSimPieces([
                          { ...simPieces[0], widthCm: Number(e.target.value) },
                        ])
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">
                      Alto (cm)
                    </span>
                    <Input
                      type="number"
                      value={simPieces[0].heightCm}
                      onChange={(e) =>
                        setSimPieces([
                          { ...simPieces[0], heightCm: Number(e.target.value) },
                        ])
                      }
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Cantidad</span>
                    <Input
                      type="number"
                      value={simPieces[0].quantity}
                      onChange={(e) =>
                        setSimPieces([
                          { ...simPieces[0], quantity: Number(e.target.value) },
                        ])
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Peso Bruto Real Total (kg)
                    </label>
                    <Input
                      type="number"
                      value={simActualWeight}
                      onChange={(e) =>
                        setSimActualWeight(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      Número ONU (DGR si aplica)
                    </label>
                    <Input
                      type="text"
                      placeholder="Ej: UN3480, UN1845"
                      value={simUnNumber}
                      onChange={(e) =>
                        setSimUnNumber(e.target.value.toUpperCase())
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="simTempCheck"
                    checked={simTempControlled}
                    onChange={(e) => setSimTempControlled(e.target.checked)}
                    className="rounded border-white/20 bg-slate-950 text-sky-500 focus:ring-sky-400"
                  />
                  <label
                    htmlFor="simTempCheck"
                    className="text-xs text-slate-300 font-medium"
                  >
                    Requiere Cadena de Frío / Temperatura Controlada (TCR)
                  </label>
                </div>
              </div>

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
                    Calcular Liquidación Aérea IATA
                  </>
                )}
              </button>

              {/* Calculation Results */}
              {simRatingResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Volumen Total:</span>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {simRatingResult.totalVolumeCbm} m³
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Peso Volumétrico:</span>
                      <p className="text-sm font-bold text-sky-400 mt-0.5">
                        {simRatingResult.volumetricWeightKg} kg
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Peso Tarifable:</span>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">
                        {simRatingResult.chargeableWeightKg} kg
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Liquidación:</span>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {simRatingResult.totalFreightPayable.toFixed(2)} €
                      </p>
                    </div>
                  </div>

                  {simDgrResult && (
                    <div className="pt-2 border-t border-white/10 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">
                          Restricción Aérea:
                        </span>
                        <span className="font-bold text-sky-300">
                          {simDgrResult.aircraftRestriction}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">
                          Códigos SHC Asignados:
                        </span>
                        <span className="font-bold text-emerald-300">
                          {simDgrResult.specialHandlingCodes.join(", ")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
