import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Ship,
  Plane,
  Truck,
  TrainTrack,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Layers,
  Package,
  Boxes,
  Compass,
  Clock,
  RefreshCw,
  ArrowRight,
  GitBranch,
  Lock,
  Unlock,
  Activity,
  Building2,
  FileCheck2,
  Sparkles,
  Scale,
  PauseCircle,
  PlayCircle,
  Radio,
  Siren,
} from "lucide-react";

interface MilestoneItem {
  milestoneCode: string;
  label: string;
  locationLocode: string;
  plannedAt?: string;
  estimatedAt?: string;
  actualAt?: string;
  actualConfirmedBySource?: string;
  actualConfirmedRank?: number;
  varianceMinutes?: number;
  status: "PLANNED" | "ESTIMATED" | "DELAYED" | "COMPLETED";
}

interface Shipment360ReadModel {
  shipmentId: string;
  referenceNumber: string;
  projectionVersion: number;
  lastUpdatedAt: string;

  header: {
    lifecycleState: string;
    executionPhase: string;
    closureState: string;
    serviceProduct: {
      mode: string;
      serviceType: string;
      incoterm: string;
      direction: string;
    };
    ownership: {
      organizationId: string;
      branchId: string;
      teamId: string;
      ownerUserId: string;
    };
    externalReferences: Array<{
      type: string;
      value: string;
      isPrimary?: boolean;
    }>;
  };

  controlSummary: {
    health: {
      status: "ON_TRACK" | "AT_RISK" | "CRITICAL" | "BLOCKED";
      score: number;
      drivers: string[];
    };
    dataQuality: {
      activeStage?: string;
      score: number;
      gateStatus: "PASSED" | "WARN" | "BLOCKED";
      openFindingsCount: number;
      findings?: Array<{
        findingCode: string;
        stage: string;
        severity: "INFO" | "WARN" | "BLOCKING";
        fieldPath: string;
        message: string;
        remediationHint: string;
      }>;
    };
    sla?: Array<{
      slaId: string;
      slaCode: string;
      slaName: string;
      status: "ON_TRACK" | "AT_RISK" | "BREACHED" | "PAUSED" | "MET";
      originalDeadlineAt: string;
      effectiveDeadlineAt: string;
      pausedAt?: string | null;
      pauseReason?: string | null;
      accumulatedPausedMinutes: number;
      stopClockHistory: Array<{
        action: "PAUSED" | "RESUMED";
        timestamp: string;
        reason: string;
        pausedDurationMinutes?: number;
      }>;
    }>;
  };

  commercialContext: {
    customerAccount: { partyId: string; name: string };
    parties: Array<{
      role: string;
      partyId: string;
      partyName: string;
      locationCode?: string;
    }>;
    linkedOrders: Array<{
      orderId: string;
      orderNumber: string;
      relationType: string;
      allocatedPackages: number;
      allocatedWeightKg: number;
      allocatedVolumeCbm: number;
      orderStatus?: string;
    }>;
  };

  routing: {
    routePlanId: string | null;
    activeVersionNumber: number;
    versionHistoryCount: number;
    stops: Array<{
      stopId: string;
      sequenceNo: number;
      locationId: string;
      locationName?: string;
      stopRole: string;
      cutOffs?: {
        vgmCutOffAt?: string;
        siCutOffAt?: string;
        gateInCutOffAt?: string;
      };
    }>;
    legs: Array<{
      sequenceNo: number;
      originStopId: string;
      destinationStopId: string;
      originLocode: string;
      destinationLocode: string;
      mode: string;
      legCategory: string;
      carrierName?: string;
      vesselOrFlight?: string;
      voyageNumber?: string;
      plannedDepartureAt: string;
      plannedArrivalAt: string;
    }>;
  };

  cargoAndEquipment: {
    totals: {
      packagesCount: number;
      grossWeightKg: number;
      volumeCbm: number;
      chargeableWeightKg: number;
      hasDG: boolean;
      hasTemperatureControl: boolean;
    };
    cargoItems: Array<{
      cargoId: string;
      packages: Array<{
        packageType: string;
        quantity: number;
        grossWeightKg: number;
        volumeCbm: number;
        stackable: boolean;
        marksAndNumbers?: string;
        goods: Array<{
          description: string;
          hsCode: string;
          countryOfOrigin: string;
          dangerousGoods?: {
            unNumber: string;
            imoClass: string;
            packingGroup?: string;
          };
          temperatureControl?: {
            minCelsius: number;
            maxCelsius: number;
            setPointCelsius?: number;
          };
        }>;
      }>;
    }>;
    equipment: Array<{
      equipmentAssignmentId: string;
      unitNumber: string;
      isoType: string;
      category: string;
      seals: string[];
      vgmWeightKg: number;
      pickupPin?: string;
      status: string;
    }>;
  };

  tracking?: {
    milestones: MilestoneItem[];
    recentEvents: Array<{
      eventId: string;
      eventCode: string;
      milestoneCode: string;
      locationLocode: string;
      sourceType: string;
      sourceTrustRank: number;
      timestampKind: string;
      eventTimestamp: string;
      summary: string;
    }>;
  };

  actionableItems?: {
    exceptions: Array<{
      exceptionId: string;
      dedupKey: string;
      category: string;
      severity: string;
      status: string;
      title: string;
      summary: string;
      milestoneCode: string;
      locationLocode: string;
      occurrenceCount: number;
      incidentId?: string | null;
      incidentNumber?: string | null;
      linkedWorkItemId?: string | null;
      lastOccurredAt: string;
    }>;
    incidents: Array<{
      incidentId: string;
      incidentNumber: string;
      title: string;
      category: string;
      severity: string;
      status: string;
      affectedLocode: string;
      affectedVesselOrFlight?: string | null;
      summary: string;
    }>;
  };

  workflowState?: {
    processInstanceId: string;
    processKey: string;
    versionNumber: number;
    state:
      | "RUNNING"
      | "SUSPENDED"
      | "BLOCKED_AT_GATEWAY"
      | "COMPLETED"
      | "TERMINATED";
    currentNodeId: string;
    currentNodeLabel: string;
    blockingReason?: string | null;
    nodes: Array<{
      nodeId: string;
      sequenceOrder: number;
      nodeType: string;
      label: string;
      description: string;
      decisionKey?: string;
      status: "COMPLETED" | "ACTIVE" | "BLOCKED" | "PENDING";
    }>;
    availableUserCommands: string[];
    variablesSnapshot: Record<string, any>;
    updatedAt: string;
  } | null;

  decisionExplainability?: Array<{
    evaluationId: string;
    decisionKey: string;
    versionNumber: number;
    shipmentId: string;
    inputsSnapshot: Record<string, any>;
    matchedRowIds: string[];
    ruleAnnotations: string[];
    outputSnapshot: Record<string, any>;
    callerContext: string;
    correlationId: string;
    evaluatedAt: string;
  }>;

