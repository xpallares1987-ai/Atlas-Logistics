/**
 * @file system-panel.types.ts
 * @description Strongly-typed contracts for System Administration Panel, multi-phase seeders, and AI gateway.
 * @module @atlas/frontend/types/system-panel
 */

export type SystemSubTab =
  | "RESOLUTIONS"
  | "RBAC"
  | "DATABASE_SEED"
  | "INTEGRATIONS"
  | "CONTROL_PLANE"
  | "SECURITY_VAULT"
  | "WEBHOOKS";

export interface SeedStatusStats {
  phase1: { shipments: number; incidents: number; drayageOrders: number };
  phase2: {
    coldChainShipments: number;
    temperatureReadings: number;
    dangerousGoods: number;
    cbamDeclarations: number;
  };
  phase3: { invoices: number; tradeCreditInstruments: number };
  phase4?: {
    cartaPorteDeclarations: number;
    efirmaAuditStamps: number;
    smartEscrowContracts: number;
    erpPurchaseOrders: number;
  };
  phase5?: {
    demurrageInvoices: number;
    demurrageDisputes: number;
    oceanBookings: number;
    stowagePlans: number;
  };
}

export interface SeedResultState {
  success: boolean;
  message: string;
  durationMs?: number;
}

export interface GeminiAiStatusState {
  configured: boolean;
  maskedKey: string | null;
  defaultModel: string;
  liteModel: string;
  mode: string;
  freeTierGuardrails: {
    maxRpm: number;
    maxRpd: number;
    cacheTtlSeconds: number;
    maxOutputTokens: number;
  };
  quota: {
    rpmUsed: number;
    rpmLimit: number;
    rpdUsed: number;
    rpdLimit: number;
  };
  cache: {
    keys: number;
    hits: number;
    misses: number;
  };
}

export interface CopilotResponseState {
  reply: string;
  source: string;
  model: string;
  latencyMs: number;
  quotaRemainingRpm: number;
}

export interface ExecutiveBriefingState {
  briefing: {
    shiftHeadline: string;
    overallRiskLevel: string;
    estimatedProtectedValueUsd: number;
    topPriorities: string[];
    immediateActions: string[];
  };
  source: string;
  model: string;
  latencyMs: number;
  quotaRemainingRpm: number;
}

export interface SemanticSearchResultItem {
  id: string;
  title: string;
  category?: string;
  text: string;
  score: number;
}

export interface SemanticSearchResultsState {
  results: SemanticSearchResultItem[];
  source: string;
  model: string;
  latencyMs: number;
  quotaRemainingRpm: number;
}
