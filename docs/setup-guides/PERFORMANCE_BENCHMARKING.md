# 📈 PERFORMANCE BENCHMARKING GUIDE — ATLAS LOGISTICS

Use this guide to measure and track your development environment performance.

---

## 🏁 Baseline Establishment (First Time)

### Step 1: Clean Install

```bash
# Remove everything
pnpm dev:stop
rm -rf node_modules atlas-erp-v2.db

# Fresh install
pnpm install

# Initialize database
pnpm db:migrate
pnpm db:seed

# Start fresh development
pnpm dev
```

### Step 2: Measure Startup Time

```bash
# Terminal 1: Time the startup
time pnpm dev

# Record the output (example):
# ✓ Redis started
# ✓ Backend running on :3001
# ✓ Frontend running on :5173
# real    0m8.345s
# user    0m5.234s
# sys     0m2.156s

# Your baseline: 8.345 seconds
```

### Step 3: Measure Memory Usage

```bash
# Terminal 2 (while Terminal 1 is running pnpm dev)
docker stats atlas-redis-dev --no-stream

# Example output:
# CONTAINER            CPU %   MEM USAGE   MEM %
# atlas-redis-dev      0.1%    32.5MB      1.5%

# Your baseline: Redis = 32.5MB, Node = (check Task Manager on Windows)
```

### Step 4: Measure API Response Time

```bash
# Terminal 2
curl -w "\nTime: %{time_total}s\n" http://localhost:3001/health

# Example output:
# {"status":"ok"}
# Time: 0.0234s

# Your baseline: 0.0234s (or 23.4ms)
```

### Step 5: Measure React HMR Speed

1. Open http://localhost:5173 in browser
2. Open DevTools (F12) → Network tab
3. Edit a React component: `packages/frontend/src/App.tsx`
4. Change something visible (e.g., title text)
5. Save file and measure time to see update
6. Record in milliseconds

**Your baseline:** ~350ms

---

## 📊 Benchmark Log

Create a file to track your benchmarks:

```markdown
# PERFORMANCE_BENCHMARKS.md

## Baseline (2024-10-02)
- Startup time: 8.3s
- Memory (Redis): 32.5MB
- Memory (Node): 245MB
- API response: 23.4ms
- HMR latency: 350ms
- Bundle size: 2.4MB
- Database size: 7.7MB

## Benchmark 1 (2024-10-09)
- Startup time: 8.2s ✓ (0.1s improvement)
- Memory (Redis): 32.6MB ✓ (stable)
- Memory (Node): 248MB ✓ (stable)
- API response: 24.1ms ✓ (acceptable)
- HMR latency: 365ms ⚠ (slightly slower)
- Bundle size: 2.4MB ✓ (same)
- Database size: 9.2MB ✓ (expected growth)
```

---

## 📏 Measurement Techniques

### 1. Startup Time

**Command:**
```bash
time pnpm dev:minimal
time pnpm dev
time pnpm dev:observability
```

**Expected:**
- dev:minimal: 4-6 seconds
- dev: 7-9 seconds
- dev:observability: 13-17 seconds

**What to record:**
- real time (total)
- user time (CPU)
- sys time (kernel)

---

### 2. Memory Usage

**For Docker containers:**
```bash
docker stats atlas-redis-dev --no-stream
```

**For Node process (Windows):**
```powershell
# Open Task Manager
# Find "node" process
# Check Memory column
```

**For Node process (Mac/Linux):**
```bash
ps aux | grep node
# Look for "RES" (memory) column

# Or use top
top -p $(pgrep -f "tsx.*server.ts")
```

**Expected:**
- Redis: 30-50MB
- Node: 200-400MB
- Stable over time (no growth)

---

### 3. API Response Time

**Using curl:**
```bash
# Health check (should be fast)
curl -w "\n%{time_total}\n" http://localhost:3001/health

# API endpoint
curl -w "\n%{time_total}\n" http://localhost:3001/api/v1/users

# With details
curl -w "\nTime Connect: %{time_connect}\nTime TTFB: %{time_starttransfer}\nTime Total: %{time_total}\n" http://localhost:3001/health
```

**Expected:**
- Health: 10-50ms
- Regular endpoints: 20-100ms
- Database queries: 50-200ms

**Time breakdown:**
- Connect time: Network latency
- TTFB (Time to First Byte): Server processing
- Total time: Everything

---

### 4. Frontend HMR Speed

**Manual measurement:**
1. Edit a component file
2. Open DevTools Performance tab (Ctrl+Shift+J)
3. Save file
4. Measure red vertical line (reload)
5. Time from save to visible update

**Expected:** 300-500ms

**Automated measurement (optional):**
```bash
# Monitor file changes
npm install -g watchman

# Time file changes
watchman watch src/
# [observe time from change to HMR update]
```

---

### 5. Build Time

```bash
# Full production build
time pnpm build

# Expected: 30-60 seconds
```

