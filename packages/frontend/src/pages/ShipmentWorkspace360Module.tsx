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
  Download,
  FileCode,
  FileText,
  GitBranch,
  History,
  Info,
  Layers,
  Leaf,
  Lock,
  PlusCircle,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
  Trees,
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
  assignedToUserId?: string | null;
  assignedTeam?: string | null;
  raisedAt?: string;
  createdAt?: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  resolutionNotes?: string | null;
}

export interface ShipmentGreenComplianceReadModel {
  shipmentId: string;
  shipmentReference: string;
  serviceType: string;
  glec: {
    totalDistanceKm: number;
    totalWeightKg: number;
    totalTco2eWtw: number;
    totalTco2eTtw: number;
    totalTco2eWtt: number;
    carbonIntensityGco2ePerTkm: number;
    transportMode: string;
    certificateNumber: string;
    methodology: string;
    offsetRecommendation: {
      creditsNeededTons: number;
      pricePerTonEur: number;
      estimatedCostEur: number;
      projectName: string;
      standard: string;
    };
  };
  cbam: {
    isApplicable: boolean;
    applicableHsCodes: string[];
    productCategory: string;
    netWeightTonnes: number;
    directEmissionsTco2e: number;
    indirectEmissionsTco2e: number;
    totalEmbeddedEmissionsTco2e: number;
    euEtsBenchmarkPriceEur: number;
    estimatedCbamLiabilityEur: number;
    reportingPeriod: string;
    transitionalRegistryStatus: "READY_FOR_SUBMISSION" | "EXEMPT" | "SUBMITTED";
  };
  customs: {
    caseNumber: string;
    procedureType: "IMPORT_CLEARANCE" | "EXPORT_CLEARANCE" | "TRANSIT_BONDED";
    status: "DRAFT" | "SUBMITTED" | "RELEASED" | "HELD";
    channel: "GREEN" | "ORANGE" | "RED";
    mrnNumber: string;
    customsOfficeLocode: string;
    declarantEori: string;
    exporterParty: string;
    importerParty: string;
    inspectionHoldsCount: number;
    hasActiveHold: boolean;
    activeHoldReason?: string;
  };
  generatedAt: string;
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
  | "audit"
  | "compliance_green";

export default function ShipmentWorkspace360Module() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlShipmentId = searchParams.get("id") || "";
  const urlTab = searchParams.get("tab") as TabKey | null;
  const urlHighlight = searchParams.get("highlight") || "";
  const urlAction = searchParams.get("action") || "";

  const [selectedShipmentId, setSelectedShipmentId] =
    useState<string>(urlShipmentId);
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

