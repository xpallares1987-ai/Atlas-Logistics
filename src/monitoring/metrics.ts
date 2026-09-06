import { register, Counter, Histogram, Gauge } from "prom-client";

// ============ HTTP Request Metrics ============
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});

// ============ Database Metrics ============
export const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
});

export const dbQueryErrors = new Counter({
  name: "db_query_errors_total",
  help: "Total database query errors",
  labelNames: ["operation", "table", "error_type"],
});

export const dbConnections = new Gauge({
  name: "db_connections_active",
  help: "Active database connections",
});

// ============ Redis Metrics ============
export const redisCommandDuration = new Histogram({
  name: "redis_command_duration_seconds",
  help: "Duration of Redis commands in seconds",
  labelNames: ["command"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5],
});

export const redisCommandErrors = new Counter({
  name: "redis_command_errors_total",
  help: "Total Redis command errors",
  labelNames: ["command", "error_type"],
});

export const redisConnections = new Gauge({
  name: "redis_connections_active",
  help: "Active Redis connections",
});

// ============ Queue Metrics ============
export const queueJobsActive = new Gauge({
  name: "queue_jobs_active",
  help: "Number of active jobs in queue",
  labelNames: ["queue_name"],
});

export const queueJobsCompleted = new Counter({
  name: "queue_jobs_completed_total",
  help: "Total completed jobs",
  labelNames: ["queue_name"],
});

export const queueJobsFailed = new Counter({
  name: "queue_jobs_failed_total",
  help: "Total failed jobs",
  labelNames: ["queue_name"],
});

export const queueJobDuration = new Histogram({
  name: "queue_job_duration_seconds",
  help: "Duration of queue jobs in seconds",
  labelNames: ["queue_name"],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

// ============ Business Logic Metrics ============
export const shipmentsCreated = new Counter({
  name: "shipments_created_total",
  help: "Total shipments created",
  labelNames: ["mode"], // "sea", "air", "road", "rail"
});

export const shipmentsProcessed = new Counter({
  name: "shipments_processed_total",
  help: "Total shipments processed to completion",
  labelNames: ["mode", "status"],
});

export const declarationsProcessed = new Counter({
  name: "customs_declarations_processed_total",
  help: "Total customs declarations (DUA) processed",
  labelNames: ["direction"], // "import", "export"
});

export const invoicesReconciled = new Counter({
  name: "invoices_reconciled_total",
  help: "Total invoices reconciled (3-way match)",
  labelNames: ["status"], // "matched", "variance", "error"
});

// ============ System Health Metrics ============
export const healthCheckDuration = new Histogram({
  name: "health_check_duration_seconds",
  help: "Duration of health checks in seconds",
  labelNames: ["check_type"], // "liveness", "readiness"
  buckets: [0.001, 0.01, 0.05, 0.1],
});

export const dependencyStatus = new Gauge({
  name: "dependency_status",
  help: "Status of external dependencies (1=up, 0=down)",
  labelNames: ["dependency"], // "database", "redis", "gcp"
});

// ============ Error Metrics ============
export const applicationErrors = new Counter({
  name: "application_errors_total",
  help: "Total application errors",
  labelNames: ["error_type", "severity"], // severity: "warning", "error", "critical"
});

// ============ Custom Business Metrics ============
export const invoiceAmount = new Histogram({
  name: "invoice_amount_eur",
  help: "Invoice amounts in EUR",
  labelNames: ["type"], // "carrier", "shipper", "freight"
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
});

export const customsValueDeclaration = new Histogram({
  name: "customs_declared_value_eur",
  help: "Declared customs value in EUR",
  labelNames: ["hs_chapter"],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
});

export const cargoWeight = new Histogram({
  name: "cargo_weight_kg",
  help: "Cargo weight in kilograms",
  labelNames: ["mode"],
  buckets: [10, 100, 500, 1000, 5000, 10000, 50000, 100000],
});

// ============ Metric Collection Utility ============
export function getMetricsRegistry() {
  return register;
}

export function getMetricsJSON() {
  return register.metrics();
}

export default {
  httpRequestDuration,
  httpRequestTotal,
  dbQueryDuration,
  dbQueryErrors,
  dbConnections,
  redisCommandDuration,
  redisCommandErrors,
  redisConnections,
  queueJobsActive,
  queueJobsCompleted,
  queueJobsFailed,
  queueJobDuration,
  shipmentsCreated,
  shipmentsProcessed,
  declarationsProcessed,
  invoicesReconciled,
  healthCheckDuration,
  dependencyStatus,
  applicationErrors,
  invoiceAmount,
  customsValueDeclaration,
  cargoWeight,
};
