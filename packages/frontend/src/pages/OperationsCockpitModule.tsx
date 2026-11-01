import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../lib/api";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Lock,
  Plane,
  RefreshCw,
  Search,
  ShieldAlert,
  Ship,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";

export interface ScoreFactor {
  factor: string;
  points: number;
  explanation: string;
}

export interface CockpitWorkItem {
  workItemId: string;
  taskId: string;
  shipmentId: string;
  shipmentReference: string;
  serviceType: string;
  taskTypeCode: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "BLOCKED" | "COMPLETED" | "IN_REVIEW";
  isBlocked: boolean;
  blockedByTasks: string[];
  urgencyBucket: "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" | "BLOCKED";
  attentionScore: number;
  scoreBreakdown?: ScoreFactor[];
  itemType?: "TASK" | "EXCEPTION";
  workflowInfo?: {
    instanceId: string;
    definitionCode: string;
    versionNumber: number;
    status: string;
  };
  primaryAction: {
    command: string;
    actionLabel: string;
    inputFields: Array<{
      name: string;
      label: string;
      type: "string" | "number" | "boolean";
      required: boolean;
    }>;
  };
  updatedAt: string;
}

export interface CockpitSummaryMetrics {
  totalTasks: number;
  openActionableCount: number;
  blockedCount: number;
  completedCount: number;
  criticalUrgencyCount: number;
  dueTodayCount: number;
  activeWorkflowsCount: number;
  completedWorkflowsCount: number;
  activeExceptionsCount?: number;
}

interface ExecutionResult {
  success: boolean;
  executedWorkItemId: string;
  completedTask?: any;
  resolvedException?: any;
  unlockedWorkItems: CockpitWorkItem[];
  workflowStatus?: string;
  shipment360: any;
}

