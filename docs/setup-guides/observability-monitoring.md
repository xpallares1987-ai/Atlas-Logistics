# Atlas Logistics — Observability, Telemetry & Performance Guide

This document is the definitive reference for metrics, structured logging, distributed tracing, dashboard visualization, and performance benchmarking across Atlas Logistics.

---

## 1. Observability Architecture Overview

Atlas Logistics implements end-to-end observability adhering to the OpenTelemetry (OTel) standard:

```
Fastify App (Pino + Prom-Client) ──► Prometheus (/metrics) ──► Grafana Dashboards (Port 3002)
                                 └──► Loki (Logs)          ──► Grafana Explore
                                 └──► OpenTelemetry Trace  ──► Tempo / APM
```

---

## 2. Key Metrics & Endpoints

| Endpoint | Protocol | Purpose | Authentication |
| :--- | :--- | :--- | :--- |
| `GET /metrics` | HTTP (Prometheus format) | Application & process metrics | Internal / Scraper network |
| `GET /health` | HTTP JSON | Liveness & readiness probe | Public |
| `GET /api/scm/v1/operational/outbox/dlq` | HTTP JSON | Dead Letter Queue inspection | Operator RBAC/ABAC |
| `GET /api/scm/v1/operational/cockpit/summary` | HTTP JSON | Real-time work queue KPI counters | Operator RBAC/ABAC |

### Core Metric Counters & Gauges
* `http_requests_total{method, route, status}`: Total HTTP request throughput.
* `http_request_duration_seconds{method, route}`: Response latency distribution (p50, p95, p99).
* `scm_outbox_pending_events_count`: Number of pending events in transactional outbox.
* `scm_outbox_dlq_events_count`: Number of dead-lettered events requiring operator review.
* `scm_cockpit_actionable_tasks_count`: Active non-blocked tasks in the work queue.
* `scm_workflow_instances_active_count`: Currently executing workflow engine instances.

---

## 3. Grafana Dashboard Configuration

When running with `docker compose --profile observability up -d`:
* **Grafana URL**: `http://localhost:3002` (Default credentials: `admin` / `admin`).
* **Pre-provisioned Dashboards**:
  1. **Atlas Executive Overview**: Global request rate, error rate, p95 latency, active shipments.
  2. **SCM Operations & Outbox Health**: Outbox processing lag, DLQ size, workflow instances state.
  3. **Node.js Process Telemetry**: Event loop lag, V8 heap usage, GC pause duration.

---

## 4. Structured Logging with Pino

All backend logs are emitted in JSON format via Pino:
```json
{
  "level": 30,
  "time": 1730361600000,
  "pid": 4821,
  "hostname": "atlas-host",
  "reqId": "req-9b81f",
  "context": "operational-core",
  "shipmentId": "shp_07645594-3952",
  "msg": "Operational shipment created successfully"
}
```

In development, human-readable pretty-printing is enabled automatically via `pino-pretty`.

---

## 5. Performance Benchmarking

### Benchmarking Targets & Baselines
* **API Route Response Time**: p95 $< 25\text{ms}$ for cached/projected read models (`/operational/shipments/:id/360`, `/operational/cockpit`).
* **Transaction Throughput**: $> 800\text{ req/sec}$ for command endpoints under SQLite WAL mode (`PRAGMA journal_mode = WAL;`).
* **Outbox Relay Tick**: $< 15\text{ms}$ per batch pass.

### Running Local Benchmarks
```bash
# Benchmark health and read model endpoints
npx autocannon -c 50 -d 10 http://localhost:3001/health
```
