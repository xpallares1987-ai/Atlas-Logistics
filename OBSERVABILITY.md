# Atlas Logistics: Observability & Monitoring Setup

## 📊 Overview

This guide sets up comprehensive observability for Atlas Logistics using:

- **Prometheus**: Time-series metrics database
- **Grafana**: Visualization and dashboarding
- **Node Exporter**: System-level metrics
- **Fastify Metrics**: Application metrics via `/metrics` endpoint
- **Health Checks**: Liveness (`/health`) and readiness (`/ready`) endpoints

---

## 🚀 Quick Start

### 1. Start Full Stack with Monitoring

```bash
# Set environment variables
export POSTGRES_DB=scm_db
export POSTGRES_PASSWORD=postgres
export JWT_SECRET=test-jwt-secret-key
export COOKIE_SECRET=test-cookie-secret-key
export GRAFANA_ADMIN_PASSWORD=admin  # Optional, defaults to "admin"

# Start all services including Prometheus & Grafana
docker compose up --pull always -d

# Verify all services are healthy
bash scripts/check-compose-health.sh
```

### 2. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | - |
| **API** | http://localhost:3001 | JWT auth |
| **Prometheus** | http://localhost:9090 | - |
| **Grafana** | http://localhost:3002 | admin / admin |
| **Node Exporter** | http://localhost:9100 | - |

### 3. Configure Grafana (First Time Only)

```bash
# Access Grafana
open http://localhost:3002

# Login with admin credentials
# Username: admin
# Password: admin (or your GRAFANA_ADMIN_PASSWORD)

# Dashboards are auto-provisioned from:
# ./grafana/dashboards/atlas-overview.json
```

---

## 🔍 Health Check Endpoints

### Liveness Check (Full Health Report)
Returns detailed status of all dependencies.

```bash
curl -s http://localhost:3001/health | jq
```

**Response:**
```json
{
  "status": "healthy",  // "healthy", "degraded", "unhealthy"
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "up",        // "up", "down", "degraded"
      "exists": true,
      "sizeMB": 245,
      "latencyMs": 2,
      "error": null
    },
    "redis": {
      "status": "up",
      "latencyMs": 1,
      "error": null
    }
  },
  "system": {
    "memory": {
      "rss": 256,            // MB
      "heapTotal": 128,
      "heapUsed": 92,
      "external": 8
    },
    "loadAvg": {
      "1min": "0.45",
      "5min": "0.32",
      "15min": "0.28"
    },
    "cpu": {
      "user": 12000000,      // microseconds
      "system": 4000000
    },
    "eventLoopDelayMs": 0.12,
    "env": "production"
  },
  "checkDurationMs": 42
}
```

### Readiness Check (Lightweight)
Used by orchestrators for traffic routing decisions.

```bash
curl -s http://localhost:3001/ready | jq
```

**Response:**
```json
{
  "ready": true,  // Only true if ALL dependencies are ready
  "timestamp": "2024-01-15T10:30:00.000Z",
  "dependencies": {
    "database": {
      "ready": true,
      "latencyMs": 2
    },
    "redis": {
      "ready": true,
      "latencyMs": 1
    }
  }
}
```

### Kubernetes-style Aliases
```bash
curl -s http://localhost:3001/healthz   # Same as /health
curl -s http://localhost:3001/readyz    # Same as /ready
```

---

## 📈 Prometheus Metrics

### Available Metrics

All metrics are exposed at `http://localhost:3001/metrics` in Prometheus text format.

#### HTTP Request Metrics
```
http_request_duration_seconds       # Histogram (latency by method, route, status)
http_requests_total                 # Counter (total requests by method, route, status)
```

#### Database Metrics
```
db_query_duration_seconds           # Histogram (query latency)
db_query_errors_total              # Counter (failed queries)
db_connections_active              # Gauge (active connections)
```

#### Redis Metrics
```
redis_command_duration_seconds     # Histogram (command latency)
redis_command_errors_total         # Counter (failed commands)
redis_connections_active           # Gauge (active connections)
```

#### Queue Metrics (BullMQ)
```
queue_jobs_active                  # Gauge (active jobs by queue name)
queue_jobs_completed_total         # Counter (completed jobs)
queue_jobs_failed_total            # Counter (failed jobs)
queue_job_duration_seconds         # Histogram (job execution time)
```

#### Business Logic Metrics
```
shipments_created_total            # Counter (shipments by mode: sea, air, road, rail)
shipments_processed_total          # Counter (completed shipments)
customs_declarations_processed_total  # Counter (DUA declarations: import/export)
invoices_reconciled_total          # Counter (3-way match results)
```

#### System Health Metrics
```
health_check_duration_seconds      # Histogram (liveness/readiness check duration)
dependency_status                  # Gauge (1=up, 0=down for db, redis, gcp)
application_errors_total           # Counter (errors by type & severity)
```

### Query Examples