export default function OperationsCockpitModule() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CockpitWorkItem[]>([]);
  const [summary, setSummary] = useState<CockpitSummaryMetrics>({
    totalTasks: 0,
    openActionableCount: 0,
    blockedCount: 0,
    completedCount: 0,
    criticalUrgencyCount: 0,
    dueTodayCount: 0,
    activeWorkflowsCount: 0,
    completedWorkflowsCount: 0,
    activeExceptionsCount: 0,
  });

  const [selectedBucket, setSelectedBucket] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "COMPLETED">(
    "OPEN",
  );
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CockpitWorkItem | null>(
    null,
  );
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] =
    useState<ExecutionResult | null>(null);

  // Fetch Cockpit items and KPI summary
  const fetchCockpitData = useCallback(async () => {
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

      const [cockpitRes, summaryRes] = await Promise.all([
        authFetch(`/api/scm/v1/operational/cockpit?${params.toString()}`),
        authFetch("/api/scm/v1/operational/cockpit/summary"),
      ]);

      if (cockpitRes.ok) {
        const data = await cockpitRes.json();
        const fetchedItems: CockpitWorkItem[] = data.items || [];
        setItems(fetchedItems);

        // Keep current item selected if still present, or pick first item
        if (fetchedItems.length > 0) {
          const found = fetchedItems.find(
            (i) => i.workItemId === selectedItem?.workItemId,
          );
          const nextSelected = found || fetchedItems[0];
          setSelectedItem(nextSelected);

          // Reset form inputs for next selected item
          const initialForm: Record<string, any> = {};
          if (nextSelected.primaryAction?.inputFields) {
            for (const f of nextSelected.primaryAction.inputFields) {
              initialForm[f.name] = "";
            }
          }
          if (nextSelected.itemType === "EXCEPTION") {
            initialForm.resolutionNotes = "";
            initialForm.resolutionStatus = "RESOLVED";
          }
          setFormData(initialForm);
        } else {
          setSelectedItem(null);
        }
      }

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (err) {
      console.error("Failed to load Operations Cockpit data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBucket, statusFilter, search, selectedItem?.workItemId]);

  useEffect(() => {
    fetchCockpitData();
  }, [selectedBucket, statusFilter]);

  const handleSelectItem = (item: CockpitWorkItem) => {
    setSelectedItem(item);
    setLastExecutionResult(null);

    const initialForm: Record<string, any> = {};
    if (item.primaryAction?.inputFields) {
      for (const f of item.primaryAction.inputFields) {
        initialForm[f.name] = "";
      }
    }
    if (item.itemType === "EXCEPTION") {
      initialForm.resolutionNotes = "";
      initialForm.resolutionStatus = "RESOLVED";
    }
    setFormData(initialForm);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExecuteInSitu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const previousItems = [...items];
    const executedId = selectedItem.workItemId;

    // Optimistic UI: Immediately mark completed or remove from open view
    setItems((prev) =>
      statusFilter === "OPEN"
        ? prev.filter((i) => i.workItemId !== executedId)
        : prev.map((i) =>
            i.workItemId === executedId
              ? { ...i, status: "COMPLETED", isBlocked: false }
              : i,
          ),
    );

    try {
      setSubmitting(true);
      const res = await authFetch(
        `/api/scm/v1/operational/cockpit/${executedId}/execute`,
        {
          method: "POST",
          body: JSON.stringify({
            result: formData,
            notes:
              formData.resolutionNotes ||
              formData.notes ||
              "Executed via Operations Cockpit",
            resolutionNotes: formData.resolutionNotes,
            resolutionStatus: formData.resolutionStatus || "RESOLVED",
            ...formData,
          }),
        },
      );

      if (res.ok) {
        const result: ExecutionResult = await res.json();
        setLastExecutionResult(result);
        await fetchCockpitData();
      } else {
        // Rollback optimistic update on error
        setItems(previousItems);
        const errJson = await res.json().catch(() => ({}));
        alert(
          `Error executing work item: ${errJson.message || res.statusText}`,
        );
      }
    } catch (err) {
      setItems(previousItems);
      console.error("Failed to execute in-situ action:", err);
      alert("Network error executing work item in-situ.");
    } finally {
      setSubmitting(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    if (serviceType.includes("AIR"))
      return <Plane className="w-4 h-4 text-sky-400" />;
    if (serviceType.includes("ROAD"))
      return <Truck className="w-4 h-4 text-emerald-400" />;
    return <Ship className="w-4 h-4 text-indigo-400" />;
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "IMMEDIATE_ACTION":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400 animate-pulse" /> Immediate
          </span>
        );
      case "DUE_TODAY":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Due Today
          </span>
        );
      case "BLOCKED":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <Lock className="w-3 h-3 text-purple-400" /> Blocked
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/40 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-400" /> Upcoming
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: string, isBlocked: boolean) => {
    if (isBlocked) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-400 border border-slate-700">
          BLOCKED
        </span>
      );
    }
    switch (priority) {
      case "CRITICAL":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-950 text-rose-300 border border-rose-800">
            CRITICAL · BLOCKING
          </span>
        );
      case "HIGH":
      case "MAJOR":
        return (
          <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-950 text-amber-300 border border-amber-800">
            HIGH PRIORITY
          </span>
        );
      case "MEDIUM":
      case "MINOR":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-950 text-blue-300 border border-blue-800">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-400 border border-slate-700">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-950 text-slate-100">
      {/* 1. Header & KPI Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Operations Cockpit 2.0
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Work-to-User
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Prioritized operational inbox: Explain → Decide → Act → Confirm
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCockpitData()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
          <button
            onClick={() => navigate("/exceptions")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg border border-rose-800/40 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Exception
            Center
          </button>
          <button
            onClick={() => navigate("/shipment-360")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg border border-indigo-800/40 transition"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" /> Shipment 360
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Open Actionable
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {summary.openActionableCount}
          </div>
          <span className="text-[10px] text-slate-500">Unblocked & ready</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Immediate Action
          </span>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {summary.criticalUrgencyCount}
          </div>
          <span className="text-[10px] text-slate-500">Critical attention</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Due Today
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {summary.dueTodayCount}
          </div>
          <span className="text-[10px] text-slate-500">SLA cutoff window</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Blocked Tasks
          </span>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {summary.blockedCount}
          </div>
          <span className="text-[10px] text-slate-500">
            Awaiting predecessor
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Exceptions
          </span>
          <div className="text-2xl font-bold text-rose-300 mt-1">
            {summary.activeExceptionsCount ?? 0}
          </div>
          <span className="text-[10px] text-slate-500">
            Requires resolution
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Workflows
          </span>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {summary.activeWorkflowsCount}
          </div>
          <span className="text-[10px] text-slate-500">Live DAG execution</span>
        </div>
      </div>

      {/* 2. Filters & Search Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "IMMEDIATE_ACTION", "DUE_TODAY", "UPCOMING", "BLOCKED"].map(
            (bucket) => (
              <button
                key={bucket}
                onClick={() => setSelectedBucket(bucket)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  selectedBucket === bucket
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {bucket.replace(/_/g, " ")}
              </button>
            ),
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              id="cockpit-search-input"
              name="cockpitSearch"
              aria-label="Search reference, task, hold..."
              type="text"
              placeholder="Search reference, task, hold..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => setStatusFilter("OPEN")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                statusFilter === "OPEN"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                statusFilter === "COMPLETED"
                  ? "bg-indigo-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Notification (CONFIRM Step of UX Pattern) & Next Action Dispatch */}
      {lastExecutionResult && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/60 flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-200">
                  Acción Confirmada en el Core Transaccional
                </div>
                <div className="text-xs text-emerald-400/90 mt-0.5 flex flex-wrap gap-2 items-center">
                  <span>
                    {lastExecutionResult.resolvedException
                      ? `Incidencia ${lastExecutionResult.executedWorkItemId} resuelta`
                      : `Tarea ${lastExecutionResult.executedWorkItemId} completada`}
                  </span>
                  <span>•</span>
                  <span>
                    {lastExecutionResult.unlockedWorkItems.length > 0
                      ? `${lastExecutionResult.unlockedWorkItems.length} tarea(s) sucesora(s) desbloqueada(s)`
                      : "Sin bloqueos inmediatos"}
                  </span>
                  <span>•</span>
                  <span>
                    Shipment Health:{" "}
                    <strong className="text-white">
                      {lastExecutionResult.shipment360?.health?.status} (
                      {lastExecutionResult.shipment360?.health?.score}/100)
                    </strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  navigate(
                    `/shipment-360?id=${lastExecutionResult.shipment360?.shipmentId || ""}&tab=tasks`,
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center gap-1 shadow-sm"
              >
                Abrir en Shipment 360 (DAG){" "}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Next Action Dispatch Pills */}
          {lastExecutionResult.unlockedWorkItems.length > 0 && (
            <div className="pt-2 border-t border-emerald-800/40 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Siguientes
                Acciones Desbloqueadas:
              </span>
              {lastExecutionResult.unlockedWorkItems.map((nextItem) => (
                <button
                  key={nextItem.workItemId}
                  onClick={() => {
                    handleSelectItem(nextItem);
                    window.scrollTo({ top: 380, behavior: "smooth" });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600/60 text-white flex items-center gap-1.5 transition-all shadow-sm"
                  title="Seleccionar inmediatamente en la bandeja de ejecución"
                >
                  <span>{nextItem.title}</span>
                  <span className="text-[10px] text-emerald-300 font-mono">
                    [{nextItem.urgencyBucket || "ACTIONABLE"}]
                  </span>
                  <ChevronRight className="w-3 h-3 text-emerald-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Main Workspace: Split View (Cards on Left, Detail & Actions on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Work Item Cards */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {loading && items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/30 rounded-xl border border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading prioritized operational items...
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-slate-900/30 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
              No work items in this category. Queue is clear!
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedItem?.workItemId === item.workItemId;
              const isException = item.itemType === "EXCEPTION";

              return (
                <div
                  key={item.workItemId}
                  onClick={() => handleSelectItem(item)}
                  className={`p-4 rounded-xl border transition cursor-pointer relative ${
                    isSelected
                      ? "bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/50"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  {/* Selection Indicator Strip */}
                  {isSelected && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r" />
                  )}

                  {/* Card Header: WHAT & WHERE */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isException ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          EXCEPTION
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          TASK
                        </span>
                      )}
                      <span className="text-xs font-mono text-slate-400">
                        {item.taskTypeCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {getUrgencyBadge(item.urgencyBucket)}
                    </div>
                  </div>

                  {/* Title (WHAT) */}
                  <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-1">
                    {item.title}
                  </h3>

                  {/* Where & Impact */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                    <div className="flex items-center gap-1 font-mono text-slate-300">
                      {getServiceIcon(item.serviceType)}
                      <span className="hover:text-indigo-400 transition">
                        {item.shipmentReference}
                      </span>
                    </div>
                    <span>•</span>
                    <div>{getPriorityBadge(item.priority, item.isBlocked)}</div>
                  </div>

                  {/* WHY NOW: Attention Score & Factor Breakdown */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          Attention:
                        </span>
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                            item.attentionScore >= 80
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : item.attentionScore >= 60
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.attentionScore}/100
                        </span>
                      </div>

                      <div className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                        <span>
                          {item.primaryAction?.actionLabel || "View Details"}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Quick Factors & Direct 360 Action */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                      <div className="flex items-center gap-1 overflow-hidden">
                        {item.scoreBreakdown
                          ?.slice(0, 2)
                          .map((factor, fIdx) => (
                            <span
                              key={fIdx}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono truncate max-w-[110px]"
                              title={factor.explanation}
                            >
                              +{factor.points}{" "}
                              {factor.factor.replace(/_/g, " ")}
                            </span>
                          ))}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetTab =
                            item.itemType === "EXCEPTION"
                              ? "exceptions"
                              : "tasks";
                          const targetId =
                            item.itemType === "EXCEPTION"
                              ? item.workItemId
                              : item.taskId || item.workItemId;
                          navigate(
                            `/shipment-360?id=${item.shipmentId}&tab=${targetTab}&highlight=${targetId}&action=resolve`,
                          );
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 rounded flex items-center gap-1 transition shrink-0"
                        title="Open in Shipment 360 with Contextual Action Drawer"
                      >
                        <span>Resolve in 360</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Explain → Decide → Act Detail Panel */}
        <div className="lg:col-span-7">
          {selectedItem ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-6 shadow-xl sticky top-6">
              {/* Top Meta Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    {selectedItem.itemType === "EXCEPTION" ? (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />{" "}
                        OPERATIONAL EXCEPTION
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />{" "}
                        OPERATIONAL TASK
                      </span>
                    )}
                    <span className="text-xs font-mono text-slate-400">
                      ID: {selectedItem.workItemId}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {selectedItem.title}
                  </h2>
                </div>

                <button
                  onClick={() => {
                    const targetTab =
                      selectedItem.itemType === "EXCEPTION"
                        ? "exceptions"
                        : "tasks";
                    const targetId =
                      selectedItem.itemType === "EXCEPTION"
                        ? selectedItem.workItemId
                        : selectedItem.taskId || selectedItem.workItemId;
                    navigate(
                      `/shipment-360?id=${selectedItem.shipmentId}&tab=${targetTab}&highlight=${targetId}&action=resolve`,
                    );
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-white transition px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900 rounded-xl border border-indigo-700/60 shadow-md shadow-indigo-950/50"
                  title="Open full shipment topology with auto-focused action drawer"
                >
                  <span>Investigate & Resolve in 360</span>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>

              {/* UX Step 1: EXPLAIN */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-400" /> 1. EXPLAIN —
                    Context & Impact
                  </span>
                  {getUrgencyBadge(selectedItem.urgencyBucket)}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedItem.description}
                </p>

                {/* Where details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Shipment
                    </span>
                    <div className="font-mono font-semibold text-slate-200">
                      {selectedItem.shipmentReference}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Service
                    </span>
                    <div className="font-semibold text-slate-200">
                      {selectedItem.serviceType}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Priority
                    </span>
                    <div>
                      {getPriorityBadge(
                        selectedItem.priority,
                        selectedItem.isBlocked,
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase">
                      Workflow
                    </span>
                    <div className="font-mono text-xs text-slate-300">
                      {selectedItem.workflowInfo?.definitionCode ||
                        "CORE_LOGISTICS"}
                    </div>
                  </div>
                </div>

                {/* Predecessor Blockers if blocked */}
                {selectedItem.isBlocked &&
                  selectedItem.blockedByTasks.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 flex items-start gap-2">
                      <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Blocked by predecessor:</strong>{" "}
                        {selectedItem.blockedByTasks.join(", ")}. Complete
                        upstream task to unlock.
                      </div>
                    </div>
                  )}

                {/* WHY NOW: Transparent Score Breakdown */}
                {selectedItem.scoreBreakdown &&
                  selectedItem.scoreBreakdown.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
                        <span>Attention Scoring Breakdown:</span>
                        <span className="font-bold text-white">
                          {selectedItem.attentionScore}/100 Total
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.scoreBreakdown.map((factor, idx) => (
                          <div
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1"
                            title={factor.explanation}
                          >
                            <span className="text-indigo-400 font-mono font-bold">
                              {factor.points >= 0
                                ? `+${factor.points}`
                                : factor.points}
                            </span>
                            <span>{factor.factor.replace(/_/g, " ")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* UX Step 2: DECIDE */}
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> 2. DECIDE —
                  Recommended Action
                </span>
                <div className="text-sm font-bold text-white">
                  {selectedItem.primaryAction?.actionLabel ||
                    "Resolve Operational Requirement"}
                </div>
                <p className="text-xs text-slate-300">
                  {selectedItem.itemType === "EXCEPTION"
                    ? "Resolve the operational discrepancy or record a formal waiver to unblock downstream workflow gates."
                    : `Execute domain command '${selectedItem.primaryAction?.command || "COMPLETE_TASK"}' to progress the shipment lifecycle.`}
                </p>
              </div>

              {/* UX Step 3: ACT (In-Situ Form) */}
              <form
                onSubmit={handleExecuteInSitu}
                className="flex flex-col gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800"
              >
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 3. ACT —
                  Execute In-Situ
                </span>

                {/* If Exception: Resolution Notes & Status */}
                {selectedItem.itemType === "EXCEPTION" ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label
                        htmlFor="cockpit-resolution-notes"
                        className="block text-xs font-semibold text-slate-300 mb-1"
                      >
                        Resolution Notes{" "}
                        <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        id="cockpit-resolution-notes"
                        name="resolutionNotes"
                        aria-label="Resolution Notes"
                        required
                        rows={3}
                        value={formData.resolutionNotes || ""}
                        onChange={(e) =>
                          handleInputChange("resolutionNotes", e.target.value)
                        }
                        placeholder="Detail the operational corrective action, inspector clearance, or carrier rebooking confirmation..."
                        className="w-full p-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="font-semibold text-slate-300">
                        Resolution Outcome:
                      </label>
                      <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="resolutionStatus"
                          value="RESOLVED"
                          checked={formData.resolutionStatus !== "WAIVED"}
                          onChange={() =>
                            handleInputChange("resolutionStatus", "RESOLVED")
                          }
                          className="text-indigo-600 focus:ring-0"
                        />
                        Fully Resolved
                      </label>
                      <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="resolutionStatus"
                          value="WAIVED"
                          checked={formData.resolutionStatus === "WAIVED"}
                          onChange={() =>
                            handleInputChange("resolutionStatus", "WAIVED")
                          }
                          className="text-indigo-600 focus:ring-0"
                        />
                        Waived by Authority
                      </label>
                    </div>
                  </div>
                ) : (
                  /* If Task: Dynamically render input fields */
                  <div className="flex flex-col gap-3">
                    {selectedItem.primaryAction?.inputFields?.map((field) => (
                      <div key={field.name}>
                        <label
                          htmlFor={`task-field-${field.name}`}
                          className="block text-xs font-semibold text-slate-300 mb-1"
                        >
                          {field.label}{" "}
                          {field.required && (
                            <span className="text-rose-400">*</span>
                          )}
                        </label>
                        <input
                          id={`task-field-${field.name}`}
                          name={field.name}
                          aria-label={field.label}
                          type={field.type === "number" ? "number" : "text"}
                          required={field.required}
                          value={formData[field.name] ?? ""}
                          onChange={(e) =>
                            handleInputChange(
                              field.name,
                              field.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                            )
                          }
                          placeholder={`Enter ${field.label}...`}
                          className="w-full p-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const targetTab =
                        selectedItem.itemType === "EXCEPTION"
                          ? "exceptions"
                          : "tasks";
                      const targetId =
                        selectedItem.itemType === "EXCEPTION"
                          ? selectedItem.workItemId
                          : selectedItem.taskId || selectedItem.workItemId;
                      navigate(
                        `/shipment-360?id=${selectedItem.shipmentId}&tab=${targetTab}&highlight=${targetId}&action=resolve`,
                      );
                    }}
                    className="px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    Investigate in 360
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                        Executing Command...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {selectedItem.primaryAction?.actionLabel ||
                          "Execute In-Situ"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm bg-slate-900/30 rounded-2xl border border-slate-800">
              Select an item from the queue to inspect and act upon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
