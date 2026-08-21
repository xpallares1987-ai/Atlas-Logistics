// src/monitoring/backupMetrics.js
// Prometheus metrics for the backup scheduler (exposed via Fastify /metrics)

import client from "prom-client";

const { Counter, Histogram } = client;

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
