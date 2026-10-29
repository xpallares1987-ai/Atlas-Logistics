import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Ship,
  Plane,
  Truck,
  SlidersHorizontal,
  ExternalLink,
  Layers,
} from "lucide-react";

interface CockpitItem {
  workItemId: string;
  workItemType: string;
  title: string;
  description: string;
  attentionScore: number;
  scoreBreakdown: {
    slaScore: number;
    healthScore: number;
    severityScore: number;
    commercialTierScore: number;
    workflowGateScore: number;
    totalAttentionScore: number;
  };
  urgencyBucket: "IMMEDIATE_ACTION" | "DUE_TODAY" | "AT_RISK" | "UPCOMING";
  status: "OPEN" | "COMPLETED";
  organizationId: string;
  branchId: string;
  teamId: string;
  assigneeName: string;
  subject: {
    entityType: string;
    entityId: string;
    referenceNumber: string;
    shipmentId: string;
    customerName: string;
    customerTier: string;
    routeSummary: string;
    transportMode: string;
  };
  shipmentHealth: "ON_TRACK" | "AT_RISK" | "CRITICAL" | "BLOCKED";
  slaSnapshot: {
    slaInstanceId: string;
    slaName: string;
    status: string;
    deadlineAt: string;
    remainingMinutes: number;
  };
  dataQualityGate: "PASSED" | "WARN" | "BLOCKED";
  primaryAction: {
    commandName: string;
    actionLabel: string;
    inputPlaceholder: string;
    defaultResolutionValue: string;
  };
  resolution?: {
    resolvedBy: string;
    resolvedAt: string;
    notes: string;
  };
  updatedAt: string;
}

