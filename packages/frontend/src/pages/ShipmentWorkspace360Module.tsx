import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authFetch } from "../lib/api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Compass,
  FileText,
  GitBranch,
  History,
  Info,
  Layers,
  Leaf,
  Lock,
  Plane,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Ship,
  Sparkles,
  Truck,
  Unlock,
  Zap,
} from "lucide-react";
import { ResolutionJustificationSelect } from "../components/common/ResolutionJustificationSelect";
import { ShipmentDrayageDrawer } from "../components/drayage/ShipmentDrayageDrawer";
import {
  TaskActionMetadata,
  ShipmentGreenComplianceReadModel,
  OperationalShipment360View,
  OperationalTimelineEvent,
  OutboxAuditEvent,
  TabKey,
  ShipmentDocumentItem,
  MletrRecordSummary,
} from "../types/shipment-workspace360.types";
import { ShipmentOverviewTab } from "../components/workspace360/ShipmentOverviewTab";
import { ShipmentGreenComplianceTab } from "../components/workspace360/ShipmentGreenComplianceTab";

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

  const generateClientFallbackHBL = async (
    shipment: OperationalShipment360View,
  ) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("HOUSE BILL OF LADING", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `B/L Number: HBL-${shipment.shipmentReference || shipment.shipmentId}`,
      15,
      32,
    );
    doc.text(`Issue Date: ${new Date().toISOString().split("T")[0]}`, 15, 38);
    doc.text(`Service Type: ${shipment.serviceType}`, 15, 44);
    doc.text(
      `Shipper: ${shipment.customerPartyId || "Global Freight Solutions S.A."}`,
      15,
      54,
    );
    doc.text(
      `Consignee: Atlantic Logistics Distribution LLC - New York Hub`,
      15,
      62,
    );
    doc.text(
      `Port of Loading: ${shipment.routePlan?.legs?.[0]?.originLocode || "ESVLC (Valencia)"}`,
      15,
      72,
    );
    doc.text(
      `Port of Discharge: ${shipment.routePlan?.legs?.slice(-1)[0]?.destinationLocode || "USNYC (New York)"}`,
      15,
      78,
    );
    doc.text(`Carrier Vessel: MSC OSCAR | Voyage: V.2409W`, 15, 86);
    doc.text(`Container: MSCU9284710 (40' HC) | Seal: SL-994821`, 15, 94);
    doc.text(
      `Cargo Description: Industrial Components & Assembly Machinery`,
      15,
      102,
    );
    doc.text(
      `Gross Weight: 24,500 kg | CBM: 68.2 m3 | Packages: 480 Units`,
      15,
      108,
    );
    doc.text(
      "Standard FIATA / DCSA compliant electronic bill of lading",
      105,
      280,
      { align: "center" },
    );
    doc.save(`HBL-${shipment.shipmentReference || shipment.shipmentId}.pdf`);
  };

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
          {/* Dynamic Shipment Selector with Canonical Fallback */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">
              Expedición:
            </span>
            <select
              aria-label="Seleccionar expedición activa"
              value={selectedShipmentId || "sh_demo_01"}
              onChange={(e) => handleSelectShipment(e.target.value)}
              className="bg-transparent text-xs font-bold text-indigo-300 focus:outline-none cursor-pointer pr-2"
            >
              {shipmentsList.length === 0 ? (
                <option
                  value="sh_demo_01"
                  className="bg-slate-900 text-slate-200"
                >
                  BK-2026-67116 (sh_demo_01)
                </option>
              ) : (
                shipmentsList.map((s) => (
                  <option
                    key={s.shipmentId}
                    value={s.shipmentId}
                    className="bg-slate-900 text-slate-200"
                  >
                    {s.shipmentReference || s.shipmentId} •{" "}
                    {s.serviceType || "OCEAN"} • {s.health?.status || "HEALTHY"}
                  </option>
                ))
              )}
            </select>
            {shipmentDetail && getHealthBadge(shipmentDetail.health)}
          </div>

          {shipmentDetail && (
            <>
              <button
                onClick={handleDownloadHBL}
                disabled={downloadingHBL}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 flex items-center gap-1.5 transition disabled:opacity-50"
                title="Descargar House Bill of Lading (PDF DCSA/FIATA)"
              >
                <FileText
                  className={`w-3.5 h-3.5 ${downloadingHBL ? "animate-spin" : ""}`}
                />
                {downloadingHBL ? "Generando..." : "Descargar HBL"}
              </button>

              <button
                onClick={() => setShowDrayageDrawer(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 flex items-center gap-1.5 transition"
                title="Dispatch Port Drayage & Container Haulage (GLEC v3.0)"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-400" />
                Dispatch Drayage
              </button>

              <button
                onClick={() => setShowRaiseExceptionModal(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/40 flex items-center gap-1.5 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Raise Exception
              </button>
            </>
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
                id="shipment-360-search"
                name="shipmentFilter"
                aria-label="Filter shipments"
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

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      {getServiceIcon(shp.serviceType || "OCEAN_FCL")}
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
                    count:
                      timelineEvents.length ||
                      shipmentDetail.routePlan?.legs?.length ||
                      0,
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
                  {
                    key: "cargo_route",
                    label: "Cargo & Route",
                    icon: Ship,
                    count:
                      (shipmentDetail.shipment?.cargoDetails?.packageCount
                        ? 1
                        : 0) + (shipmentDetail.routePlan?.legs?.length || 0),
                  },
                  {
                    key: "audit",
                    label: "Outbox Audit",
                    icon: FileText,
                    count: auditEvents.length || 0,
                  },
                  {
                    key: "compliance_green",
                    label: "Compliance & Green",
                    icon: Leaf,
                    count: greenCompliance?.customs?.hasActiveHold ? 1 : 0,
                    badge: greenCompliance?.cbam?.isApplicable
                      ? "CBAM"
                      : undefined,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key as TabKey)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition -mb-px ${
                        isActive
                          ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
                          : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {tab.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          {tab.badge}
                        </span>
                      )}
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
                <ShipmentOverviewTab
                  shipmentDetail={shipmentDetail}
                  greenCompliance={greenCompliance}
                  handleTabChange={handleTabChange}
                  setActiveActionModal={setActiveActionModal}
                />
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
                        {shipmentDetail.signals.map((sig) => {
                          const isHighlighted = highlightId === sig.signalId;
                          return (
                            <div
                              key={sig.signalId}
                              id={`highlight-${sig.signalId}`}
                              data-highlight-id={sig.signalId}
                              className={`p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 ${
                                isHighlighted
                                  ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-amber-500/20 bg-amber-950/30 border-amber-400"
                                  : sig.severity === "CRITICAL"
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
                          );
                        })}
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
                      const isHighlighted =
                        highlightId === task.taskId ||
                        highlightId === `task_${task.taskId}` ||
                        highlightId.replace("task_", "") === task.taskId;

                      return (
                        <div
                          key={task.taskId}
                          id={`highlight-${task.taskId}`}
                          data-highlight-id={task.taskId}
                          className={`p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            isHighlighted
                              ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-amber-500/20 bg-amber-950/20 border-amber-400"
                              : isComplete
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
                        const isHighlighted =
                          highlightId === ex.exceptionId ||
                          highlightId === `exc_${ex.exceptionId}` ||
                          highlightId.replace("exc_", "") === ex.exceptionId;

                        return (
                          <div
                            key={ex.exceptionId}
                            id={`highlight-${ex.exceptionId}`}
                            data-highlight-id={ex.exceptionId}
                            className={`p-4 rounded-xl border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                              isHighlighted
                                ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-amber-500/20 bg-amber-950/20 border-amber-400"
                                : isResolved
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
                                  {ex.raisedAt || ex.createdAt
                                    ? new Date(
                                        ex.raisedAt || ex.createdAt!,
                                      ).toLocaleString()
                                    : "Recently"}
                                </span>
                                {(ex.assignedTo ||
                                  ex.assignedToUserId ||
                                  ex.assignedTeam) && (
                                  <span>
                                    • Assigned:{" "}
                                    {ex.assignedTo ||
                                      ex.assignedToUserId ||
                                      ex.assignedTeam}
                                  </span>
                                )}
                                {isResolved &&
                                  (ex.resolutionNote || ex.resolutionNotes) && (
                                    <span className="text-emerald-400">
                                      • Note:{" "}
                                      {ex.resolutionNote || ex.resolutionNotes}
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

      {/* Contextual Slide-Over Action Drawer (Explain -> Decide -> Act -> Confirm) */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setActiveActionModal(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md md:max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-inner">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Contextual Action Drawer
                    </h3>
                    <p className="text-xs text-slate-400">
                      Supply Chain Execution & Resolution Protocol
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveActionModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg text-sm font-bold transition"
                  title="Close Drawer"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Body: Explain -> Decide -> Act */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Step 1: Explain */}
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> 1. Explain Context &
                      Impact
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      {activeActionModal.type === "RESOLVE_EXCEPTION"
                        ? "Exception"
                        : "Workflow Task"}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    {activeActionModal.title}
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    {activeActionModal.description}
                  </p>
                  <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Target ID:</span>
                    <span className="text-indigo-300 font-semibold">
                      {activeActionModal.targetId}
                    </span>
                  </div>
                </div>

                {/* Step 2 & 3: Decide & Act */}
                <form
                  id="drawer-action-form"
                  onSubmit={handleExecuteAction}
                  className="space-y-4"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> 2. Decide &
                    Act
                  </div>

                  {activeActionModal.type === "RESOLVE_EXCEPTION" ? (
                    <div className="space-y-4">
                      <ResolutionJustificationSelect
                        id="modal-resolution-note"
                        value={activeActionModal.inputs["resolutionNote"] || ""}
                        onChange={(val) =>
                          setActiveActionModal({
                            ...activeActionModal,
                            inputs: {
                              ...activeActionModal.inputs,
                              resolutionNote: val,
                            },
                          })
                        }
                      />

                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Executing resolution will write an immutable domain
                          event to the Outbox and unblock downstream DAG tasks.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeActionModal.primaryAction?.inputFields &&
                      activeActionModal.primaryAction.inputFields.length > 0 ? (
                        activeActionModal.primaryAction.inputFields.map((f) => (
                          <div key={f.name}>
                            <label
                              htmlFor={`modal-field-${f.name}`}
                              className="block text-xs font-semibold text-slate-300 mb-1"
                            >
                              {f.label}{" "}
                              {f.required && (
                                <span className="text-rose-400">*</span>
                              )}
                            </label>
                            <input
                              id={`modal-field-${f.name}`}
                              name={f.name}
                              aria-label={f.label}
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
                              className="w-full p-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <span>
                            No additional parameters required. Submitting will
                            advance the DAG workflow and persist the domain
                            mutation.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>

              {/* Drawer Footer: Confirm */}
              <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveActionModal(null)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  form="drawer-action-form"
                  type="submit"
                  disabled={actionSubmitting}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {actionSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                      Committing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Execute Mutation
                    </>
                  )}
                </button>
              </div>
            </div>
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
