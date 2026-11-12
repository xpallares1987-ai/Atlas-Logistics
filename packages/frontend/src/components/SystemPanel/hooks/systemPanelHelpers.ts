/**
 * @file systemPanelHelpers.ts
 * @description Pure helper functions and mathematical validators for System Administration domain.
 * @module @atlas/frontend/components/SystemPanel/hooks
 * @see {@link docs/adr/0020-frontend-modular-decomposition.md}
 */

import type { SeedStatusStats } from "../../../types/system-panel.types";

/**
 * Validates Google AI Studio / Gemini API key structure.
 */
export function validateApiKeyFormat(apiKey: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { isValid: false, error: "API key cannot be empty" };
  }
  if (!trimmed.startsWith("AIzaSy")) {
    return {
      isValid: false,
      error: "Google AI Studio API key must start with 'AIzaSy'",
    };
  }
  if (trimmed.length < 30) {
    return {
      isValid: false,
      error: "API key format is too short for a valid Google Cloud key",
    };
  }
  return { isValid: true };
}

/**
 * Formats API execution latency in human-readable milliseconds or seconds.
 */
export function formatLatency(latencyMs?: number): string {
  if (typeof latencyMs !== "number" || isNaN(latencyMs) || latencyMs < 0) {
    return "0ms";
  }
  if (latencyMs >= 1000) {
    return `${(latencyMs / 1000).toFixed(1)}s`;
  }
  return `${Math.round(latencyMs)}ms`;
}

/**
 * Computes safe percentage for quota usage indicators.
 */
export function calculateQuotaPercentage(used: number, limit: number): number {
  if (limit <= 0 || isNaN(limit) || isNaN(used)) return 0;
  const clampedUsed = Math.max(0, used);
  const percentage = (clampedUsed / limit) * 100;
  return Math.min(100, Math.round(percentage * 10) / 10);
}

/**
 * Aggregates all live database records across all seed phases.
 */
export function calculateTotalSeedRecords(
  stats: SeedStatusStats | null,
): number {
  if (!stats) return 0;

  let total = 0;

  // Phase 1
  if (stats.phase1) {
    total +=
      (stats.phase1.shipments || 0) +
      (stats.phase1.incidents || 0) +
      (stats.phase1.drayageOrders || 0);
  }

  // Phase 2
  if (stats.phase2) {
    total +=
      (stats.phase2.coldChainShipments || 0) +
      (stats.phase2.temperatureReadings || 0) +
      (stats.phase2.dangerousGoods || 0) +
      (stats.phase2.cbamDeclarations || 0);
  }

  // Phase 3
  if (stats.phase3) {
    total +=
      (stats.phase3.invoices || 0) + (stats.phase3.tradeCreditInstruments || 0);
  }

  // Phase 4
  if (stats.phase4) {
    total +=
      (stats.phase4.cartaPorteDeclarations || 0) +
      (stats.phase4.efirmaAuditStamps || 0) +
      (stats.phase4.smartEscrowContracts || 0) +
      (stats.phase4.erpPurchaseOrders || 0);
  }

  // Phase 5
  if (stats.phase5) {
    total +=
      (stats.phase5.demurrageInvoices || 0) +
      (stats.phase5.demurrageDisputes || 0) +
      (stats.phase5.oceanBookings || 0) +
      (stats.phase5.stowagePlans || 0);
  }

  return total;
}

/**
 * Filters resolution justification notes by category, label, or text content.
 */
export function filterResolutionNotes<
  T extends { label: string; text: string; category: string },
>(notes: T[], query: string): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return notes;

  return notes.filter(
    (n) =>
      n.label.toLowerCase().includes(normalized) ||
      n.text.toLowerCase().includes(normalized) ||
      n.category.toLowerCase().includes(normalized),
  );
}
