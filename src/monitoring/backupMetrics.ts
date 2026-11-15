/**
 * @file backupMetrics.ts
 * @description Prometheus metrics definitions for the SQLite online backup scheduler.
 * Exports counters and duration histograms registered into the global Prometheus register.
 * @module @atlas/backend/monitoring/backupMetrics
 * @see {@link docs/superpowers/plans/2026-11-14-governance-hardening-and-observability-plan.md}
 */

import { Counter, Histogram } from "@prometheus-io/client";

// ============================================================================
// 1. BACKUP SCHEDULER METRICS
// ============================================================================

export const backupSuccess = new Counter({
  name: "backup_success_total",
  help: "Total number of successful backup runs",
});

export const backupFailure = new Counter({
  name: "backup_failure_total",
  help: "Total number of failed backup runs",
});

export const backupDuration = new Histogram({
  name: "backup_duration_seconds",
  help: "Duration of backup runs in seconds",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
});

export default {
  backupSuccess,
  backupFailure,
  backupDuration,
};
