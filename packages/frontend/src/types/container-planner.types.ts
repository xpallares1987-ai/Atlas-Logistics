/**
 * @file container-planner.types.ts
 * @description Domain interfaces, types, and canonical fallback items for the 3D Container Stowage & Axle Load Planner.
 * @module @atlas/frontend/types/container-planner
 * @see {@link docs/adr/0020-modular-frontend-architecture.md}
 */

import { CargoItemInput } from "@atlas/shared";

// ============================================================================
// 1. NAVIGATION & VIEW MODES
// ============================================================================

export type PlannerTabId = "AXLE" | "IMDG" | "MANIFEST";
export type TransformMode = "translate" | "rotate";

// ============================================================================
// 2. RELATIONAL SQLITE & AI AUDIT CONTRACTS
// ============================================================================

export interface StowagePlanSummary {
  id: string;
  containerId: string;
  shipmentId: string;
  totalCargoWeightKg: number;
  maxPayloadKg: number;
  volumeUtilizationPercent: number;
  weightUtilizationPercent: number;
  stabilityCertified: boolean;
  certifiedBy?: string | null;
  certifiedAt?: number | null;
}

export interface CertificationFeedback {
  type: "success" | "error";
  message: string;
}

export interface GeminiStowageAuditResponse {
  audit: {
    ctuCompliant: boolean;
    safetyScore: number;
    imdgCompatibilityStatus: string;
    centerOfGravityStatus: string;
    axleBalanceAssessment: string;
    recommendations: string[];
  };
  source: string;
  model: string;
  latencyMs: number;
  quotaRemainingRpm: number;
}

// ============================================================================
// 3. CANONICAL FALLBACK CARGO MANIFEST
// ============================================================================

export const CANONICAL_FALLBACK_ITEMS: CargoItemInput[] = [
  {
    id: "cargo_item_01",
    name: "Tooling Unit Alpha",
    widthM: 1.2,
    heightM: 1.4,
    lengthM: 1.2,
    weightKg: 4200,
    stackable: true,
    color: "#3b82f6",
  },
  {
    id: "cargo_item_02",
    name: "Precision Lathe B",
    widthM: 1.2,
    heightM: 1.4,
    lengthM: 1.2,
    weightKg: 4200,
    stackable: true,
    color: "#60a5fa",
  },
  {
    id: "cargo_item_03",
    name: "Hydraulic Assembly C",
    widthM: 1.2,
    heightM: 1.5,
    lengthM: 1.4,
    weightKg: 4800,
    stackable: true,
    color: "#4ade80",
  },
  {
    id: "cargo_item_04",
    name: "Hydraulic Assembly D",
    widthM: 1.2,
    heightM: 1.5,
    lengthM: 1.4,
    weightKg: 4800,
    stackable: true,
    color: "#4ade80",
  },
  {
    id: "cargo_item_05",
    name: "Robotic Arms Pallet E",
    widthM: 2.1,
    heightM: 1.3,
    lengthM: 1.5,
    weightKg: 6500,
    stackable: false,
    color: "#fbbf24",
  },
];

export const CARGO_ITEM_PALETTE = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];
