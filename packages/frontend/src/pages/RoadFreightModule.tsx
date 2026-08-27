import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Truck,
  Download,
  Search,
  Calculator,
  Building,
  Clock,
  Flame,
  CheckCircle2,
  Layers,
  MapPin,
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

export default function RoadFreightModule() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsignment, setSelectedConsignment] = useState<any>(null);

  // Simulator / Planner Modal
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [simOrigin, setSimOrigin] = useState("Madrid (Hub Central)");
  const [simDest, setSimDest] = useState("Lyon (Saint-Exupéry)");
  const [simDistanceKm, setSimDistanceKm] = useState(1180);
  const [simPallets, setSimPallets] = useState(30);
  const [simWeightKg, setSimWeightKg] = useState(19500);
  const [simIsAdr, setSimIsAdr] = useState(true);
  const [simUnCode, setSimUnCode] = useState("UN 1263");
  const [simAdrClass, setSimAdrClass] = useState("3");
  const [simCategory, setSimCategory] = useState<0 | 1 | 2 | 3 | 4>(3);
  const [simAdrQty, setSimAdrQty] = useState(400); // 400 kg Cat 3 * 1 = 400 pts (Exempt)

  const [simRouteResult, setSimRouteResult] = useState<any>(null);
  const [simAdrResult, setSimAdrResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch Consignments
  const { data: consignments = [], isLoading } = useApiQuery<any[]>(
    ["road-consignments", activeFilter, searchQuery],
    `/road-freight/consignments?type=${activeFilter}&q=${encodeURIComponent(searchQuery)}`,
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

  const runSimulation = async () => {
    try {
      setIsSimulating(true);
      const headers = getAuthHeaders();

      // 1. Calculate Route & Tachograph
      const routeRes = await fetch("/api/road-freight/calculate-route", {
        method: "POST",
        headers,
        body: JSON.stringify({
          originCity: simOrigin,
          destinationCity: simDest,
          distanceKm: Number(simDistanceKm),
          totalPallets: Number(simPallets),
          totalGrossWeightKg: Number(simWeightKg),
        }),
      });
      if (routeRes.ok) {
        const data = await routeRes.json();
        setSimRouteResult(data.route);
      }

      // 2. Calculate ADR 1.1.3.6
      if (simIsAdr) {
        const adrRes = await fetch("/api/road-freight/calculate-adr", {
          method: "POST",
          headers,
          body: JSON.stringify({
            items: [
              {
                unCode: simUnCode,
                properShippingName: "PINTURAS INFLAMABLES",
                adrClass: simAdrClass,
                transportCategory: Number(simCategory),
                quantityUnits: Number(simAdrQty),
                tunnelRestrictionCode: "(D/E)",
              },
            ],
          }),
        });
        if (adrRes.ok) {
          const adrData = await adrRes.json();
          setSimAdrResult(adrData.adr);
        }
      } else {
        setSimAdrResult(null);
      }
    } catch (err) {
      console.error("Road simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // KPIs
  const totalConsignmentsCount = consignments.length;
  const totalTonnage =
    consignments.reduce((acc, c) => acc + (c.totalGrossWeightKg || 0), 0) /
    1000;
  const avgUtilizationPct =
    consignments.length > 0
      ? consignments.reduce(
          (acc, c) => acc + (c.trailerFloorUtilizationPct || 0),
          0,
        ) / consignments.length
      : 0;
  const adrConsignmentsCount = consignments.filter(
    (c) => c.isAdrHazardous,
  ).length;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Gradients */}
      <div className="absolute top-0 right-1/3 w-[600px] h-[300px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-emerald-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <Truck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Transporte Terrestre & e-CMR
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  IRU 24 Cajas & Carta de Porte
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Despacho de cargas FTL/LTL, Carta de Porte Nacional (Ley 15/2009 &
              RDL 3/2022), evaluación ADR 1.1.3.6 (1.000 puntos) y tacógrafo CE
              561/2006.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowPlannerModal(true);
                if (!simRouteResult) runSimulation();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white shadow-lg shadow-amber-600/25 hover:shadow-amber-600/40 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Planificador ADR & Tacógrafo
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Expediciones Activas
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalConsignmentsCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              e-CMR y Cartas de Porte
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Carga Despachada
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalTonnage.toFixed(1)} t
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Toneladas transportadas
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Ocupación Semirremolque
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {avgUtilizationPct.toFixed(1)}%
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Base 33 Euro-pallets por trailer
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Expediciones ADR
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {adrConsignmentsCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Flame className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Mercancías Peligrosas ADR
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Pane */}
      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Consignments List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
          <div className="p-4 border-b border-white/10 space-y-3">
            <Input
              type="text"
              placeholder="Buscar e-CMR, Carta Porte, Matrícula, Conductor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
            />
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(
                ["ALL", "INTERNATIONAL_CMR", "NATIONAL_CARTA_PORTE"] as const
              ).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                    activeFilter === filter
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                      : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {filter === "ALL"
                    ? "Todos"
                    : filter === "INTERNATIONAL_CMR"
                      ? "e-CMR Internacional"
                      : "Carta de Porte Nacional"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
              </div>
            ) : consignments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No se encontraron expediciones de transporte terrestre.
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
                key={activeFilter + searchQuery}
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
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm tracking-wide">
                                {c.consignmentNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  c.status === "DELIVERED"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : c.status === "IN_TRANSIT"
                                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              {c.originCity} ➔ {c.destinationCity}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              Tractora: {c.tractorPlate} | {c.driverName}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-amber-300">
                            {c.totalPallets}/33 Pallets
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">
                            {c.totalGrossWeightKg?.toLocaleString()} kg
                          </span>
                          {c.isAdrHazardous && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold mt-1">
                              ADR
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

        {/* Right Column: e-CMR & Carta de Porte Inspector */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
          {selectedConsignment ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {selectedConsignment.consignmentType}
                    </span>
                    <h2 className="text-xl font-black text-white tracking-wide">
                      {selectedConsignment.consignmentNumber}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <MapPin size={12} className="text-amber-400" />
                    {selectedConsignment.originCity} ➔{" "}
                    {selectedConsignment.destinationCity} (
                    {selectedConsignment.totalDistanceKm} km)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/road-freight/consignments/${selectedConsignment.id}/cmr-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    e-CMR (24 Cajas PDF)
                  </a>
                  <a
                    href={`/api/road-freight/consignments/${selectedConsignment.id}/carta-porte-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    Carta de Porte (PDF)
                  </a>
                </div>
              </div>

              {/* 4-Panel Inspector */}
              <div className="p-4 md:p-6 space-y-4">
                {/* Panel 1: Parties & Vehicle Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                      <Building size={12} /> Expedidor & Destinatario
                    </span>
                    <p className="text-xs text-slate-300">
                      <strong>Expedidor:</strong>{" "}
                      {selectedConsignment.senderName} (
                      {selectedConsignment.senderCountry})
                    </p>
                    <p className="text-xs text-slate-300">
                      <strong>Destinatario:</strong>{" "}
                      {selectedConsignment.consigneeName} (
                      {selectedConsignment.consigneeCountry})
                    </p>
                    <p className="text-xs text-slate-400 pt-1 border-t border-white/5">
                      Porteador: {selectedConsignment.carrierName} (
                      {selectedConsignment.carrierVat})
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                      <Truck size={12} /> Vehículo y Conductor Asignado
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                      <div>
                        <span className="text-slate-400">Tractora:</span>
                        <p className="font-bold text-white">
                          {selectedConsignment.tractorPlate}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Semirremolque:</span>
                        <p className="font-bold text-white">
                          {selectedConsignment.trailerPlate}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Conductor:</span>
                        <p className="font-bold text-white">
                          {selectedConsignment.driverName}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Permiso / DNI:</span>
                        <p className="font-bold text-slate-300">
                          {selectedConsignment.driverLicense}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Capacity & Floor Utilization Meter */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                      <Layers size={12} /> Ocupación del Semirremolque (Trailer
                      13,6 m / 33 Pallets)
                    </span>
                    <span className="text-xs font-bold text-emerald-300">
                      {selectedConsignment.trailerFloorUtilizationPct}%
                      Superficie
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, selectedConsignment.trailerFloorUtilizationPct)}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-slate-400">Pallets Cargados:</span>
                      <p className="text-sm font-bold text-white">
                        {selectedConsignment.totalPallets} / 33
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Peso Bruto:</span>
                      <p className="text-sm font-bold text-sky-400">
                        {selectedConsignment.totalGrossWeightKg?.toLocaleString()}{" "}
                        kg
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Carga Útil Máx:</span>
                      <p className="text-sm font-bold text-slate-300">
                        24.000 kg
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Utilización Carga:</span>
                      <p className="text-sm font-bold text-emerald-400">
                        {(
                          (selectedConsignment.totalGrossWeightKg / 24000) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </div>
                  </div>
                </div>

                {/* Panel 3: ADR 1.1.3.6 Hazard Panel */}
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    selectedConsignment.isAdrHazardous
                      ? "bg-rose-950/20 border-rose-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-wider text-rose-300 uppercase flex items-center gap-1.5">
                      <Flame size={12} /> Clasificación de Mercancías Peligrosas
                      (ADR 2025)
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selectedConsignment.isAdrHazardous
                          ? selectedConsignment.orangePlatesRequired
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {selectedConsignment.isAdrHazardous
                        ? selectedConsignment.orangePlatesRequired
                          ? "ADR Completo (Placas Naranja)"
                          : "Exención 1.1.3.6 (Sin Placas)"
                        : "No Peligroso"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200">
                    {selectedConsignment.goodsDescription}
                  </p>

                  {selectedConsignment.isAdrHazardous && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-slate-400">Puntos ADR:</span>
                        <p className="font-bold text-amber-300">
                          {selectedConsignment.adrTotalPoints} pts
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Placas Naranja:</span>
                        <p className="font-bold text-rose-400">
                          {selectedConsignment.orangePlatesRequired
                            ? "Obligatorias"
                            : "Exento"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Túneles:</span>
                        <p className="font-bold text-sky-400">
                          {selectedConsignment.tunnelRestrictionCode ||
                            "Sin restricción"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Panel 4: Tachograph Itinerary Timeline */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                    <Clock size={12} /> Tacógrafo Digital CE 561/2006 & Paradas
                    de Descanso
                  </span>

                  <div className="flex items-center gap-4 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                    <div>
                      <span className="text-slate-400">
                        Tiempo de Conducción:
                      </span>
                      <p className="font-bold text-white">
                        {selectedConsignment.estimatedDrivingHours} h
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Pausas de 45 min:</span>
                      <p className="font-bold text-amber-400">
                        {selectedConsignment.requiredRestBreaksCount}{" "}
                        obligatorias
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Salida:</span>
                      <p className="font-bold text-slate-300">
                        {new Date(
                          selectedConsignment.pickupDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    {selectedConsignment.specialInstructions}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              <Truck className="w-12 h-12 mb-2 stroke-1 opacity-40" />
              Seleccione una expedición terrestre para ver los detalles del
              e-CMR
            </div>
          )}
        </div>
      </div>

      {/* Simulator Modal */}
      <AnimatePresence>
        {showPlannerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-w-2xl w-full space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Planificador de Ruta, Tacógrafo y ADR 1.1.3.6
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cálculo de tiempos al volante, pausas reglamentarias y
                      puntos de exención ADR
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlannerModal(false)}
                  className="text-slate-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              {/* Route Form */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Origen
                  </label>
                  <Input
                    type="text"
                    value={simOrigin}
                    onChange={(e) => setSimOrigin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Destino
                  </label>
                  <Input
                    type="text"
                    value={simDest}
                    onChange={(e) => setSimDest(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Distancia (km)
                  </label>
                  <Input
                    type="number"
                    value={simDistanceKm}
                    onChange={(e) => setSimDistanceKm(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Euro-pallets (Máx 33)
                  </label>
                  <Input
                    type="number"
                    value={simPallets}
                    onChange={(e) => setSimPallets(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Peso Total (kg)
                  </label>
                  <Input
                    type="number"
                    value={simWeightKg}
                    onChange={(e) => setSimWeightKg(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* ADR Section */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Flame size={14} /> Incluir Mercancía Peligrosa ADR
                  </label>
                  <input
                    type="checkbox"
                    checked={simIsAdr}
                    onChange={(e) => setSimIsAdr(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500"
                  />
                </div>

                {simIsAdr && (
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Nº ONU
                      </label>
                      <Input
                        type="text"
                        value={simUnCode}
                        onChange={(e) => setSimUnCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Clase ADR
                      </label>
                      <Input
                        type="text"
                        value={simAdrClass}
                        onChange={(e) => setSimAdrClass(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Cat. Transporte
                      </label>
                      <select
                        value={simCategory}
                        onChange={(e) =>
                          setSimCategory(Number(e.target.value) as any)
                        }
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white"
                      >
                        <option value={1}>Cat. 1 (x50)</option>
                        <option value={2}>Cat. 2 (x3)</option>
                        <option value={3}>Cat. 3 (x1)</option>
                        <option value={4}>Cat. 4 (x0)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Cantidad (kg/L)
                      </label>
                      <Input
                        type="number"
                        value={simAdrQty}
                        onChange={(e) => setSimAdrQty(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isSimulating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Truck size={16} />
                    Planificar Ruta y Evaluar Exención 1.1.3.6
                  </>
                )}
              </button>

              {/* Simulation Result */}
              {simRouteResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-2 border-b border-white/10">
                    <div>
                      <span className="text-slate-400">Conducción:</span>
                      <p className="text-sm font-bold text-white">
                        {simRouteResult.estimatedDrivingHours} h
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Pausas 45 min:</span>
                      <p className="text-sm font-bold text-amber-400">
                        {simRouteResult.requiredRestBreaksCount} pausas
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Ocupación Trailer:</span>
                      <p className="text-sm font-bold text-emerald-400">
                        {simRouteResult.capacityUtilization.floorUtilizationPct}
                        %
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Puntos ADR:</span>
                      <p className="text-sm font-bold text-rose-400">
                        {simAdrResult
                          ? `${simAdrResult.totalPoints} pts`
                          : "0 pts"}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {simRouteResult.complianceNotes}
                  </p>
                  {simAdrResult && (
                    <p className="text-[11px] text-amber-300 font-medium">
                      {simAdrResult.complianceSummary}
                    </p>
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