```promql
# HTTP request rate (requests/sec)
rate(http_requests_total[5m])

# P95 HTTP latency (seconds)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database query error rate
rate(db_query_errors_total[5m])

# Average database query latency (ms)
(rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])) * 1000

# Queue job success rate (%)
rate(queue_jobs_completed_total[5m]) / (rate(queue_jobs_completed_total[5m]) + rate(queue_jobs_failed_total[5m])) * 100

# Shipments per mode (per minute)
rate(shipments_created_total[1m])

# Application error rate (critical severity)
rate(application_errors_total{severity="critical"}[5m])
```

---

## 📊 Grafana Dashboards

### Pre-configured Dashboard: Atlas Logistics Overview

**Location**: http://localhost:3002/d/atlas-overview

**Panels:**
1. **System Status** - API health (up/down)
2. **HTTP Requests/sec** - Current request throughput
3. **Database Latency** - P50/P95 query times
4. **Redis Connections** - Active connections
5. **HTTP Request Duration (p95)** - Request latency trend
6. **Memory Usage** - RSS & Heap memory
7. **Database Query Errors** - Error rate trend
8. **Queue Jobs** - Active, completed, failed jobs
9. **Shipments Created** - By transport mode (sea, air, road, rail)
10. **Customs Declarations Processed** - Import/export volume
11. **Invoice Reconciliation Status** - 3-way match results
12. **Application Errors by Type** - Error distribution

### Adding Custom Dashboards

1. In Grafana: **+ Create → Dashboard**
2. Add panels using PromQL queries from above
3. Save and it will persist in `grafana_data` volume

---

## 🚨 Alerting

### Pre-configured Alerts

Alerts are defined in `grafana/rules/atlas-alerts.yml`:

| Alert | Condition | Severity |
|-------|-----------|----------|
| **APIServiceDown** | API unreachable for 1+ min | Critical |
| **DatabaseDown** | >100 DB errors in 2 min | Critical |
| **DatabaseLatencyHigh** | P95 query latency >1s for 5 min | Warning |
| **RedisDown** | No Redis connections for 1+ min | Critical |
| **HTTPErrorRateHigh** | 5xx rate >5% for 5 min | Warning |
| **QueueJobsFailing** | >10% job failure rate for 10 min | Warning |
| **HighMemoryUsage** | Heap >85% for 5+ min | Warning |
| **HighApplicationErrorRate** | Critical errors >0.01/sec for 2 min | Critical |

### Enable Alerting

1. In Prometheus: **Status → Targets** — verify all targets are green
2. In Prometheus: **Alerts** — view active alerts
3. Configure notification channels (Slack, PagerDuty, email) in Grafana if desired

---

## 🔧 Configuration Files

### Prometheus
- **Config**: `grafana/prometheus.yml`
- **Rules**: `grafana/rules/atlas-alerts.yml`
- **Scrape interval**: 15s
- **Evaluation interval**: 15s
- **Data retention**: 7 days (default)

### Grafana
- **Provisioning**: `grafana/provisioning/`
  - `dashboards/atlas-dashboards.yml` — Dashboard provider
  - `datasources/prometheus.yml` — Prometheus datasource
- **Dashboards**: `grafana/dashboards/`
  - `atlas-overview.json` — Main dashboard

### Application Metrics
- **Fastify metrics**: `src/monitoring/metrics.ts`
- **Health checks**: `src/routes/health.routes.ts`
- **Endpoint**: `/metrics` (Prometheus format)

---

## 🛠️ Troubleshooting

### Prometheus not scraping metrics

```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq

# Verify API metrics endpoint
curl -s http://localhost:3001/metrics | head -20
```

### Grafana can't connect to Prometheus

```bash
# Verify Prometheus is running
docker compose ps prometheus

# Check network connectivity from Grafana container
docker compose exec grafana curl -s http://prometheus:9090/-/healthy
```

### Health check endpoints not responding

```bash
# Check API logs
docker compose logs api | tail -50

# Test health endpoint directly
curl -v http://localhost:3001/health

# For readiness
curl -v http://localhost:3001/ready
```

### High memory usage

```bash
# Check memory metrics in Grafana
# Or query directly:
curl -s 'http://localhost:9090/api/v1/query?query=nodejs_heap_size_used_bytes' | jq

# Consider increasing container memory limit in docker-compose.yml
```

---

## 📋 Best Practices

### Health Checks in Orchestrators

**Kubernetes**:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

**Docker Compose**: Already configured in services with `healthcheck`

### Metrics Retention

- Prometheus default: **7 days**
- For longer retention, adjust docker-compose volumes or pass CLI flag:
  ```bash
  docker compose.override.yml:
    prometheus:
      command:
        - '--storage.tsdb.retention.time=30d'  # 30-day retention
  ```

### Custom Metrics

To add business metrics in your code:

```typescript
import { shipmentsCreated, invoiceAmount } from '../monitoring/metrics.ts';

// Increment shipment counter
shipmentsCreated.labels('sea').inc();

// Record invoice amount
invoiceAmount.labels('carrier').observe(12500);
```

---

## 🔗 References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [fastify-metrics](https://github.com/SkeLLLa/fastify-metrics)

---

## 📞 Support

For issues with observability setup, check:
1. `docker compose logs prometheus`
2. `docker compose logs grafana`
3. `docker compose ps` (verify all services healthy)
4. Prometheus UI: http://localhost:9090/status (check config)
