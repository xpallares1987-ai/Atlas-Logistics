# ✅ Observability & Monitoring Implementation Complete

## 📊 What's Been Added

### 1. **Enhanced Health Checks** (`src/routes/health.routes.ts`)

**Liveness Check (`/health`)**:
- Detailed status of database, Redis, memory, CPU, event loop lag
- System metrics: heap usage, load average, process uptime
- Returns HTTP 200 for healthy/degraded, 503 for unhealthy
- Execution latency tracking

**Readiness Check (`/ready`)**:
- Lightweight check for orchestrators (Kubernetes, Docker, ECS)
- Only returns 200 when ALL dependencies are ready
- Includes latency measurements for each dependency
- K8s-style aliases: `/healthz` and `/readyz`

### 2. **Prometheus Metrics** (`src/monitoring/metrics.ts`)

**Pre-configured Metrics** (prom-client):

| Category | Metrics |
|----------|---------|
| **HTTP** | Request duration, total requests by status |
| **Database** | Query duration, error count, connection pool |
| **Redis** | Command duration, error count, active connections |
| **Queues** | Active jobs, completed, failed, job duration (BullMQ) |
| **Business** | Shipments, customs declarations, invoice reconciliation |
| **Health** | Dependency status gauges, health check duration |
| **Errors** | Application errors by type & severity |

### 3. **Monitoring Stack in docker-compose.yml**

New services added:

| Service | Port | Purpose |
|---------|------|---------|
| **prometheus** | 9090 | Time-series metrics database |
| **grafana** | 3002 | Visualization & dashboards |
| **node-exporter** | 9100 | System-level metrics |

### 4. **Grafana Configuration**

**Provisioning** (`grafana/provisioning/`):
- Auto-configured Prometheus datasource
- Auto-loaded dashboards from `grafana/dashboards/`
- No manual setup required on first run

**Dashboard**: `grafana/dashboards/atlas-overview.json`
- 12 pre-configured panels covering all metrics
- System Status, HTTP latency, Database health, Queue jobs, Business KPIs
- Auto-refreshes every 30 seconds

### 5. **Prometheus Configuration**

**Config** (`grafana/prometheus.yml`):
- Scrape interval: 15 seconds
- Targets: Fastify API, Node Exporter, Prometheus itself
- Metric retention: 7 days (default)

**Alert Rules** (`grafana/rules/atlas-alerts.yml`):
- 8 pre-configured alerts (critical & warning levels)
- APIServiceDown, DatabaseDown, HighErrorRate, QueueFailures, etc.

---

## 🚀 Quick Start

```bash
# 1. Set environment variables
export POSTGRES_DB=scm_db
export POSTGRES_PASSWORD=postgres
export JWT_SECRET=test-jwt-secret-key
export COOKIE_SECRET=test-cookie-secret-key
export GRAFANA_ADMIN_PASSWORD=admin

# 2. Start full stack with monitoring
docker compose up --pull always -d

# 3. Verify all services are healthy
bash scripts/check-compose-health.sh

# 4. Access services:
# Frontend:   http://localhost:3000
# API:        http://localhost:3001
# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3002 (admin/admin)
```

---

## 📈 Key Endpoints

### Health Checks (API)
```bash
# Detailed liveness check
curl http://localhost:3001/health

# Lightweight readiness check (for orchestrators)
curl http://localhost:3001/ready

# K8s conventions
curl http://localhost:3001/healthz
curl http://localhost:3001/readyz
```

### Metrics Export
```bash
# Prometheus-format metrics (for scraping)
curl http://localhost:3001/metrics

# Prometheus UI
http://localhost:9090
```

### Grafana Dashboard
```
http://localhost:3002/d/atlas-overview
Login: admin / admin
```

---

## 🎯 Metrics Captured

### Performance Indicators
- **HTTP P95 Latency**: Histogram per method/route
- **Database Query Latency**: Per operation (insert, select, update)
- **Redis Command Latency**: Per Redis command
- **Job Duration**: Queue jobs by name

### Business Metrics
- **Shipments Created**: Counter by transport mode (sea, air, road, rail)
- **Customs Declarations**: Counter by direction (import/export)
- **Invoice Reconciliation**: Counter by result (matched, variance, error)
- **Cargo Weight**: Histogram by transport mode

### Reliability Indicators
- **HTTP Error Rate**: 5xx errors per minute
- **Database Errors**: Query errors per operation
- **Queue Failure Rate**: Failed jobs vs completed
- **Dependency Status**: Database, Redis, GCP connectivity (gauges)

### Resource Usage
- **Memory**: RSS, Heap total/used, external buffers (MB)
- **CPU**: User and system time (microseconds)
- **Event Loop Lag**: Responsiveness indicator (ms)
- **Load Average**: 1min, 5min, 15min

---

## 🚨 Pre-configured Alerts