---

### 6. Test Suite Performance

```bash
# Run all tests with timing
time pnpm test

# Expected: 10-30 seconds

# Or with detailed timing
pnpm test -- --reporter=verbose
```

---

### 7. Linting Performance

```bash
# Lint everything
time pnpm lint

# Expected: 5-15 seconds

# Lint with --max-warnings 0
time pnpm lint -- --max-warnings 0
```

---

### 8. Type Checking

```bash
# Full type check
time pnpm type-check

# Expected: 8-15 seconds
```

---

## 🎯 Monthly Benchmark Routine

First Monday of each month:

```bash
# 1. Clean environment
pnpm dev:stop
rm -rf node_modules
pnpm install

# 2. Fresh database
rm -rf atlas-erp-v2.db atlas-erp-v2.db-*
pnpm db:migrate
pnpm db:seed

# 3. Run all benchmarks
echo "=== STARTUP TIME ==="
time pnpm dev:minimal     # Record time

# (In another terminal)
echo "=== MEMORY ==="
docker stats atlas-redis-dev --no-stream

echo "=== API RESPONSE ==="
curl -w "\n%{time_total}s\n" http://localhost:3001/health

echo "=== BUILD TIME ==="
time pnpm build

echo "=== TEST TIME ==="
time pnpm test

echo "=== LINT TIME ==="
time pnpm lint

# 4. Record all results in PERFORMANCE_BENCHMARKS.md
# 5. Compare with previous month
# 6. Note any improvements or regressions
```

---

## 📉 Identifying Regressions

If performance is degraded:

| Metric | Baseline | Current | Status |
|--------|----------|---------|--------|
| Startup | 8.3s | 12.5s | ❌ SLOW (+50%) |
| Memory | 245MB | 520MB | ⚠️ HIGH (+112%) |
| API response | 23.4ms | 45.2ms | ❌ SLOW (+93%) |

### Investigation Steps

1. **Check git log**
   ```bash
   git log --oneline | head -20
   # Which commit introduced regression?
   ```

2. **Check what changed**
   ```bash
   git diff HEAD~5..HEAD
   # Large number of dependencies added?
   # New middleware in Fastify?
   # Database queries added?
   ```

3. **Profile the slow operation**
   ```bash
   pnpm dev:observability
   # Monitor Grafana: http://localhost:3002
   # Identify the hot path
   ```

4. **Fix and re-measure**
   ```bash
   # Make optimization
   # Re-run benchmark
   # Verify improvement
   ```

---

## 🎯 Performance Targets

Set these as goals:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Startup time | < 10s | 8.3s | ✓ Met |
| Memory idle | < 400MB | 245MB | ✓ Met |
| Memory after 1h | < 500MB | 280MB | ✓ Met |
| API response | < 100ms | 23.4ms | ✓ Met |
| HMR latency | < 500ms | 350ms | ✓ Met |
| Build time | < 60s | 45s | ✓ Met |
| Test time | < 30s | 18s | ✓ Met |
| Lint time | < 20s | 12s | ✓ Met |

---

## 🚨 When to Alert

Trigger performance investigation if:

```
- Startup time > 15 seconds
- Memory usage > 800MB (and not improving)
- API response > 500ms
- HMR latency > 1 second
- Error rate > 1%
- Test failure rate > 5%
```

---

## 🔧 Quick Optimization Tips

If performance is degrading:

### Startup
```bash
# Check what's slow during startup
NODE_DEBUG=http,dns pnpm dev 2>&1 | head -50
```

### Memory
```bash
# Check for memory leaks
pnpm dev:observability
# Monitor nodejs_heap_size_used_bytes in Grafana
```

### API Response
```bash
# Profile endpoint
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/endpoint
```

### Build Time
```bash
# Analyze bundle
pnpm build -- --analyze
```

---

## 📝 Benchmark Report Template

Use this when documenting benchmarks:

```markdown
# Benchmark Report — [Date]

## Environment
- OS: [Windows/Mac/Linux]
- Docker: v[VERSION]
- Node: v[VERSION]
- pnpm: v[VERSION]

## Results
- Startup: [time]
- Memory: [MB]
- API response: [ms]
- HMR latency: [ms]
- Build time: [s]
- Test time: [s]

## Comparison
- vs Baseline: [+X% / -X%]
- vs Last Month: [+X% / -X%]

## Analysis
[What's faster/slower? Why?]

## Action Items
- [ ] [Optimization needed?]
- [ ] [Bug to investigate?]
```

---

## 🎯 Remember

- **Measure before optimizing** — Don't guess
- **Have a baseline** — Know your starting point
- **Track trends** — One slow month is noise, three is a pattern
- **Use real data** — Your actual machine, not hypothetical
- **Only optimize when needed** — Don't prematurely optimize

---

**Start your first benchmark today. Run monthly to track trends.**
