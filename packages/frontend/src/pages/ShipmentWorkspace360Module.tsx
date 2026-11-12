/**
 * @file ShipmentWorkspace360Module.tsx
 * @description Central mission control and CQRS authoritative workspace for operational shipments.
 * Coordinates multi-perspective tab telemetry, URL deep-linking, real-time status signals,
 * in-situ action dispatches, and outbox event audit verification against live Fastify endpoints.
 * @module @atlas/frontend/pages
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authFetch } from "../lib/api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Plane,
  RefreshCw,
  Ship,
  Truck,
} from "lucide-react";
import { ShipmentDrayageDrawer } from "../components/drayage/ShipmentDrayageDrawer";
import {
  ShipmentGreenComplianceReadModel,
  OperationalShipment360View,
  OperationalTimelineEvent,
  OutboxAuditEvent,
  TabKey,
  ShipmentDocumentItem,
  MletrRecordSummary,
  TaskActionMetadata,
} from "../types/shipment-workspace360.types";
import {
  ShipmentOverviewTab,
  ShipmentAttentionTab,
  ShipmentJourneyTab,
  ShipmentTasksTab,
  ShipmentExceptionsTab,
  ShipmentCargoRouteTab,
  ShipmentAuditTab,
  ShipmentGreenComplianceTab,
  WorkspaceSidebar,
  ShipmentHeroBanner,
  WorkspaceHeader,
  ShipmentNavigationTabs,
  ExecuteActionModal,
  RaiseExceptionModal,
} from "../components/Shipment/index";
import { generateClientFallbackHBL } from "../utils/hbl-generator";

export default function ShipmentWorkspace360Module() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlShipmentId = searchParams.get("id") || "";
  const urlTab = searchParams.get("tab") as TabKey | null;
  const urlHighlight = searchParams.get("highlight") || "";
  const urlAction = searchParams.get("action") || "";

  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(
    urlShipmentId || "sh_demo_01",
  );
  const [activeTab, setActiveTab] = useState<TabKey>(
    urlTab &&
      [
        "overview",
        "attention",
        "journey",
        "tasks",
        "exceptions",
        "cargo_route",
        "audit",
        "compliance_green",
      ].includes(urlTab)
      ? urlTab
      : "overview",
  );
  const [highlightId, setHighlightId] = useState<string>(urlHighlight);

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
  const [greenCompliance, setGreenCompliance] =
    useState<ShipmentGreenComplianceReadModel | null>(null);
  const [greenLoading, setGreenLoading] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [shipmentDocuments, setShipmentDocuments] = useState<
    ShipmentDocumentItem[]
  >([]);
  const [mletrRecord, setMletrRecord] = useState<MletrRecordSummary | null>(
    null,
  );
  const [offsetPercentage, setOffsetPercentage] = useState<number>(100);
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
  const [showDrayageDrawer, setShowDrayageDrawer] = useState(false);

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
      const res = await authFetch("/api/scm/v1/operational/shipments-360");
      if (!res.ok)
        throw new Error(`HTTP error ${res.status}: Failed to fetch shipments`);
      const data = await res.json();
      const items: OperationalShipment360View[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setShipmentsList(items);

      // Deterministic canonical fallback: prefer sh_demo_01 or keep URL/selected shipment
      if (items.length > 0) {
        if (
          !selectedShipmentId ||
          !items.some((i) => i.shipmentId === selectedShipmentId)
        ) {
          const canonical = items.find(
            (i) =>
              i.shipmentId === "sh_demo_01" ||
              i.shipmentReference === "BK-2026-67116",
          );
          const targetId = canonical
            ? canonical.shipmentId
            : items[0].shipmentId;
          setSelectedShipmentId(targetId);
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("id", targetId);
            return next;
          });
        }
      } else {
        if (!selectedShipmentId) {
          setSelectedShipmentId("sh_demo_01");
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("id", "sh_demo_01");
            return next;
          });
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
      const res = await authFetch(
        `/api/scm/v1/operational/shipments/${id}/360`,
      );
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

  // Fetch Official Documents for this shipment
  const fetchShipmentDocuments = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const res = await authFetch(`/api/documents?shipmentId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setShipmentDocuments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load shipment documents", err);
    }
  }, []);

  // Fetch MLETR e-Title Transferable Record
  const fetchMletrRecord = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const res = await authFetch(
        `/api/smart-contracts/mletr?shipmentId=${id}`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.record) {
          setMletrRecord(json.data.record);
        } else {
          setMletrRecord(null);
        }
      }
    } catch {
      setMletrRecord(null);
    }
  }, []);

  // Fetch Timeline
  const fetchTimeline = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setTimelineLoading(true);
      const res = await authFetch(
        `/api/scm/v1/operational/shipments/${id}/timeline`,
      );
      if (res.ok) {
        const data = await res.json();
        setTimelineEvents(Array.isArray(data) ? data : (data?.items ?? []));
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
      const res = await authFetch(
        `/api/scm/v1/operational/shipments/${id}/audit-trail`,
      );
      if (res.ok) {
        const data = await res.json();
        setAuditEvents(Array.isArray(data) ? data : (data?.items ?? []));
      }
    } catch (err) {
      console.error("Failed to load audit trail", err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  // Fetch Green Compliance & Customs Read Model
  const fetchGreenCompliance = useCallback(async (id: string) => {
    if (!id) return;
    try {
      setGreenLoading(true);
      const res = await authFetch(
        `/api/scm/v1/operational/shipments/${id}/green-compliance`,
      );
      if (res.ok) {
        const data = await res.json();
        setGreenCompliance(data);
      }
    } catch (err) {
      console.error("Failed to load green compliance", err);
    } finally {
      setGreenLoading(false);
    }
  }, []);

  // Generic Official Document Downloader (PDF & XML)
  const handleDownloadDoc = async (
    endpoint:
      "carbon-certificate" | "cbam-report" | "cbam-xml" | "dua-pdf" | "dua-xml",
    filename: string,
    successMsg: string,
  ) => {
    if (!shipmentDetail) return;
    try {
      setDownloadingDoc(endpoint);
      const res = await authFetch(
        `/api/scm/v1/operational/shipments/${shipmentDetail.shipmentId}/${endpoint}`,
      );
      if (!res.ok)
        throw new Error(`HTTP ${res.status}: Failed to download document`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setActionSuccessMessage(successMsg);
    } catch (err) {
      console.error(`Download failed for ${endpoint}:`, err);
      setError(
        err instanceof Error ? err.message : `Failed to download ${filename}`,
      );
    } finally {
      setDownloadingDoc(null);
    }
  };

  useEffect(() => {
    fetchShipmentsList();
  }, [fetchShipmentsList]);

  // Synchronize URL search params with local state
  useEffect(() => {
    if (urlShipmentId && urlShipmentId !== selectedShipmentId) {
      setSelectedShipmentId(urlShipmentId);
    }
  }, [urlShipmentId, selectedShipmentId]);

  useEffect(() => {
    if (
      urlTab &&
      [
        "overview",
        "attention",
        "journey",
        "tasks",
        "exceptions",
        "cargo_route",
        "audit",
        "compliance_green",
      ].includes(urlTab) &&
      urlTab !== activeTab
    ) {
      setActiveTab(urlTab);
    }
  }, [urlTab, activeTab]);

  useEffect(() => {
    setHighlightId(urlHighlight);
  }, [urlHighlight]);

  useEffect(() => {
    if (selectedShipmentId) {
      fetchShipmentDetail(selectedShipmentId);
      fetchShipmentDocuments(selectedShipmentId);
      fetchMletrRecord(selectedShipmentId);
      fetchGreenCompliance(selectedShipmentId);
      if (activeTab === "journey") {
        fetchTimeline(selectedShipmentId);
      }
      if (activeTab === "audit") {
        fetchAuditTrail(selectedShipmentId);
      }
      if (activeTab === "compliance_green") {
        fetchGreenCompliance(selectedShipmentId);
      }
    }
  }, [
    selectedShipmentId,
    activeTab,
    fetchShipmentDetail,
    fetchShipmentDocuments,
    fetchMletrRecord,
    fetchTimeline,
    fetchAuditTrail,
    fetchGreenCompliance,
  ]);

  // Auto-focus & open contextual action drawer when landing from deep-link with action=resolve
  useEffect(() => {
    if (!shipmentDetail || !urlHighlight || urlAction !== "resolve") return;

    // 1. Try matching exception
    const matchedEx = shipmentDetail.exceptions?.find(
      (e) =>
        e.exceptionId === urlHighlight ||
        e.exceptionId === urlHighlight.replace("exc_", ""),
    );
    if (matchedEx && matchedEx.status !== "RESOLVED") {
      setActiveActionModal({
        type: "RESOLVE_EXCEPTION",
        targetId: matchedEx.exceptionId,
        title: `Resolve Exception: ${matchedEx.title}`,
        description:
          matchedEx.description ||
          "Provide resolution justification to restore shipment health and unblock execution.",
        inputs: { resolutionNote: "" },
      });
      return;
    }

    // 2. Try matching task
    const cleanTaskId = urlHighlight.replace("task_", "");
    const matchedTask = shipmentDetail.tasks?.find(
      (t) => t.taskId === urlHighlight || t.taskId === cleanTaskId,
    );
    if (matchedTask && matchedTask.status !== "COMPLETED") {
      setActiveActionModal({
        type: "COMPLETE_TASK",
        targetId: matchedTask.taskId,
        title: matchedTask.title,
        description: `Complete domain task ${matchedTask.taskType} and unlock successors in the DAG.`,
        inputs: {},
        primaryAction: matchedTask.primaryAction,
      });
      return;
    }

    // 3. Fallback matching recommendedAction
    const rec = shipmentDetail.explainability?.recommendedAction;
    if (
      rec &&
      (rec.targetId === urlHighlight || rec.targetId === cleanTaskId)
    ) {
      if (rec.actionType === "RESOLVE_EXCEPTION") {
        setActiveActionModal({
          type: "RESOLVE_EXCEPTION",
          targetId: rec.targetId,
          title: rec.title,
          description: rec.description,
          inputs: { resolutionNote: "" },
        });
      } else {
        const task = shipmentDetail.tasks?.find(
          (t) => t.taskId === rec.targetId,
        );
        setActiveActionModal({
          type: "COMPLETE_TASK",
          targetId: rec.targetId,
          title: rec.title,
          description: rec.description,
          inputs: {},
          primaryAction: task?.primaryAction,
        });
      }
    }
  }, [shipmentDetail, urlHighlight, urlAction]);

  // Smooth scroll to highlighted item
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      const el =
        document.getElementById(`highlight-${highlightId}`) ||
        document.getElementById(
          `highlight-${highlightId.replace(/^(task_|exc_)/, "")}`,
        ) ||
        document.querySelector(`[data-highlight-id="${highlightId}"]`) ||
        document.querySelector(
          `[data-highlight-id="${highlightId.replace(/^(task_|exc_)/, "")}"]`,
        );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [highlightId, activeTab, shipmentDetail]);

  const handleSelectShipment = (id: string) => {
    setSelectedShipmentId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("id", id);
      next.delete("highlight");
      next.delete("action");
      return next;
    });
    setHighlightId("");
    setActionSuccessMessage(null);
  };

  const handleTabChange = (newTab: TabKey) => {
    setActiveTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", newTab);
      return next;
    });
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
        const res = await authFetch(
          `/api/scm/v1/operational/exceptions/${activeActionModal.targetId}/resolve`,
          {
            method: "POST",
            body: JSON.stringify({ resolutionNote: note }),
          },
        );
        if (!res.ok) throw new Error("Failed to resolve exception");
        setActionSuccessMessage(
          `Exception resolved successfully. Downstream blockers unblocked.`,
        );
      } else {
        // Execute task directly via transactional cockpit execute endpoint
        const execRes = await authFetch(
          `/api/scm/v1/operational/cockpit/${activeActionModal.targetId}/execute`,
          {
            method: "POST",
            body: JSON.stringify({
              inputValues: activeActionModal.inputs,
              ...activeActionModal.inputs,
            }),
          },
        );
        if (!execRes.ok) {
          const errData = await execRes.json().catch(() => null);
          throw new Error(
            errData?.message || "Failed to execute domain command",
          );
        }
        setActionSuccessMessage(
          `Task '${activeActionModal.title}' completed successfully. Downstream gates unblocked.`,
        );
      }

      setActiveActionModal(null);
      // Reload fresh data
      await Promise.all([
        fetchShipmentDetail(shipmentDetail.shipmentId),
        fetchShipmentDocuments(shipmentDetail.shipmentId),
        fetchMletrRecord(shipmentDetail.shipmentId),
      ]);
      if (activeTab === "journey")
        await fetchTimeline(shipmentDetail.shipmentId);
      if (activeTab === "audit")
        await fetchAuditTrail(shipmentDetail.shipmentId);
      if (activeTab === "compliance_green" || activeTab === "overview")
        await fetchGreenCompliance(shipmentDetail.shipmentId);
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
      const res = await authFetch(`/api/scm/v1/operational/exceptions`, {
        method: "POST",
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

  const [downloadingHBL, setDownloadingHBL] = useState(false);

  const handleDownloadHBL = async () => {
    if (!shipmentDetail) return;
    try {
      setDownloadingHBL(true);
      const res = await authFetch(
        `/api/scm/v1/operational/shipments/${shipmentDetail.shipmentId}/bol`,
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `HBL-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setActionSuccessMessage(
          "House Bill of Lading (PDF) descargado exitosamente.",
        );
      } else {
        await generateClientFallbackHBL(shipmentDetail);
        setActionSuccessMessage(
          "House Bill of Lading generado en cliente (Modo Contingencia).",
        );
      }
    } catch (err) {
      console.warn(
        "Backend PDF fetch failed, falling back to client jsPDF:",
        err,
      );
      await generateClientFallbackHBL(shipmentDetail);
      setActionSuccessMessage(
        "House Bill of Lading generado en cliente (Modo Contingencia).",
      );
    } finally {
      setDownloadingHBL(false);
    }
  };

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

  const getServiceIcon = (serviceType: string) => {
    if (serviceType.includes("AIR"))
      return <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    if (serviceType.includes("ROAD"))
      return <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    return <Ship className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-slate-950 text-slate-100">
      {/* Top Header / Bar */}
      <WorkspaceHeader
        selectedShipmentId={selectedShipmentId}
        shipmentsList={shipmentsList}
        onSelectShipment={handleSelectShipment}
        shipmentDetail={shipmentDetail}
        healthBadge={
          shipmentDetail ? getHealthBadge(shipmentDetail.health) : null
        }
        onDownloadHBL={handleDownloadHBL}
        downloadingHBL={downloadingHBL}
        onOpenDrayage={() => setShowDrayageDrawer(true)}
        onOpenRaiseException={() => setShowRaiseExceptionModal(true)}
        onRefresh={() => {
          if (selectedShipmentId) fetchShipmentDetail(selectedShipmentId);
          fetchShipmentsList();
        }}
        refreshDisabled={loading || detailLoading}
        refreshSpinning={detailLoading}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Drawer / Shipment List */}
        <WorkspaceSidebar
          shipmentsList={shipmentsList}
          selectedShipmentId={selectedShipmentId}
          onSelectShipment={handleSelectShipment}
          loading={loading}
          searchFilter={searchFilter}
          onSearchFilterChange={setSearchFilter}
          getServiceIcon={getServiceIcon}
        />

        {/* Right Active Shipment Workspace */}
        <main className="flex-1 overflow-y-auto flex flex-col bg-slate-950">
          {actionSuccessMessage && (
            <div className="m-6 mb-0 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-300 shadow-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionSuccessMessage}</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => navigate("/cockpit")}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al Cockpit
                </button>
                <button
                  onClick={() => setActionSuccessMessage(null)}
                  className="text-emerald-400 hover:text-emerald-200 font-bold px-2 py-1"
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
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
              <ShipmentHeroBanner
                shipmentDetail={shipmentDetail}
                healthBadge={getHealthBadge(shipmentDetail.health)}
              />

              {/* Navigation Tabs (7 Perspectives) */}
              <ShipmentNavigationTabs
                activeTab={activeTab}
                onTabChange={(tab: TabKey) => handleTabChange(tab)}
                shipmentDetail={shipmentDetail}
                timelineCount={timelineEvents.length}
                auditCount={auditEvents.length}
                greenCompliance={greenCompliance}
              />

              {/* Perspective 1: Overview */}
              {activeTab === "overview" && (
                <ShipmentOverviewTab
                  shipmentDetail={shipmentDetail}
                  greenCompliance={greenCompliance}
                  handleTabChange={handleTabChange}
                  setActiveActionModal={setActiveActionModal}
                />
              )}

              {/* Perspective 2: Attention & Signals */}
              {activeTab === "attention" && (
                <ShipmentAttentionTab
                  shipmentDetail={shipmentDetail}
                  highlightId={urlHighlight}
                />
              )}

              {/* Perspective 3: Journey & Chronological Operational Timeline */}
              {activeTab === "journey" && (
                <ShipmentJourneyTab
                  shipmentDetail={shipmentDetail}
                  timelineEvents={timelineEvents}
                  timelineLoading={timelineLoading}
                  onRefreshTimeline={fetchTimeline}
                />
              )}

              {/* Perspective 8: Compliance & Green */}
              {activeTab === "compliance_green" && (
                <ShipmentGreenComplianceTab
                  shipmentDetail={shipmentDetail}
                  greenCompliance={greenCompliance}
                  greenLoading={greenLoading}
                  fetchGreenCompliance={fetchGreenCompliance}
                  shipmentDocuments={shipmentDocuments}
                  mletrRecord={mletrRecord}
                  handleDownloadDoc={handleDownloadDoc}
                  downloadingDoc={downloadingDoc}
                  offsetPercentage={offsetPercentage}
                  setOffsetPercentage={setOffsetPercentage}
                  setActionSuccessMessage={setActionSuccessMessage}
                />
              )}

              {/* Perspective 4: Tasks (DAG Operational Pipeline) */}
              {activeTab === "tasks" && (
                <ShipmentTasksTab
                  shipmentDetail={shipmentDetail}
                  highlightId={urlHighlight}
                  onOpenTaskAction={(task: any) => {
                    setActiveActionModal({
                      type: "COMPLETE_TASK",
                      targetId: task.taskId,
                      title: task.title,
                      description: `Complete domain task ${task.taskType} and unlock successors in the DAG.`,
                      inputs: {},
                      primaryAction: task.primaryAction,
                    });
                  }}
                />
              )}

              {/* Perspective 5: Exceptions Portfolio */}
              {activeTab === "exceptions" && (
                <ShipmentExceptionsTab
                  shipmentDetail={shipmentDetail}
                  highlightId={urlHighlight}
                  onOpenRaiseExceptionModal={() =>
                    setShowRaiseExceptionModal(true)
                  }
                  onOpenResolveExceptionModal={(ex: any) => {
                    setActiveActionModal({
                      type: "RESOLVE_EXCEPTION",
                      targetId: ex.exceptionId,
                      title: `Resolve: ${ex.title}`,
                      description:
                        "Provide resolution justification to restore shipment health and unblock execution.",
                      inputs: { resolutionNote: "" },
                    });
                  }}
                />
              )}

              {/* Perspective 6: Cargo & Route */}
              {activeTab === "cargo_route" && (
                <ShipmentCargoRouteTab shipmentDetail={shipmentDetail} />
              )}

              {/* Perspective 7: Outbox Audit */}
              {activeTab === "audit" && (
                <ShipmentAuditTab
                  shipmentDetail={shipmentDetail}
                  auditEvents={auditEvents}
                  auditLoading={auditLoading}
                  onRefreshAudit={fetchAuditTrail}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Contextual Slide-Over Action Drawer (Explain -> Decide -> Act -> Confirm) */}
      {activeActionModal && (
        <ExecuteActionModal
          modalState={activeActionModal}
          onClose={() => setActiveActionModal(null)}
          onSubmit={handleExecuteAction}
          submitting={actionSubmitting}
          onChangeInputs={(inputs: any) =>
            setActiveActionModal((prev) => (prev ? { ...prev, inputs } : null))
          }
        />
      )}

      {/* Raise Exception Modal */}
      <RaiseExceptionModal
        isOpen={showRaiseExceptionModal}
        onClose={() => setShowRaiseExceptionModal(false)}
        onSubmit={handleRaiseException}
        submitting={raiseSubmitting}
        category={newExceptionCategory}
        setCategory={setNewExceptionCategory}
        severity={newExceptionSeverity}
        setSeverity={setNewExceptionSeverity}
        title={newExceptionTitle}
        setTitle={setNewExceptionTitle}
        description={newExceptionDesc}
        setDescription={setNewExceptionDesc}
        isBlocking={newExceptionBlocking}
        setIsBlocking={setNewExceptionBlocking}
      />

      {showDrayageDrawer && (
        <ShipmentDrayageDrawer
          isOpen={showDrayageDrawer}
          onClose={() => setShowDrayageDrawer(false)}
          shipment={shipmentDetail}
          onOrderCreated={() => {
            if (selectedShipmentId) {
              fetchShipmentDetail(selectedShipmentId);
            }
          }}
        />
      )}
    </div>
  );
}
