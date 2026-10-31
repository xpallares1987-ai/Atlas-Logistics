import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Compass,
  FileText,
  GitBranch,
  History,
  Layers,
  Lock,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Ship,
  Sparkles,
  Unlock,
  Zap,
} from "lucide-react";

// ============================================================================
// DOMAIN TYPES MATCHING OPERATIONAL BFF READ MODELS
// ============================================================================

export interface TaskActionMetadata {
  command: string;
  actionLabel: string;
  inputFields: Array<{
    name: string;
    label: string;
    type: "string" | "number" | "boolean";
    required: boolean;
  }>;
}

export interface OperationalSignal {
  signalId: string;
  signalType:
    | "BLOCKING_EXCEPTION"
    | "SLA_RISK"
    | "TASK_BLOCKED"
    | "ROUTE_DEVIATION"
    | "WORKFLOW_HALTED";
  severity: "CRITICAL" | "MAJOR" | "WARNING" | "INFO";
  title: string;
  explanation: string;
  source: string;
  createdAt: string;
}

export interface ExplainabilityModel {
  isBlocked: boolean;
  blockReasons: string[];
  slaStatus: "ON_TRACK" | "AT_RISK" | "BREACHED";
  slaRiskExplanation?: string;
  activeWorkflowKey?: string;
  recommendedAction: {
    actionKey: string;
    title: string;
    description: string;
    actionType: "COMPLETE_TASK" | "RESOLVE_EXCEPTION" | "INSPECT_ROUTE";
    targetId: string;
    isBlocking: boolean;
  };
  attentionScoreBreakdown: Array<{
    factor: string;
    points: number;
    explanation: string;
  }>;
}

export interface OperationalExceptionRecord {
  exceptionId: string;
  shipmentId: string;
  category:
    "CARRIER" | "DOCUMENTATION" | "CUSTOMS" | "EQUIPMENT" | "OPERATIONAL";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  isBlocking: boolean;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED";
  assignedTo?: string | null;
  assignedTeam?: string | null;
  raisedAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
}

export interface OperationalShipment360View {
  shipmentId: string;
  shipmentReference: string;
  serviceType: string;
  lifecycle: string;
  closureStatus: string;
  customerPartyId: string | null;

  shipment: {
    shipmentId: string;
    referenceNumber: string;
    serviceType: string;
    status: string;
    originLocode?: string;
    destinationLocode?: string;
    cargoDetails?: {
      totalWeightKg?: number;
      totalVolumeCbm?: number;
      packageCount?: number;
      cargoType?: string;
    };
  };

  routePlan: {
    routePlanId: string;
    status: string;
    legs: Array<{
      legId: string;
      sequence: number;
      mode: string;
      originLocode: string;
      destinationLocode: string;
      carrierCode?: string;
      status: string;
    }>;
  } | null;

  milestonePlan: {
    milestonePlanId: string;
    status: string;
    milestones: Array<{
      milestoneId: string;
      milestoneCode: string;
      plannedAt?: string;
      actualAt?: string;
      status: string;
    }>;
  } | null;

  workflow: {
    instanceId: string;
    definitionCode: string;
    versionNumber: number;
    status: string;
    progressPercentage: number;
  } | null;

  tasks: Array<{
    taskId: string;
    taskType: string;
    title: string;
    priority: string;
    status: string;
    isBlocked: boolean;
    dependencies: Array<{
      predecessorTaskId: string;
      status: string;
    }>;
    primaryAction?: TaskActionMetadata;
  }>;

  exceptions: OperationalExceptionRecord[];
  signals: OperationalSignal[];

  health: {
    status: "ON_TRACK" | "AT_RISK" | "CRITICAL";
    score: number;
    blockers: string[];
  };

  explainability: ExplainabilityModel;

  metrics: {
    totalTasks: number;
    openTasks: number;
    blockedTasks: number;
    completedTasks: number;
    progressPercentage: number;
    activeExceptionsCount?: number;
  };

  projectionVersion: number;
  lastUpdatedAt: string;
}

export interface OperationalTimelineEvent {
  timelineId: string;
  timestamp: string;
  eventType: string;
  source: "OUTBOX" | "EXCEPTION" | "TELEMETRY" | "WORKFLOW";
  category:
    "LIFECYCLE" | "PLANNING" | "WORKFLOW" | "TASK" | "EXCEPTION" | "TELEMETRY";
  title: string;
  description: string;
  actor: string;
  payload: Record<string, unknown>;
}

