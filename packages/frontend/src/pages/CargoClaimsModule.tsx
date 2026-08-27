import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  ShieldAlert,
  Scale,
  Download,
  Search,
  Calculator,
  Ship,
  Plane,
  Truck,
  Building,
  Calendar,
  AlertTriangle,
  FileText,
  DollarSign,
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

export default function CargoClaimsModule() {
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  // Simulator State
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [simConvention, setSimConvention] = useState("HAGUE_VISBY");
  const [simMode, setSimMode] = useState("OCEAN");
  const [simWeightKg, setSimWeightKg] = useState(3200);
  const [simPackages, setSimPackages] = useState(4);
  const [simClaimedAmount, setSimClaimedAmount] = useState(24500);
  const [simIncidentDate, setSimIncidentDate] = useState(
    new Date().toISOString().substring(0, 10),
  );
  const [simDeliveryDate, setSimDeliveryDate] = useState(
    new Date().toISOString().substring(0, 10),
  );
  const [simResult, setSimResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch Claims
  const { data: claims = [], isLoading } = useApiQuery<any[]>(
    ["cargo-claims", activeFilter, searchQuery],
    `/claims?convention=${activeFilter}&q=${encodeURIComponent(searchQuery)}`,
  );

  // Auto-select first claim
  React.useEffect(() => {
    if (claims.length > 0 && !selectedClaim) {
      setSelectedClaim(claims[0]);
    }
  }, [claims, selectedClaim]);

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

  const calculateLiability = async () => {
    try {
      setIsCalculating(true);
      const headers = getAuthHeaders();

      const res = await fetch("/api/claims/calculate-liability", {
        method: "POST",
        headers,
        body: JSON.stringify({
          convention: simConvention,
          transportMode: simMode,
          damagedWeightKg: Number(simWeightKg),
          packagesCount: Number(simPackages),
          claimedAmount: Number(simClaimedAmount),
          incidentDate: simIncidentDate,
          deliveryDate: simDeliveryDate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimResult(data.liability);
      }
    } catch (err) {
      console.error("Claims calculator error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  // KPIs
  const totalClaimsCount = claims.length;
  const totalClaimedEur = claims.reduce(
    (acc, c) => acc + (c.claimedAmount || 0),
    0,
  );
  const totalStatutoryLimitEur = claims.reduce(
    (acc, c) => acc + (c.statutoryLimitEur || 0),
    0,
  );
  const totalRecoveredEur = claims.reduce(
    (acc, c) => acc + (c.subrogationRecoveredAmount || 0),
    0,
  );

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "AIR":
        return <Plane className="w-4 h-4" />;
      case "ROAD":
        return <Truck className="w-4 h-4" />;
      default:
        return <Ship className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Gradients */}
      <div className="absolute top-0 right-1/3 w-[600px] h-[300px] bg-rose-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[300px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Header & KPI Summary */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                Siniestros de Carga & Recobros Subrogatorios
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Límites Estatutarios DEG
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Liquidación de límites de responsabilidad bajo La Haya-Visby (2
              DEG/kg), Montreal (22 DEG/kg) y CMR (8,33 DEG/kg), emisión de
              cartas de reserva y gestión de recobro subrogatorio.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowSimulatorModal(true);
                if (!simResult) calculateLiability();
              }}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-lg shadow-rose-600/25 hover:shadow-rose-600/40 transition-all flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculadora DEG y Prescripción
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Expedientes
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {totalClaimsCount}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Siniestros y averías activas
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Importe Reclamado
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {(totalClaimedEur / 1000).toFixed(1)} k€
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {totalClaimedEur.toLocaleString()} € en reclamaciones
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Límite Estatutario (DEG)
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {(totalStatutoryLimitEur / 1000).toFixed(1)} k€
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Scale className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Tope legal frente al porteador
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Recobro Liquidado
                </p>
                <h3 className="text-2xl font-black text-white mt-1">
                  {(totalRecoveredEur / 1000).toFixed(1)} k€
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {totalRecoveredEur.toLocaleString()} € recuperados
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Pane */}
      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Claims List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
          <div className="p-4 border-b border-white/10 space-y-3">
            <Input
              type="text"
              placeholder="Buscar Siniestro, B/L, AWB, Porteador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
            />
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(["ALL", "HAGUE_VISBY", "MONTREAL_1999", "CMR"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeFilter === filter
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {filter === "ALL"
                      ? "Todos"
                      : filter === "HAGUE_VISBY"
                        ? "Marítimo (Haya)"
                        : filter === "MONTREAL_1999"
                          ? "Aéreo (Montreal)"
                          : "Carretera (CMR)"}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
              </div>
            ) : claims.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No se encontraron expedientes de siniestros.
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
                key={activeFilter + searchQuery}
              >
                {claims.map((claim) => {
                  const isSelected = selectedClaim?.id === claim.id;
                  return (
                    <motion.div
                      key={claim.id}
                      variants={itemVariants}
                      onClick={() => setSelectedClaim(claim)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-white/10 border-white/20 shadow-lg"
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mt-0.5">
                            {getModeIcon(claim.transportMode)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-sm tracking-wide">
                                {claim.claimNumber}
                              </p>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  claim.status === "RECOVERED"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : claim.status === "SUBROGATED"
                                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {claim.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium truncate max-w-[220px] mt-0.5">
                              Doc: {claim.transportDocNumber}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                              {claim.carrierName}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-rose-300">
                            {claim.claimedAmount?.toLocaleString()}{" "}
                            {claim.claimedCurrency}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-1">
                            {claim.damagedWeightKg} kg daño
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

        {/* Right Column: Claim & Subrogation Inspector */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px]">
          {selectedClaim ? (
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {selectedClaim.governingConvention}
                    </span>
                    <h2 className="text-xl font-black text-white tracking-wide">
                      {selectedClaim.claimNumber}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Doc: {selectedClaim.transportDocNumber} | Porteador:{" "}
                    {selectedClaim.carrierName}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/claims/${selectedClaim.id}/protest-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    Carta de Protesta (PDF)
                  </a>
                  <a
                    href={`/api/claims/${selectedClaim.id}/subrogation-pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Download size={14} />
                    Recibo Subrogación (PDF)
                  </a>
                </div>
              </div>

              {/* 4-Box Inspector Details */}
              <div className="p-4 md:p-6 space-y-4">
                {/* Box 1: Transport & Incident */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-rose-400 uppercase flex items-center gap-1.5">
                      <Building size={12} /> Datos de Transporte y Reclamante
                    </span>
                    <p className="text-sm font-bold text-white">
                      {selectedClaim.claimantName}
                    </p>
                    <p className="text-xs text-slate-300">
                      Porteador: {selectedClaim.carrierName}
                    </p>
                    <p className="text-xs text-slate-400">
                      Doc: {selectedClaim.transportDocNumber} | Modo:{" "}
                      {selectedClaim.transportMode}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                      <Calendar size={12} /> Cronología del Siniestro
                    </span>
                    <p className="text-xs text-slate-300">
                      Fecha Siniestro:{" "}
                      {new Date(
                        selectedClaim.incidentDate,
                      ).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-300">
                      Fecha Notificación / Protesta:{" "}
                      {new Date(selectedClaim.noticeDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-400">
                      Tipo de Daño:{" "}
                      <strong className="text-white">
                        {selectedClaim.incidentType}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Box 2: Damage Description & Surveyor Evidence */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                    Declaración de Daños & Peritación Técnica
                  </span>
                  <p className="text-xs text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                    {selectedClaim.incidentDescription}
                  </p>
                  {selectedClaim.surveyorData && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-slate-400">
                          Perito Designado:
                        </span>
                        <p className="font-bold text-white">
                          {selectedClaim.surveyorData.surveyorName}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          Informe Pericial:
                        </span>
                        <p className="font-bold text-sky-400">
                          {selectedClaim.surveyorData.reportNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          Demérito Evaluado:
                        </span>
                        <p className="font-bold text-rose-400">
                          {selectedClaim.surveyorData.assessedDepreciationPct}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Box 3: Statutory SDR Liability Liquidation */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/20 to-amber-950/20 border border-rose-500/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black tracking-wider text-rose-300 uppercase flex items-center gap-1.5">
                      <Scale size={12} /> Liquidación Estatutaria de
                      Responsabilidad (DEG)
                    </span>
                    <span className="text-xs font-bold text-amber-300">
                      Tasa: {selectedClaim.statutorySdrRate} DEG / kg
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Peso Dañado:</span>
                      <p className="text-sm font-bold text-white">
                        {selectedClaim.damagedWeightKg} kg
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Importe Reclamado:</span>
                      <p className="text-sm font-bold text-rose-400">
                        {selectedClaim.claimedAmount?.toLocaleString()}{" "}
                        {selectedClaim.claimedCurrency}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Límite Estatutario:
                      </span>
                      <p className="text-sm font-bold text-sky-400">
                        {selectedClaim.statutoryLimitEur?.toLocaleString()} €
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Responsabilidad Neta:
                      </span>
                      <p className="text-sm font-bold text-emerald-400">
                        {Math.min(
                          selectedClaim.claimedAmount,
                          selectedClaim.statutoryLimitEur,
                        ).toLocaleString()}{" "}
                        €
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    {selectedClaim.recoveryNotes}
                  </p>
                </div>

                {/* Box 4: Insurance Policy Settlement & Subrogation Ledger */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                      Indemnización Póliza Asegurada
                    </span>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-xs text-slate-400">
                        Valor Asegurado:
                      </span>
                      <span className="text-xs font-bold text-white">
                        {selectedClaim.insuranceInsuredValue?.toLocaleString()}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400">
                        Franquicia Deducible:
                      </span>
                      <span className="text-xs font-bold text-rose-400">
                        -{" "}
                        {selectedClaim.insurancePolicyDeductible?.toLocaleString()}{" "}
                        €
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                      <span className="text-xs font-bold text-slate-200">
                        Indemnización Abonada:
                      </span>
                      <span className="text-sm font-black text-emerald-400">
                        {selectedClaim.insurancePayoutAmount?.toLocaleString()}{" "}
                        €
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <span className="text-[10px] font-black tracking-wider text-emerald-300 uppercase">
                      Recobro Subrogatorio frente al Porteador
                    </span>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-xs text-slate-400">
                        Finiquito y Cesión:
                      </span>
                      <span className="text-xs font-bold text-emerald-300">
                        {selectedClaim.subrogationSigned
                          ? "Firmado"
                          : "Pendiente"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                      <span className="text-xs font-bold text-slate-200">
                        Importe Recobrado:
                      </span>
                      <span className="text-lg font-black text-white">
                        {selectedClaim.subrogationRecoveredAmount?.toLocaleString()}{" "}
                        €
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
              <ShieldAlert className="w-12 h-12 mb-2 stroke-1 opacity-40" />
              Seleccione un siniestro para inspeccionar la liquidación
              estatutaria y el recobro
            </div>
          )}
        </div>
      </div>

      {/* Calculator Modal */}
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
                  <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      Calculadora de Responsabilidad Estatutaria (DEG)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Límites según convenios internacionales y cómputo de
                      plazos de prescripción
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
                    Convenio Internacional
                  </label>
                  <select
                    value={simConvention}
                    onChange={(e) => {
                      setSimConvention(e.target.value);
                      if (e.target.value === "MONTREAL_1999") setSimMode("AIR");
                      if (e.target.value === "CMR") setSimMode("ROAD");
                      if (
                        e.target.value === "HAGUE_VISBY" ||
                        e.target.value === "HAMBURG"
                      )
                        setSimMode("OCEAN");
                    }}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="HAGUE_VISBY">
                      Hague-Visby Rules (Marítimo 2 DEG/kg)
                    </option>
                    <option value="HAMBURG">
                      Hamburg Rules (Marítimo 2.5 DEG/kg)
                    </option>
                    <option value="MONTREAL_1999">
                      Montreal 1999 (Aéreo 22 DEG/kg)
                    </option>
                    <option value="CMR">
                      CMR Convention (Carretera 8.33 DEG/kg)
                    </option>
                    <option value="CIM_COTIF">
                      CIM / COTIF (Ferrocarril 17 DEG/kg)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Modo de Transporte
                  </label>
                  <select
                    value={simMode}
                    onChange={(e) => setSimMode(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="OCEAN">Marítimo (OCEAN)</option>
                    <option value="AIR">Aéreo (AIR)</option>
                    <option value="ROAD">Carretera (ROAD)</option>
                    <option value="RAIL">Ferrocarril (RAIL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Peso Dañado (kg)
                  </label>
                  <Input
                    type="number"
                    value={simWeightKg}
                    onChange={(e) => setSimWeightKg(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Bultos / Pallets
                  </label>
                  <Input
                    type="number"
                    value={simPackages}
                    onChange={(e) => setSimPackages(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Daño Reclamado (€)
                  </label>
                  <Input
                    type="number"
                    value={simClaimedAmount}
                    onChange={(e) =>
                      setSimClaimedAmount(Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Fecha del Siniestro
                  </label>
                  <Input
                    type="date"
                    value={simIncidentDate}
                    onChange={(e) => setSimIncidentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Fecha de Entrega
                  </label>
                  <Input
                    type="date"
                    value={simDeliveryDate}
                    onChange={(e) => setSimDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={calculateLiability}
                disabled={isCalculating}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isCalculating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Scale size={16} />
                    Calcular Límite DEG y Plazo de Prescripción
                  </>
                )}
              </button>

              {/* Result Details */}
              {simResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-2 border-b border-white/10">
                    <div>
                      <span className="text-slate-400">Tasa Aplicable:</span>
                      <p className="text-sm font-bold text-white">
                        {simResult.statutorySdrRatePerKg} DEG/kg
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Límite Legal DEG:</span>
                      <p className="text-sm font-bold text-sky-400">
                        {simResult.totalStatutoryLimitSdr.toFixed(2)} DEG
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Tope Máximo EUR:</span>
                      <p className="text-sm font-bold text-emerald-400">
                        {simResult.totalStatutoryLimitEur.toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Plazo Caducidad:</span>
                      <p className="text-sm font-bold text-amber-400">
                        {simResult.timeBarDays} días
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {simResult.legalRecommendation}
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
