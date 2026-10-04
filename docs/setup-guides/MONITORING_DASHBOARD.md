# 📊 MONITORING & PERFORMANCE DASHBOARD — ATLAS LOGISTICS

## When to Use Observability Mode

```bash
pnpm dev:observability
```

**Only when:**
- Performance is degraded
- You're debugging metrics
- You're profiling specific endpoints
- You're investigating memory leaks

**NOT during normal development** (too much overhead)

---

## Accessing the Dashboard

Once `pnpm dev:observability` is running:

### Grafana (Main Dashboard)
- **URL:** http://localhost:3002
- **User:** admin
- **Password:** atlas2024
- **Purpose:** Visual metrics, alerts, graphs

### Prometheus (Raw Metrics)
- **URL:** http://localhost:9090
- **Purpose:** Query raw metric data, test queries

### Application Metrics
- **URL:** http://localhost:3001/metrics
- **Purpose:** Prometheus-format metrics endpoint (always available)

---

## Key Metrics to Monitor

### 1. Response Time
**Query (Prometheus):**
```
histogram_quantile(0.95, rate(http_requests_duration_seconds_bucket[5m]))
```
**Healthy:** < 100ms for most endpoints
**Warning:** > 500ms

### 2. Request Count
**Query:**
```
rate(http_requests_total[5m])
```
**Healthy:** Consistent with expected traffic
**Warning:** Sudden spikes

### 3. Memory Usage
**Query:**
```
process_resident_memory_bytes
```
**Healthy:** < 400MB (usually 200-300MB)
**Warning:** > 1GB

### 4. Node Version
**Query:**
```
nodejs_version_info
```
**Expected:** v22.x.x

### 5. Redis Connection
**Query:**
```
redis_connected_clients
```
**Healthy:** 1-3 clients
**Warning:** 0 (Redis not connected)

---

## Dashboard Queries for Grafana

### CPU Usage
```promql
rate(process_cpu_seconds_total[1m])
```

### Heap Memory
```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100
```

### Active Requests
```promql
http_requests_in_flight
```

### Error Rate
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

### BullMQ Queue Depth
```promql
bullmq_queue_depth
```

---

## Performance Benchmarking

### 1. Measure Startup Time

```bash
# Terminal 1: Start with timing
time pnpm dev:observability

# Should show something like:
# real    0m12.345s
# user    0m8.123s
# sys     0m2.456s
```

**Expected:**
- dev:minimal: 5s
- dev: 8s
- dev:observability: 15s

### 2. Measure Hot Reload Speed

1. Edit a simple React component
2. Watch network tab in DevTools
3. Measure time to show change

**Expected:** < 500ms

### 3. Measure API Response Time

```bash
# Terminal 2 (while pnpm dev is running)
curl -w "\n%{time_total}s\n" http://localhost:3001/health

# Example output:
# {"status":"ok"}
# 0.023456s
```

**Expected:** < 50ms

### 4. Check Memory After 1 Hour

```bash
# After 1 hour of development
docker stats atlas-redis-dev
```

**Expected:**
- Redis: < 50MB
- Node process: 250-400MB (no growth over time)

---

## Alert Thresholds

Set these up in Grafana:

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Memory | 600MB | 800MB | Restart process |
| CPU | 80% | 95% | Investigate spike |
| Error Rate | 5% | 25% | Check logs |
| Redis Conn | 0 | - | Restart Redis |
| Response Time | 500ms | 2s | Profile endpoint |

---

## Common Performance Issues & Fixes

### Issue: Memory Growing Over Time
**Signs:** Memory usage increases from 200MB to 1GB over hours
**Cause:** Memory leak in code
**Fix:**
1. Stop dev: `pnpm dev:stop`
2. Check for event listeners not removed
3. Check for circular references
4. Use `pnpm dev:observability` and monitor heap
5. Restart: `pnpm dev`

### Issue: Slow API Responses
**Signs:** Endpoints taking > 1 second
**Cause:** Database queries, N+1 problem, or blocking I/O
**Fix:**
1. Check `pnpm dev:observability` response times
2. Look at database query log
3. Use Drizzle query profiling
4. Optimize indexes

### Issue: High CPU Usage
**Signs:** CPU at 80%+ consistently
**Cause:** Infinite loops, busy polling, or hot code path
**Fix:**
1. Check `pnpm dev:observability` process metrics
2. Use Node.js profiler
3. Check CPU flame graphs in Grafana
4. Identify and optimize hot path

### Issue: Redis Not Connecting
**Signs:** BullMQ jobs failing, no queue jobs processing
**Cause:** Docker container not running
**Fix:**
```bash
docker compose up redis --remove-orphans
# Or restart dev:
pnpm dev:stop
pnpm dev
```

---

## Testing Specific Endpoints

### Load Test with Apache Bench
```bash
# Install Apache Bench (if not have)
# macOS: brew install httpd
# Windows: Download from Apache
# Linux: apt-get install apache2-utils

# Test endpoint
ab -n 100 -c 10 http://localhost:3001/health
# -n: number of requests
# -c: concurrent requests

# Output shows:
# - Requests per second
# - Mean time per request
# - Transfer rate
```

### Load Test with wrk
```bash
# Install wrk
# macOS: brew install wrk
# Or download from: https://github.com/wg/wrk

# Test for 30 seconds with 4 threads, 12 connections
wrk -t4 -c12 -d30s http://localhost:3001/health

# Output shows:
# - Requests/sec
# - Latency percentiles
# - Error rate
```

---

## Continuous Monitoring Workflow

### Daily
- Check `http://localhost:3001/metrics` endpoint
- Monitor response times during development
- Note any performance degradation

### Weekly
- Run `pnpm dev:observability` for 1-2 hours
- Review memory/CPU trends
- Document findings in PERFORMANCE_LOG.md

### Monthly
- Full performance audit with load testing
- Compare metrics to baseline
- Optimize if degraded

---

## Creating Custom Dashboards

### Add Metrics to Your Code

```typescript
// src/config/metrics.ts
import client from 'prom-client';

export const httpRequestDuration = new client.Histogram({
  name: 'http_requests_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const customMetric = new client.Counter({
  name: 'custom_metric_total',
  help: 'Custom metric description',
});
```

### Export Metrics

```typescript
// src/app.ts
app.get('/metrics', async (req, res) => {
  res.header('Content-Type', client.register.contentType);
  return res.send(await client.register.metrics());
});
```

### Query in Grafana

1. Go to Grafana: http://localhost:3002
2. Create new panel
3. Query: `http_requests_duration_seconds_bucket`
4. Add labels and rates as needed

---

## Performance Baseline

Document your baseline for future comparison:

```
Baseline (2024-10-02):
- Startup time: 8 seconds
- Memory (idle): 250MB
- Memory (after 1h): 280MB (stable)
- API response time: 23ms avg
- HMR time: 350ms
- Error rate: 0%
- Redis connection: ✓ 1 client
```

Update this monthly to track changes.

---

## When to Optimize

Only optimize when:
1. Metrics show degradation
2. User reports slowness
3. You're shipping to production
4. You have proof (not guessing)

**Never optimize prematurely.**

---

## Resources

- [Prometheus Queries](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Node.js Profiling](https://nodejs.org/en/docs/guides/simple-profiling/)
- [prom-client](https://github.com/siimon/prom-client)

---

**Remember:** Monitoring is a tool, not an obsession. Use it when you need it.
