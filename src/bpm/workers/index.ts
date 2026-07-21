/**
 * Atlas Logistics — Zeebe Worker Registry.
 *
 * Central registration point for all BPM workers.
 * Import this module and call `registerAllWorkers()` during bootstrap.
 */

// ── Phase 1: Rate workers ────────────────────────────────────────────
import { fetchRatesWorker } from "./rates/fetch-rates.worker.js";
import { compareRatesWorker } from "./rates/compare-rates.worker.js";

// ── Phase 1: Booking workers ─────────────────────────────────────────
import { validateBookingWorker } from "./booking/validate-booking.worker.js";
import { confirmBookingWorker } from "./booking/confirm-booking.worker.js";
import { notifyPartiesWorker } from "./booking/notify-parties.worker.js";

// ── Phase 1: Customs workers ─────────────────────────────────────────
import { validateHsCodeWorker } from "./customs/validate-hs-code.worker.js";
import { submitDeclarationWorker } from "./customs/submit-declaration.worker.js";
import { checkRestrictionsWorker } from "./customs/check-restrictions.worker.js";

// ── Phase 1: Document workers ────────────────────────────────────────
import { generateHblWorker } from "./docs/generate-hbl.worker.js";
import { generateMblWorker } from "./docs/generate-mbl.worker.js";
import { generateManifestWorker } from "./docs/generate-manifest.worker.js";

// ── Phase 2: Tracking workers ────────────────────────────────────────
import { updateStatusWorker } from "./tracking/update-status.worker.js";
import { checkAisWorker } from "./tracking/check-ais.worker.js";

// ── Phase 2: Finance workers ─────────────────────────────────────────
import { generateInvoiceWorker } from "./finance/generate-invoice.worker.js";
import { reconcileCostsWorker } from "./finance/reconcile-costs.worker.js";
import { emailInvoiceWorker } from "./finance/email-invoice.worker.js";

// ── Phase 2: Warehouse workers ───────────────────────────────────────
import { receiveCargoWorker } from "./warehouse/receive-cargo.worker.js";
import { optimizeLoadingWorker } from "./warehouse/optimize-loading.worker.js";
import { sealContainerWorker } from "./warehouse/seal-container.worker.js";

// ── Claims workers ──────────────────────────────────────────────────
import { fileInsuranceClaimWorker } from "./claims/file-insurance-claim.worker.js";

import type { AtlasWorker } from "../utils/worker-base.js";

/** All registered workers */
const workers: AtlasWorker[] = [
  // Phase 1 — Rates
  fetchRatesWorker,
  compareRatesWorker,
  // Phase 1 — Booking
  validateBookingWorker,
  confirmBookingWorker,
  notifyPartiesWorker,
  // Phase 1 — Customs
  validateHsCodeWorker,
  submitDeclarationWorker,
  checkRestrictionsWorker,
  // Phase 1 — Documents
  generateHblWorker,
  generateMblWorker,
  generateManifestWorker,
  // Phase 2 — Tracking
  updateStatusWorker,
  checkAisWorker,
  // Phase 2 — Finance
  generateInvoiceWorker,
  reconcileCostsWorker,
  emailInvoiceWorker,
  // Phase 2 — Warehouse
  receiveCargoWorker,
  optimizeLoadingWorker,
  sealContainerWorker,
  // Claims
  fileInsuranceClaimWorker,
];

/**
 * Register all Zeebe workers with the cluster.
 * Call this once during application bootstrap.
 */
export function registerAllWorkers(): void {
  console.log(
    `[WorkerRegistry] Registering ${workers.length} Zeebe workers...`,
  );

  for (const worker of workers) {
    try {
      worker.register();
    } catch (error) {
      console.error(
        `[WorkerRegistry] Failed to register worker ${worker.taskType}:`,
        error,
      );
    }
  }

  console.log(
    `[WorkerRegistry] ✓ All ${workers.length} workers registered successfully`,
  );
}

export { workers };