  tradeAndConsolidation?: {
    consolidations: Array<{
      consolidationId: string;
      consolidationReference: string;
      consolidationType: string;
      mode: string;
      originLocode: string;
      destinationLocode: string;
      carrierName: string;
      masterDocumentNumber: string;
      maxCapacityWeightKg: number;
      maxCapacityVolumeCbm: number;
      allocatedWeightKg: number;
      allocatedVolumeCbm: number;
      weightUtilizationPercent: number;
      volumeUtilizationPercent: number;
      status: string;
      members: Array<{
        membershipId: string;
        shipmentId: string;
        shipmentReference: string;
        transportLegSequenceNo: number;
        houseDocumentNumber: string;
        allocatedPackages: number;
        allocatedWeightKg: number;
        allocatedVolumeCbm: number;
      }>;
    }>;
    documents: Array<{
      documentId: string;
      shipmentId: string;
      documentType: string;
      documentReference: string;
      title: string;
      requiresApproval: boolean;
      currentVersionNo: number;
      lifecycleState: string;
      latestSha256Hash: string;
      versions: Array<{
        versionNumber: number;
        fileName: string;
        sha256Hash: string;
        changeNotes: string;
        createdAt: string;
      }>;
      approvals: Array<{
        versionNumber: number;
        decision: string;
        reviewerUserId: string;
        comments: string;
      }>;
    }>;
    customsCases: Array<{
      customsCaseId: string;
      caseNumber: string;
      procedureType: string;
      jurisdictionCountry: string;
      customsOfficeLocode: string;
      declarantEoriOrTaxId: string;
      mrnNumber?: string | null;
      channelAssigned?: string | null;
      state: string;
      openHoldsCount: number;
      totalCalculatedDutyEur: number;
      totalCalculatedVatEur: number;
      tariffItems: Array<{
        itemNo: number;
        hsCode: string;
        goodsDescription: string;
        statisticalValueEur: number;
        calculatedDutyEur: number;
        calculatedVatEur: number;
      }>;
    }>;
  };

  activityTrail: Array<{
    eventId: string;
    eventType: string;
    occurredAt: string;
    producerContext: string;
  }>;
}

type WorkspaceTab =
  | "OVERVIEW"
  | "ROUTING"
  | "CARGO_EQUIPMENT"
  | "CONTROL_GATE"
  | "WORKFLOW_DECISIONS"
  | "TRADE_CONSOLIDATION";
type DrawerTab = "EXPLAINABILITY" | "OUTBOX_TRAIL";

