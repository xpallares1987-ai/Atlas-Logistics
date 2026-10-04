import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Radio,
  RefreshCw,
  TrendingDown,
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  Activity,
  FileCheck2,
  Scale,
  Sparkles,
  PlusCircle,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function ControlTowerModule() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "radar" | "kanban" | "audit" | "customs" | "spot"
  >("radar");

  // State
  const [kpis, setKpis] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selected incident for modal resolution
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // New incident modal
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [newIncidentData, setNewIncidentData] = useState({
    title: "",
    incidentType: "PORT_CONGESTION",
    severity: "HIGH",
    description: "",
    impactAmountEur: 1200,
    delayHours: 12,
    locationName: "",
    shipmentId: "SH-1001",
  });

  // 3-Way Match Freight Audit
  const [auditMatches, setAuditMatches] = useState<any[]>([]);
  const [disputeModalLine, setDisputeModalLine] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("UNJUSTIFIED_DEMURRAGE");
  const [disputeNote, setDisputeNote] = useState("");

  // Customs ICS2 Radar
  const [customsRadar, setCustomsRadar] = useState<any[]>([]);
  const [showNewIcs2Modal, setShowNewIcs2Modal] = useState(false);
  const [ics2Form, setIcs2Form] = useState({
    declarantEori: "ESB99482716",
    customsOfficeCode: "ES004611",
    shipmentId: "SH-1001",
    notes: "Despacho anticipado de mercancía general.",
  });

  // Spot Rate Calculator
  const [spotParams, setSpotParams] = useState({
    origin: "Puerto de Valencia (VLC)",
    destination: "Zaragoza Plataforma Logística (PLAZA)",
    transportMode: "OCEAN_FCL",
    containerType: "40HC",
    distanceKm: 320,
    targetMarginPct: 15,
    includeCustoms: true,
  });
  const [spotQuote, setSpotQuote] = useState<any>(null);
  const [isCalculatingSpot, setIsCalculatingSpot] = useState(false);

  // Autonomous mode threshold toggle
  const [autonomousModeActive, setAutonomousModeActive] = useState(true);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpisRes, incidentsRes, auditRes, customsRes] = await Promise.all([
        fetch("/api/control-tower/kpis").then((r) => r.json()),
        fetch("/api/control-tower/incidents").then((r) => r.json()),
        fetch("/api/control-tower/audit/matches").then((r) => r.json()),
        fetch("/api/control-tower/customs/radar").then((r) => r.json()),
      ]);

      if (kpisRes.success) setKpis(kpisRes.data);
      if (incidentsRes.success) setIncidents(incidentsRes.data);
      if (auditRes.success) setAuditMatches(auditRes.data);
      if (customsRes.success) setCustomsRadar(customsRes.data);
    } catch (err) {
      console.error("Error fetching Control Tower data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered incidents
  const filteredIncidents = incidents.filter((i) => {
    if (severityFilter !== "ALL" && i.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    return true;
  });

  // Handle Create Incident
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/control-tower/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIncidentData),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewIncidentModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to create incident", err);
    }
  };

  // Handle Resolve Incident
  const handleResolveIncident = async (optionId?: string) => {
    if (!selectedIncident) return;
    setIsResolving(true);
    try {
      const actionText = optionId
        ? "Re-enrutamiento multimodal aprobado y despachado"
        : resolutionNote || "Incidencia resuelta por operador";

      const res = await fetch(
        `/api/control-tower/incidents/${selectedIncident.id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionText,
            selectedOptionId: optionId,
            resolvedBy: user?.name || user?.email || "OPERADOR_CENTRAL",
          }),
        },
      );
      const json = await res.json();
      if (json.success) {
        setSelectedIncident(null);
        setResolutionNote("");
        fetchData();
      }
    } catch (err) {
      console.error("Failed to resolve incident", err);
    } finally {
      setIsResolving(false);
    }
  };

  // Handle Raise Dispute
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalLine) return;
    try {
      const res = await fetch("/api/control-tower/audit/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceLineId: disputeModalLine.lineId,
          carrierInvoiceId: disputeModalLine.carrierInvoiceId,
          reason: disputeReason,
          resolutionNote: disputeNote,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDisputeModalLine(null);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to raise dispute", err);
    }
  };

  // Handle File ICS2
  const handleFileIcs2 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/control-tower/customs/file-ics2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ics2Form),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewIcs2Modal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to file ICS2", err);
    }
  };

  // Handle Calculate Spot
  const handleCalculateSpot = async () => {
    setIsCalculatingSpot(true);
    try {
      const res = await fetch("/api/control-tower/rates/calculate-spot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spotParams),
      });
      const json = await res.json();
      if (json.success) {
        setSpotQuote(json.data);
      }
    } catch (err) {
      console.error("Failed to calculate spot", err);
    } finally {
      setIsCalculatingSpot(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-900 text-slate-100">
      {/* Header & Cockpit Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Radio className="text-white animate-pulse" size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Torre de Control Autónoma Multimodal
              </h1>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                LIVE OPS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Detección de incidentes en tiempo real, re-enrutamiento con IA,
              auditoría 3-way match y radar aduanero ICS2.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Autonomous Mode Toggle */}
          <button
            onClick={() => setAutonomousModeActive(!autonomousModeActive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autonomousModeActive
                ? "bg-indigo-950/70 border-indigo-500 text-indigo-300"
                : "bg-slate-800 border-slate-700 text-slate-400"
            }`}
          >
            <Zap
              size={14}
              className={
                autonomousModeActive ? "text-indigo-400 fill-indigo-400" : ""
              }
            />
            {autonomousModeActive
              ? "Modo Autónomo Activo (<500€ / 3h)"
              : "Supervisión Manual Estricta"}
          </button>

          <button
            onClick={() => setShowNewIncidentModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-colors"
          >
            <ShieldAlert size={15} />
            + Nueva Incidencia
          </button>

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Global Control Tower KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SLA On-Time</span>
            <Activity size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {kpis?.onTimeSlaPct ?? 94.4}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            Cumplimiento contractual
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Incidentes Activos</span>
            <ShieldAlert size={14} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {kpis?.activeIncidentsCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            Requieren atención ops
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Tasa Auto-Resolución</span>
            <Zap size={14} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 mt-2">
            {kpis?.autoResolvedPct ?? 0}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {kpis?.autoResolvedCount ?? 0} casos mitigados con IA
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Flete Disputado</span>
            <Scale size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">
            €{kpis?.totalDisputedFreightEur?.toLocaleString() ?? "0"}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {kpis?.activeDisputesCount ?? 0} disputas 3-way match
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Riesgo CO2 Extra</span>
            <TrendingDown size={14} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-2">
            {kpis?.carbonAtRiskTonnes ?? 0} t
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            Mitigable por re-enrutamiento
          </span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Levante Aduanero</span>
            <FileCheck2 size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {kpis?.customsRadar?.autoClearanceRatePct ?? 0}%
          </div>
          <span className="text-[10px] text-emerald-400 mt-1">
            {kpis?.customsRadar?.green ?? 0} Circuito Verde AEAT
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("radar")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "radar"
              ? "border-indigo-500 text-white bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Radio size={14} />
          Radar de Incidentes & SLA
        </button>

        <button
          onClick={() => setActiveTab("kanban")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "kanban"
              ? "border-indigo-500 text-white bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers size={14} />
          Tablero Kanban de Excepciones
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "audit"
              ? "border-indigo-500 text-white bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scale size={14} />
          Auditoría 3-Way Match & Disputas
        </button>

        <button
          onClick={() => setActiveTab("customs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "customs"
              ? "border-indigo-500 text-white bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCheck2 size={14} />
          Ventanilla Única & ICS2 Radar
        </button>

        <button
          onClick={() => setActiveTab("spot")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "spot"
              ? "border-indigo-500 text-white bg-indigo-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles size={14} />
          Calculadora Spot Multimodal
        </button>
      </div>

      {/* TAB 1: RADAR DE INCIDENTES & RE-ENRUTAMIENTO */}
      {activeTab === "radar" && (
        <div className="flex flex-col gap-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Severidad:</span>
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    severityFilter === sev
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {sev === "ALL" ? "Todas" : sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Estado:</span>
              {["ALL", "OPEN", "ANALYZING", "AUTO_RESOLVED", "RESOLVED"].map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      statusFilter === st
                        ? "bg-slate-700 text-white font-semibold"
                        : "bg-slate-800/80 text-slate-400 hover:text-white"
                    }`}
                  >
                    {st === "ALL" ? "Todos" : st}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Incidents Cards List */}
          <div className="grid grid-cols-1 gap-3">
            {filteredIncidents.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-xl border border-dashed border-slate-800">
                No se encontraron incidencias activas con los filtros
                seleccionados.
              </div>
            ) : (
              filteredIncidents.map((incident) => {
                const isCritical = incident.severity === "CRITICAL";
                const isHigh = incident.severity === "HIGH";
                const isResolved =
                  incident.status === "RESOLVED" ||
                  incident.status === "AUTO_RESOLVED";

                return (
                  <div
                    key={incident.id}
                    className={`bg-slate-800/70 border rounded-xl p-4 transition-all hover:border-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCritical
                        ? "border-rose-500/40 bg-rose-950/10"
                        : isHigh
                          ? "border-amber-500/40 bg-amber-950/10"
                          : "border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3 max-w-2xl">
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          isCritical
                            ? "bg-rose-500/20 text-rose-400"
                            : isHigh
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        <ShieldAlert size={20} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">
                            {incident.incidentNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                              isCritical
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : isHigh
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {incident.severity}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-700/60 text-slate-300">
                            {incident.incidentType}
                          </span>
                          {incident.shipmentId && (
                            <span className="text-xs text-slate-400 font-mono">
                              Envío: {incident.shipmentId}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-white text-sm mt-1">
                          {incident.title}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                          {incident.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-2">
                          <span>📍 {incident.locationName}</span>
                          <span>
                            ⏱️ Retraso estimado: +{incident.delayHours}h
                          </span>
                          <span>
                            💶 Impacto económico: €
                            {incident.impactAmountEur?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        {incident.autoResolved && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                            <Zap size={11} />
                            AUTO-RESUELTO
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                            isResolved
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : incident.status === "ANALYZING"
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {incident.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
                        >
                          <Sparkles size={13} />
                          {isResolved
                            ? "Ver Detalle"
                            : "Ver Opciones / Resolver"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TABLERO KANBAN DE EXCEPCIONES */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              title: "1. Detectados / Abiertos",
              status: "OPEN",
              color: "border-rose-500/40 bg-rose-950/10",
            },
            {
              title: "2. En Análisis con IA",
              status: "ANALYZING",
              color: "border-indigo-500/40 bg-indigo-950/10",
            },
            {
              title: "3. Auto-Resueltos",
              status: "AUTO_RESOLVED",
              color: "border-cyan-500/40 bg-cyan-950/10",
            },
            {
              title: "4. Aprobados / Resueltos",
              status: "RESOLVED",
              color: "border-emerald-500/40 bg-emerald-950/10",
            },
          ].map((col) => {
            const colIncidents = incidents.filter((i) =>
              col.status === "AUTO_RESOLVED"
                ? i.autoResolved || i.status === "AUTO_RESOLVED"
                : col.status === "RESOLVED"
                  ? i.status === "RESOLVED" && !i.autoResolved
                  : i.status === col.status,
            );

            return (
              <div
                key={col.status}
                className="flex flex-col gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                  <span className="text-xs font-bold text-slate-200">
                    {col.title}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {colIncidents.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px]">
                  {colIncidents.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Sin incidentes
                    </div>
                  ) : (
                    colIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => setSelectedIncident(inc)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer hover:border-slate-500 transition-all ${col.color}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-400">
                            {inc.incidentNumber}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            +{inc.delayHours}h
                          </span>
                        </div>
                        <h4 className="font-semibold text-white mt-1 line-clamp-1">
                          {inc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {inc.description}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-700/50">
                          <span>📍 {inc.locationName}</span>
                          <span className="font-bold text-slate-300">
                            €{inc.impactAmountEur}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: AUDITORÍA 3-WAY MATCH */}
      {activeTab === "audit" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white">
                Auditoría 3-Way Match de Facturas de Porteadores
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cotejo automático de facturas de flete vs cotizaciones pactadas
                y albaranes/hitos EDI. Las discrepancias fuera de tolerancia
                generan notas de débito.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-lg">
                Tolerancia: ±25.00 EUR
              </span>
            </div>
          </div>

          <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="p-3">Factura Porteador</th>
                  <th className="p-3">Documento (BL / CMR)</th>
                  <th className="p-3">Concepto Cargo</th>
                  <th className="p-3 text-right">Facturado</th>
                  <th className="p-3 text-right">Esperado</th>
                  <th className="p-3 text-right">Discrepancia</th>
                  <th className="p-3 text-center">Estado Auditoría</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {auditMatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No hay líneas de flete registradas para auditoría.
                    </td>
                  </tr>
                ) : (
                  auditMatches.map((m) => {
                    const isDiscrepant = !m.isWithinTolerance;
                    return (
                      <tr
                        key={m.lineId}
                        className={`hover:bg-slate-700/30 transition-colors ${
                          isDiscrepant ? "bg-rose-950/10" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-semibold text-white">
                            {m.carrierName}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {m.invoiceNumber}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-200">
                          {m.documentNumber}
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-200">
                            {m.chargeCode}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {m.description}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-white">
                          €{m.billedAmount?.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400">
                          €{m.expectedAmount?.toFixed(2)}
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-bold ${
                            isDiscrepant ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {m.varianceAmount > 0 ? "+" : ""}€
                          {m.varianceAmount?.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {isDiscrepant ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                              DISCREPANCIA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              MATCH EXACTO
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isDiscrepant && m.disputeStatus !== "DISPUTED" ? (
                            <button
                              onClick={() => {
                                setDisputeModalLine(m);
                                setDisputeNote(
                                  `Discrepancia en cargo ${m.chargeCode}. Importe facturado excede lo acordado en €${m.varianceAmount}.`,
                                );
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-md shadow transition-colors"
                            >
                              Emitir Disputa
                            </button>
                          ) : m.disputeStatus === "DISPUTED" ? (
                            <span className="text-[11px] font-mono text-amber-400">
                              {m.disputeCode || "DISPUTADA"}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">
                              Aprobado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VENTANILLA ÚNICA & ICS2 RADAR */}
      {activeTab === "customs" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white">
                Radar de Ventanilla Única Aduanera & Declaraciones ICS2 ENS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento telemático de declaraciones de entrada (ENS) de la
                UE y clasificación automática de circuito de inspección.
              </p>
            </div>
            <button
              onClick={() => setShowNewIcs2Modal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
            >
              <PlusCircle size={14} />
              + Presentar Declaración ENS
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
                <span>🟢 Circuito Verde (Levante Inmediato)</span>
                <CheckCircle2 size={16} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Despacho telemático automático sin intervención documental ni
                física de aduanas.
              </p>
            </div>

            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
                <span>🟠 Circuito Naranja (Revisión Documental)</span>
                <Clock size={16} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Requiere comprobación de factura comercial, certificados EUR.1 o
                licencias de importación.
              </p>
            </div>

            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
                <span>🔴 Circuito Rojo (Inspección Física)</span>
                <ShieldAlert size={16} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Contenedor retenido en muelle para reconocimiento ocular o paso
                por escáner no intrusivo.
              </p>
            </div>
          </div>

          {/* Declarations Table */}
          <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-700">
                <tr>
                  <th className="p-3">Número MRN</th>
                  <th className="p-3">Envío</th>
                  <th className="p-3">EORI Declarante</th>
                  <th className="p-3">Aduana de Entrada</th>
                  <th className="p-3 text-center">Score de Seguridad</th>
                  <th className="p-3 text-center">Circuito de Riesgo</th>
                  <th className="p-3">Estado / Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {customsRadar.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-indigo-400">
                      {d.mrn}
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {d.shipmentId || "N/A"}
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {d.declarantEori}
                    </td>
                    <td className="p-3 text-slate-300">
                      {d.customsOfficeCode}
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-mono font-bold text-slate-200 bg-slate-700 px-2 py-0.5 rounded">
                        {d.securityAssessmentScore ?? 95}/100
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          d.riskCircuit === "GREEN"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : d.riskCircuit === "ORANGE"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {d.riskCircuit}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 text-[11px]">
                      {d.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CALCULADORA SPOT MULTIMODAL */}
      {activeTab === "spot" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-400" />
              Parámetros de Cotización Puerta a Puerta
            </h2>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-400 font-medium">
                Punto de Origen:
              </label>
              <input
                type="text"
                value={spotParams.origin}
                onChange={(e) =>
                  setSpotParams({ ...spotParams, origin: e.target.value })
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-400 font-medium">
                Destino Final:
              </label>
              <input
                type="text"
                value={spotParams.destination}
                onChange={(e) =>
                  setSpotParams({ ...spotParams, destination: e.target.value })
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-400 font-medium">
                Modo de Transporte:
              </label>
              <select
                value={spotParams.transportMode}
                onChange={(e) =>
                  setSpotParams({
                    ...spotParams,
                    transportMode: e.target.value as any,
                  })
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="OCEAN_FCL">
                  Marítimo FCL (Full Container Load)
                </option>
                <option value="RAIL_INTERMODAL">
                  Ferrocarril Intermodal TEN-T (Bajo CO2)
                </option>
                <option value="ROAD_EXPRESS">Carretera Express Dedicado</option>
                <option value="AIR_CARGO">Carga Aérea Express (IATA)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">
                  Equipo / Unidad:
                </label>
                <select
                  value={spotParams.containerType}
                  onChange={(e) =>
                    setSpotParams({
                      ...spotParams,
                      containerType: e.target.value as any,
                    })
                  }
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="20FT">20' Dry Standard</option>
                  <option value="40FT">40' Dry Standard</option>
                  <option value="40HC">40' High Cube</option>
                  <option value="REEFER">40' Reefer Frío</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">
                  Distancia Terrestre:
                </label>
                <input
                  type="number"
                  value={spotParams.distanceKm}
                  onChange={(e) =>
                    setSpotParams({
                      ...spotParams,
                      distanceKm: Number(e.target.value),
                    })
                  }
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-slate-400 font-medium">
                Margen Comercial Objetivo: {spotParams.targetMarginPct}%
              </label>
              <input
                type="range"
                min="5"
                max="35"
                value={spotParams.targetMarginPct}
                onChange={(e) =>
                  setSpotParams({
                    ...spotParams,
                    targetMarginPct: Number(e.target.value),
                  })
                }
                className="accent-indigo-500"
              />
            </div>

            <button
              onClick={handleCalculateSpot}
              disabled={isCalculatingSpot}
              className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Zap size={15} />
              {isCalculatingSpot
                ? "Calculando..."
                : "Calcular Tarifa Algorítmica"}
            </button>
          </div>

          {/* Output Breakdown */}
          <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
            {spotQuote ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <div>
                    <h3 className="font-bold text-base text-white">
                      Desglose de Cotización Spot Puerta a Puerta
                    </h3>
                    <p className="text-xs text-slate-400">
                      {spotQuote.origin} ➔ {spotQuote.destination} (
                      {spotQuote.transportMode})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">
                      Tarifa Venta Final:
                    </span>
                    <div className="text-2xl font-black text-emerald-400">
                      €{spotQuote.sellRateTotal?.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Flete Base Porteador</span>
                    <div className="text-base font-bold text-white mt-1">
                      €{spotQuote.baseFreight?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">
                      Recargo Combustible BAF
                    </span>
                    <div className="text-base font-bold text-white mt-1">
                      €{spotQuote.fuelSurchargeBaf?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">
                      Carbono EU ETS Maritime
                    </span>
                    <div className="text-base font-bold text-cyan-400 mt-1">
                      €{spotQuote.carbonSurchargeEts?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">
                      Manipulación Terminal THC
                    </span>
                    <div className="text-base font-bold text-white mt-1">
                      €{(spotQuote.originThc + spotQuote.destThc)?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">
                      Acarreo & Peajes Euroviñeta
                    </span>
                    <div className="text-base font-bold text-white mt-1">
                      €{spotQuote.inlandDrayageAndTolls?.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Despacho Aduanero</span>
                    <div className="text-base font-bold text-white mt-1">
                      €{spotQuote.customsClearanceFee?.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="text-slate-300">
                      Coste Neto de Compra:{" "}
                      <strong>€{spotQuote.buyRateTotal?.toFixed(2)}</strong>
                    </span>
                    <div className="text-indigo-300 font-semibold mt-0.5">
                      Margen Comercial ({spotQuote.profitMarginPct}%): +€
                      {spotQuote.profitMarginAmount?.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-300">
                    <span>⏱️ Tránsito: ~{spotQuote.estimatedTransitDays}d</span>
                    <span>🌿 Emisiones: {spotQuote.co2eKg} kg CO2e</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() =>
                      alert(
                        `Cotización guardada exitosamente con tarifa de €${spotQuote.sellRateTotal}.`,
                      )
                    }
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors"
                  >
                    Convertir en Expediente / Reserva
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                <FileSpreadsheet size={40} className="mb-2 opacity-50" />
                <p className="text-sm">
                  Configura los parámetros a la izquierda y pulsa "Calcular
                  Tarifa"
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  El motor calculará el desglose exacto de costes, márgenes y
                  huella de carbono.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESOLUTION MODAL (Rerouting Alternative Corridors) */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert size={20} className="text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  Resolución de Incidencia: {selectedIncident.incidentNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-lg">
              <h4 className="font-semibold text-white">
                {selectedIncident.title}
              </h4>
              <p className="text-slate-300 mt-1">
                {selectedIncident.description}
              </p>
              <div className="flex gap-4 text-slate-400 mt-2 text-[11px]">
                <span>📍 {selectedIncident.locationName}</span>
                <span>⏱️ Retraso: +{selectedIncident.delayHours}h</span>
                <span>💶 Impacto: €{selectedIncident.impactAmountEur}</span>
              </div>
            </div>

            {/* Reroute Options Generated by AI */}
            <div>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                Alternativas de Re-enrutamiento Multimodal
              </h4>
              <div className="flex flex-col gap-2.5">
                {selectedIncident.rerouteOptions?.length > 0 ? (
                  selectedIncident.rerouteOptions.map((opt: any) => (
                    <div
                      key={opt.id}
                      className="bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">
                            {opt.optionName}
                          </span>
                          {opt.isRecommended && (
                            <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              RECOMENDADA
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {opt.corridorDescription}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-2">
                          <span
                            className={
                              opt.etaDeltaHours < 0
                                ? "text-emerald-400 font-bold"
                                : "text-amber-400"
                            }
                          >
                            ⏱️ ETA: {opt.etaDeltaHours > 0 ? "+" : ""}
                            {opt.etaDeltaHours}h
                          </span>
                          <span className="text-slate-300">
                            💶 Coste: +€{opt.costDeltaEur}
                          </span>
                          <span
                            className={
                              opt.co2DeltaKg < 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }
                          >
                            🌿 CO2: {opt.co2DeltaKg > 0 ? "+" : ""}
                            {opt.co2DeltaKg}kg
                          </span>
                          <span className="text-indigo-400 font-bold">
                            Factibilidad: {opt.feasibilityScore}%
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleResolveIncident(opt.id)}
                        disabled={isResolving}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 shadow transition-colors"
                      >
                        Aprobar y Ejecutar
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs py-2">
                    No hay alternativas pre-generadas. Introduce una acción
                    manual abajo.
                  </p>
                )}
              </div>
            </div>

            {/* Custom Resolution Form */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <label className="text-slate-400 font-medium">
                Acción Manual de Resolución:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: Autorizado servicio nocturno prioritario de grúa..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
                <button
                  onClick={() => handleResolveIncident()}
                  disabled={isResolving}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
                >
                  Resolver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL (3-Way Match) */}
      {disputeModalLine && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRaiseDispute}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Emitir Disputa de Flete & Nota de Débito
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDisputeModalLine(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-lg text-slate-300">
              <div>
                Porteador:{" "}
                <strong className="text-white">
                  {disputeModalLine.carrierName}
                </strong>
              </div>
              <div>
                Factura:{" "}
                <span className="font-mono text-indigo-400">
                  {disputeModalLine.invoiceNumber}
                </span>
              </div>
              <div>
                Discrepancia a Disputar:{" "}
                <strong className="text-rose-400">
                  €{disputeModalLine.varianceAmount}
                </strong>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                Motivo de la Disputa:
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="UNJUSTIFIED_DEMURRAGE">
                  Demoras no justificadas (días libres vigentes)
                </option>
                <option value="BAF_INDEX_MISMATCH">
                  Recargo combustible BAF excede índice contractual
                </option>
                <option value="DUPLICATE_THC">
                  Cargo duplicado de manipulación portuaria (THC)
                </option>
                <option value="INCORRECT_CURRENCY_CONVERSION">
                  Tipo de cambio FX incorrecto
                </option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                Detalle y Justificación Técnica:
              </label>
              <textarea
                rows={3}
                value={disputeNote}
                onChange={(e) => setDisputeNote(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDisputeModalLine(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Confirmar y Emitir Nota de Débito
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW INCIDENT MODAL */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateIncident}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Registrar Nueva Incidencia Operativa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewIncidentModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                Título del Incidente:
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Bloqueo de acceso en Terminal CSP Valencia"
                value={newIncidentData.title}
                onChange={(e) =>
                  setNewIncidentData({
                    ...newIncidentData,
                    title: e.target.value,
                  })
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">
                  Tipo de Incidencia:
                </label>
                <select
                  value={newIncidentData.incidentType}
                  onChange={(e) =>
                    setNewIncidentData({
                      ...newIncidentData,
                      incidentType: e.target.value,
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="PORT_CONGESTION">Congestión Portuaria</option>
                  <option value="CANAL_BLOCKAGE">
                    Bloqueo Canal / Estrecho
                  </option>
                  <option value="VESSEL_DELAY">Retraso Naviera</option>
                  <option value="COLD_CHAIN_BREACH">
                    Rotura Cadena de Frío
                  </option>
                  <option value="CUSTOMS_HOLD">Retención Aduanera</option>
                  <option value="ROAD_ACCIDENT">Avería / Tráfico Terrestre</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">Severidad:</label>
                <select
                  value={newIncidentData.severity}
                  onChange={(e) =>
                    setNewIncidentData({
                      ...newIncidentData,
                      severity: e.target.value as any,
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="LOW">Baja (Menor)</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">
                  Impacto (€):
                </label>
                <input
                  type="number"
                  value={newIncidentData.impactAmountEur}
                  onChange={(e) =>
                    setNewIncidentData({
                      ...newIncidentData,
                      impactAmountEur: Number(e.target.value),
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-medium">
                  Retraso Estimado (h):
                </label>
                <input
                  type="number"
                  value={newIncidentData.delayHours}
                  onChange={(e) =>
                    setNewIncidentData({
                      ...newIncidentData,
                      delayHours: Number(e.target.value),
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                Ubicación / Nodo:
              </label>
              <input
                type="text"
                placeholder="Ej: Puerto de Barcelona (BEST)"
                value={newIncidentData.locationName}
                onChange={(e) =>
                  setNewIncidentData({
                    ...newIncidentData,
                    locationName: e.target.value,
                  })
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">Descripción:</label>
              <textarea
                rows={2}
                required
                value={newIncidentData.description}
                onChange={(e) =>
                  setNewIncidentData({
                    ...newIncidentData,
                    description: e.target.value,
                  })
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewIncidentModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                Registrar Incidencia
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW ICS2 MODAL */}
      {showNewIcs2Modal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleFileIcs2}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck2 size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Presentar Declaración ENS (EU ICS2 Release 3)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewIcs2Modal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                EORI del Declarante:
              </label>
              <input
                type="text"
                required
                value={ics2Form.declarantEori}
                onChange={(e) =>
                  setIcs2Form({ ...ics2Form, declarantEori: e.target.value })
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                Código de Aduana de Entrada:
              </label>
              <input
                type="text"
                required
                value={ics2Form.customsOfficeCode}
                onChange={(e) =>
                  setIcs2Form({
                    ...ics2Form,
                    customsOfficeCode: e.target.value,
                  })
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                Expediente / Envío:
              </label>
              <input
                type="text"
                value={ics2Form.shipmentId}
                onChange={(e) =>
                  setIcs2Form({ ...ics2Form, shipmentId: e.target.value })
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-medium">
                Notas de Seguridad:
              </label>
              <textarea
                rows={2}
                value={ics2Form.notes}
                onChange={(e) =>
                  setIcs2Form({ ...ics2Form, notes: e.target.value })
                }
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewIcs2Modal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                Transmitir ENS a la AEAT
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