      // If no shipment selected yet, pick the first or keep URL one
      if (items.length > 0) {
        if (!selectedShipmentId) {
          const firstId = items[0].shipmentId;
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
      await fetchShipmentDetail(shipmentDetail.shipmentId);
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

                  {/* Green Compliance & Customs DUA Overview Card */}
                  {greenCompliance && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 border border-emerald-500/20 shadow-xl space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Leaf className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                              Green Compliance & Customs Clearance Overview
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                GLEC v3 • CBAM • DUA
                              </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                              Official ISO 14083 carbon ledger, EU ETS liability
                              & AEAT clearance status
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTabChange("compliance_green")}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition self-start md:self-auto"
                        >
                          Ver Perspectiva Completa (8ª)
                          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        {/* Scope 3 KPI */}
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                            <span>GLEC Scope 3 Footprint</span>
                            <span className="text-[10px] text-emerald-400 font-mono">
                              WTW
                            </span>
                          </div>
                          <div className="text-lg font-bold text-slate-100">
                            {greenCompliance.glec.totalTco2eWtw.toFixed(3)}{" "}
                            <span className="text-xs font-normal text-slate-400">
                              tCO2e
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Intensity:{" "}
                            {greenCompliance.glec.carbonIntensityGco2ePerTkm.toFixed(
                              1,
                            )}{" "}
                            gCO2e / t-km
                          </div>
                        </div>

                        {/* CBAM KPI */}
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                            <span>EU CBAM Liability</span>
                            <span className="text-[10px] text-indigo-400 font-mono">
                              Reg. 2023/956
                            </span>
                          </div>
                          <div className="text-lg font-bold text-indigo-300">
                            €
                            {greenCompliance.cbam.estimatedCbamLiabilityEur.toLocaleString(
                              "es-ES",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Benchmark ETS: €
                            {greenCompliance.cbam.euEtsBenchmarkPriceEur.toFixed(
                              2,
                            )}
                            /t
                          </div>
                        </div>

                        {/* Customs DUA KPI */}
                        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                          <div className="text-[11px] font-medium text-slate-400 flex items-center justify-between">
                            <span>Aduanas (AEAT DUA)</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                greenCompliance.customs.channel === "GREEN"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : greenCompliance.customs.channel === "ORANGE"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              CANAL {greenCompliance.customs.channel}
                            </span>
                          </div>
                          <div className="text-sm font-mono font-bold text-slate-200 truncate">
                            {greenCompliance.customs.mrnNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>
                              Oficina:{" "}
                              {greenCompliance.customs.customsOfficeLocode}
                            </span>
                            {greenCompliance.customs.hasActiveHold && (
                              <span className="text-rose-400 font-bold">
                                Retención Activa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                <div className="space-y-6">
                  {/* Header & Quick Official Document Downloads */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Leaf className="w-5 h-5 text-emerald-400" />
                          Finanzas Verdes, CBAM & Despacho Aduanero
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Marco GLEC v3 / ISO 14083 • Reglamento (UE) 2023/956
                          CBAM • DUA / SAD Agencia Tributaria
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            fetchGreenCompliance(shipmentDetail.shipmentId)
                          }
                          disabled={greenLoading}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${greenLoading ? "animate-spin" : ""}`}
                          />
                          Recalcular
                        </button>
                      </div>
                    </div>

                    {/* Official Document Downloads Strip */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5">
                      <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        Documentación Oficial:
                      </span>

                      <button
                        onClick={() =>
                          handleDownloadDoc(
                            "carbon-certificate",
                            `CERT-SCOPE3-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.pdf`,
                            "Certificado de Emisiones Scope 3 (PDF) descargado.",
                          )
                        }
                        disabled={downloadingDoc === "carbon-certificate"}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        Certificado Scope 3 (PDF)
                      </button>

                      <button
                        onClick={() =>
                          handleDownloadDoc(
                            "cbam-report",
                            `CBAM-DECLARATION-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.pdf`,
                            "Informe CBAM Reg. 2023/956 (PDF) descargado.",
                          )
                        }
                        disabled={downloadingDoc === "cbam-report"}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        Informe CBAM (PDF)
                      </button>

                      <button
                        onClick={() =>
                          handleDownloadDoc(
                            "cbam-xml",
                            `CBAM-REGISTRY-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.xml`,
                            "Declaración CBAM para Registro Transitorio UE (XML) descargada.",
                          )
                        }
                        disabled={downloadingDoc === "cbam-xml"}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                        CBAM XML (UE)
                      </button>

                      <button
                        onClick={() =>
                          handleDownloadDoc(
                            "dua-pdf",
                            `DUA-LEVANTE-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.pdf`,
                            "Documento Único Administrativo DUA (PDF) descargado.",
                          )
                        }
                        disabled={downloadingDoc === "dua-pdf"}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        DUA Aduanero (PDF)
                      </button>

                      <button
                        onClick={() =>
                          handleDownloadDoc(
                            "dua-xml",
                            `DUA-AEAT-${shipmentDetail.shipmentReference || shipmentDetail.shipmentId}.xml`,
                            "Mensaje EDIFACT/XML de Despacho AEAT descargado.",
                          )
                        }
                        disabled={downloadingDoc === "dua-xml"}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <FileCode className="w-3.5 h-3.5 text-amber-400" />
                        DUA XML (AEAT)
                      </button>
                    </div>
                  </div>

                  {greenLoading && !greenCompliance ? (
                    <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                      Calculando contabilidad verde y estado aduanero...
                    </div>
                  ) : !greenCompliance ? (
                    <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                      No hay datos disponibles de cumplimiento verde para este
                      envío.
                    </div>
                  ) : (
                    <>
                      {/* Grid 1: GLEC Scope 3 & Insetting Simulator */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Scope 3 Footprint Breakdown */}
                        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Leaf className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-sm font-bold text-white">
                                Huella de Carbono Scope 3 (GLEC v3 / ISO 14083)
                              </h4>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {greenCompliance.glec.certificateNumber}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                              <div className="text-[10px] font-semibold text-slate-400">
                                Total Well-to-Wheels (WTW)
                              </div>
                              <div className="text-lg font-bold text-emerald-400 mt-1">
                                {greenCompliance.glec.totalTco2eWtw.toFixed(3)}{" "}
                                <span className="text-[11px] font-normal text-slate-400">
                                  tCO2e
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {(
                                  greenCompliance.glec.totalTco2eWtw * 1000
                                ).toFixed(0)}{" "}
                                kg CO2e
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                              <div className="text-[10px] font-semibold text-slate-400">
                                Direct Tank-to-Wheels (TTW)
                              </div>
                              <div className="text-lg font-bold text-slate-200 mt-1">
                                {greenCompliance.glec.totalTco2eTtw.toFixed(3)}{" "}
                                <span className="text-[11px] font-normal text-slate-400">
                                  tCO2e
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Operacional directo
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                              <div className="text-[10px] font-semibold text-slate-400">
                                Upstream Well-to-Tank (WTT)
                              </div>
                              <div className="text-lg font-bold text-slate-200 mt-1">
                                {greenCompliance.glec.totalTco2eWtt.toFixed(3)}{" "}
                                <span className="text-[11px] font-normal text-slate-400">
                                  tCO2e
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Producción combustible
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                              <div className="text-[10px] font-semibold text-slate-400">
                                Intensidad de Carbono
                              </div>
                              <div className="text-lg font-bold text-cyan-400 mt-1">
                                {greenCompliance.glec.carbonIntensityGco2ePerTkm.toFixed(
                                  1,
                                )}{" "}
                                <span className="text-[11px] font-normal text-slate-400">
                                  g/t-km
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Normalizada por carga
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                            <div>
                              <span className="font-semibold text-slate-300">
                                Modo de Transporte:
                              </span>{" "}
                              {greenCompliance.glec.transportMode}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-300">
                                Distancia Corredor:
                              </span>{" "}
                              {greenCompliance.glec.totalDistanceKm.toLocaleString()}{" "}
                              km
                            </div>
                            <div>
                              <span className="font-semibold text-slate-300">
                                Carga Útil:
                              </span>{" "}
                              {(
                                greenCompliance.glec.totalWeightKg / 1000
                              ).toFixed(1)}{" "}
                              toneladas
                            </div>
                            <div className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {greenCompliance.glec.methodology}
                            </div>
                          </div>
                        </div>

                        {/* Insetting & Carbon Neutrality Simulator */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/30 space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <Trees className="w-4 h-4 text-emerald-400" />
                                Simulador Neutralidad de Carbono
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Gold Standard
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              Compense las emisiones Scope 3 de este viaje con
                              créditos de carbono verificados.
                            </p>

                            {/* Percentage selector */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">
                                  Nivel de Compensación:
                                </span>
                                <span className="font-bold text-emerald-300 font-mono">
                                  {offsetPercentage}%
                                </span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[50, 100, 150, 200].map((pct) => (
                                  <button
                                    key={pct}
                                    onClick={() => setOffsetPercentage(pct)}
                                    className={`py-1 text-xs font-semibold rounded-lg transition border ${
                                      offsetPercentage === pct
                                        ? "bg-emerald-500/30 text-emerald-200 border-emerald-500/50"
                                        : "bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200"
                                    }`}
                                  >
                                    {pct}%
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Cost calculation */}
                            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">
                                  Créditos Necesarios:
                                </span>
                                <span className="font-bold text-slate-200 font-mono">
                                  {(
                                    (greenCompliance.glec.offsetRecommendation
                                      ?.creditsNeededTons ||
                                      greenCompliance.glec.totalTco2eWtw) *
                                    (offsetPercentage / 100)
                                  ).toFixed(2)}{" "}
                                  tCO2e
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">
                                  Benchmark Precio:
                                </span>
                                <span className="font-mono text-slate-300">
                                  €
                                  {greenCompliance.glec.offsetRecommendation
                                    ?.pricePerTonEur || 25.0}{" "}
                                  / ton
                                </span>
                              </div>
                              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-200">
                                  Inversión Estimada:
                                </span>
                                <span className="text-base font-bold text-emerald-400 font-mono">
                                  €
                                  {(
                                    (greenCompliance.glec.offsetRecommendation
                                      ?.creditsNeededTons ||
                                      greenCompliance.glec.totalTco2eWtw) *
                                    (offsetPercentage / 100) *
                                    (greenCompliance.glec.offsetRecommendation
                                      ?.pricePerTonEur || 25)
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="text-[11px] text-slate-400">
                              <span className="font-semibold text-slate-300">
                                Proyecto Destino:
                              </span>{" "}
                              {greenCompliance.glec.offsetRecommendation
                                ?.projectName ||
                                "Corredor Andino de Reforestación (VCS-1842)"}
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              setActionSuccessMessage(
                                `Certificado de compensación verde simulación al ${offsetPercentage}% registrado con éxito.`,
                              )
                            }
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
                          >
                            <Trees className="w-4 h-4" />
                            Aplicar Insetting al {offsetPercentage}%
                          </button>
                        </div>
                      </div>

                      {/* Grid 2: EU CBAM Governance & Customs Clearance */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* EU CBAM Card */}
                        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Scale className="w-4 h-4 text-indigo-400" />
                              <h4 className="text-sm font-bold text-white">
                                Pasivo Financiero CBAM (Reglamento UE 2023/956)
                              </h4>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                greenCompliance.cbam.isApplicable
                                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                  : "bg-slate-800 text-slate-400 border border-slate-700"
                              }`}
                            >
                              {greenCompliance.cbam.isApplicable
                                ? "Regulado Anexo I"
                                : "Exento"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                              <div className="text-[10px] font-semibold text-slate-400">
                                Emisiones Embebidas Totales
                              </div>
                              <div className="text-lg font-bold text-slate-100 mt-1">
                                {greenCompliance.cbam.totalEmbeddedEmissionsTco2e.toFixed(
                                  2,
                                )}{" "}
                                <span className="text-[11px] font-normal text-slate-400">
                                  tCO2e
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Directas:{" "}
                                {greenCompliance.cbam.directEmissionsTco2e.toFixed(
                                  1,
                                )}
                                t • Indirectas:{" "}
                                {greenCompliance.cbam.indirectEmissionsTco2e.toFixed(
                                  1,
                                )}
                                t
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                              <div className="text-[10px] font-semibold text-slate-400">
                                Pasivo CBAM Estimado
                              </div>
                              <div className="text-lg font-bold text-indigo-400 mt-1">
                                €
                                {greenCompliance.cbam.estimatedCbamLiabilityEur.toLocaleString(
                                  "es-ES",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                EU ETS Benchmark: €
                                {greenCompliance.cbam.euEtsBenchmarkPriceEur.toFixed(
                                  2,
                                )}
                                /t
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                Categoría Arancelaria:
                              </span>
                              <span className="font-semibold text-slate-200">
                                {greenCompliance.cbam.productCategory}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                Partidas Arancelarias (HS):
                              </span>
                              <span className="font-mono text-slate-300">
                                {greenCompliance.cbam.applicableHsCodes.join(
                                  ", ",
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                Periodo de Notificación:
                              </span>
                              <span className="text-slate-300 font-semibold">
                                {greenCompliance.cbam.reportingPeriod}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                              <span className="text-slate-400">
                                Registro Transitorio UE:
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                {
                                  greenCompliance.cbam
                                    .transitionalRegistryStatus
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Customs DUA / SAD Card */}
                        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-amber-400" />
                              <h4 className="text-sm font-bold text-white">
                                Despacho Aduanero & Levante (AEAT DUA / SAD)
                              </h4>
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                greenCompliance.customs.channel === "GREEN"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : greenCompliance.customs.channel === "ORANGE"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              CANAL {greenCompliance.customs.channel}
                            </span>
                          </div>

                          {/* Active Hold Alert if present */}
                          {greenCompliance.customs.hasActiveHold ? (
                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                Retención Aduanera Activa (Gating Operativo
                                Activo)
                              </div>
                              <p className="text-xs text-rose-200">
                                {greenCompliance.customs.activeHoldReason ||
                                  "Inspección física o revisión documental pendiente. El envío está bloqueado hasta la emisión del levante aduanero."}
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              Sin retenciones activas. Despacho en regla
                              conforme a normativa aduanera UE.
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                              <div className="text-[10px] text-slate-400">
                                MRN de Despacho
                              </div>
                              <div className="font-mono font-bold text-slate-200 truncate">
                                {greenCompliance.customs.mrnNumber}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Régimen: {greenCompliance.customs.procedureType}
                              </div>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                              <div className="text-[10px] text-slate-400">
                                Aduana Principal
                              </div>
                              <div className="font-bold text-slate-200">
                                {greenCompliance.customs.customsOfficeLocode}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                EORI: {greenCompliance.customs.declarantEori}
                              </div>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                Expedidor / Exportador:
                              </span>
                              <span className="font-semibold text-slate-200">
                                {greenCompliance.customs.exporterParty}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                Destinatario / Importador:
                              </span>
                              <span className="font-semibold text-slate-200">
                                {greenCompliance.customs.importerParty}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                              <span className="text-slate-400">
                                Historial de Inspecciones:
                              </span>
                              <span className="text-slate-300">
                                {greenCompliance.customs.inspectionHoldsCount}{" "}
                                intervenciones registradas
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
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
                      <div>
                        <label
                          htmlFor="modal-resolution-note"
                          className="block text-xs font-semibold text-slate-300 mb-1"
                        >
                          Resolution Justification Note{" "}
                          <span className="text-rose-400">*</span>
                        </label>
                        <textarea
                          id="modal-resolution-note"
                          name="resolutionNote"
                          aria-label="Resolution Justification Note"
                          required
                          rows={4}
                          value={
                            activeActionModal.inputs["resolutionNote"] || ""
                          }
                          onChange={(e) =>
                            setActiveActionModal({
                              ...activeActionModal,
                              inputs: {
                                ...activeActionModal.inputs,
                                resolutionNote: e.target.value,
                              },
                            })
                          }
                          placeholder="E.g., Rolled booking accommodated on feeder vessel CMA CGM LOUVRE ETA +24h, customs clearance certified..."
                          className="w-full p-3 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

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
    </div>
  );
}
