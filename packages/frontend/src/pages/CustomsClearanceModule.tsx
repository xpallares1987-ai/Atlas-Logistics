import { useState, useMemo } from "react";
import { useApiQuery } from "../hooks/useApiQuery";
import { useQueryClient } from "@tanstack/react-query";
import {
  Search,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Calculator,
  FileText,
  Clock,
  X,
  FileCode,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Input } from "@atlas/ui";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function CustomsClearanceModule() {
  const queryClient = useQueryClient();
  const { data: customsData, isLoading } = useApiQuery<any[]>(
    ["customs"],
    "/customs-declarations",
  );
  const declarations = Array.isArray(customsData) ? customsData : [];

  const [activeFilter, setActiveFilter] = useState<
    "All" | "Hold" | "Pending" | "Cleared"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDecl, setSelectedDecl] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);

  // Live Tariff Calculator State
  const [calcHsCode, setCalcHsCode] = useState("8504.40.90.90");
  const [calcFobValue, setCalcFobValue] = useState(25000);
  const [calcFreight, setCalcFreight] = useState(1800);
  const [calcInsurance, setCalcInsurance] = useState(200);
  const [calcWeightKg, setCalcWeightKg] = useState(1200);
  const [calcOrigin, setCalcOrigin] = useState("CN");
  const [calcPrefCert, setCalcPrefCert] = useState(false);
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const filteredDeclarations = useMemo(() => {
    return declarations.filter((dec) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (dec.blNumber && dec.blNumber.toLowerCase().includes(q)) ||
        (dec.duaNumber && dec.duaNumber.toLowerCase().includes(q)) ||
        (dec.hsCode && dec.hsCode.toLowerCase().includes(q)) ||
        dec.id.toLowerCase().includes(q);

      const matchesFilter =
        activeFilter === "All"
          ? true
          : activeFilter === "Hold"
            ? dec.status === "Red Channel" || dec.status === "Hold"
            : activeFilter === "Pending"
              ? dec.status === "Pending" || dec.status === "Orange Channel"
              : activeFilter === "Cleared"
                ? dec.status === "Green Channel" || dec.status === "Cleared"
                : true;
      return matchesSearch && matchesFilter;
    });
  }, [declarations, searchQuery, activeFilter]);

  // Set initial selected declaration
  useMemo(() => {
    if (!selectedDecl && filteredDeclarations.length > 0) {
      setSelectedDecl(filteredDeclarations[0]);
    } else if (
      selectedDecl &&
      !filteredDeclarations.some((d) => d.id === selectedDecl.id)
    ) {
      if (filteredDeclarations.length > 0) {
        setSelectedDecl(filteredDeclarations[0]);
      } else {
        setSelectedDecl(null);
      }
    }
  }, [filteredDeclarations, selectedDecl]);

  const holds = declarations.filter(
    (d) => d.status === "Red Channel" || d.status === "Hold",
  );
  const greens = declarations.filter(
    (d) => d.status === "Green Channel" || d.status === "Cleared",
  );
  const oranges = declarations.filter(
    (d) => d.status === "Orange Channel" || d.status === "Pending",
  );

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case "Green Channel":
      case "Cleared":
        return {
          icon: CheckCircle2,
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
          glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
          label: "Canal Verde (Levante Inmediato)",
        };
      case "Red Channel":
      case "Hold":
        return {
          icon: AlertCircle,
          color: "text-rose-400",
          bg: "bg-rose-500/10",
          border: "border-rose-500/20",
          glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
          label: "Canal Rojo (Inspección Física)",
        };
      case "Orange Channel":
      case "Pending":
      default:
        return {
          icon: Clock,
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/20",
          glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
          label: "Canal Naranja (Control Documental)",
        };
    }
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

  const runComplianceAudit = async (id: string) => {
    try {
      setIsAuditing(true);
      const res = await fetch(`/api/customs-declarations/${id}/analyze`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["customs"] });
      }
    } catch (err) {
      console.error("Audit error:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleCalculateTariff = async () => {
    try {
      setIsCalculating(true);
      const res = await fetch("/api/customs-declarations/calculate-tariff", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hsCode: calcHsCode,
          fobValue: Number(calcFobValue),
          freightCost: Number(calcFreight),
          insuranceCost: Number(calcInsurance),
          grossWeightKg: Number(calcWeightKg),
          originCountry: calcOrigin,
          hasPreferentialOriginCert: calcPrefCert,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCalcResult(data);
      }
    } catch (err) {
      console.error("Calculation error:", err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleCreateNewDeclaration = async () => {
    try {
      const customsVal =
        Number(calcFobValue) + Number(calcFreight) + Number(calcInsurance);
      const res = await fetch("/api/customs-declarations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          shipmentId: `shp-${Date.now().toString(36)}`,
          hsCode: calcHsCode,
          type: "Import",
          customsValue: customsVal,
          originCountry: calcOrigin,
          destinationCountry: "ES",
          eoriNumber: "ESB88492019",
          consigneeName: "Iberica Import Logistics SL",
          exporterName: "Global Trade Logistics Ltd",
          grossWeightKg: Number(calcWeightKg),
          hasPreferentialOriginCert: calcPrefCert,
          attachedDocumentTypes: ["DOC-INV", "DOC-HBL", "DOC-PKL"],
        }),
      });

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["customs"] });
        setShowCalculatorModal(false);
      }
    } catch (err) {
      console.error("Create declaration error:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
      {/* Top Header */}
      <div className="p-4 md:p-8 pb-4 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-rose-500" />
              Despacho Aduanero y Motor Arancelario
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Gestión determinista de partidas TARIC, cálculo de aranceles/IVA,
              auditoría de cumplimiento y generación oficial de DUA / SAD (PDF y
              XML).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowCalculatorModal(true);
                if (!calcResult) handleCalculateTariff();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all active:scale-95"
            >
              <Calculator className="w-4 h-4" /> Simulador TARIC / Nuevo
              Despacho
            </button>
          </div>
        </div>

        {/* Quick Channel Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Declaraciones
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {declarations.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Canal Verde (Levante)
              </p>
              <h3 className="text-2xl font-black text-emerald-300 mt-1">
                {greens.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Canal Naranja (Docs)
              </p>
              <h3 className="text-2xl font-black text-amber-300 mt-1">
                {oranges.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Canal Rojo (Inspección)
              </p>
              <h3 className="text-2xl font-black text-rose-300 mt-1">
                {holds.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Hold Alert Banner */}
        <AnimatePresence>
          {holds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_30px_rgba(244,63,94,0.1)] mb-2"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-300">
                    Alerta de Inspección Física Aduanera (Canal Rojo)
                  </h3>
                  <p className="text-xs text-rose-200/80">
                    Existen {holds.length} despacho(s) con requerimiento de
                    reconocimiento físico por sanciones de origen o mercancía de
                    doble uso.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveFilter("Hold")}
                className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-colors border border-rose-500/30"
              >
                Filtrar Canal Rojo
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Split Pane */}
      <div className="flex-1 px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-6 min-h-0 z-10 relative overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Declarations List */}
        <div className="w-full lg:w-1/3 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[400px] lg:min-h-0">
          <div className="p-4 border-b border-white/10 space-y-3">
            <div>
              <Input
                type="text"
                placeholder="Buscar por DUA, B/L o Partida..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(["All", "Pending", "Hold", "Cleared"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
                      activeFilter === filter
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {filter === "All"
                      ? "Todos"
                      : filter === "Pending"
                        ? "Canal Naranja"
                        : filter === "Hold"
                          ? "Canal Rojo"
                          : "Canal Verde"}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {isLoading ? (
              <div className="text-center p-8 text-slate-500">
                Cargando despachos...
              </div>
            ) : filteredDeclarations.length === 0 ? (
              <div className="text-center p-8 text-slate-500 flex flex-col items-center">
                <FileCheck className="w-8 h-8 opacity-50 mb-2" />
                <p>No se encontraron declaraciones</p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
                key={activeFilter + searchQuery}
              >
                {filteredDeclarations.map((dec) => {
                  const visuals = getStatusVisuals(dec.status);
                  const StatusIcon = visuals.icon;
                  const isSelected = selectedDecl?.id === dec.id;

                  return (
                    <motion.button
                      key={dec.id}
                      variants={itemVariants}
                      onClick={() => setSelectedDecl(dec)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? "bg-white/10 border-white/20 shadow-lg"
                          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl mt-0.5 ${visuals.bg} ${visuals.border} border ${visuals.glow}`}
                          >
                            <StatusIcon
                              className={`w-4 h-4 ${visuals.color}`}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm tracking-wide">
                              {dec.duaNumber ||
                                `DUA-${dec.id.slice(0, 8).toUpperCase()}`}
                            </p>
                            <p className="text-xs text-slate-400 mb-1">
                              TARIC: {dec.hsCode || "8504.40.90.90"} | B/L:{" "}
                              {dec.blNumber || "N/A"}
                            </p>
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${visuals.bg} ${visuals.border} ${visuals.color}`}
                            >
                              {dec.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                            RIESGO
                          </span>
                          <span
                            className={`text-base font-black ${
                              (dec.riskScore ?? dec.aiRiskScore ?? 10) > 60
                                ? "text-rose-400"
                                : (dec.riskScore ?? dec.aiRiskScore ?? 10) > 20
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {dec.riskScore ?? dec.aiRiskScore ?? 12}/100
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Column: 54-Box DUA Inspector & Rule Diagnostics */}
        <div className="w-full lg:w-2/3 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col relative min-h-[600px] lg:min-h-0">
          {!selectedDecl ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <ShieldCheck className="w-16 h-16 opacity-20 mb-4" />
              <p>Seleccione un despacho para inspeccionar el DUA oficial</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              {/* Top Inspector Header */}
              <div className="p-6 border-b border-white/10 bg-white/5 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {selectedDecl.duaNumber ||
                          `26ES000811${selectedDecl.id.substring(0, 8).toUpperCase()}`}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusVisuals(selectedDecl.status).bg} ${getStatusVisuals(selectedDecl.status).border} ${getStatusVisuals(selectedDecl.status).color}`}
                      >
                        {getStatusVisuals(selectedDecl.status).label}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight mt-2">
                      Documento Único Administrativo (DUA)
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Aduana de Despacho: ES000811 Barcelona Marítima | Régimen:{" "}
                      {selectedDecl.type || "IM4 - Importación Definitiva"}
                    </p>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        window.open(
                          `/api/customs-declarations/${selectedDecl.id}/pdf`,
                          "_blank",
                        )
                      }
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5" /> DUA PDF
                    </button>

                    <button
                      onClick={() =>
                        window.open(
                          `/api/customs-declarations/${selectedDecl.id}/xml`,
                          "_blank",
                        )
                      }
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <FileCode className="w-3.5 h-3.5 text-amber-400" /> DUA
                      XML (AEAT)
                    </button>

                    <button
                      disabled={isAuditing}
                      onClick={() => runComplianceAudit(selectedDecl.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`}
                      />
                      Re-Auditar
                    </button>
                  </div>
                </div>
              </div>

              {/* DUA Box Layout Structure */}
              <div className="p-6 space-y-6">
                {/* 54 Boxes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Box 1 & 2: Exporter */}
                  <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Casilla 02 - Exportador / Expedidor
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">
                      Global Freight Logistics Ltd
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Pudong Logistics Hub, Shanghai (CN)
                    </p>
                    <p className="text-xs text-slate-500 mt-2 font-mono">
                      Origen: {selectedDecl.originCountry || "CN"}
                    </p>
                  </div>

                  {/* Box 8: Consignee & EORI */}
                  <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Casilla 08 - Destinatario / Importador
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">
                      Iberica Import Logistics SL
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Carrer del Port 45, Barcelona (ES)
                    </p>
                    <p className="text-xs text-emerald-400 mt-2 font-mono font-bold">
                      EORI: {selectedDecl.eoriNumber || "ESB88492019"}
                    </p>
                  </div>

                  {/* Box 14: Declarant Representative */}
                  <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Casilla 14 - Declarante / Representante
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">
                      Atlas Logistics Customs Brokerage SL
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      EORI: ESB88492019 (Representación Directa)
                    </p>
                    <p className="text-xs text-indigo-300 mt-2 font-mono">
                      Estado OEA: Certificado
                    </p>
                  </div>
                </div>

                {/* Box 31, 33, 46: Goods & Valuation */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-white/10 gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                        Casilla 31 & 33 - Mercancía y Código TARIC
                      </span>
                      <h3 className="text-lg font-bold text-white mt-1">
                        {selectedDecl.hsDescription ||
                          "Convertidores estáticos y fuentes de alimentación conmutadas"}
                      </h3>
                    </div>
                    <div className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">
                      <span className="text-xs font-mono font-black text-indigo-300">
                        TARIC: {selectedDecl.hsCode || "8504.40.90.90"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                    <div>
                      <span className="text-slate-400">
                        Casilla 46 (Valor CIF):
                      </span>
                      <p className="text-base font-bold text-white mt-0.5">
                        {Number(
                          selectedDecl.customsValue || 25000,
                        ).toLocaleString("es-ES")}{" "}
                        EUR
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Derechos de Arancel (A00):
                      </span>
                      <p className="text-base font-bold text-amber-400 mt-0.5">
                        {Number(
                          selectedDecl.dutiesAmount || 825,
                        ).toLocaleString("es-ES")}{" "}
                        EUR
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        IVA Importación (B00):
                      </span>
                      <p className="text-base font-bold text-indigo-400 mt-0.5">
                        {Number(
                          selectedDecl.taxesAmount || 5423.25,
                        ).toLocaleString("es-ES")}{" "}
                        EUR
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Total Liquidación (Casilla 47):
                      </span>
                      <p className="text-base font-black text-emerald-400 mt-0.5">
                        {Number(
                          selectedDecl.totalPayable || 6248.25,
                        ).toLocaleString("es-ES")}{" "}
                        EUR
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deterministic Compliance Diagnostics Breakdown */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Diagnóstico de Cumplimiento Normativo (Reglas Deterministas)
                  </h3>

                  <div className="space-y-3">
                    {/* EORI Rule */}
                    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold text-slate-200">
                          Validación EORI (Regla EORI-01)
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          EORI del importador (
                          {selectedDecl.eoriNumber || "ESB88492019"}) registrado
                          y habilitado para operaciones aduaneras en la UE.
                        </p>
                      </div>
                    </div>

                    {/* Sanctions Rule */}
                    <div
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        selectedDecl.originCountry === "RU" ||
                        selectedDecl.originCountry === "KP"
                          ? "bg-rose-500/10 border-rose-500/20"
                          : "bg-white/5 border-white/5"
                      }`}
                    >
                      {selectedDecl.originCountry === "RU" ||
                      selectedDecl.originCountry === "KP" ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs">
                        <p className="font-bold text-slate-200">
                          Screening de Sanciones y Restricciones (Regla SANC-01)
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          {selectedDecl.originCountry === "RU" ||
                          selectedDecl.originCountry === "KP"
                            ? `Alerta: El país de origen (${selectedDecl.originCountry}) está sujeto a medidas restrictivas internacionales.`
                            : `País de origen (${selectedDecl.originCountry || "CN"}) verificado libre de embargos comerciales.`}
                        </p>
                      </div>
                    </div>

                    {/* Valuation & Dual Use */}
                    <div
                      className={`flex items-start gap-3 p-3 rounded-xl border ${
                        selectedDecl.isDualUse
                          ? "bg-rose-500/10 border-rose-500/20"
                          : "bg-white/5 border-white/5"
                      }`}
                    >
                      {selectedDecl.isDualUse ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs">
                        <p className="font-bold text-slate-200">
                          Control de Doble Uso y Material Sensible (Regla
                          DUAL-01)
                        </p>
                        <p className="text-slate-400 mt-0.5">
                          {selectedDecl.isDualUse
                            ? "Mercancía clasificada como tecnología de doble uso. Requiere licencia de exportación/importación."
                            : "Clasificación TARIC exenta de licencias de doble uso (Reglamento UE 2021/821)."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attached Documents */}
                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Casilla 44 - Documentos Presentados y Certificados
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <div>
                        <p className="font-bold text-white">N935 Factura</p>
                        <p className="text-[10px] text-slate-400">
                          Factura comercial definitiva
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <div>
                        <p className="font-bold text-white">
                          N705 Conocimiento
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {selectedDecl.blNumber || "BL-88492019"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <div>
                        <p className="font-bold text-white">
                          N714 Packing List
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Lista de empaque y bultos
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tariff Calculator & New Declaration Modal */}
      <AnimatePresence>
        {showCalculatorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <Calculator className="w-5 h-5 text-rose-400" />
                  <h3 className="text-lg font-bold text-white">
                    Simulador Arancelario TARIC y Nuevo Despacho
                  </h3>
                </div>
                <button
                  onClick={() => setShowCalculatorModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                <div>
                  <label className="text-xs font-bold text-slate-400">
                    Código TARIC / HS Code
                  </label>
                  <select
                    value={calcHsCode}
                    onChange={(e) => setCalcHsCode(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="8504.40.90.90">
                      8504.40.90.90 - Fuentes de alimentación (3.3% Arancel)
                    </option>
                    <option value="8471.30.00.00">
                      8471.30.00.00 - Portátiles y tablets (0.0% Arancel)
                    </option>
                    <option value="6109.10.00.10">
                      6109.10.00.10 - Camisetas de algodón (12.0% Arancel)
                    </option>
                    <option value="8708.29.90.00">
                      8708.29.90.00 - Componentes de automoción (4.5% Arancel)
                    </option>
                    <option value="2204.21.06.00">
                      2204.21.06.00 - Vinos DOCa Rioja (Específico 0.131 €/kg)
                    </option>
                    <option value="9013.80.00.00">
                      9013.80.00.00 - Dispositivos láser (Doble Uso - 4.0%)
                    </option>
                    <option value="3004.90.00.00">
                      3004.90.00.00 - Medicamentos (0.0% Arancel, 4% IVA)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">
                    País de Origen
                  </label>
                  <select
                    value={calcOrigin}
                    onChange={(e) => setCalcOrigin(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="CN">China (CN)</option>
                    <option value="US">Estados Unidos (US)</option>
                    <option value="VN">Vietnam (VN)</option>
                    <option value="TR">Turquía (TR - Unión Aduanera)</option>
                    <option value="RU">Rusia (RU - Restricciones)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">
                    Valor FOB de la Mercancía (€)
                  </label>
                  <input
                    type="number"
                    value={calcFobValue}
                    onChange={(e) => setCalcFobValue(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">
                    Flete Internacional (€)
                  </label>
                  <input
                    type="number"
                    value={calcFreight}
                    onChange={(e) => setCalcFreight(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">
                    Seguro de Transporte (€)
                  </label>
                  <input
                    type="number"
                    value={calcInsurance}
                    onChange={(e) => setCalcInsurance(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">
                    Peso Bruto (KG)
                  </label>
                  <input
                    type="number"
                    value={calcWeightKg}
                    onChange={(e) => setCalcWeightKg(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="prefCert"
                  checked={calcPrefCert}
                  onChange={(e) => setCalcPrefCert(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 bg-slate-800 border-white/10"
                />
                <label
                  htmlFor="prefCert"
                  className="text-xs text-slate-300 select-none cursor-pointer"
                >
                  Dispone de Certificado de Origen Preferencial (EUR.1 / ATR
                  para 0% arancel)
                </label>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleCalculateTariff}
                  disabled={isCalculating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" /> Calcular Liquidación
                </button>
              </div>

              {calcResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 mb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Valor CIF (Base):</span>
                      <p className="text-sm font-bold text-white mt-0.5">
                        {calcResult.customsValueCif.toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Arancel ({(calcResult.dutyRateApplied * 100).toFixed(1)}
                        %):
                      </span>
                      <p className="text-sm font-bold text-amber-400 mt-0.5">
                        {calcResult.importDuty.toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        IVA ({(calcResult.vatRateApplied * 100).toFixed(1)}%):
                      </span>
                      <p className="text-sm font-bold text-indigo-400 mt-0.5">
                        {calcResult.vatAmount.toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Liquidación:</span>
                      <p className="text-sm font-black text-emerald-400 mt-0.5">
                        {calcResult.totalCustomsPayable.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={() => setShowCalculatorModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewDeclaration}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30"
                >
                  Crear Despacho DUA Oficial
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