All alerts are defined in `grafana/rules/atlas-alerts.yml`:

1. **APIServiceDown** (Critical) — API unreachable >1 min
2. **DatabaseDown** (Critical) — >100 DB errors in 2 min
3. **DatabaseLatencyHigh** (Warning) — P95 latency >1s for 5 min
4. **RedisDown** (Critical) — No active connections >1 min
5. **HTTPErrorRateHigh** (Warning) — 5xx rate >5% for 5 min
6. **QueueJobsFailing** (Warning) — >10% failure rate for 10 min
7. **HighMemoryUsage** (Warning) — Heap >85% for 5+ min
8. **HighApplicationErrorRate** (Critical) — Critical errors >0.01/sec

---

## 📁 Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/monitoring/metrics.ts` | Prometheus metrics definitions |
| `src/routes/health.routes.ts` | Enhanced health & readiness endpoints |
| `grafana/prometheus.yml` | Prometheus configuration |
| `grafana/rules/atlas-alerts.yml` | Alert rule definitions |
| `grafana/dashboards/atlas-overview.json` | Main Grafana dashboard |
| `grafana/provisioning/dashboards/atlas-dashboards.yml` | Dashboard auto-loader |
| `grafana/provisioning/datasources/prometheus.yml` | Datasource config |
| `OBSERVABILITY.md` | Complete observability guide |

### Modified Files
| File | Changes |
|------|---------|
| `docker-compose.yml` | Added prometheus, grafana, node-exporter services |

---

## 🔍 Verification Checklist

### Local Development
- [ ] `docker compose up --pull always -d` starts all 8 services
- [ ] `bash scripts/check-compose-health.sh` reports all healthy
- [ ] `curl http://localhost:3001/health` returns 200 with details
- [ ] `curl http://localhost:3001/ready` returns 200 when ready
- [ ] `curl http://localhost:3001/metrics` returns Prometheus metrics
- [ ] `http://localhost:9090/targets` shows all scrape targets as green
- [ ] `http://localhost:3002` loads Grafana dashboard (admin/admin)
- [ ] Dashboard panels display metrics (may take 30-60s to populate)

### Prometheus
- [ ] Fastify API target scraping (Status → Targets)
- [ ] Node Exporter target scraping
- [ ] Alert rules loaded (Alerts → tab)

### Grafana
- [ ] Prometheus datasource connected (Settings → Data sources)
- [ ] Atlas Overview dashboard visible
- [ ] Panels rendering metrics (refresh after 30s)

---

## 🎓 Example Queries

### PromQL Examples (Prometheus/Grafana)

```promql
# HTTP request rate (requests/second)
rate(http_requests_total[5m])

# P95 HTTP latency (seconds)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database query latency (milliseconds)
(rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])) * 1000

# Failed DB queries per second
rate(db_query_errors_total[5m])

# Queue job success rate
rate(queue_jobs_completed_total[5m]) / (rate(queue_jobs_completed_total[5m]) + rate(queue_jobs_failed_total[5m]))

# Shipments created per minute by mode
rate(shipments_created_total[1m])

# Application critical errors per second
rate(application_errors_total{severity="critical"}[5m])
```

---

## 🔗 Integration Points

### Kubernetes Deployment
```yaml
livenessProbe:
  httpGet:
    path: /health      # Detailed health check
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready       # Ready for traffic
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Docker Swarm / ECS
Uses health checks in docker-compose for monitoring service state.

### CI/CD Monitoring
- GitHub Actions can query `/metrics` for build system health
- Pre-deployment smoke tests can verify `/ready` returns 200

---

## 📚 Next Steps (Optional)

1. **Alertmanager**: Route alerts to Slack, PagerDuty, email
2. **Long-term Storage**: Use Thanos or VictoriaMetrics for multi-retention
3. **Log Aggregation**: ELK or Loki for centralized logs + metrics correlation
4. **APM**: Add Jaeger or DataDog for distributed tracing
5. **SLO Tracking**: Define SLIs and track SLO compliance over time

---

## 🆘 Troubleshooting

### Metrics not appearing in Grafana
- Wait 30-60 seconds for data to accumulate
- Check Prometheus targets: http://localhost:9090/targets
- Verify API `/metrics` endpoint: `curl http://localhost:3001/metrics`

### Health checks returning 503
- Verify database is running: `docker compose logs db`
- Verify Redis is running: `docker compose logs redis`
- Check Redis connectivity: `docker compose exec redis redis-cli ping`

### Grafana can't connect to Prometheus
- Ensure Prometheus container is healthy: `docker compose ps prometheus`
- Verify network: `docker compose exec grafana curl http://prometheus:9090/-/healthy`

---

## 📞 Resources

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/grafana/latest/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)
- [fastify-metrics](https://github.com/SkeLLLa/fastify-metrics)
- [OBSERVABILITY.md](./OBSERVABILITY.md) — Full setup guide
