/**
 * @file shipment-workspace360.types.ts
 * @description Domain types for Shipment Workspace 360 & Operational BFF Read Models
 */

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

export type TabKey =
  | "overview"
  | "attention"
  | "journey"
  | "tasks"
  | "exceptions"
  | "cargo_route"
  | "audit"
  | "compliance_green";

export interface ShipmentDocumentItem {
  id: string;
  name: string;
  type: string;
  documentReference: string | null;
  sha256Hash: string | null;
  status: string;
  signedBy: string | null;
  signedAt: string | null;
  createdAt: string;
}

export interface MletrRecordSummary {
  id: string;
  registryType: string;
  status: string;
  currentHolder: string;
  currentHolderRole: string;
  totalEndorsements: number;
  isSurrendered: boolean;
}
