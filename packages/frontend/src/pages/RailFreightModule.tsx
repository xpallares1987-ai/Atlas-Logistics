import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  TrainTrack,
  Download,
  Search,
  Calculator,
  ShieldCheck,
  FileCode2,
  Scale,
  Gauge,
  Layers,
  ArrowRightLeft,
  Navigation,
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

export default function RailFreightModule() {
  const [activeTab, setActiveTab] = useState<
    "CONSIGNMENTS" | "TRAIN_CONSIST" | "AXLE_AUDIT"
  >("CONSIGNMENTS");
  const [activeCorridorFilter, setActiveCorridorFilter] =
    useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsignment, setSelectedConsignment] = useState<any>(null);

  // Train Simulator State
  const [simLocoWeight, setSimLocoWeight] = useState(123.0);
  const [simLocoBrake, setSimLocoBrake] = useState(110.0);
  const [simWagonCount, setSimWagonCount] = useState(18);
  const [simAvgWagonTare, setSimAvgWagonTare] = useState(28.5);
  const [simAvgWagonPayload, setSimAvgWagonPayload] = useState(32.0);
  const [simAvgWagonBrake, setSimAvgWagonBrake] = useState(80.0);
  const [trainPhysicsResult, setTrainPhysicsResult] = useState<any>(null);

  // Axle Load Simulator State
  const [calcWagonTare, setCalcWagonTare] = useState(28.5);
  const [calcPayload, setCalcPayload] = useState(60.0);
  const [calcAxles, setCalcAxles] = useState(6);
  const [calcLineCategory, setCalcLineCategory] = useState<
    "A" | "B" | "C" | "D"
  >("D");
  const [axleResult, setAxleResult] = useState<any>(null);

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusInput, setStatusInput] = useState<
    | "PLANNED"
    | "TRAIN_FORMED"
    | "IN_TRANSIT"
    | "GAUGE_TRANSFERRED"
    | "DELIVERED"
  >("IN_TRANSIT");
  const [remarksInput, setRemarksInput] = useState("");

  // Fetch Consignments
  const {
    data: consignments = [],
    isLoading: loadingConsignments,
    refetch: refetchConsignments,
  } = useApiQuery<any[]>(
    ["rail-consignments", activeCorridorFilter, searchQuery],
    `/rail/consignments?corridorId=${activeCorridorFilter}&q=${encodeURIComponent(
      searchQuery,
    )}`,
  );

  // Fetch Corridors
  const { data: corridors = [] } = useApiQuery<any[]>(
    ["rail-corridors"],
    "/rail/corridors",
  );

  // Fetch Terminals
  const { data: terminals = [] } = useApiQuery<any[]>(
    ["rail-terminals"],
    "/rail/terminals",
  );

  // Fetch Wagons
  const { data: wagons = [] } = useApiQuery<any[]>(
    ["rail-wagons"],
    "/rail/wagons",
  );

  // Fetch Train Consists
  const { data: trains = [] } = useApiQuery<any[]>(
    ["rail-trains"],
    "/rail/trains",
  );

  // Fetch Selected Consignment Details
  const { data: consignmentDetails } = useApiQuery<any>(
    ["rail-consignment-details", selectedConsignment?.id],
    selectedConsignment?.id
      ? `/rail/consignments/${selectedConsignment.id}`
      : "",
  );

  // Auto-select first consignment
  React.useEffect(() => {
    if (consignments.length > 0 && !selectedConsignment) {
      setSelectedConsignment(consignments[0]);
    }
  }, [consignments, selectedConsignment]);

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

  const handleRunTrainPhysics = async () => {
    try {
      const generatedWagons = Array.from({ length: simWagonCount }, () => ({
        wagonSeries: "Sggmrss 90' Intermodal",
        tareWeightTonnes: Number(simAvgWagonTare),
        payloadMassTonnes: Number(simAvgWagonPayload),
        lengthOverBuffersMeters: 29.59,
        brakedWeightTonnes: Number(simAvgWagonBrake),
        numberOfAxles: 6,
      }));

      const res = await fetch("/api/rail/calculate-physics", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          locomotiveLengthMeters: 23.0,
          locomotiveWeightTonnes: Number(simLocoWeight),
          locomotiveBrakedWeightTonnes: Number(simLocoBrake),
          maxAllowedLengthMeters: 750,
          requiredBrakePercentage: 65.0,
          corridorLineCategory: "D",
          wagons: generatedWagons,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTrainPhysicsResult(data.result);
      }
    } catch (err) {
      console.error("Train physics calculation error:", err);
    }
  };

  const handleRunAxleCalc = async () => {
    try {
      const res = await fetch("/api/rail/calculate-axle-load", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          wagonTareTonnes: Number(calcWagonTare),
          payloadTonnes: Number(calcPayload),
          numberOfAxles: Number(calcAxles),
          lineCategory: calcLineCategory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAxleResult(data.result);
      }
    } catch (err) {
      console.error("Axle load calculation error:", err);
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedConsignment) return;
    try {
      const res = await fetch(
        `/api/rail/consignments/${selectedConsignment.id}/status`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status: statusInput,
            remarks:
              remarksInput ||
              "Estado de expedición ferroviaria actualizado según el registro de circulación de tracción.",
          }),
        },
      );
      if (res.ok) {
        setShowStatusModal(false);
        refetchConsignments();
      }
    } catch (err) {
      console.error("Error updating consignment status:", err);
    }
  };

  // KPIs
  const totalGrossMassSum = consignments.reduce(
    (acc, c) => acc + (c.totalGrossMassTonnes || 0),
    0,
  );
  const totalTeuSum = consignments.reduce(
    (acc, c) => acc + (c.totalTeu || 0),
    0,
  );
  const inTransitCount = consignments.filter(
    (c) => c.status === "IN_TRANSIT" || c.status === "GAUGE_TRANSFERRED",
  ).length;

  const currentConsignment = consignmentDetails || selectedConsignment;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-indigo-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <TrainTrack className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Ferrocarril Intermodal & Corredores TEN-T
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  COTIF / CIM (UIC 992) & TAF-TSI
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Gestión integral de trenes bloque, composición de convoyes TEN-T
              (750m), cálculo de masa frenada, cargas por eje UIC (A-D) e
              interoperabilidad transfronteriza (Ancho Ibérico 1.668 mm / UIC
              1.435 mm).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab("TRAIN_CONSIST");
                if (!trainPhysicsResult) handleRunTrainPhysics();
                if (!axleResult) handleRunAxleCalc();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Simulador de Composición & Frenado
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Expediciones Activas CIM
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {consignments.length}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Navigation className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {inTransitCount} convoyes en circulación
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Masa Bruta Transportada
                </p>
                <h3 className="text-2xl font-black text-blue-400 mt-1">
                  {totalGrossMassSum.toLocaleString()} t
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {totalTeuSum} UTIs / TEUs asignados
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Trenes Bloque Formados
                </p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {trains.length}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              100% conformes TEN-T 750m
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Nodos Cambio de Ancho
                </p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">
                  Hendaye & Portbou
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              1.668 mm (Ibérico) ⇄ 1.435 mm (UIC)
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
          {(
            [
              {
                id: "CONSIGNMENTS",
                label: "Expedientes CIM & Seguimiento Corredores",
              },
              {
                id: "TRAIN_CONSIST",
                label: "Composición de Trenes Bloque & Boletín de Frenado",
              },
              {
                id: "AXLE_AUDIT",
                label: "Auditoría de Cargas por Eje UIC & Gálibo P400",
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

      {/* Tab 1: CIM Rail Consignments & Corridor Tracking */}
      {activeTab === "CONSIGNMENTS" && (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Consignments List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Nº CIM, Remitente, Destinatario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  "ALL",
                  "corridor_rfc6_med",
                  "corridor_rfc4_atl",
                  "corridor_iberian_core",
                ].map((corr) => (
                  <button
                    key={corr}
                    onClick={() => setActiveCorridorFilter(corr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeCorridorFilter === corr
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                    }`}
                  >
                    {corr === "ALL"
                      ? "Todos los Corredores"
                      : corr === "corridor_rfc6_med"
                        ? "RFC6 Mediterráneo"
                        : corr === "corridor_rfc4_atl"
                          ? "RFC4 Atlántico"
                          : "Eje Central"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingConsignments ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
              ) : consignments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron expedientes ferroviarios CIM registrados.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeCorridorFilter + searchQuery}
                >
                  {consignments.map((c) => {
                    const isSelected = selectedConsignment?.id === c.id;
                    return (
                      <motion.div
                        key={c.id}
                        variants={itemVariants}
                        onClick={() => setSelectedConsignment(c)}
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
                                {c.cimNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  c.status === "DELIVERED"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : c.status === "IN_TRANSIT"
                                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                      : c.status === "GAUGE_TRANSFERRED"
                                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                }`}
                              >
                                {c.status === "GAUGE_TRANSFERRED"
                                  ? "CAMBIO DE ANCHO"
                                  : c.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {c.senderName} ➔ {c.consigneeName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              RU: {c.railwayUndertakingRu} | Masa:{" "}
                              {c.totalGrossMassTonnes} t
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-blue-400">
                              {c.totalTeu} TEU / UTIs
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              NHM: {c.nhmCommodityCode}
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

          {/* Right Column: Detailed Consignment & Actions */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {currentConsignment ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {currentConsignment.status}
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {currentConsignment.cimNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <TrainTrack size={12} className="text-blue-400" />
                      Empresa Ferroviaria (RU):{" "}
                      {currentConsignment.railwayUndertakingRu}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setStatusInput(
                          currentConsignment.status || "IN_TRANSIT",
                        );
                        setRemarksInput(currentConsignment.remarks || "");
                        setShowStatusModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5 shadow-sm border border-white/10"
                    >
                      <ShieldCheck size={14} className="text-blue-400" />
                      Actualizar Estado
                    </button>
                    {trains.length > 0 && (
                      <a
                        href={`/api/rail/trains/${trains[0].id}/taf-tsi-xml`}
                        download={`TAF_TSI_${currentConsignment.cimNumber}.xml`}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <FileCode2 size={14} />
                        XML TAF-TSI
                      </a>
                    )}
                    <a
                      href={`/api/rail/consignments/${currentConsignment.id}/cim-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Carta de Porte CIM (PDF)
                    </a>
                  </div>
                </div>

                {/* Body: Route & Transport Summary */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Route Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Masa Bruta Total
                      </span>
                      <p className="text-lg font-black text-white">
                        {currentConsignment.totalGrossMassTonnes} Toneladas
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Capacidad UTIs
                      </span>
                      <p className="text-lg font-bold text-blue-400">
                        {currentConsignment.totalTeu} TEU / P400
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Estatuto Aduanero
                      </span>
                      <p className="text-lg font-bold text-emerald-400">
                        {currentConsignment.customsStatus || "UNION_GOODS"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Límite COTIF CIM
                      </span>
                      <p className="text-lg font-black text-indigo-400">
                        17.00 DEG / kg
                      </p>
                    </div>
                  </div>

                  {/* Terminal Itinerary */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
                    <span className="font-bold text-slate-300 block">
                      Itinerario y Nodos Ferroviarios:
                    </span>
                    <div className="flex items-center gap-3 text-slate-200">
                      <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold">
                        ORIGEN
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {currentConsignment.originTerminalId}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Salida Programada:{" "}
                          {currentConsignment.departureDate
                            ?.replace("T", " ")
                            .replace("Z", "")}
                        </p>
                      </div>
                      <ArrowRightLeft
                        size={16}
                        className="text-blue-400 mx-2"
                      />
                      {currentConsignment.gaugeTransferTerminalId && (
                        <>
                          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold">
                            CAMBIO DE ANCHO (
                            {currentConsignment.gaugeTransferTerminalId})
                          </div>
                          <ArrowRightLeft
                            size={16}
                            className="text-blue-400 mx-2"
                          />
                        </>
                      )}
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
                        DESTINO
                      </div>
                      <div>
                        <p className="font-bold text-white">
                          {currentConsignment.destinationTerminalId}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Llegada Estimada:{" "}
                          {currentConsignment.estimatedArrivalDate
                            ?.replace("T", " ")
                            .replace("Z", "")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Allocated Wagons & UTIs Table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Pos.</th>
                          <th className="p-3">Tipo UTI</th>
                          <th className="p-3">Identificador / Matrícula</th>
                          <th className="p-3 text-right">Carga (t)</th>
                          <th className="p-3 text-right">Masa Bruta Vagón</th>
                          <th className="p-3 text-right">Carga por Eje</th>
                          <th className="p-3 text-center">Precinto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(currentConsignment.allocations || []).map(
                          (alloc: any) => (
                            <tr
                              key={alloc.id}
                              className="hover:bg-white/5 transition-colors"
                            >
                              <td className="p-3 text-slate-300 font-bold">
                                #{alloc.positionInTrain || 1}
                              </td>
                              <td className="p-3 text-slate-200">
                                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px]">
                                  {alloc.utiType}
                                </span>
                              </td>
                              <td className="p-3 text-white font-bold">
                                {alloc.utiIdentification}
                              </td>
                              <td className="p-3 text-right font-bold text-white">
                                {alloc.payloadMassTonnes} t
                              </td>
                              <td className="p-3 text-right text-slate-300">
                                {alloc.grossWagonMassTonnes} t
                              </td>
                              <td className="p-3 text-right font-black text-blue-400">
                                {alloc.calculatedAxleLoadTonnes} t/eje
                              </td>
                              <td className="p-3 text-center text-slate-400 text-[11px]">
                                {alloc.sealNumber || "OK"}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Remarks & Legal Sign-off */}
                  {currentConsignment.remarks && (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                      <span className="text-slate-400 font-bold block">
                        Observaciones de Tracción Ferroviaria:
                      </span>
                      <p className="text-slate-200 italic">
                        "{currentConsignment.remarks}"
                      </p>
                      <span className="text-[10px] text-blue-400 block pt-1">
                        Inspector de Tracción Responsable:{" "}
                        {currentConsignment.responsibleRailwayOfficer ||
                          "Marc Vidal"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <TrainTrack className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione un expediente ferroviario para inspeccionar los
                vagones y el itinerario del corredor
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Train Consist & Brake Simulator */}
      {activeTab === "TRAIN_CONSIST" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulator Inputs */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Gauge size={18} className="text-blue-400" />
                Simulador de Convoy Ferroviario (TEN-T 750m)
              </h3>
              <p className="text-xs text-slate-400">
                Calcula la longitud del tren bloque, peso bruto total y
                porcentaje de masa frenada requerida.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Número de Vagones en el Tren
                  </label>
                  <Input
                    type="number"
                    value={simWagonCount}
                    onChange={(e) => setSimWagonCount(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Tara Media Vagón (t)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={simAvgWagonTare}
                      onChange={(e) =>
                        setSimAvgWagonTare(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Carga Media UTI (t)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={simAvgWagonPayload}
                      onChange={(e) =>
                        setSimAvgWagonPayload(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Freno Vagón (t)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={simAvgWagonBrake}
                      onChange={(e) =>
                        setSimAvgWagonBrake(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Loco Tara (t)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={simLocoWeight}
                      onChange={(e) => setSimLocoWeight(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Loco Freno (t)
                    </label>
                    <Input
                      type="number"
                      step="1"
                      value={simLocoBrake}
                      onChange={(e) => setSimLocoBrake(Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunTrainPhysics}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20"
                >
                  Calcular Dinámica de Tren & Frenado
                </button>

                {trainPhysicsResult && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Longitud Total del Convoy:
                      </span>
                      <span
                        className={`font-black ${trainPhysicsResult.isLengthCompliant ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {trainPhysicsResult.totalTrainLengthMeters} m / 750 m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Masa Bruta del Tren:
                      </span>
                      <span className="font-bold text-white">
                        {trainPhysicsResult.totalGrossMassTonnes} Toneladas
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Porcentaje de Masa Frenada:
                      </span>
                      <span
                        className={`font-black ${trainPhysicsResult.isBrakeCompliant ? "text-blue-400" : "text-amber-400"}`}
                      >
                        {trainPhysicsResult.calculatedBrakePercentage}% (Mín:
                        65%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-white/10">
                      {trainPhysicsResult.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Train Consists List */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4 lg:col-span-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Layers size={18} className="text-emerald-400" />
                Trenes Bloque en Circulación & Boletines de Tracción
              </h3>
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                {trains.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">
                          {t.trainRunNumber}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {t.locomotiveSeries} | {t.tractionOperator}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Longitud: {t.totalTrainLengthMeters}m | Masa:{" "}
                        {t.totalGrossMassTonnes}t | Frenado:{" "}
                        {t.calculatedBrakePercentage}%
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/rail/trains/${t.id}/braking-sheet-pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors flex items-center gap-1"
                      >
                        <Download size={13} />
                        Boletín Frenado (PDF)
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Axle Load Audit & P400 Gauge */}
      {activeTab === "AXLE_AUDIT" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Axle Load Simulator */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Scale size={18} className="text-blue-400" />
                Auditor de Carga Máxima por Eje (Norma EN 15528)
              </h3>
              <p className="text-xs text-slate-400">
                Verifica la compatibilidad de carga por eje con las categorías
                de infraestructura UIC (Líneas A, B, C y D).
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Tara del Vagón (t)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={calcWagonTare}
                      onChange={(e) => setCalcWagonTare(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Carga Útil Transportada (t)
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      value={calcPayload}
                      onChange={(e) => setCalcPayload(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Número de Ejes
                    </label>
                    <Input
                      type="number"
                      value={calcAxles}
                      onChange={(e) => setCalcAxles(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Categoría de Línea UIC
                    </label>
                    <select
                      value={calcLineCategory}
                      onChange={(e: any) => setCalcLineCategory(e.target.value)}
                      className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="A">Línea A (Máx 16.0 t/eje)</option>
                      <option value="B">Línea B (Máx 18.0 t/eje)</option>
                      <option value="C">Línea C (Máx 20.0 t/eje)</option>
                      <option value="D">
                        Línea D (Máx 22.5 t/eje - TEN-T)
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleRunAxleCalc}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20"
                >
                  Verificar Carga por Eje
                </button>

                {axleResult && (
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Masa Bruta del Vagón:
                      </span>
                      <span className="font-bold text-white">
                        {axleResult.grossWagonMassTonnes} Toneladas
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Carga por Eje Calculada:
                      </span>
                      <span
                        className={`font-black text-sm ${axleResult.isCompliant ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {axleResult.calculatedAxleLoadTonnes} t/eje
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/10">
                      <span className="text-slate-400">
                        Límite Categoría {calcLineCategory}:
                      </span>
                      <span className="font-bold text-slate-300">
                        {axleResult.maxAllowedAxleLoadTonnes} t/eje
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic pt-1">
                      {axleResult.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Rolling Stock & Infrastructure Catalog */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <TrainTrack size={18} className="text-indigo-400" />
                Parque de Vagones ({wagons.length}) & Nodos TEN-T (
                {terminals.length} Terminales / {corridors.length} Corredores)
              </h3>
              <div className="space-y-2 overflow-y-auto max-h-[300px] text-xs pr-1">
                {wagons.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-white">
                        {w.uicWagonNumber}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${w.isP400Certified ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"}`}
                      >
                        {w.isP400Certified ? "P400 CANGURO" : "FLATBED"}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {w.wagonSeries}
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>
                        Tara: {w.tareWeightTonnes}t | Ejes: {w.numberOfAxles}
                      </span>
                      <span>Carga Cat D: {w.maxPayloadCategoryD}t</span>
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
                  <ShieldCheck size={18} className="text-blue-400" />
                  Actualización de Estado de Circulación Ferroviaria
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
                    Estado de la Expedición CIM
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e: any) => setStatusInput(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="PLANNED">
                      PLANNED (Planificado en Malla Ferroviaria)
                    </option>
                    <option value="TRAIN_FORMED">
                      TRAIN_FORMED (Tren Formado en Vía de Carga)
                    </option>
                    <option value="IN_TRANSIT">
                      IN_TRANSIT (En Circulación de Tracción)
                    </option>
                    <option value="GAUGE_TRANSFERRED">
                      GAUGE_TRANSFERRED (Transbordo de Ancho Realizado)
                    </option>
                    <option value="DELIVERED">
                      DELIVERED (Entregado en Terminal de Destino)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Observaciones de Tracción
                  </label>
                  <textarea
                    value={remarksInput}
                    onChange={(e) => setRemarksInput(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    placeholder="Detalles sobre el surco ferroviario, maniobras en terminal y entrega..."
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
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
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
