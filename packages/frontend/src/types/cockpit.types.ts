/**
 * @file cockpit.types.ts
 * @description Canonical TypeScript interface definitions for Operations Cockpit 2.0.
 * @module @atlas/frontend/types/cockpit
 * @see {@link docs/adr/0020-frontend-modular-decomposition-and-file-size-guardrails.md}
 */

// ============================================================================
// 1. SCORING & WORK ITEM DATA MODELS
// ============================================================================

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

// ============================================================================
// 2. SUMMARY METRICS & FILTER CRITERIA
// ============================================================================

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

export type TransportMode = "ALL" | "OCEAN" | "AIR" | "ROAD";
export type UrgencyBucketFilter =
  "ALL" | "IMMEDIATE_ACTION" | "DUE_TODAY" | "UPCOMING" | "BLOCKED";
export type StatusFilter = "OPEN" | "COMPLETED";

// ============================================================================
// 3. EXECUTION & DOCUMENT OUTPUTS
// ============================================================================

export interface EmittedDocumentModalData {
  id: string;
  name: string;
  type: string;
  documentReference: string | null;
  sha256Hash: string;
  status: string;
  signedBy?: string | null;
  signedAt?: string | Date | null;
  downloadUrl: string;
}

export interface ExecutionResult {
  success: boolean;
  executedWorkItemId: string;
  completedTask?: any;
  resolvedException?: any;
  unlockedWorkItems: CockpitWorkItem[];
  workflowStatus?: string;
  shipment360: any;
  emittedDocument?: EmittedDocumentModalData | null;
}
