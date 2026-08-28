import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Snowflake,
  ThermometerSnowflake,
  Download,
  Search,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Flame,
  BatteryCharging,
  Activity,
  CheckCircle2,
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

export default function ColdChainModule() {
  const [activeTab, setActiveTab] = useState<
    "MONITOR" | "CALCULATOR" | "AUDIT_GDP"
  >("MONITOR");
  const [activeProfileFilter, setActiveProfileFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<any>(null);

  // MKT Calculator State
  const [calcTempsInput, setCalcTempsInput] = useState(
    "4.8, 5.2, 5.0, 8.4, 4.9, 4.6",
  );
  const [calcMinTemp, setCalcMinTemp] = useState(2.0);
  const [calcMaxTemp, setCalcMaxTemp] = useState(8.0);
  const [mktResult, setMktResult] = useState<any>(null);

  // Dry Ice Simulator State
  const [simDryIceInitialKg, setSimDryIceInitialKg] = useState(45.0);
  const [simDryIceCurrentKg, setSimDryIceCurrentKg] = useState(32.0);
  const [simDryIceRate, setSimDryIceRate] = useState(0.45);
  const [simDryIceTransitHrs, setSimDryIceTransitHrs] = useState(24);
  const [dryIceResult, setDryIceResult] = useState<any>(null);

  // Reefer Genset Simulator State
  const [simAmbientTemp, setSimAmbientTemp] = useState(32.0);
  const [simSetpointTemp, setSimSetpointTemp] = useState(5.0);
  const [simTransitHours, setSimTransitHours] = useState(36);
  const [simTankCapacity, setSimTankCapacity] = useState(450);
  const [reeferResult, setReeferResult] = useState<any>(null);

  // GDP Release Modal State
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [verdictInput, setVerdictInput] = useState<
    | "RELEASED_FOR_DISTRIBUTION"
    | "QUARANTINE_INVESTIGATION"
    | "REJECTED_DISPOSAL"
  >("RELEASED_FOR_DISTRIBUTION");
  const [rpNameInput, setRpNameInput] = useState(
    "Dra. Elena Ruiz (Directora Técnica QP/RP)",
  );
  const [auditNotesInput, setAuditNotesInput] = useState("");

  // Fetch Cold Chain Shipments
  const {
    data: shipments = [],
    isLoading: loadingShipments,
    refetch: refetchShipments,
  } = useApiQuery<any[]>(
    ["cold-chain-shipments", activeProfileFilter, searchQuery],
    `/cold-chain/shipments?profileId=${activeProfileFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Fetch Regulated Profiles
  const { data: profiles = [] } = useApiQuery<any[]>(
    ["cold-chain-profiles"],
    "/cold-chain/profiles",
  );

  // Fetch Detailed Selected Shipment
  const { data: shipmentDetails } = useApiQuery<any>(
    ["cold-chain-shipment-details", selectedShipment?.id],
    selectedShipment?.id ? `/cold-chain/shipments/${selectedShipment.id}` : "",
  );

  // Auto-select first shipment
  React.useEffect(() => {
    if (shipments.length > 0 && !selectedShipment) {
      setSelectedShipment(shipments[0]);
    }
  }, [shipments, selectedShipment]);

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

  const handleRunMktCalc = async () => {
    const tempsArray = calcTempsInput
      .split(",")
      .map((t) => parseFloat(t.trim()))
      .filter((t) => !isNaN(t));

    try {
      const res = await fetch("/api/cold-chain/calculate-mkt", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          readings: tempsArray.map((c) => ({
            celsius: c,
            durationMinutes: 60,
          })),
          minAllowedCelsius: Number(calcMinTemp),
          maxAllowedCelsius: Number(calcMaxTemp),
          targetCelsius: (Number(calcMinTemp) + Number(calcMaxTemp)) / 2,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMktResult(data.evaluation);
      }
    } catch (err) {
      console.error("MKT calculation error:", err);
    }
  };

  const handleRunDryIceSim = async () => {
    try {
      const res = await fetch("/api/cold-chain/simulate-dry-ice", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          initialWeightKg: Number(simDryIceInitialKg),
          currentWeightKg: Number(simDryIceCurrentKg),
          sublimationRateKgHr: Number(simDryIceRate),
          transitHoursRemaining: Number(simDryIceTransitHrs),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDryIceResult(data.result);
      }
    } catch (err) {
      console.error("Dry Ice simulation error:", err);
    }
  };

  const handleRunReeferSim = async () => {
    try {
      const res = await fetch("/api/cold-chain/simulate-reefer-power", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ambientTempCelsius: Number(simAmbientTemp),
          setpointCelsius: Number(simSetpointTemp),
          transitHours: Number(simTransitHours),
          tankCapacityLiters: Number(simTankCapacity),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReeferResult(data.result);
      }
    } catch (err) {
      console.error("Reefer simulation error:", err);
    }
  };

  const handleSaveGdpRelease = async () => {
    if (!selectedShipment) return;
    try {
      const res = await fetch(
        `/api/cold-chain/shipments/${selectedShipment.id}/release`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            gdpReleaseVerdict: verdictInput,
            responsiblePersonName: rpNameInput,
            qualityAuditNotes:
              auditNotesInput ||
              "Liberación certificada por Dirección Técnica.",
          }),
        },
      );
      if (res.ok) {
        setShowReleaseModal(false);
        refetchShipments();
      }
    } catch (err) {
      console.error("Error saving GDP release:", err);
    }
  };

  // KPIs
  const totalShipmentsCount = shipments.length;
  const compliantCount = shipments.filter(
    (s) => s.gdpReleaseVerdict === "RELEASED_FOR_DISTRIBUTION",
  ).length;
  const quarantineCount = shipments.filter(
    (s) =>
      s.gdpReleaseVerdict === "QUARANTINE_INVESTIGATION" ||
      s.excursionStatus === "CRITICAL_EXCURSION",
  ).length;
  const criticalDryIceCount = shipments.filter(
    (s) => s.currentDryIceWeightKg && s.currentDryIceWeightKg < 10.0,
  ).length;

  const currentShipment = shipmentDetails || selectedShipment;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-blue-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                <ThermometerSnowflake className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Cadena de Frío & Farma GDP / Reefer
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  EN 12830 & MKT Arrhenius
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Control térmico de productos biológicos, vacunas (-80°C / +2°C a
              +8°C) y contenedores Reefer, cálculo cinético MKT, autonomía de
              hielo seco y Certificados Oficiales de Liberación GDP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveTab("CALCULATOR");
                if (!mktResult) handleRunMktCalc();
                if (!dryIceResult) handleRunDryIceSim();
                if (!reeferResult) handleRunReeferSim();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/25 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Simuladores Térmicos
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Envíos Activos Frío
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalShipmentsCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Snowflake className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Dataloggers EN 12830 conectados
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Conformidad GDP (Liberados)
                </p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  {totalShipmentsCount > 0
                    ? ((compliantCount / totalShipmentsCount) * 100).toFixed(0)
                    : 0}
                  %
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              MKT y estabilidad conformes
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Lotes en Cuarentena
                </p>
                <h3 className="text-2xl font-black text-amber-400 mt-1">
                  {quarantineCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Excursiones bajo análisis CAPA
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Alerta Hielo Seco
                </p>
                <h3 className="text-2xl font-black text-rose-400 mt-1">
                  {criticalDryIceCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Reserva crítica (&lt; 10 kg)
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mt-6 border-b border-white/10 pb-2">
          {(
            [
              {
                id: "MONITOR",
                label: "Monitor de Envíos & Dataloggers (EN 12830)",
              },
              {
                id: "CALCULATOR",
                label: "Calculadora Térmica (MKT / Hielo Seco / Genset)",
              },
              {
                id: "AUDIT_GDP",
                label: "Auditoría de Calidad GDP & Liberación de Lotes",
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                  : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Live Monitor & Datalogger Series */}
      {activeTab === "MONITOR" && (
        <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
          {/* Left Column: Shipments List */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
            <div className="p-4 border-b border-white/10 space-y-3">
              <Input
                type="text"
                placeholder="Buscar Nº Envío, Lote, Producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveProfileFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    activeProfileFilter === "ALL"
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                      : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                  }`}
                >
                  Todos los Perfiles
                </button>
                {profiles.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProfileFilter(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeProfileFilter === p.id
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5"
                    }`}
                  >
                    {p.name.split(" ")[0]} ({p.minTempCelsius}°C/
                    {p.maxTempCelsius}°C)
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingShipments ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : shipments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No se encontraron envíos de cadena de frío.
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                  key={activeProfileFilter + searchQuery}
                >
                  {shipments.map((s) => {
                    const isSelected = selectedShipment?.id === s.id;
                    return (
                      <motion.div
                        key={s.id}
                        variants={itemVariants}
                        onClick={() => setSelectedShipment(s)}
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
                                {s.trackingNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  s.gdpReleaseVerdict ===
                                  "RELEASED_FOR_DISTRIBUTION"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : s.gdpReleaseVerdict ===
                                        "QUARANTINE_INVESTIGATION"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {s.gdpReleaseVerdict ===
                                "RELEASED_FOR_DISTRIBUTION"
                                  ? "LIBERADO"
                                  : s.gdpReleaseVerdict ===
                                      "QUARANTINE_INVESTIGATION"
                                    ? "CUARENTENA"
                                    : s.gdpReleaseVerdict}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {s.productDescription}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Lote: {s.batchNumber} | Datalogger:{" "}
                              {s.loggerSerialNumber}
                            </p>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-cyan-400">
                              Consigna: {s.setpointTempCelsius}°C
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              MKT:{" "}
                              {s.mktCalculatedCelsius ?? s.setpointTempCelsius}
                              °C
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

          {/* Right Column: Telemetry & Quality Details */}
          <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
            {currentShipment ? (
              <div className="flex flex-col h-full overflow-y-auto">
                {/* Header */}
                <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {currentShipment.pharmaClassification}
                      </span>
                      <h2 className="text-xl font-black text-white tracking-wide">
                        {currentShipment.trackingNumber}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <Box size={12} className="text-cyan-400" />
                      Lote: {currentShipment.batchNumber} |{" "}
                      {currentShipment.productDescription}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setVerdictInput(
                          currentShipment.gdpReleaseVerdict ||
                            "RELEASED_FOR_DISTRIBUTION",
                        );
                        setAuditNotesInput(
                          currentShipment.qualityAuditNotes || "",
                        );
                        setShowReleaseModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <ShieldCheck size={14} />
                      Dictamen de Calidad (RP)
                    </button>
                    <a
                      href={`/api/cold-chain/shipments/${currentShipment.id}/certificate-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Download size={14} />
                      Certificado GDP (PDF)
                    </a>
                  </div>
                </div>

                {/* Body: Thermal Dashboard & Readings */}
                <div className="p-4 md:p-6 space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Temperatura MKT
                      </span>
                      <p className="text-lg font-black text-cyan-400">
                        {currentShipment.mktCalculatedCelsius ??
                          currentShipment.setpointTempCelsius}
                        °C
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Consigna Setpoint
                      </span>
                      <p className="text-lg font-bold text-white">
                        {currentShipment.setpointTempCelsius}°C
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Excursión Térmica
                      </span>
                      <p
                        className={`text-lg font-bold ${currentShipment.excursionDurationMinutes > 0 ? "text-amber-400" : "text-emerald-400"}`}
                      >
                        {currentShipment.excursionDurationMinutes || 0} min
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        Dictamen GDP
                      </span>
                      <span
                        className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          currentShipment.gdpReleaseVerdict ===
                          "RELEASED_FOR_DISTRIBUTION"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {currentShipment.gdpReleaseVerdict}
                      </span>
                    </div>
                  </div>

                  {/* Telemetry Readings Table */}
                  <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="p-3">Registro (UTC)</th>
                          <th className="p-3 text-right">Temp. Sonda</th>
                          <th className="p-3 text-right">Temp. Ambiente</th>
                          <th className="p-3 text-right">Humedad %</th>
                          <th className="p-3 text-center">Alimentación</th>
                          <th className="p-3 text-center">Estado Térmico</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(currentShipment.readings || []).map((rd: any) => (
                          <tr
                            key={rd.id}
                            className="hover:bg-white/5 transition-colors"
                          >
                            <td className="p-3 text-slate-300 font-medium">
                              {rd.recordedAt
                                ? rd.recordedAt
                                    .replace("T", " ")
                                    .replace("Z", "")
                                : "N/A"}
                            </td>
                            <td
                              className={`p-3 text-right font-black ${rd.isExcursion ? "text-rose-400" : "text-emerald-400"}`}
                            >
                              {rd.probeTemperatureCelsius}°C
                            </td>
                            <td className="p-3 text-right text-slate-400">
                              {rd.ambientTemperatureCelsius ?? "--"}°C
                            </td>
                            <td className="p-3 text-right text-slate-300">
                              {rd.relativeHumidityPct ?? "--"}%
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {rd.powerSupplyMode}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  !rd.isExcursion
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                }`}
                              >
                                {!rd.isExcursion ? "EN RANGO" : "EXCURSIÓN"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Audit Notes Box */}
                  {currentShipment.qualityAuditNotes && (
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-xs space-y-1">
                      <span className="text-slate-400 font-bold block">
                        Dictamen y Observaciones de Dirección Técnica:
                      </span>
                      <p className="text-slate-200 italic">
                        "{currentShipment.qualityAuditNotes}"
                      </p>
                      <span className="text-[10px] text-cyan-400 block pt-1">
                        Firmado por:{" "}
                        {currentShipment.responsiblePersonName ||
                          "Persona Responsable GDP"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <ThermometerSnowflake className="w-12 h-12 mb-2 stroke-1 opacity-40" />
                Seleccione un envío para inspeccionar la telemetría térmica EN
                12830
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Thermal Calculators & Physics Simulators */}
      {activeTab === "CALCULATOR" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-6 overflow-y-auto z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulator 1: MKT Arrhenius Calculator */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Activity size={18} className="text-cyan-400" />
                Temperatura Cinética Media (MKT)
              </h3>
              <p className="text-xs text-slate-400">
                Ecuación de Arrhenius (ΔH = 83.14 kJ/mol) para evaluar el
                impacto térmico real sobre la estabilidad farmacéutica.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">
                    Serie de Temperaturas (°C)
                  </label>
                  <Input
                    type="text"
                    value={calcTempsInput}
                    onChange={(e) => setCalcTempsInput(e.target.value)}
                    placeholder="ej. 4.8, 5.2, 5.0, 8.4, 4.9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Mín. Permitido (°C)
                    </label>
                    <Input
                      type="number"
                      value={calcMinTemp}
                      onChange={(e) => setCalcMinTemp(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Máx. Permitido (°C)
                    </label>
                    <Input
                      type="number"
                      value={calcMaxTemp}
                      onChange={(e) => setCalcMaxTemp(Number(e.target.value))}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunMktCalc}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all"
                >
                  Calcular MKT de Arrhenius
                </button>

                {mktResult && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">MKT Calculado:</span>
                      <span className="font-black text-cyan-400 text-sm">
                        {mktResult.mktCelsius}°C ({mktResult.mktKelvin} K)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Media Aritmética:</span>
                      <span className="font-bold text-slate-200">
                        {mktResult.avgRecordedCelsius}°C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Excursión Acumulada:
                      </span>
                      <span className="font-bold text-amber-400">
                        {mktResult.totalExcursionMinutes} min
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic pt-1">
                      {mktResult.stabilityAuditNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Simulator 2: Dry Ice Sublimation (UN 1845) */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Snowflake size={18} className="text-blue-400" />
                Autonomía Hielo Seco (-80°C UN 1845)
              </h3>
              <p className="text-xs text-slate-400">
                Calcula la tasa de sublimación por delta térmico y la reserva en
                kg a la llegada estimada.
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Carga Inicial (kg)
                    </label>
                    <Input
                      type="number"
                      value={simDryIceInitialKg}
                      onChange={(e) =>
                        setSimDryIceInitialKg(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Carga Actual (kg)
                    </label>
                    <Input
                      type="number"
                      value={simDryIceCurrentKg}
                      onChange={(e) =>
                        setSimDryIceCurrentKg(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Tasa (kg/h)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={simDryIceRate}
                      onChange={(e) => setSimDryIceRate(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Tránsito Restante (h)
                    </label>
                    <Input
                      type="number"
                      value={simDryIceTransitHrs}
                      onChange={(e) =>
                        setSimDryIceTransitHrs(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunDryIceSim}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                >
                  Estimar Autonomía & Pérdida
                </button>

                {dryIceResult && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Autonomía Restante:
                      </span>
                      <span className="font-black text-blue-400 text-sm">
                        {dryIceResult.holdoverHoursRemaining} Horas
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Peso Proyectado Llegada:
                      </span>
                      <span className="font-bold text-white">
                        {dryIceResult.projectedWeightAtArrivalKg} kg
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic pt-1">
                      {dryIceResult.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Simulator 3: Reefer Genset Diesel & Power Draw */}
            <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <BatteryCharging size={18} className="text-emerald-400" />
                Genset Diésel Contenedor Reefer
              </h3>
              <p className="text-xs text-slate-400">
                Consumo diésel y autonomía del generador del contenedor
                frigorífico según diferencial térmico (ΔT).
              </p>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Temp. Ambiente (°C)
                    </label>
                    <Input
                      type="number"
                      value={simAmbientTemp}
                      onChange={(e) =>
                        setSimAmbientTemp(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Consigna Setpoint (°C)
                    </label>
                    <Input
                      type="number"
                      value={simSetpointTemp}
                      onChange={(e) =>
                        setSimSetpointTemp(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Horas de Trayecto
                    </label>
                    <Input
                      type="number"
                      value={simTransitHours}
                      onChange={(e) =>
                        setSimTransitHours(Number(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Capacidad Depósito (L)
                    </label>
                    <Input
                      type="number"
                      value={simTankCapacity}
                      onChange={(e) =>
                        setSimTankCapacity(Number(e.target.value))
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunReeferSim}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                >
                  Estimar Consumo de Combustible
                </button>

                {reeferResult && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Diferencial Térmico (ΔT):
                      </span>
                      <span className="font-bold text-white">
                        {reeferResult.deltaTCelsius}°C
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tasa de Consumo:</span>
                      <span className="font-black text-emerald-400">
                        {reeferResult.fuelBurnRateLitersPerHr} L/h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">
                        Consumo Total Estimado:
                      </span>
                      <span className="font-bold text-white">
                        {reeferResult.totalFuelConsumedLiters} Litros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 italic pt-1">
                      {reeferResult.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: GDP Quality Audit & Batch Release Center */}
      {activeTab === "AUDIT_GDP" && (
        <div className="flex-1 px-4 md:px-8 pb-8 space-y-4 overflow-y-auto z-10 relative">
          <div className="p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              Expedientes de Calidad Farmacéutica & Certificados de Liberación
              GDP
            </h3>

            <div className="space-y-3">
              {shipments.map((s) => (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    s.gdpReleaseVerdict === "RELEASED_FOR_DISTRIBUTION"
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : s.gdpReleaseVerdict === "QUARANTINE_INVESTIGATION"
                        ? "bg-amber-950/20 border-amber-500/30"
                        : "bg-rose-950/20 border-rose-500/30"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">
                        {s.trackingNumber}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-slate-200">
                        Lote: {s.batchNumber}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          s.gdpReleaseVerdict === "RELEASED_FOR_DISTRIBUTION"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {s.gdpReleaseVerdict}
                      </span>
                    </div>
                    <p className="text-xs text-white font-bold mt-1">
                      {s.productDescription}
                    </p>
                    <p className="text-xs text-slate-400 italic mt-0.5">
                      {s.qualityAuditNotes}
                    </p>
                    <p className="text-[11px] text-cyan-400 mt-1">
                      Firmante QP/RP:{" "}
                      {s.responsiblePersonName || "Pendiente de dictamen"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/cold-chain/shipments/${s.id}/certificate-pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                    >
                      <Download size={14} />
                      Descargar Certificado GDP (PDF)
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Responsible Person GDP Release Modal */}
      <AnimatePresence>
        {showReleaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-cyan-400" />
                  Dictamen de Liberación de Lote GDP
                </h3>
                <button
                  onClick={() => setShowReleaseModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Veredicto Farmacéutico
                  </label>
                  <select
                    value={verdictInput}
                    onChange={(e: any) => setVerdictInput(e.target.value)}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="RELEASED_FOR_DISTRIBUTION">
                      RELEASED_FOR_DISTRIBUTION (Aprobado para distribución
                      comercial)
                    </option>
                    <option value="QUARANTINE_INVESTIGATION">
                      QUARANTINE_INVESTIGATION (Retenido en Cuarentena para
                      CAPA)
                    </option>
                    <option value="REJECTED_DISPOSAL">
                      REJECTED_DISPOSAL (Rechazado para destrucción segura)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Persona Responsable (RP / QP)
                  </label>
                  <Input
                    type="text"
                    value={rpNameInput}
                    onChange={(e) => setRpNameInput(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Observaciones de Auditoría de Estabilidad
                  </label>
                  <textarea
                    value={auditNotesInput}
                    onChange={(e) => setAuditNotesInput(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Detalles sobre evaluación de MKT, excursiones térmicas toleradas o acciones correctivas CAPA..."
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowReleaseModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveGdpRelease}
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Guardar y Emitir Dictamen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