export default function MyWorkQueueModule() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CockpitItem[]>([]);
  const [summary, setSummary] = useState({
    totalOpen: 0,
    immediateActionCount: 0,
    dueTodayCount: 0,
    dataQualityBlockedCount: 0,
    approvalsCount: 0,
    completedTodayCount: 0,
  });
  const [selectedBucket, setSelectedBucket] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "COMPLETED">(
    "OPEN",
  );
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CockpitItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCockpit = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("status", statusFilter);
      if (selectedBucket !== "ALL") {
        params.set("urgencyBucket", selectedBucket);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/scm/v1/cockpit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setItems(data.items || []);
        if (data.items?.length > 0) {
          const currentStillThere = data.items.find(
            (i: CockpitItem) => i.workItemId === selectedItem?.workItemId,
          );
          const nextSelected = currentStillThere || data.items[0];
          setSelectedItem(nextSelected);
          setResolutionNotes(
            nextSelected.primaryAction?.defaultResolutionValue || "",
          );
        } else {
          setSelectedItem(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch OperationsCockpitReadModel:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBucket, statusFilter, search, selectedItem?.workItemId]);

  useEffect(() => {
    fetchCockpit();
  }, [selectedBucket, statusFilter]);

  const handleSelectCard = (item: CockpitItem) => {
    setSelectedItem(item);
    setResolutionNotes(item.primaryAction?.defaultResolutionValue || "");
  };

  const handleExecuteInSitu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      const res = await fetch(
        `/api/scm/v1/cockpit/${selectedItem.workItemId}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolutionNotes,
          }),
        },
      );
      if (res.ok) {
        const result = await res.json();
        setToastMessage(
          `✓ Ejecutado: ${result.completedItem.primaryAction.commandName} sobre ${result.completedItem.subject.referenceNumber} (Shipment360 actualizado a ON_TRACK)`,
        );
        await fetchCockpit();
      }
    } catch (err) {
      console.error("Error executing work item in-situ:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderModeIcon = (mode: string) => {
    if (mode === "AIR") return <Plane className="w-4 h-4 text-sky-400" />;
    if (mode === "ROAD") return <Truck className="w-4 h-4 text-amber-400" />;
    return <Ship className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Header — Work-to-User Paradigm */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  My Work · Smart Work Queue
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  OperationsCockpitReadModel (CQRS)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Paradigma <strong>Work-to-User</strong>: El SCM prioriza qué
                requiere atención combinando SLA (35%), Shipment Health (25%),
                Severidad (20%), Tier Comercial (10%) y Workflow Gate (10%).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchCockpit()}
                placeholder="Filtrar por ATLS-..., cliente o ruta..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>
            <button
              onClick={() => navigate("/shipment-360")}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-indigo-300 flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Shipment Workspace 360°
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white ml-4"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Top KPI Attention Filter Pills (Panel 1) */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
          {[
            {
              id: "ALL",
              status: "OPEN" as const,
              label: "Toda mi Cola Activa",
              count: summary.totalOpen,
              color: "border-indigo-500/40 text-indigo-300 bg-indigo-500/10",
            },
            {
              id: "IMMEDIATE_ACTION",
              status: "OPEN" as const,
              label: "🔥 Acción Inmediata",
              count: summary.immediateActionCount,
              color: "border-rose-500/40 text-rose-300 bg-rose-500/10",
            },
            {
              id: "DUE_TODAY",
              status: "OPEN" as const,
              label: "⏱️ Vencen Hoy (Cut-Off)",
              count: summary.dueTodayCount,
              color: "border-amber-500/40 text-amber-300 bg-amber-500/10",
            },
            {
              id: "DATA_QUALITY_BLOCKED",
              status: "OPEN" as const,
              label: "🚧 Gate Data Quality",
              count: summary.dataQualityBlockedCount,
              color: "border-purple-500/40 text-purple-300 bg-purple-500/10",
            },
            {
              id: "APPROVALS",
              status: "OPEN" as const,
              label: "✍️ Mis Aprobaciones",
              count: summary.approvalsCount,
              color: "border-sky-500/40 text-sky-300 bg-sky-500/10",
            },
            {
              id: "ALL",
              status: "COMPLETED" as const,
              label: "✅ Resueltos In-Situ",
              count: summary.completedTodayCount,
              color: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
            },
          ].map((pill, idx) => {
            const isSelected =
              statusFilter === pill.status && selectedBucket === pill.id;
            return (
              <button
                key={idx}
                onClick={() => {
                  setStatusFilter(pill.status);
                  setSelectedBucket(pill.id);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? `${pill.color} ring-2 ring-indigo-500/40 shadow-lg`
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="text-[11px] font-bold truncate">
                  {pill.label}
                </div>
                <div className="text-xl font-black text-white mt-1 font-mono">
                  {pill.count}
                </div>
              </button>
            );
          })}
        </div>

        {/* Main 2-Column Split: Left Prioritized Queue + Right In-Situ Execution Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel 2: Smart Work Queue Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {loading ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                Cargando proyección OperationsCockpitReadModel...
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-white">
                  ¡Cola limpia en este filtro!
                </div>
                <p className="text-xs text-slate-400">
                  No hay tareas o excepciones pendientes que requieran
                  intervención.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isSelected = selectedItem?.workItemId === item.workItemId;
                return (
                  <div
                    key={item.workItemId}
                    onClick={() => handleSelectCard(item)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                      isSelected
                        ? "bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                        : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Attention Score Badge */}
                        <div
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono border shrink-0 ${
                            item.attentionScore >= 85
                              ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                              : item.attentionScore >= 70
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                : "bg-indigo-500/15 border-indigo-500/40 text-indigo-300"
                          }`}
                        >
                          <span className="text-base font-black leading-none">
                            {item.attentionScore}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">
                            Score
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                              {item.workItemType}
                            </span>
                            <span className="font-mono text-xs font-bold text-indigo-400">
                              {item.subject.referenceNumber}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              · {item.subject.customerName}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-white leading-snug">
                            {item.title}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                          item.shipmentHealth === "CRITICAL"
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : item.shipmentHealth === "AT_RISK"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        Health: {item.shipmentHealth}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        {renderModeIcon(item.subject.transportMode)}
                        <span className="font-mono text-[11px]">
                          {item.subject.routeSummary}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.dataQualityGate !== "PASSED" && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                            DQ Gate: {item.dataQualityGate}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1 ${
                            item.slaSnapshot.remainingMinutes <= 150
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          SLA: {item.slaSnapshot.remainingMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel 3: In-Situ Execution & Explainability Drawer (5 cols) */}
          <div className="lg:col-span-5">
            {selectedItem ? (
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 sticky top-6 shadow-2xl">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
                      Ejecución In-Situ · Sin cambiar de pantalla
                    </div>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      {selectedItem.title}
                    </h2>
                  </div>
                  <button
                    onClick={() =>
                      navigate(
                        `/shipment-360?id=${selectedItem.subject.shipmentId}`,
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>Abrir 360°</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  {selectedItem.description}
                </p>

                {/* Explainability: AttentionScore Formula Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      Explainability · Cálculo de Prioridad
                    </span>
                    <span className="font-mono font-bold text-indigo-400">
                      {selectedItem.attentionScore} / 100
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">SLA (35%)</div>
                      <div className="text-white font-bold mt-0.5">
                        {selectedItem.scoreBreakdown.slaScore}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">Health (25%)</div>
                      <div className="text-white font-bold mt-0.5">
                        {selectedItem.scoreBreakdown.healthScore}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">Sev (20%)</div>
                      <div className="text-white font-bold mt-0.5">
                        {selectedItem.scoreBreakdown.severityScore}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">Tier (10%)</div>
                      <div className="text-white font-bold mt-0.5">
                        {selectedItem.scoreBreakdown.commercialTierScore}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div className="text-slate-400">Gate (10%)</div>
                      <div className="text-white font-bold mt-0.5">
                        {selectedItem.scoreBreakdown.workflowGateScore}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SLA & Subject Metadata */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">
                      Reloj SLA Vinculado
                    </span>
                    <div className="font-bold text-white mt-0.5 truncate">
                      {selectedItem.slaSnapshot.slaName}
                    </div>
                    <div className="text-[11px] font-mono text-amber-400 mt-0.5">
                      Restan {selectedItem.slaSnapshot.remainingMinutes} min
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">
                      Comando de Dominio
                    </span>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5 truncate text-[11px]">
                      {selectedItem.primaryAction.commandName}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Outbox + Inbox Idempotente
                    </div>
                  </div>
                </div>

                {/* In-Situ Resolution Form */}
                {selectedItem.status === "OPEN" ? (
                  <form
                    onSubmit={handleExecuteInSitu}
                    className="space-y-3 pt-1"
                  >
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">
                        Evidencia / Resolución Operativa (Audit Trail)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder={
                          selectedItem.primaryAction.inputPlaceholder
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {submitting
                        ? "Ejecutando Comando y Publicando Evento..."
                        : selectedItem.primaryAction.actionLabel}
                    </button>
                  </form>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Resuelto In-Situ por {selectedItem.resolution?.resolvedBy}
                    </div>
                    <div className="text-slate-300">
                      {selectedItem.resolution?.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                Seleccione un ítem de la Smart Work Queue para ejecutarlo
                in-situ.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
