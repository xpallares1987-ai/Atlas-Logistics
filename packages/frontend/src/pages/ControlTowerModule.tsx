/**
 * @file ControlTowerModule.tsx
 * @description Autonomous Multimodal Control Tower command center page.
 * Orchestrates real-time incident detection, AI-driven rerouting, 3-way match freight audit,
 * EU ICS2 customs radar, and algorithmic spot margin simulation.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Radio,
  RefreshCw,
  TrendingDown,
  Layers,
  Zap,
  Activity,
  FileCheck2,
  Scale,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  RadarTab,
  KanbanTab,
  AuditTab,
  CustomsTab,
  SpotTab,
  ResolveIncidentModal,
  DisputeLineModal,
  NewIncidentModal,
  NewIcs2Modal,
} from "../components/ControlTower/index";

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
            <ShieldAlert size={15} />+ Nueva Incidencia
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

        <Link
          to="/security-risk"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 ml-auto self-center transition-all"
        >
          <ShieldAlert size={14} className="text-indigo-400" />
          Radar de Riesgo & Seguridad Criptográfica
        </Link>
      </div>

      {/* TABS */}
      {activeTab === "radar" && (
        <RadarTab
          incidents={incidents}
          severityFilter={severityFilter}
          onSeverityFilterChange={setSeverityFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectIncident={setSelectedIncident}
        />
      )}

      {activeTab === "kanban" && (
        <KanbanTab
          incidents={incidents}
          onSelectIncident={setSelectedIncident}
        />
      )}

      {activeTab === "audit" && (
        <AuditTab
          auditMatches={auditMatches}
          onDisputeLine={(line) => setDisputeModalLine(line)}
        />
      )}

      {activeTab === "customs" && (
        <CustomsTab
          customsRadar={customsRadar}
          onOpenNewIcs2Modal={() => setShowNewIcs2Modal(true)}
        />
      )}

      {activeTab === "spot" && (
        <SpotTab
          spotParams={spotParams}
          setSpotParams={setSpotParams}
          spotQuote={spotQuote}
          handleCalculateSpot={handleCalculateSpot}
          isCalculatingSpot={isCalculatingSpot}
        />
      )}

      {/* MODALS */}
      <ResolveIncidentModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onResolve={handleResolveIncident}
        isResolving={isResolving}
        resolutionNote={resolutionNote}
        onResolutionNoteChange={setResolutionNote}
      />

      <DisputeLineModal
        line={disputeModalLine}
        onClose={() => setDisputeModalLine(null)}
        onSubmit={handleRaiseDispute}
        disputeReason={disputeReason}
        onDisputeReasonChange={setDisputeReason}
        disputeNote={disputeNote}
        onDisputeNoteChange={setDisputeNote}
      />

      <NewIncidentModal
        isOpen={showNewIncidentModal}
        onClose={() => setShowNewIncidentModal(false)}
        onSubmit={handleCreateIncident}
        data={newIncidentData}
        onChangeData={(data: any) => setNewIncidentData(data)}
      />

      <NewIcs2Modal
        isOpen={showNewIcs2Modal}
        onClose={() => setShowNewIcs2Modal(false)}
        onSubmit={handleFileIcs2}
        data={ics2Form}
        onChangeData={setIcs2Form}
      />
    </div>
  );
}