export interface OutboxAuditEvent {
  eventId: string;
  aggregateId: string;
  eventType: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  error?: string;
  payload: Record<string, unknown>;
}

// 7 Perspectives
type TabKey =
  | "overview"
  | "attention"
  | "journey"
  | "tasks"
  | "exceptions"
  | "cargo_route"
  | "audit";

export default function ShipmentWorkspace360Module() {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlShipmentId = searchParams.get("id") || "";
  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>(urlShipmentId);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [shipmentsList, setShipmentsList] = useState<
    OperationalShipment360View[]
  >([]);
  const [shipmentDetail, setShipmentDetail] =
    useState<OperationalShipment360View | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<
    OperationalTimelineEvent[]
  >([]);
  const [auditEvents, setAuditEvents] = useState<OutboxAuditEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  // In-Situ Action (Explain -> Decide -> Act -> Confirm)
  const [activeActionModal, setActiveActionModal] = useState<{
    type: "COMPLETE_TASK" | "RESOLVE_EXCEPTION";
    targetId: string;
    title: string;
    description: string;
    inputs: Record<string, string>;
    primaryAction?: TaskActionMetadata;
  } | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<
    string | null
  >(null);

  // Raise Exception Modal
  const [showRaiseExceptionModal, setShowRaiseExceptionModal] = useState(false);
  const [newExceptionCategory, setNewExceptionCategory] =
    useState<string>("CARRIER");
  const [newExceptionSeverity, setNewExceptionSeverity] =
    useState<string>("HIGH");
  const [newExceptionTitle, setNewExceptionTitle] = useState("");
  const [newExceptionDesc, setNewExceptionDesc] = useState("");
  const [newExceptionBlocking, setNewExceptionBlocking] = useState(true);
  const [raiseSubmitting, setRaiseSubmitting] = useState(false);

  // Fetch shipment list
  const fetchShipmentsList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/scm/v1/operational/shipments-360");
      if (!res.ok)
        throw new Error(`HTTP error ${res.status}: Failed to fetch shipments`);
      const data = await res.json();
      setShipmentsList(data);

      // If no shipment selected yet, pick the first or keep URL one
      if (data.length > 0) {
        if (!selectedShipmentId) {
          const firstId = data[0].shipmentId;
          setSelectedShipmentId(firstId);
          setSearchParams({ id: firstId });
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error fetching shipments list",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedShipmentId, setSearchParams]);

  // Fetch single shipment 360 view
  const fetchShipmentDetail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setDetailLoading(true);
      setError(null);
      const res = await fetch(`/api/scm/v1/operational/shipments/${id}/360`);
      if (!res.ok)
        throw new Error(`Failed to load shipment 360 data for ${id}`);
      const data = await res.json();
      setShipmentDetail(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error loading shipment details",
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Fetch Timeline
  const fetchTimeline = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setTimelineLoading(true);
      const res = await fetch(
        `/api/scm/v1/operational/shipments/${id}/timeline`,
      );
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(data);
      }
    } catch (err) {
      console.error("Failed to load timeline", err);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  // Fetch Audit Trail
  const fetchAuditTrail = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setAuditLoading(true);
      const res = await fetch(
        `/api/scm/v1/operational/shipments/${id}/audit-trail`,
      );
      if (res.ok) {
        const data = await res.json();
        setAuditEvents(data);
      }
    } catch (err) {
      console.error("Failed to load audit trail", err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipmentsList();
  }, [fetchShipmentsList]);

  useEffect(() => {
    if (urlShipmentId && urlShipmentId !== selectedShipmentId) {
      setSelectedShipmentId(urlShipmentId);
    }
  }, [urlShipmentId, selectedShipmentId]);

  useEffect(() => {
    if (selectedShipmentId) {
      fetchShipmentDetail(selectedShipmentId);
      if (activeTab === "journey") {
        fetchTimeline(selectedShipmentId);
      }
      if (activeTab === "audit") {
        fetchAuditTrail(selectedShipmentId);
      }
    }
  }, [
    selectedShipmentId,
    activeTab,
    fetchShipmentDetail,
    fetchTimeline,
    fetchAuditTrail,
  ]);

  const handleSelectShipment = (id: string) => {
    setSelectedShipmentId(id);
    setSearchParams({ id });
    setActionSuccessMessage(null);
  };

  // Execute in-situ action
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionModal || !shipmentDetail) return;

    try {
      setActionSubmitting(true);
      setError(null);

      if (activeActionModal.type === "RESOLVE_EXCEPTION") {
        const note =
          activeActionModal.inputs["resolutionNote"] ||
          "Resolved in-situ via Command Center";
        const res = await fetch(
          `/api/scm/v1/operational/exceptions/${activeActionModal.targetId}/resolve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resolutionNote: note }),
          },
        );
        if (!res.ok) throw new Error("Failed to resolve exception");
        setActionSuccessMessage(
          `Exception resolved successfully. Downstream blockers unblocked.`,
        );
      } else {
        // Find corresponding task's workItemId or execute directly via cockpit execute endpoint
        const cockpitRes = await fetch(
          `/api/scm/v1/operational/cockpit?shipmentId=${shipmentDetail.shipmentId}`,
        );
        const cockpitItems = await cockpitRes.json();
        const matchedItem = cockpitItems.find(
          (it: { taskId: string }) => it.taskId === activeActionModal.targetId,
        );

        if (matchedItem) {
          const execRes = await fetch(
            `/api/scm/v1/operational/cockpit/${matchedItem.workItemId}/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inputValues: activeActionModal.inputs }),
            },
          );
          if (!execRes.ok) throw new Error("Failed to execute cockpit command");
        } else {
          // Direct fallback complete task command
          const res = await fetch(
            `/api/scm/v1/operational/cockpit/task_${activeActionModal.targetId}/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ inputValues: activeActionModal.inputs }),
            },
          );
          if (!res.ok) throw new Error("Failed to complete task");
        }
        setActionSuccessMessage(
          `Task '${activeActionModal.title}' completed successfully.`,
        );
      }

      setActiveActionModal(null);
      // Reload fresh data
      await fetchShipmentDetail(shipmentDetail.shipmentId);
      if (activeTab === "journey")
        await fetchTimeline(shipmentDetail.shipmentId);
      if (activeTab === "audit")
        await fetchAuditTrail(shipmentDetail.shipmentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error executing action");
    } finally {
      setActionSubmitting(false);
    }
  };

  // Raise Exception
  const handleRaiseException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentDetail || !newExceptionTitle) return;

    try {
      setRaiseSubmitting(true);
      setError(null);
      const res = await fetch(`/api/scm/v1/operational/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentId: shipmentDetail.shipmentId,
          category: newExceptionCategory,
          severity: newExceptionSeverity,
          title: newExceptionTitle,
          description: newExceptionDesc,
          isBlocking: newExceptionBlocking,
        }),
      });

      if (!res.ok) throw new Error("Failed to raise exception");
      setShowRaiseExceptionModal(false);
      setNewExceptionTitle("");
      setNewExceptionDesc("");
      setActionSuccessMessage(
        "Operational exception logged and propagated to outbox & Cockpit.",
      );
      await fetchShipmentDetail(shipmentDetail.shipmentId);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to raise exception",
      );
    } finally {
      setRaiseSubmitting(false);
    }
  };

  const filteredShipments = shipmentsList.filter((s) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      s.shipmentReference?.toLowerCase().includes(term) ||
      s.shipmentId?.toLowerCase().includes(term) ||
      s.serviceType?.toLowerCase().includes(term)
    );
  });

  const getHealthBadge = (health?: { status: string; score: number }) => {
    if (!health) return null;
    switch (health.status) {
      case "ON_TRACK":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy ({health.score}/100)
          </span>
        );
      case "AT_RISK":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            At Risk ({health.score}/100)
          </span>
        );
      case "CRITICAL":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" />
            Critical ({health.score}/100)
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header / Bar */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Shipment 360 Command Center
              </h1>
              <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                CQRS Authoritative
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operational mission control, explainable attention telemetry &
              in-situ action dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {shipmentDetail && (
            <button
              onClick={() => setShowRaiseExceptionModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/40 flex items-center gap-1.5 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Raise Exception
            </button>
          )}

          <button
            onClick={() => {
              if (selectedShipmentId) fetchShipmentDetail(selectedShipmentId);
              fetchShipmentsList();
            }}
            disabled={loading || detailLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${detailLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Drawer / Shipment List */}
        <aside className="w-80 border-r border-slate-800 bg-slate-900/30 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by ref, ID, mode..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {loading && shipmentsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Loading shipments...
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No shipments found.
              </div>
            ) : (
              filteredShipments.map((shp) => {
                const isSelected = shp.shipmentId === selectedShipmentId;
                return (
                  <button
                    key={shp.shipmentId}
                    onClick={() => handleSelectShipment(shp.shipmentId)}
                    className={`w-full text-left p-3 rounded-xl transition flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600/15 border border-indigo-500/40 text-slate-100 shadow-sm"
                        : "hover:bg-slate-800/50 text-slate-400 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-200">
                        {shp.shipmentReference || shp.shipmentId}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          shp.health?.status === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : shp.health?.status === "AT_RISK"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {shp.health?.status || "HEALTHY"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{shp.serviceType || "OCEAN_FCL"}</span>
                      <span>•</span>
                      <span>{shp.lifecycle || "IN_TRANSIT"}</span>
                      {shp.metrics?.activeExceptionsCount ? (
                        <>
                          <span>•</span>
                          <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" />
                            {shp.metrics.activeExceptionsCount} exc
                          </span>
                        </>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Active Shipment Workspace */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-slate-950">
          {actionSuccessMessage && (
            <div className="m-6 mb-0 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccessMessage}</span>
              </div>
              <button
                onClick={() => setActionSuccessMessage(null)}
                className="text-emerald-400 hover:text-emerald-200 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {error && (
            <div className="m-6 mb-0 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-rose-400 hover:text-rose-200 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {detailLoading && !shipmentDetail ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-sm">Synthesizing 360 projection...</p>
            </div>
          ) : !shipmentDetail ? (
            <div className="p-16 text-center text-slate-500 text-sm">
              Select a shipment from the left drawer to inspect the full 360
              Command Center.
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Header Hero Banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black tracking-tight text-white">
                      {shipmentDetail.shipmentReference ||
                        shipmentDetail.shipmentId}
                    </h2>
                    {getHealthBadge(shipmentDetail.health)}
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                      v{shipmentDetail.projectionVersion}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-400" />
                      {shipmentDetail.serviceType}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-300">
                      Lifecycle: {shipmentDetail.lifecycle}
                    </span>
                    <span>•</span>
                    <span>
                      Customer:{" "}
                      {shipmentDetail.customerPartyId || "ACME Global Shipping"}
                    </span>
                    <span>•</span>
                    <span className="text-slate-500">
                      Updated:{" "}
                      {new Date(
                        shipmentDetail.lastUpdatedAt,
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Quick Progress Indicator */}
                <div className="flex items-center gap-6 bg-slate-950/60 px-5 py-3 rounded-xl border border-slate-800">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      Workflow Progress
                    </div>
                    <div className="text-xl font-black text-indigo-400">
                      {shipmentDetail.metrics?.progressPercentage ?? 0}%
                    </div>
                  </div>
                  <div className="w-24 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${shipmentDetail.metrics?.progressPercentage ?? 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Tabs (7 Perspectives) */}
              <div className="flex items-center gap-1 border-b border-slate-800">
                {[
                  { key: "overview", label: "Overview", icon: Layers },
                  {
                    key: "attention",
                    label: "Attention & Signals",
                    icon: ShieldAlert,
                    count:
                      (shipmentDetail.signals?.length || 0) +
                      (shipmentDetail.exceptions?.filter(
                        (e) => e.status === "OPEN",
                      ).length || 0),
                  },
                  {
                    key: "journey",
                    label: "Journey & Timeline",
                    icon: History,
                  },
                  {
                    key: "tasks",
                    label: "Tasks (DAG)",
                    icon: GitBranch,
                    count:
                      shipmentDetail.tasks?.filter((t) => t.status === "OPEN")
                        .length || 0,
                  },
                  {
                    key: "exceptions",
                    label: "Exceptions",
                    icon: AlertTriangle,
                    count:
                      shipmentDetail.exceptions?.filter(
                        (e) => e.status === "OPEN",
                      ).length || 0,
                  },
                  { key: "cargo_route", label: "Cargo & Route", icon: Ship },
                  { key: "audit", label: "Outbox Audit", icon: FileText },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as TabKey)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-px ${
                        isActive
                          ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Perspective 1: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Top Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] font-medium text-slate-400">
                        Operational Health
                      </div>
                      <div className="text-xl font-bold mt-1 text-slate-100 flex items-center justify-between">
                        <span>{shipmentDetail.health.status}</span>
                        <span className="text-sm font-mono text-slate-400">
                          {shipmentDetail.health.score}/100
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {shipmentDetail.health.blockers.length} active blockers
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] font-medium text-slate-400">
                        Tasks Executed
                      </div>
                      <div className="text-xl font-bold mt-1 text-slate-100">
                        {shipmentDetail.metrics.completedTasks} /{" "}
                        {shipmentDetail.metrics.totalTasks}
                      </div>
                      <div className="mt-2 text-[11px] text-emerald-400">
                        {shipmentDetail.metrics.openTasks} open,{" "}
                        {shipmentDetail.metrics.blockedTasks} gated
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] font-medium text-slate-400">
                        Active Exceptions
                      </div>
                      <div className="text-xl font-bold mt-1 text-rose-400">
                        {
                          shipmentDetail.exceptions.filter(
                            (e) => e.status === "OPEN",
                          ).length
                        }
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        {
                          shipmentDetail.exceptions.filter(
                            (e) => e.isBlocking && e.status === "OPEN",
                          ).length
                        }{" "}
                        blocking execution
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="text-[11px] font-medium text-slate-400">
                        Active Workflow
                      </div>
                      <div className="text-base font-bold mt-1 text-indigo-300 truncate">
                        {shipmentDetail.workflow?.definitionCode ||
                          "OCEAN_IMPORT_STD"}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        Version {shipmentDetail.workflow?.versionNumber ?? 1} •{" "}
                        {shipmentDetail.workflow?.status || "RUNNING"}
                      </div>
                    </div>
                  </div>

                  {/* Explainable Next Action Banner */}
                  {shipmentDetail.explainability?.recommendedAction && (
                    <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold uppercase text-indigo-300 tracking-wider">
                            Recommended Next Best Action
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">
                          {
                            shipmentDetail.explainability.recommendedAction
                              .title
                          }
                        </h4>
                        <p className="text-xs text-slate-300">
                          {
                            shipmentDetail.explainability.recommendedAction
                              .description
                          }
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const action =
                            shipmentDetail.explainability.recommendedAction;
                          if (action.actionType === "RESOLVE_EXCEPTION") {
                            setActiveActionModal({
                              type: "RESOLVE_EXCEPTION",
                              targetId: action.targetId,
                              title: action.title,
                              description: action.description,
                              inputs: { resolutionNote: "" },
                            });
                          } else {
                            const task = shipmentDetail.tasks.find(
                              (t) => t.taskId === action.targetId,
                            );
                            setActiveActionModal({
                              type: "COMPLETE_TASK",
                              targetId: action.targetId,
                              title: action.title,
                              description: action.description,
                              inputs: {},
                              primaryAction: task?.primaryAction,
                            });
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-600/30 transition"
                      >
                        <Zap className="w-4 h-4" />
                        Act Now (In-Situ)
                      </button>
                    </div>
                  )}

                  {/* Two column: Active Blockers & Route Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Blockers & Invariants */}
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400" />
                        Execution Gating & Blockers
                      </h3>
                      {shipmentDetail.health.blockers.length === 0 ? (
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5 py-4">
                          <CheckCircle2 className="w-4 h-4" />
                          All invariants satisfied. Shipment moving without
                          gating impediments.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {shipmentDetail.health.blockers.map((b, idx) => (
                            <li
                              key={idx}
                              className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2"
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Operational Route Highlights */}
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Compass className="w-4 h-4 text-indigo-400" />
                        Route Plan & Milestone Schedule
                      </h3>
                      {shipmentDetail.routePlan?.legs &&
                      shipmentDetail.routePlan.legs.length > 0 ? (
                        <div className="space-y-2">
                          {shipmentDetail.routePlan.legs.map((leg) => (
                            <div
                              key={leg.legId}
                              className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-indigo-400 font-bold">
                                  Leg {leg.sequence}
                                </span>
                                <span className="text-slate-300">
                                  {leg.originLocode} → {leg.destinationLocode}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-400 font-mono">
                                <span>{leg.mode}</span>
                                <span>({leg.carrierCode || "CARRIER"})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 py-4">
                          No route plan generated yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Perspective 2: Attention & Signals */}
              {activeTab === "attention" && (
                <div className="space-y-6">
                  {/* Attention Scoring Breakdown */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-slate-200">
                          Explainable Attention Telemetry
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        Calculated from live invariants & open exceptions
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {shipmentDetail.explainability?.attentionScoreBreakdown?.map(
                        (factor, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40"
                          >
                            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                              <span>{factor.factor}</span>
                              <span className="text-indigo-400">
                                +{factor.points} pts
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {factor.explanation}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Signals Feed */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Real-Time Operational Signals (
                      {shipmentDetail.signals?.length || 0})
                    </h4>
                    {!shipmentDetail.signals ||
                    shipmentDetail.signals.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                        No active anomalies or warning signals detected.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {shipmentDetail.signals.map((sig) => (
                          <div
                            key={sig.signalId}
                            className={`p-4 rounded-xl border flex items-start gap-3 ${
                              sig.severity === "CRITICAL"
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                : sig.severity === "MAJOR"
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                  : "bg-slate-900 border-slate-800 text-slate-300"
                            }`}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">
                                  {sig.title}
                                </span>
                                <span className="text-[10px] font-mono opacity-75">
                                  {sig.source}
                                </span>
                              </div>
                              <p className="text-xs opacity-90">
                                {sig.explanation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Perspective 3: Journey & Chronological Operational Timeline */}
              {activeTab === "journey" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-400" />
                      Operational Event Timeline (CQRS Outbox & Exceptions)
                    </h3>
                    <button
                      onClick={() => fetchTimeline(shipmentDetail.shipmentId)}
                      disabled={timelineLoading}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${timelineLoading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </button>
                  </div>

                  {timelineLoading ? (
                    <div className="p-12 text-center text-xs text-slate-500">
                      Loading timeline events...
                    </div>
                  ) : timelineEvents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                      No operational events recorded yet.
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                      {timelineEvents.map((evt) => (
                        <div key={evt.timelineId} className="relative group">
                          {/* Dot */}
                          <div
                            className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                              evt.category === "EXCEPTION"
                                ? "bg-rose-500 ring-2 ring-rose-500/20"
                                : evt.category === "PLANNING"
                                  ? "bg-indigo-500"
                                  : evt.category === "TASK"
                                    ? "bg-emerald-500"
                                    : "bg-cyan-500"
                            }`}
                          />

                          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200">
                                  {evt.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 font-mono text-slate-400">
                                  {evt.category}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {new Date(evt.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400">
                              {evt.description}
                            </p>

                            <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono">
                              <span>Actor: {evt.actor}</span>
                              <span>•</span>
                              <span>Source: {evt.source}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Perspective 4: Tasks (DAG Operational Pipeline) */}
              {activeTab === "tasks" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-indigo-400" />
                        Operational Task DAG & Gating Pipeline
                      </h3>
                      <p className="text-xs text-slate-400">
                        Tasks are conditionally unlocked as upstream
                        predecessors are satisfied.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {shipmentDetail.tasks.map((task) => {
                      const isComplete = task.status === "COMPLETED";
                      const isGated = task.isBlocked;

                      return (
                        <div
                          key={task.taskId}
                          className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isComplete
                              ? "bg-slate-900/40 border-slate-800/60 opacity-80"
                              : isGated
                                ? "bg-amber-500/5 border-amber-500/20"
                                : "bg-slate-900 border-indigo-500/40 shadow-sm"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                                isComplete
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : isGated
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "bg-indigo-600/20 text-indigo-400"
                              }`}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isGated ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <Unlock className="w-4 h-4" />
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-200">
                                  {task.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-800 text-slate-400">
                                  {task.taskType}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    isComplete
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : isGated
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-indigo-500/20 text-indigo-300"
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </div>

                              {task.dependencies &&
                                task.dependencies.length > 0 && (
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <span>Predecessors:</span>
                                    {task.dependencies.map((dep, dIdx) => (
                                      <span
                                        key={dIdx}
                                        className={`px-1.5 py-0.2 rounded font-mono ${
                                          dep.status === "COMPLETED"
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-amber-500/10 text-amber-400"
                                        }`}
                                      >
                                        {dep.predecessorTaskId.slice(0, 12)} (
                                        {dep.status})
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center justify-end shrink-0">
                            {isComplete ? (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                Satisfied
                              </span>
                            ) : isGated ? (
                              <span className="text-xs text-amber-400/80 font-medium flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" /> Gated by
                                Predecessors
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveActionModal({
                                    type: "COMPLETE_TASK",
                                    targetId: task.taskId,
                                    title: task.title,
                                    description: `Complete domain task ${task.taskType} and unlock successors in the DAG.`,
                                    inputs: {},
                                    primaryAction: task.primaryAction,
                                  });
                                }}
                                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-sm"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                {task.primaryAction?.actionLabel ||
                                  "Complete In-Situ"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Perspective 5: Exceptions Portfolio */}
              {activeTab === "exceptions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        Operational Exceptions (
                        {shipmentDetail.exceptions.length})
                      </h3>
                      <p className="text-xs text-slate-400">
                        Exceptions trigger domain events, degrade health score,
                        and halt downstream workflow steps.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowRaiseExceptionModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Raise Exception
                    </button>
                  </div>

                  {shipmentDetail.exceptions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                      Zero operational exceptions logged for this shipment.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shipmentDetail.exceptions.map((ex) => {
                        const isResolved = ex.status === "RESOLVED";
                        return (
                          <div
                            key={ex.exceptionId}
                            className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                              isResolved
                                ? "bg-slate-900/30 border-slate-800 opacity-70"
                                : ex.severity === "CRITICAL"
                                  ? "bg-rose-500/10 border-rose-500/30"
                                  : "bg-amber-500/10 border-amber-500/30"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-200">
                                  {ex.title}
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    ex.severity === "CRITICAL"
                                      ? "bg-rose-500/20 text-rose-300"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {ex.severity}
                                </span>
                                {ex.isBlocking && (
                                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-red-950 text-red-400 border border-red-700">
                                    BLOCKING
                                  </span>
                                )}
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                  {ex.category}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300">
                                {ex.description}
                              </p>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                <span>
                                  Raised:{" "}
                                  {new Date(ex.raisedAt).toLocaleString()}
                                </span>
                                {ex.assignedTo && (
                                  <span>• Assigned: {ex.assignedTo}</span>
                                )}
                                {isResolved && (
                                  <span className="text-emerald-400">
                                    • Note: {ex.resolutionNote}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end shrink-0">
                              {isResolved ? (
                                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                  Resolved
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setActiveActionModal({
                                      type: "RESOLVE_EXCEPTION",
                                      targetId: ex.exceptionId,
                                      title: `Resolve: ${ex.title}`,
                                      description:
                                        "Provide resolution justification to restore shipment health and unblock execution.",
                                      inputs: { resolutionNote: "" },
                                    });
                                  }}
                                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Resolve Exception
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Perspective 6: Cargo & Route */}
              {activeTab === "cargo_route" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Physical Cargo */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-indigo-400" />
                      Cargo Specifications & Containers
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[11px]">
                          Total Weight
                        </span>
                        <span className="font-bold text-slate-200 mt-1 block">
                          {shipmentDetail.shipment?.cargoDetails
                            ?.totalWeightKg ?? 18450}{" "}
                          kg
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[11px]">
                          Volume
                        </span>
                        <span className="font-bold text-slate-200 mt-1 block">
                          {shipmentDetail.shipment?.cargoDetails
                            ?.totalVolumeCbm ?? 42.5}{" "}
                          CBM
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[11px]">
                          Package Count
                        </span>
                        <span className="font-bold text-slate-200 mt-1 block">
                          {shipmentDetail.shipment?.cargoDetails
                            ?.packageCount ?? 24}{" "}
                          Packages / Pallets
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <span className="text-slate-400 block text-[11px]">
                          Cargo Classification
                        </span>
                        <span className="font-bold text-slate-200 mt-1 block">
                          {shipmentDetail.shipment?.cargoDetails?.cargoType ??
                            "GENERAL_COMMODITY"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route Legs */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      Multi-Modal Route Execution Legs
                    </h3>
                    {shipmentDetail.routePlan?.legs &&
                    shipmentDetail.routePlan.legs.length > 0 ? (
                      <div className="space-y-2">
                        {shipmentDetail.routePlan.legs.map((leg) => (
                          <div
                            key={leg.legId}
                            className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                                {leg.sequence}
                              </div>
                              <div>
                                <div className="font-bold text-slate-200">
                                  {leg.originLocode} → {leg.destinationLocode}
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  Carrier: {leg.carrierCode || "MAEU"}
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {leg.mode}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 py-6 text-center">
                        No legs planned yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Perspective 7: Outbox Audit */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        Outbox Event Stream Audit Log
                      </h3>
                      <p className="text-xs text-slate-400">
                        Immutable event log proving transactional aggregate
                        mutation + outbox event consistency.
                      </p>
                    </div>

                    <button
                      onClick={() => fetchAuditTrail(shipmentDetail.shipmentId)}
                      disabled={auditLoading}
                      className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${auditLoading ? "animate-spin" : ""}`}
                      />
                      Refresh
                    </button>
                  </div>

                  {auditLoading ? (
                    <div className="p-12 text-center text-xs text-slate-500">
                      Loading audit records...
                    </div>
                  ) : auditEvents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                      No outbox audit records found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {auditEvents.map((aud) => (
                        <div
                          key={aud.eventId}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-bold text-indigo-400">
                              {aud.eventType}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(aud.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-slate-400">
                            <span>Status: {aud.status}</span>
                            <span>•</span>
                            <span>Event ID: {aud.eventId.slice(0, 16)}...</span>
                          </div>
                          <details className="mt-2 text-[10px] text-slate-500">
                            <summary className="cursor-pointer hover:text-slate-300">
                              View Payload JSON
                            </summary>
                            <pre className="p-2 mt-1 rounded bg-slate-950 border border-slate-800 overflow-x-auto text-slate-400">
                              {JSON.stringify(aud.payload, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* In-Situ Action Modal (Explain -> Decide -> Act -> Confirm) */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Execute Action In-Situ
                </h3>
              </div>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Explain */}
            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                1. Explain Context
              </div>
              <p className="font-semibold text-slate-200">
                {activeActionModal.title}
              </p>
              <p className="text-slate-400">{activeActionModal.description}</p>
            </div>

            {/* Step 2: Decide & Act */}
            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                2. Input Decision Parameters
              </div>

              {activeActionModal.type === "RESOLVE_EXCEPTION" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Resolution Justification Note
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={activeActionModal.inputs["resolutionNote"] || ""}
                    onChange={(e) =>
                      setActiveActionModal({
                        ...activeActionModal,
                        inputs: {
                          ...activeActionModal.inputs,
                          resolutionNote: e.target.value,
                        },
                      })
                    }
                    placeholder="E.g., Rolled booking accommodated on feeder vessel CMA CGM LOUVRE ETA +24h..."
                    className="w-full p-2.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {activeActionModal.primaryAction?.inputFields &&
                  activeActionModal.primaryAction.inputFields.length > 0 ? (
                    activeActionModal.primaryAction.inputFields.map((f) => (
                      <div key={f.name}>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          {f.label}{" "}
                          {f.required && (
                            <span className="text-rose-400">*</span>
                          )}
                        </label>
                        <input
                          type={f.type === "number" ? "number" : "text"}
                          required={f.required}
                          value={activeActionModal.inputs[f.name] || ""}
                          onChange={(e) =>
                            setActiveActionModal({
                              ...activeActionModal,
                              inputs: {
                                ...activeActionModal.inputs,
                                [f.name]: e.target.value,
                              },
                            })
                          }
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                          className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 p-3 bg-slate-800/40 rounded-lg">
                      No additional parameters required. Submitting will commit
                      the domain aggregate mutation with outbox event.
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {actionSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                      Committing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Execute
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Exception Modal */}
      {showRaiseExceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  Raise Operational Exception
                </h3>
              </div>
              <button
                onClick={() => setShowRaiseExceptionModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRaiseException} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newExceptionCategory}
                    onChange={(e) => setNewExceptionCategory(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CARRIER">CARRIER</option>
                    <option value="DOCUMENTATION">DOCUMENTATION</option>
                    <option value="CUSTOMS">CUSTOMS</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="OPERATIONAL">OPERATIONAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Severity
                  </label>
                  <select
                    value={newExceptionSeverity}
                    onChange={(e) => setNewExceptionSeverity(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newExceptionTitle}
                  onChange={(e) => setNewExceptionTitle(e.target.value)}
                  placeholder="E.g., Vessel delay / Rolled booking at transshipment port"
                  className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newExceptionDesc}
                  onChange={(e) => setNewExceptionDesc(e.target.value)}
                  placeholder="Detail the operational impact, affected legs, or partner notices..."
                  className="w-full p-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="blockingCheck"
                  checked={newExceptionBlocking}
                  onChange={(e) => setNewExceptionBlocking(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-0"
                />
                <label
                  htmlFor="blockingCheck"
                  className="text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  Mark as Blocking (Halts downstream tasks and triggers
                  immediate attention)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRaiseExceptionModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={raiseSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition disabled:opacity-50"
                >
                  {raiseSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                      Emitting...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Raise Exception
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