export const ShipmentWorkspace360Module: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [shipmentsList, setShipmentsList] = useState<Shipment360ReadModel[]>(
    [],
  );
  const [activeShipment, setActiveShipment] =
    useState<Shipment360ReadModel | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("OVERVIEW");
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("EXPLAINABILITY");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [bannerFeedback, setBannerFeedback] = useState<string | null>(null);

  const selectedIdParam = searchParams.get("id");

  const loadWorkspaceData = useCallback(
    async (targetId?: string | null) => {
      setLoading(true);
      try {
        const listRes = await fetch("/api/scm/v1/shipments-360");
        const listJson = await listRes.json();
        const items: Shipment360ReadModel[] = Array.isArray(listJson)
          ? listJson
          : (listJson?.data ?? []);
        setShipmentsList(items);

        const resolvedId = targetId || selectedIdParam || items[0]?.shipmentId;
        if (resolvedId) {
          const singleRes = await fetch(
            `/api/scm/v1/shipments/${resolvedId}/360`,
          );
          if (singleRes.ok) {
            const singleJson = await singleRes.json();
            setActiveShipment(
              singleJson?.shipmentId ? singleJson : singleJson.data,
            );
          } else if (items.length > 0) {
            setActiveShipment(items[0]);
          }
        }
      } catch (err) {
        console.error("Error loading Shipment360ReadModel:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedIdParam],
  );

  useEffect(() => {
    loadWorkspaceData(selectedIdParam);
  }, [loadWorkspaceData, selectedIdParam]);

  const handleSelectShipment = (shipmentId: string) => {
    setSearchParams({ id: shipmentId });
  };

  const handlePublishRouteReplan = async () => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const currentStops = activeShipment.routing.stops;
      const currentLegs = activeShipment.routing.legs;
      if (currentStops.length < 2 || currentLegs.length === 0) return;

      const nextVer = activeShipment.routing.activeVersionNumber + 1;
      const updatedLegs = currentLegs.map((leg, idx) => {
        if (idx === currentLegs.length - 1) {
          return {
            ...leg,
            voyageNumber: `${leg.voyageNumber || "VOY"}-R${nextVer}`,
          };
        }
        return leg;
      });

      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/route-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changeReason: `Replanificación operativa solicitada desde Shipment Workspace 360° (v${nextVer})`,
            stops: currentStops,
            legs: updatedLegs,
          }),
        },
      );
      if (res.ok) {
        setBannerFeedback(
          `✓ Nueva versión inmutable de RoutePlan (v${nextVer}) publicada e hidratada vía Outbox.`,
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleClosureState = async () => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const isClosed = activeShipment.header.closureState === "CLOSED";
      const endpoint = isClosed
        ? `/api/scm/v1/shipments/${activeShipment.shipmentId}/reopen`
        : `/api/scm/v1/shipments/${activeShipment.shipmentId}/close`;

      const payload = isClosed
        ? {
            reason:
              "Reapertura operativa autorizada desde Shipment Workspace 360°",
          }
        : {};

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setBannerFeedback(
          isClosed
            ? "✓ Expediente reabierto con auditoría (estado REOPENED)."
            : "✓ Expediente cerrado operativamente (estado CLOSED).",
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleSimulateTrackingEvent = async (preset: {
    eventCode: string;
    milestoneCode: string;
    sourceType: string;
    timestampKind: string;
    delayHours?: number;
    summary: string;
  }) => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const matchingMilestone = activeShipment.tracking?.milestones?.find(
        (m) => m.milestoneCode === preset.milestoneCode,
      );
      const baseTime = matchingMilestone?.plannedAt
        ? new Date(matchingMilestone.plannedAt).getTime()
        : Date.now();
      const eventTimestamp = new Date(
        baseTime + (preset.delayHours || 0) * 3600 * 1000,
      ).toISOString();
      const locode =
        matchingMilestone?.locationLocode ||
        activeShipment.routing.legs[0]?.originLocode ||
        "ESBCN";

      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventCode: preset.eventCode,
            milestoneCode: preset.milestoneCode,
            locationLocode: locode,
            sourceType: preset.sourceType,
            timestampKind: preset.timestampKind,
            eventTimestamp,
            summary: preset.summary,
          }),
        },
      );

      if (res.ok) {
        setBannerFeedback(
          `✓ Evento '${preset.eventCode}' (${preset.sourceType}) procesado: MilestonePlan, Relojes SLA, Excepciones y Smart Work Queue actualizados.`,
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleSlaClock = async (
    slaCode: string,
    currentStatus: string,
  ) => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const action = currentStatus === "PAUSED" ? "RESUME" : "PAUSE";
      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/sla-stop-clock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slaCode,
            action,
            reason:
              action === "PAUSE"
                ? "Stop-Clock activado por espera de inspección/documentación externa"
                : "Bloqueo externo liberado — Reanudando reloj SLA con extensión de deadline",
            simulatedPauseMinutes: 120,
          }),
        },
      );
      if (res.ok) {
        setBannerFeedback(
          action === "PAUSE"
            ? `✓ Reloj SLA (${slaCode}) puesto en PAUSED (Stop-Clock activo).`
            : `✓ Reloj SLA (${slaCode}) reanudado (+120 min añadidos al Effective Deadline).`,
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleEvaluateDqStage = async (stage: string) => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/data-quality/evaluate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        setBannerFeedback(
          `✓ Evaluación Data Quality en etapa ${stage}: ${data.gateStatus} (${data.score}%).`,
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handlePromoteToIncident = async () => {
    if (!activeShipment || actionBusy) return;
    const openExceptions =
      activeShipment.actionableItems?.exceptions?.filter(
        (e) => e.status !== "RESOLVED",
      ) || [];
    if (openExceptions.length === 0) return;

    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const res = await fetch("/api/scm/v1/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Disrupción Operativa en ${openExceptions[0].locationLocode} afectando línea ${activeShipment.header.serviceProduct.mode}`,
          category: "PORT_CONGESTION",
          severity: "CRITICAL",
          affectedLocode: openExceptions[0].locationLocode,
          affectedVesselOrFlight:
            activeShipment.routing.legs[0]?.vesselOrFlight || "CARRIER-LINE",
          exceptionIds: openExceptions.map((e) => e.exceptionId),
          summary: `Agrupación N:1 de ${openExceptions.length} excepción(es) activas del expediente ${activeShipment.referenceNumber}.`,
        }),
      });
      if (res.ok) {
        const inc = await res.json();
        setBannerFeedback(
          `✓ Macro Incident ${inc.incidentNumber} creado y vinculado a ${openExceptions.length} excepción(es).`,
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleAdvanceWorkflow = async () => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/workflow/advance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerReason: "ui.ShipmentWorkspace360.AdvanceWorkflowGateway",
            strictGateAssertion: true,
          }),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setBannerFeedback(
          `✓ Workflow Runtime evaluado: nodo actual '${data.workflowState?.currentNodeLabel}' (${data.workflowState?.state}).`,
        );
      } else {
        setBannerFeedback(
          `⚠️ Invariante de Gateway / Workflow (${data.code}): ${data.message}`,
        );
      }
      await loadWorkspaceData(activeShipment.shipmentId);
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleWorkflowState = async (action: "SUSPEND" | "RESUME") => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/workflow/state`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reason:
              action === "SUSPEND"
                ? "Suspensión operativa solicitada desde Shipment Workspace 360°"
                : "Reanudación operativa autorizada",
          }),
        },
      );
      if (res.ok) {
        setBannerFeedback(
          action === "SUSPEND"
            ? "✓ ProcessInstance puesta en estado SUSPENDED (tokens congelados)."
            : "✓ ProcessInstance reanudada a estado RUNNING.",
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreateAndLinkConsolidation = async () => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const firstLeg = activeShipment.routing.legs[0];
      const mode = firstLeg?.mode || activeShipment.header.serviceProduct.mode;
      const originLocode = firstLeg?.originLocode || "CNSHA";
      const destinationLocode = firstLeg?.destinationLocode || "ESBCN";

      const createRes = await fetch("/api/scm/v1/consolidations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consolidationType:
            mode === "AIR"
              ? "AIR_CONSOLE"
              : mode === "ROAD"
                ? "ROAD_GROUPAGE"
                : "LCL_CONSOLE",
          mode,
          originLocode,
          destinationLocode,
          carrierName: firstLeg?.carrierName || "Maersk Line",
          vesselOrFlight: firstLeg?.vesselOrFlight || "MAERSK TITAN",
          voyageNumber: firstLeg?.voyageNumber || "415W",
          masterDocumentNumber: `MBL-${Date.now().toString().slice(-6)}`,
          maxCapacityWeightKg: 26000,
          maxCapacityVolumeCbm: 68,
        }),
      });

      if (createRes.ok) {
        const cns = await createRes.json();
        await fetch(
          `/api/scm/v1/consolidations/${cns.consolidationId}/members`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shipmentId: activeShipment.shipmentId,
              transportLegSequenceNo: firstLeg?.sequenceNo || 1,
              legMode: mode,
              legOriginLocode: originLocode,
              legDestinationLocode: destinationLocode,
              houseDocumentNumber: `HBL-${activeShipment.referenceNumber}`,
              allocatedPackages:
                activeShipment.cargoAndEquipment.totals.packagesCount || 20,
              allocatedWeightKg:
                activeShipment.cargoAndEquipment.totals.grossWeightKg || 5000,
              allocatedVolumeCbm:
                activeShipment.cargoAndEquipment.totals.volumeCbm || 18,
            }),
          },
        );
        setBannerFeedback(
          `✓ Consolidación Master ${cns.consolidationReference} creada y vinculada al House ${activeShipment.referenceNumber}.`,
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentType: "HOUSE_BL",
            documentReference: `HBL-${activeShipment.referenceNumber}`,
            title: `House Bill of Lading · ${activeShipment.referenceNumber}`,
            requiresApproval: true,
            changeNotes:
              "Generación automática de borrador HBL desde Workspace",
          }),
        },
      );
      if (res.ok) {
        setBannerFeedback(
          "✓ Documento HBL (v1) generado con hash SHA-256 en estado UNDER_REVIEW.",
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleApproveAndIssueDocument = async (documentId: string) => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      await fetch(`/api/scm/v1/documents/${documentId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "APPROVED",
          comments: "Revisión documental conforme con manifiesto y SOLAS VGM",
        }),
      });
      const issueRes = await fetch(
        `/api/scm/v1/documents/${documentId}/issue`,
        {
          method: "POST",
        },
      );
      if (issueRes.ok) {
        setBannerFeedback(
          "✓ Documento revisado (APPROVED) y emitido como versión inmutable (ISSUED).",
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreateCustomsCase = async () => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const destLocode =
        activeShipment.routing.legs[activeShipment.routing.legs.length - 1]
          ?.destinationLocode || "ESBCN";
      const res = await fetch(
        `/api/scm/v1/shipments/${activeShipment.shipmentId}/customs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            procedureType: "IMPORT_CLEARANCE",
            jurisdictionCountry: destLocode.slice(0, 2),
            customsOfficeLocode: destLocode,
            declarantEoriOrTaxId: "ESB61928374",
            tariffItems: [
              {
                hsCode: "8507.60.00",
                goodsDescription:
                  "Módulos Industriales y Componentes Electrónicos",
                countryOfOrigin: "CN",
                statisticalValueEur: 48500,
                dutyRatePercent: 4.5,
                vatRatePercent: 21.0,
              },
            ],
          }),
        },
      );
      if (res.ok) {
        const ccase = await res.json();
        setBannerFeedback(
          `✓ Expediente Aduanero ${ccase.caseNumber} (MRN ${ccase.mrnNumber}) presentado con cálculo de Arancel e IVA.`,
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const handleReleaseCustomsCase = async (customsCaseId: string) => {
    if (!activeShipment || actionBusy) return;
    setActionBusy(true);
    setBannerFeedback(null);
    try {
      const res = await fetch(`/api/scm/v1/customs/${customsCaseId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clearOpenHolds: true,
          resolutionNotes: "Inspección superada y Levante Aduanero concedido",
        }),
      });
      if (res.ok) {
        setBannerFeedback(
          "✓ Levante Aduanero (RELEASED) confirmado — Reloj SLA reanudado y Workflow actualizado.",
        );
        await loadWorkspaceData(activeShipment.shipmentId);
      }
    } finally {
      setActionBusy(false);
    }
  };

  const renderModeIcon = (mode: string) => {
    switch (mode) {
      case "SEA":
      case "OCEAN":
        return <Ship className="w-4 h-4 text-sky-400" />;
      case "AIR":
        return <Plane className="w-4 h-4 text-violet-400" />;
      case "ROAD":
        return <Truck className="w-4 h-4 text-amber-400" />;
      case "RAIL":
        return <TrainTrack className="w-4 h-4 text-emerald-400" />;
      default:
        return <Compass className="w-4 h-4 text-indigo-400" />;
    }
  };

  if (loading && !activeShipment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="text-slate-400 text-sm flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          Hidratando proyección CQRS Shipment360ReadModel...
        </div>
      </div>
    );
  }

  if (!activeShipment) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <p className="text-slate-400">
          No se encontraron expedientes 360° activos.
        </p>
      </div>
    );
  }

  const health = activeShipment.controlSummary.health;
  const dq = activeShipment.controlSummary.dataQuality;
  const milestones = activeShipment.tracking?.milestones || [];
  const slaClocks = activeShipment.controlSummary.sla || [];
  const exceptions = activeShipment.actionableItems?.exceptions || [];
  const incidents = activeShipment.actionableItems?.incidents || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-5">
      {/* ZONA 1: Persistent Command Header */}
      <header className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            {renderModeIcon(activeShipment.header.serviceProduct.mode)}
            <select
              aria-label="Seleccionar Expediente 360"
              value={activeShipment.shipmentId}
              onChange={(e) => handleSelectShipment(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-base focus:outline-none cursor-pointer"
            >
              {shipmentsList.map((s) => (
                <option
                  key={s.shipmentId}
                  value={s.shipmentId}
                  className="bg-slate-900 text-white"
                >
                  {s.referenceNumber} ·{" "}
                  {s.commercialContext.customerAccount.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {activeShipment.header.serviceProduct.mode} ·{" "}
              {activeShipment.header.serviceProduct.serviceType}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
              {activeShipment.header.serviceProduct.incoterm} ·{" "}
              {activeShipment.header.serviceProduct.direction}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
              Estado: {activeShipment.header.lifecycleState}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
              Cierre: {activeShipment.header.closureState}
            </span>
          </div>
        </div>

        {/* Health, Data Quality & Command Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Shipment Health Badge */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              health.status === "ON_TRACK"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : health.status === "AT_RISK"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
            }`}
          >
            {health.status === "ON_TRACK" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>
              Health: {health.status} ({health.score}/100)
            </span>
          </div>

          {/* Data Quality Gate Badge */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              dq.gateStatus === "PASSED"
                ? "bg-sky-500/15 text-sky-300 border-sky-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              DQ Gate: {dq.gateStatus} ({dq.score}%)
            </span>
          </div>

          {/* Projection Version */}
          <span className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
            Proj v{activeShipment.projectionVersion}
          </span>

          <button
            onClick={handlePublishRouteReplan}
            disabled={
              actionBusy || activeShipment.header.closureState === "CLOSED"
            }
            className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Replanificar Ruta (v{activeShipment.routing.activeVersionNumber + 1}
            )
          </button>

          <button
            onClick={handleToggleClosureState}
            disabled={actionBusy}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            {activeShipment.header.closureState !== "CLOSED" ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Cerrar Expediente
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                Reabrir Expediente
              </>
            )}
          </button>

          <button
            onClick={() => navigate("/my-work")}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Work Queue
          </button>
        </div>
      </header>

      {bannerFeedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs text-emerald-300 flex items-center justify-between">
          <span>{bannerFeedback}</span>
          <button
            onClick={() => setBannerFeedback(null)}
            className="text-emerald-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ZONA 2: Interactive Route, Planned/Estimated/Actual Milestones & Live Event Simulator */}
      <section className="bg-slate-900/75 border border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Zona 2 · Cadena Multimodal &amp; Hitos Planned / Estimated /
              Actual (RoutePlan v{activeShipment.routing.activeVersionNumber})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Scope ABAC: {activeShipment.header.ownership.organizationId} /{" "}
            {activeShipment.header.ownership.branchId}
          </span>
        </div>

        {/* Multimodal Legs & Stops Chain */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeShipment.routing.legs.map((leg) => {
            const originStop = activeShipment.routing.stops.find(
              (s) => s.stopId === leg.originStopId,
            );
            const destStop = activeShipment.routing.stops.find(
              (s) => s.stopId === leg.destinationStopId,
            );
            return (
              <div
                key={leg.sequenceNo}
                className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {renderModeIcon(leg.mode)}
                    <span className="text-xs font-bold text-white">
                      Tramo #{leg.sequenceNo} · {leg.legCategory}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {leg.mode}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-200 font-medium bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
                  <div>
                    <div className="font-mono font-bold text-indigo-300">
                      {leg.originLocode}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {originStop?.locationName || leg.originLocode}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-300">
                      {leg.destinationLocode}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {destStop?.locationName || leg.destinationLocode}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1">
                  <span>
                    Carrier:{" "}
                    <strong className="text-slate-200">
                      {leg.carrierName || "TBD"}
                    </strong>
                  </span>
                  {leg.vesselOrFlight && (
                    <span className="font-mono text-slate-300">
                      {leg.vesselOrFlight}{" "}
                      {leg.voyageNumber ? `(${leg.voyageNumber})` : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <span>
                    ETD: {new Date(leg.plannedDepartureAt).toLocaleDateString()}
                  </span>
                  <span>
                    ETA: {new Date(leg.plannedArrivalAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Planned / Estimated / Actual Milestone Ribbon */}
        {milestones.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Línea de Tiempo de Hitos (Planned vs. Estimated vs. Actual ·
              Jerarquía Terminal &gt; Carrier EDI &gt; IoT &gt; Manual)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {milestones.map((ms) => (
                <div
                  key={ms.milestoneCode}
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-1.5 ${
                    ms.status === "COMPLETED"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : ms.status === "DELAYED"
                        ? "bg-rose-500/10 border-rose-500/30"
                        : "bg-slate-950/90 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-[10px] text-indigo-300">
                      {ms.milestoneCode}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                        ms.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : ms.status === "DELAYED"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {ms.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-white font-semibold truncate">
                    {ms.label}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                    {ms.plannedAt && (
                      <div>
                        Plan: {new Date(ms.plannedAt).toLocaleDateString()}
                      </div>
                    )}
                    {ms.estimatedAt && !ms.actualAt && (
                      <div className="text-amber-300">
                        Est: {new Date(ms.estimatedAt).toLocaleDateString()}
                      </div>
                    )}
                    {ms.actualAt && (
                      <div className="text-emerald-300 font-bold">
                        Act: {new Date(ms.actualAt).toLocaleDateString()} (
                        {ms.actualConfirmedBySource})
                      </div>
                    )}
                    {ms.varianceMinutes !== undefined &&
                      ms.varianceMinutes !== 0 && (
                        <div
                          className={
                            ms.varianceMinutes > 120
                              ? "text-rose-300 font-bold"
                              : "text-emerald-300"
                          }
                        >
                          Var: {ms.varianceMinutes > 0 ? "+" : ""}
                          {Math.round(ms.varianceMinutes / 60)}h
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Operational Event Simulator Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>
              Simulador de Hechos Operativos en Vivo (Slices 2 &amp; 3):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                handleSimulateTrackingEvent({
                  eventCode: "VGM_VERIFIED",
                  milestoneCode: "VGM_CUTOFF",
                  sourceType: "TERMINAL_PORT_CUSTOMS",
                  timestampKind: "ACTUAL",
                  delayHours: -2,
                  summary:
                    "Terminal Portuaria confirma Gate-In y SOLAS VGM verificado (Rank 4).",
                })
              }
              disabled={actionBusy}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
            >
              ⚡ Confirmar Actual Gate-In / VGM (Terminal)
            </button>
            <button
              onClick={() =>
                handleSimulateTrackingEvent({
                  eventCode: "ETA_UPDATED",
                  milestoneCode: "ETA_POD",
                  sourceType: "CARRIER_DCSA_EDI",
                  timestampKind: "ESTIMATED",
                  delayHours: 36,
                  summary:
                    "Mensaje EDI 315 / DCSA Carrier reporta retraso de +36h en llegada a POD por congestión.",
                })
              }
              disabled={actionBusy}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition"
            >
              🌊 Simular Retraso ETA +36h (Carrier EDI)
            </button>
            <button
              onClick={() =>
                handleSimulateTrackingEvent({
                  eventCode: "CUSTOMS_HOLD",
                  milestoneCode: "CUSTOMS_CLEARANCE",
                  sourceType: "TERMINAL_PORT_CUSTOMS",
                  timestampKind: "ESTIMATED",
                  delayHours: 12,
                  summary:
                    "Aduana AEAT emite Canal Naranja / Inspección Documental (Activa Stop-Clock SLA).",
                })
              }
              disabled={actionBusy}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition"
            >
              🛃 Emitir Hold Aduanero (Stop-Clock SLA)
            </button>
            <button
              onClick={() =>
                handleSimulateTrackingEvent({
                  eventCode: "CUSTOMS_RELEASED",
                  milestoneCode: "CUSTOMS_CLEARANCE",
                  sourceType: "TERMINAL_PORT_CUSTOMS",
                  timestampKind: "ACTUAL",
                  delayHours: 4,
                  summary:
                    "Levante Aduanero AEAT confirmado — Reanuda SLA y extiende Deadline.",
                })
              }
              disabled={actionBusy}
              className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-semibold transition"
            >
              ✅ Confirmar Levante Aduanero (Reanuda SLA)
            </button>
          </div>
        </div>
      </section>

      {/* ZONA 3: Attention & Action Strip */}
      {(health.drivers.length > 0 ||
        dq.openFindingsCount > 0 ||
        exceptions.length > 0) && (
        <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Zona 3 · Attention &amp; Risk Drivers Activos en el Expediente
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {health.drivers.map((driver) => (
                  <span
                    key={driver}
                    className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/20 text-amber-200 border border-amber-500/30"
                  >
                    {driver}
                  </span>
                ))}
                {exceptions.filter((e) => e.status !== "RESOLVED").length >
                  0 && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-rose-500/20 text-rose-200 border border-rose-500/30">
                    {exceptions.filter((e) => e.status !== "RESOLVED").length}{" "}
                    Excepciones Activas (Deduplicadas)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/my-work")}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
          >
            Resolver en Smart Work Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* ZONA 4 (Domain Workspace Views) + ZONA 5 (Contextual 360° Inspector Side-Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ZONA 4: Domain Workspace Views (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900/75 border border-slate-800 rounded-2xl p-5 flex flex-col gap-5">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab("OVERVIEW")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === "OVERVIEW"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              1. Overview, Refs &amp; Orders (
              {activeShipment.commercialContext.linkedOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("ROUTING")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === "ROUTING"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              2. Transport Planning (Stops &amp; Legs)
            </button>
            <button
              onClick={() => setActiveTab("CARGO_EQUIPMENT")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === "CARGO_EQUIPMENT"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              3. Cargo, Goods &amp; Equipment (
              {activeShipment.cargoAndEquipment.equipment.length})
            </button>
            <button
              onClick={() => setActiveTab("CONTROL_GATE")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === "CONTROL_GATE"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              4. SLA Stop-Clock, DQ Gate &amp; Exceptions ({exceptions.length})
            </button>
            <button
              onClick={() => setActiveTab("WORKFLOW_DECISIONS")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === "WORKFLOW_DECISIONS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              5. Workflow Runtime &amp; Decision Tables (
              {activeShipment.decisionExplainability?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("TRADE_CONSOLIDATION")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                activeTab === "TRADE_CONSOLIDATION"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              6. Consolidation, Docs &amp; Customs (
              {(activeShipment.tradeAndConsolidation?.consolidations.length ||
                0) +
                (activeShipment.tradeAndConsolidation?.documents.length || 0) +
                (activeShipment.tradeAndConsolidation?.customsCases.length ||
                  0)}
              )
            </button>
          </div>

          {/* TAB 1: OVERVIEW, EXTERNAL REFS & LINKED ORDERS */}
          {activeTab === "OVERVIEW" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Cuenta Cliente &amp; Referencias Externas (Booking / MBL / HBL
                  / MAWB)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      CUSTOMER ACCOUNT
                    </span>
                    <div className="text-sm font-semibold text-white mt-2">
                      {activeShipment.commercialContext.customerAccount.name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      ID:{" "}
                      {activeShipment.commercialContext.customerAccount.partyId}
                    </div>
                  </div>
                  {activeShipment.header.externalReferences.map((ref) => (
                    <div
                      key={`${ref.type}-${ref.value}`}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5"
                    >
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {ref.type}
                      </span>
                      <div className="text-sm font-mono font-bold text-indigo-300 mt-2">
                        {ref.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Customer Orders Vinculadas (Relación N:M Order ↔ Shipment)
                </h3>
                <div className="space-y-2.5">
                  {activeShipment.commercialContext.linkedOrders.map((ord) => (
                    <div
                      key={ord.orderId}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-indigo-300">
                            Order: {ord.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {ord.relationType}
                          </span>
                          {ord.orderStatus && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                              {ord.orderStatus}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-1">
                          Order Aggregate ID: {ord.orderId}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-300 font-mono">
                        <span>
                          <strong>{ord.allocatedPackages}</strong> bultos
                        </span>
                        <span>
                          <strong>
                            {ord.allocatedWeightKg.toLocaleString()}
                          </strong>{" "}
                          kg
                        </span>
                        <span>
                          <strong>{ord.allocatedVolumeCbm}</strong> m³
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSPORT PLANNING (STOPS & LEGS) */}
          {activeTab === "ROUTING" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Secuencia de Paradas (Stops) y Tramos (Transport Legs)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    RoutePlan Aggregate ID:{" "}
                    <span className="font-mono text-slate-300">
                      {activeShipment.routing.routePlanId}
                    </span>{" "}
                    · Versión activa v
                    {activeShipment.routing.activeVersionNumber}
                  </p>
                </div>
                <button
                  onClick={handlePublishRouteReplan}
                  disabled={actionBusy}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  Publicar Nueva Versión (v
                  {activeShipment.routing.activeVersionNumber + 1})
                </button>
              </div>

              <div className="space-y-2.5">
                {activeShipment.routing.stops.map((stop) => (
                  <div
                    key={stop.stopId}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center">
                        {stop.sequenceNo}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {stop.locationName || stop.locationId}{" "}
                          <span className="font-mono text-indigo-300">
                            ({stop.locationId})
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Rol de Parada: {stop.stopRole}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Stop ID: {stop.stopId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CARGO -> PACKAGES -> GOODS & EQUIPMENT */}
          {activeTab === "CARGO_EQUIPMENT" && (
            <div className="space-y-5">
              {/* Totals Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Total Bultos</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {activeShipment.cargoAndEquipment.totals.packagesCount}
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">
                    Peso Bruto Total
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {activeShipment.cargoAndEquipment.totals.grossWeightKg.toLocaleString()}{" "}
                    kg
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">
                    Volumen Total
                  </div>
                  <div className="text-lg font-bold text-white font-mono">
                    {activeShipment.cargoAndEquipment.totals.volumeCbm} m³
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Peso Tasable</div>
                  <div className="text-lg font-bold text-indigo-300 font-mono">
                    {activeShipment.cargoAndEquipment.totals.chargeableWeightKg.toLocaleString()}{" "}
                    kg
                  </div>
                </div>
              </div>

              {/* Cargo Hierarchy */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Jerarquía de Mercancía (Cargo → Packages → Goods &amp; HS
                  Code)
                </h3>
                <div className="space-y-3">
                  {activeShipment.cargoAndEquipment.cargoItems.map((ci) => (
                    <div
                      key={ci.cargoId}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-bold text-white font-mono">
                            Cargo Aggregate: {ci.cargoId}
                          </span>
                        </div>
                      </div>

                      {ci.packages.map((pkg, pkgIdx) => (
                        <div
                          key={pkgIdx}
                          className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>
                              Embalaje: <strong>{pkg.packageType}</strong> ×{" "}
                              {pkg.quantity} uds (
                              {pkg.stackable ? "Apilable" : "No Apilable"})
                            </span>
                            <span className="font-mono">
                              {pkg.grossWeightKg.toLocaleString()} kg ·{" "}
                              {pkg.volumeCbm} m³
                            </span>
                          </div>
                          {pkg.goods.map((gl, glIdx) => (
                            <div
                              key={glIdx}
                              className="bg-slate-950 border border-slate-800/80 rounded p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <span className="font-semibold text-white">
                                  {gl.description}
                                </span>{" "}
                                <span className="font-mono text-indigo-300">
                                  (HS {gl.hsCode} · Origen {gl.countryOfOrigin})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {gl.dangerousGoods && (
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono text-[11px] flex items-center gap-1">
                                    <Flame className="w-3 h-3" />
                                    {gl.dangerousGoods.unNumber} · IMO{" "}
                                    {gl.dangerousGoods.imoClass}
                                  </span>
                                )}
                                {gl.temperatureControl && (
                                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono text-[11px]">
                                    Temp: {gl.temperatureControl.minCelsius}°C a{" "}
                                    {gl.temperatureControl.maxCelsius}°C
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment & SOLAS VGM */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Unidades de Equipamiento &amp; Certificación SOLAS VGM
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeShipment.cargoAndEquipment.equipment.map((eq) => (
                    <div
                      key={eq.equipmentAssignmentId}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-emerald-300">
                          {eq.unitNumber} ({eq.isoType})
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {eq.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Precintos (Seals): {eq.seals?.join(", ") || "N/A"}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-2 mt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5 text-indigo-400" />
                          SOLAS VGM:{" "}
                          <strong>
                            {eq.vgmWeightKg?.toLocaleString() ?? "N/A"} kg
                          </strong>
                        </span>
                        <span className="text-slate-400">{eq.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SLA STOP-CLOCK, 4-STAGE DATA QUALITY GATE & DEDUPLICATED EXCEPTIONS */}
          {activeTab === "CONTROL_GATE" && (
            <div className="space-y-6">
              {/* 1. SLA Clocks & Stop-Clock Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    18. SLA Management · Relojes Activos &amp; Stop-Clock
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Pausa por causa externa extiende automáticamente el
                    Effective Deadline
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {slaClocks.map((sla) => (
                    <div
                      key={sla.slaId}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                        sla.status === "PAUSED"
                          ? "bg-purple-500/10 border-purple-500/40"
                          : sla.status === "AT_RISK" ||
                              sla.status === "BREACHED"
                            ? "bg-rose-500/10 border-rose-500/40"
                            : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-indigo-300 font-bold">
                            {sla.slaCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              sla.status === "PAUSED"
                                ? "bg-purple-500/20 text-purple-300"
                                : sla.status === "ON_TRACK"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {sla.status}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white mt-1">
                          {sla.slaName}
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                        <div>
                          Deadline Orig:{" "}
                          {new Date(sla.originalDeadlineAt).toLocaleString()}
                        </div>
                        <div className="text-slate-200">
                          Deadline Efectivo:{" "}
                          {new Date(sla.effectiveDeadlineAt).toLocaleString()}
                        </div>
                        {sla.accumulatedPausedMinutes > 0 && (
                          <div className="text-purple-300">
                            Stop-Clock acumulado: +
                            {sla.accumulatedPausedMinutes} min
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          handleToggleSlaClock(sla.slaCode, sla.status)
                        }
                        disabled={actionBusy}
                        className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition"
                      >
                        {sla.status === "PAUSED" ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Reanudar Reloj (+Extender)
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-purple-400" />
                            Activar Stop-Clock (Pausar)
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Contextual 4-Stage Data Quality Gate */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      19. Data Quality Gate Contextual · Etapa Activa:{" "}
                      <span className="text-sky-300 font-mono">
                        {dq.activeStage || "PRE_DEPARTURE_EXPORT"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Score: <strong>{dq.score}%</strong> · Estado:{" "}
                      <strong>{dq.gateStatus}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        "BOOKING",
                        "PRE_DEPARTURE_EXPORT",
                        "CUSTOMS_CLEARANCE",
                        "BILLING_READY",
                      ] as const
                    ).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleEvaluateDqStage(st)}
                        disabled={actionBusy}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition ${
                          dq.activeStage === st
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        Evaluar {st}
                      </button>
                    ))}
                  </div>
                </div>

                {dq.findings && dq.findings.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {dq.findings.map((f) => (
                      <div
                        key={f.findingCode}
                        className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-mono font-bold text-rose-300">
                            [{f.severity}] {f.findingCode}:
                          </span>{" "}
                          <span className="text-slate-200">{f.message}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {f.remediationHint}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 font-medium">
                    ✓ Todos los invariantes de calidad de datos de la etapa se
                    cumplen sin hallazgos abiertos.
                  </div>
                )}
              </div>

              {/* 3. Deduplicated Operational Exceptions & N:1 Macro Incidents */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    13. Exception &amp; Incident Management · Deduplicación
                    Activa ({exceptions.length})
                  </h3>
                  {exceptions.filter((e) => e.status !== "RESOLVED").length >
                    0 && (
                    <button
                      onClick={handlePromoteToIncident}
                      disabled={actionBusy}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Siren className="w-3.5 h-3.5" />
                      Promover a Macro Incident (N:1)
                    </button>
                  )}
                </div>

                {incidents.length > 0 && (
                  <div className="space-y-2">
                    {incidents.map((inc) => (
                      <div
                        key={inc.incidentId}
                        className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-mono font-bold text-rose-300">
                            [{inc.incidentNumber}]
                          </span>{" "}
                          <strong className="text-white">{inc.title}</strong> ·{" "}
                          <span className="text-slate-300">{inc.summary}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                          {inc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {exceptions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    No hay excepciones operativas registradas en este
                    expediente. Usa el Simulador de Zona 2 para disparar un
                    retraso de ETA o un Hold Aduanero.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {exceptions.map((exc) => (
                      <div
                        key={exc.exceptionId}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {exc.severity} · {exc.category}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                              Ocurrencias deduplicadas: ×{exc.occurrenceCount}
                            </span>
                            {exc.incidentNumber && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Incident: {exc.incidentNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white mt-1.5">
                            {exc.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {exc.summary}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                              exc.status === "RESOLVED"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {exc.status}
                          </span>
                          {exc.status !== "RESOLVED" && (
                            <button
                              onClick={() => navigate("/my-work")}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                            >
                              Resolver en My Work
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: WORKFLOW RUNTIME (BPMN-LIKE) & DECISION TABLES WITH EXPLAINABILITY */}
          {activeTab === "WORKFLOW_DECISIONS" && (
            <div className="space-y-6">
              {activeShipment.workflowState ? (
                <>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                          20. Workflow Runtime ·{" "}
                          {activeShipment.workflowState.processKey} (v
                          {activeShipment.workflowState.versionNumber})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            activeShipment.workflowState.state === "RUNNING"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : activeShipment.workflowState.state ===
                                  "BLOCKED_AT_GATEWAY"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : activeShipment.workflowState.state ===
                                    "SUSPENDED"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                          }`}
                        >
                          {activeShipment.workflowState.state}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mt-1.5">
                        Token Activo:{" "}
                        <span className="text-indigo-300 font-mono">
                          {activeShipment.workflowState.currentNodeLabel}
                        </span>
                      </div>
                      {activeShipment.workflowState.blockingReason && (
                        <div className="text-xs text-rose-300 mt-1 font-medium">
                          ⛔ Motivo Bloqueo Gateway:{" "}
                          {activeShipment.workflowState.blockingReason}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={handleAdvanceWorkflow}
                        disabled={actionBusy}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Evaluar Gateway &amp; Avanzar Token
                      </button>

                      {activeShipment.workflowState.state === "SUSPENDED" ? (
                        <button
                          onClick={() => handleToggleWorkflowState("RESUME")}
                          disabled={actionBusy}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          Reanudar Proceso
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleWorkflowState("SUSPEND")}
                          disabled={actionBusy}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          Suspender Proceso
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 7-Node BPMN-like Directed Graph Pipeline */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Grafo Dirigido de Actividades y Gateways (Agnóstico del
                      Dominio)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeShipment.workflowState.nodes.map((node) => (
                        <div
                          key={node.nodeId}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                            node.status === "COMPLETED"
                              ? "bg-emerald-500/10 border-emerald-500/30"
                              : node.status === "BLOCKED"
                                ? "bg-rose-500/10 border-rose-500/40"
                                : node.status === "ACTIVE"
                                  ? "bg-indigo-500/15 border-indigo-500/40"
                                  : "bg-slate-950 border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-indigo-300">
                              {node.nodeType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                node.status === "COMPLETED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : node.status === "BLOCKED"
                                    ? "bg-rose-500/20 text-rose-300"
                                    : node.status === "ACTIVE"
                                      ? "bg-indigo-500/20 text-indigo-200"
                                      : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {node.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white">
                            {node.label}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {node.description}
                          </div>
                          {node.decisionKey && (
                            <div className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded px-2 py-1">
                              Decision Table: {node.decisionKey}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variables Snapshot */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Variables de Correlación del Proceso (Snapshot)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">
                          Equipo Asignado (Regla)
                        </span>
                        <span className="text-emerald-300 font-bold">
                          {activeShipment.workflowState.variablesSnapshot
                            ?.assignedTeamId ||
                            activeShipment.header.ownership.teamId}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">
                          Rol Especialista
                        </span>
                        <span className="text-indigo-300 font-bold">
                          {activeShipment.workflowState.variablesSnapshot
                            ?.assignedRole || "OPERATIONS_COORDINATOR"}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">
                          Checklist Obligatorio
                        </span>
                        <span className="text-amber-300 font-bold">
                          {activeShipment.workflowState.variablesSnapshot
                            ?.mandatoryChecklistCode || "CHK_GENERAL"}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400">
                  No hay ProcessInstance activa para este expediente.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CONSOLIDATION (HOUSE/MASTER), VERSIONED DOCUMENTS & MULTI-PROCEDURE CUSTOMS */}
          {activeTab === "TRADE_CONSOLIDATION" && (
            <div className="space-y-6">
              {/* 1. 09. Consolidation (House <-> Master Shared Transport) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      09. Consolidation · Transporte Compartido House ↔ Master
                      (N:M)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Agrupa múltiples Houses bajo un Master (LCL / Grupaje /
                      Air Console) validando corredor, modo y capacidad.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateAndLinkConsolidation}
                    disabled={actionBusy}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Vincular a Master Consolidation
                  </button>
                </div>

                {(activeShipment.tradeAndConsolidation?.consolidations || [])
                  .length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    Este expediente no participa aún en una consolidación
                    compartida.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeShipment.tradeAndConsolidation?.consolidations.map(
                      (cns) => (
                        <div
                          key={cns.consolidationId}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-indigo-300">
                                {cns.consolidationReference}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                {cns.consolidationType}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Master: {cns.masterDocumentNumber}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-300">
                              {cns.originLocode} → {cns.destinationLocode} ·{" "}
                              {cns.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
                            <span>
                              Ocupación Peso:{" "}
                              <strong className="text-white">
                                {cns.allocatedWeightKg.toLocaleString()} /{" "}
                                {cns.maxCapacityWeightKg.toLocaleString()} kg (
                                {cns.weightUtilizationPercent}%)
                              </strong>
                            </span>
                            <span>
                              Ocupación Volumen:{" "}
                              <strong className="text-white">
                                {cns.allocatedVolumeCbm} /{" "}
                                {cns.maxCapacityVolumeCbm} m³ (
                                {cns.volumeUtilizationPercent}%)
                              </strong>
                            </span>
                            <span>Houses: {cns.members.length}</span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* 2. 14. Document Management (Immutable Versions, SHA-256 & Approval Gates) */}
              <div className="space-y-3 border-t border-slate-800 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      14. Document Management · Versionado Inmutable, SHA-256
                      &amp; Aprobaciones
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ciclo: UNDER_REVIEW → APPROVED → ISSUED (Inmutable;
                      cualquier cambio posterior genera v+1).
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateDocument}
                    disabled={actionBusy}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Generar HBL / Documento (v1)
                  </button>
                </div>

                {(activeShipment.tradeAndConsolidation?.documents || [])
                  .length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    No hay documentos emitidos para este expediente.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeShipment.tradeAndConsolidation?.documents.map(
                      (doc) => (
                        <div
                          key={doc.documentId}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs text-sky-300">
                                {doc.documentType} · {doc.documentReference} (v
                                {doc.currentVersionNo})
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  doc.lifecycleState === "ISSUED"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : doc.lifecycleState === "APPROVED"
                                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {doc.lifecycleState}
                              </span>
                            </div>
                            <div className="text-xs text-white font-semibold">
                              {doc.title}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              SHA-256: {doc.latestSha256Hash.slice(0, 24)}… ·{" "}
                              {doc.versions.length} versión(es)
                            </div>
                          </div>

                          {doc.lifecycleState !== "ISSUED" && (
                            <button
                              onClick={() =>
                                handleApproveAndIssueDocument(doc.documentId)
                              }
                              disabled={actionBusy}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition"
                            >
                              Aprobar &amp; Emitir (ISSUED)
                            </button>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* 3. 15. Customs (Multi-Procedure Cases, HS Tariff Items & Holds) */}
              <div className="space-y-3 border-t border-slate-800 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      15. Customs · Expedientes Aduaneros Multi-Procedimiento
                      (Export / T1 / Import DUA)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Valida EORI + partidas HS Code, calcula Arancel/IVA y
                      sincroniza Holds con el Stop-Clock de SLA.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateCustomsCase}
                    disabled={actionBusy}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Presentar Despacho DUA / MRN
                  </button>
                </div>

                {(activeShipment.tradeAndConsolidation?.customsCases || [])
                  .length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                    No hay expedientes aduaneros registrados para este
                    expediente.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeShipment.tradeAndConsolidation?.customsCases.map(
                      (cc) => (
                        <div
                          key={cc.customsCaseId}
                          className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs text-amber-300">
                                {cc.caseNumber} · {cc.procedureType} (
                                {cc.customsOfficeLocode})
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  cc.state === "RELEASED"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : cc.state === "UNDER_INSPECTION_HOLD"
                                      ? "bg-rose-500/20 text-rose-300"
                                      : "bg-sky-500/20 text-sky-300"
                                }`}
                              >
                                {cc.state} · Canal {cc.channelAssigned}
                              </span>
                            </div>
                            <div className="text-xs font-mono text-slate-300">
                              MRN: <strong>{cc.mrnNumber}</strong> · EORI:{" "}
                              {cc.declarantEoriOrTaxId}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              Arancel: €
                              {cc.totalCalculatedDutyEur.toLocaleString()} · IVA
                              Importación: €
                              {cc.totalCalculatedVatEur.toLocaleString()} ·
                              Partidas HS: {cc.tariffItems.length}
                            </div>
                          </div>

                          {cc.state !== "RELEASED" && (
                            <button
                              onClick={() =>
                                handleReleaseCustomsCase(cc.customsCaseId)
                              }
                              disabled={actionBusy}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition"
                            >
                              Confirmar Levante (RELEASED)
                            </button>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ZONA 5: Contextual 360° Inspector Side-Drawer (4 cols) — Explainability & Outbox Trail */}
        <aside className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDrawerTab("EXPLAINABILITY")}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                  drawerTab === "EXPLAINABILITY"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Explainability (
                {activeShipment.decisionExplainability?.length || 0})
              </button>
              <button
                onClick={() => setDrawerTab("OUTBOX_TRAIL")}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
                  drawerTab === "OUTBOX_TRAIL"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Outbox ({activeShipment.activityTrail.length})
              </button>
            </div>
          </div>

          {drawerTab === "EXPLAINABILITY" ? (
            <>
              <p className="text-xs text-slate-400">
                Registro de auditoría inmutable (
                <code className="text-indigo-300">
                  DecisionEvaluationRecord
                </code>
                ) que explica qué fila de cada{" "}
                <strong className="text-slate-200">Decision Table</strong> se
                aplicó y por qué:
              </p>

              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {(activeShipment.decisionExplainability || []).map((rec) => (
                  <div
                    key={rec.evaluationId}
                    className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-amber-300 break-all">
                        {rec.decisionKey} (v{rec.versionNumber})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                        {rec.matchedRowIds.join(", ")}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 space-y-1">
                      {rec.ruleAnnotations.map((ann, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900/90 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] text-emerald-300"
                        >
                          💡 {ann}
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 bg-slate-900/60 rounded p-2 border border-slate-800/80 space-y-1">
                      <div>
                        <strong className="text-slate-300">Inputs:</strong>{" "}
                        {JSON.stringify(rec.inputsSnapshot)}
                      </div>
                      <div>
                        <strong className="text-indigo-300">Output:</strong>{" "}
                        {JSON.stringify(rec.outputSnapshot)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Caller: {rec.callerContext}</span>
                      <span>
                        {new Date(rec.evaluatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                Secuencia inmutable de Domain Events que hidrataron esta
                proyección{" "}
                <code className="text-indigo-300">Shipment360ReadModel</code> (v
                {activeShipment.projectionVersion}):
              </p>

              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {activeShipment.activityTrail.map((ev) => (
                  <div
                    key={ev.eventId}
                    className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-300 break-all">
                        {ev.eventType}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700 shrink-0">
                        {ev.producerContext}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ev.occurredAt).toLocaleTimeString()}
                      </span>
                      <span>ID: {ev.eventId.slice(0, 12)}…</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Idempotent Consumer Inbox
            </span>
            <span className="font-mono text-emerald-300">ACTIVE</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ShipmentWorkspace360Module;
