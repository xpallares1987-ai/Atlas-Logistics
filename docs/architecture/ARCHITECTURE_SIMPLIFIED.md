# 📊 ATLAS LOGISTICS — DEVELOPMENT ARCHITECTURE (SIMPLIFIED)

## Before vs After

### ❌ BEFORE: Production-Heavy Setup

```
┌─────────────────────────────────────────────────────────────┐
│                     LOCAL MACHINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Docker Desktop                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 1: API (Fastify)                          │   │ 500MB
│  │  - Node 22, Fastify 5                               │   │
│  │  - Hot reload: ❌ NO                                │   │
│  │  - Debugging: Difficult (inside container)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 2: Frontend (Nginx + Vite Build)          │   │ 300MB
│  │  - Static build                                      │   │
│  │  - Hot reload: ❌ NO                                │   │
│  │  - Rebuild required for changes                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 3: Worker (BullMQ)                         │   │ 400MB
│  │  - Background jobs                                   │   │
│  │  - Hot reload: ❌ NO                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 4: PostgreSQL 16                           │   │ 300MB
│  │  - Not actually used (you use SQLite)               │   │
│  │  - Wasted resources                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 5: Redis 7.2                               │   │ 50MB
│  │  - BullMQ queue broker (CRITICAL)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 6: Prometheus (Optional)                   │   │ 200MB
│  │  - Metrics scraper                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 7: Grafana (Optional)                      │   │ 200MB
│  │  - Metrics dashboards                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 8: Node Exporter (Optional)                │   │ 50MB
│  │  - System metrics                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 9: pgAdmin (Optional)                      │   │ 100MB
│  │  - PostgreSQL UI (doesn't apply to SQLite)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Container 10: Camunda Platform 8 (Optional)          │   │ 1.2GB
│  │  - Not implemented in your code                      │   │
│  │  - Aspirational from ARCHITECTURE.md                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  TOTAL: ~2.5GB RAM | Startup: 30s+ | Hot reload: ❌        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### ✅ AFTER: Development-Optimized Setup (RECOMMENDED)

```
┌──────────────────────────────────────────────────────────────────┐
│                        LOCAL MACHINE                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Node.js (Running in Terminal)                 Docker Desktop    │
│  ┌──────────────────────────────────────────┐  ┌──────────────┐  │
│  │ Fastify Backend (:3001)                  │  │ Redis 7.2    │  │ 50MB
│  │  - tsx watch (hot reload) ✅              │  │  (:6379)     │  │
│  │  - VS Code debugger compatible ✅        │  │  CRITICAL    │  │
│  │  - Fast iteration (<1s restart)          │  └──────────────┘  │
│  └──────────────────────────────────────────┘                    │
│                                                                   │
│  Node.js (Running in Terminal)                                   │
│  ┌──────────────────────────────────────────┐                    │
│  │ React + Vite Frontend (:5173)             │                   │
│  │  - HMR hot module reload ✅               │                   │
│  │  - Instant UI updates                    │                   │
│  │  - TypeScript watch mode                 │                   │
│  └──────────────────────────────────────────┘                    │
│                                                                   │
│  Node.js (Running in Terminal)                                   │
│  ┌──────────────────────────────────────────┐                    │
│  │ Turborepo Dev Server                      │                   │
│  │  - Module Federation (MFEs)               │                   │
│  │  - Dashboard, Rate Comparer, Warehouse   │                   │
│  │  - BPMN Modeler (live dev)                │                   │
│  └──────────────────────────────────────────┘                    │
│                                                                   │
│  Local File System                                               │
│  ┌──────────────────────────────────────────┐                    │
│  │ SQLite Database (atlas-erp-v2.db)        │                   │
│  │  - Local file, instant access            │                   │
│  │  - Same as production                    │                   │
│  │  - Inspectable with `pnpm db:inspect`    │                   │
│  └──────────────────────────────────────────┘                    │
│                                                                   │
│  OPTIONAL: Docker Observability (when needed)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Prometheus (:9090) + Grafana (:3002) + Node Exporter    │   │
│  │  - Start only: pnpm dev:observability                   │   │
│  │  - Profiles: --profile observability                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  TOTAL: ~400MB RAM | Startup: 8s | Hot reload: ✅ INSTANT       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Development Modes Comparison

### Mode 1: Minimal (Fast, Local-Only)

```bash
pnpm dev:minimal

┌─────────────────────┐
│  Local Terminal     │
├─────────────────────┤
│ Backend (:3001) ✅  │
│ Frontend (:5173) ✅ │
│ MFE/Turbo ✅        │
└─────────────────────┘

RAM: ~300MB | Startup: <5s | Use: Quick iteration
```

---

### Mode 2: Standard (Recommended Daily)

```bash
pnpm dev

┌─────────────────────────────────────────────┐
│  Docker                                     │
├─────────────────────────────────────────────┤
│ Redis (:6379) ✅ BullMQ queues working     │
└─────────────────────────────────────────────┘

┌─────────────────────┐
│  Local Terminal     │
├─────────────────────┤
│ Backend (:3001) ✅  │
│ Frontend (:5173) ✅ │
│ MFE/Turbo ✅        │
└─────────────────────┘

RAM: ~400MB | Startup: ~8s | Use: Full-stack development
```

---

### Mode 3: Observability (Deep Debugging)

```bash
pnpm dev:observability

┌───────────────────────────────────────────────────────────┐
│  Docker                                                   │
├───────────────────────────────────────────────────────────┤
│ Redis (:6379)         ✅ BullMQ                           │
│ Prometheus (:9090)    ✅ Metrics scraper                  │
│ Grafana (:3002)       ✅ Dashboards (admin/atlas2024)     │
│ Node Exporter (:9100) ✅ System metrics                   │
└───────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  Local Terminal     │
├─────────────────────┤
│ Backend (:3001) ✅  │
│ Frontend (:5173) ✅ │
│ MFE/Turbo ✅        │
└─────────────────────┘

RAM: ~1GB | Startup: ~15s | Use: Performance profiling
```

---

## 🔄 Data Flow in Development

```
User Browser                     Docker Network
(http://localhost:5173)           (Docker Desktop)
         │
         │ HTTP/WS
         ▼
  Fastify Backend ◄──────────► Redis Broker
  (Local Port 3001)            (Container :6379)
         │                          │
         │ SQL                      │ Job Queue
         ▼                          ▼
   SQLite DB                    BullMQ Worker
 (Local File)                 (Local Process)
```

---

## 📈 Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| **Total RAM** | 2.5GB | 400MB | 6x less |
| **Startup Time** | 30s+ | 8s | 3x faster |
| **Code Change → Running** | 15-30s | <1s | 20x faster |
| **Debugging Capability** | Hard (container) | Easy (VS Code) | ✅ |
| **Hot Reload** | ❌ No | ✅ Yes | ✅ |
| **File Editing** | Rebuild needed | Instant | ✅ |

---

## 🚀 When to Use Each Mode

| Scenario | Recommended Mode | Reason |
|----------|-----------------|--------|
| Writing React components | `dev:minimal` | Fastest HMR, no DB needed |
| Working on Fastify APIs | `dev` | Need Redis for local testing |
| Adding BullMQ background jobs | `dev` | Full queue infrastructure |
| Database schema changes | `dev` | Full backend + DB |
| Performance profiling | `dev:observability` | See Grafana dashboards |
| Debugging memory leaks | `dev:observability` | Node metrics + Prometheus |
| CI/CD integration testing | `dev:observability` | Full production-parity stack |

---

## ✅ Checklist: What to Keep vs Remove

| Service | Keep? | Reason |
|---------|-------|--------|
| **Redis** | ✅ YES | BullMQ + sessions (critical) |
| **SQLite** | ✅ YES | Your actual database |
| **Backend (Fastify)** | ✅ YES | Local for hot reload |
| **Frontend (React/Vite)** | ✅ YES | Local for HMR |
| **Turborepo** | ✅ YES | MFE dev orchestration |
| **PostgreSQL** | ❌ NO | Using SQLite locally |
| **pgAdmin** | ❌ NO | Use `pnpm db:inspect` |
| **Camunda** | ❌ NO | Not implemented |
| **Prometheus** | ⚠️ OPTIONAL | Only for observability |
| **Grafana** | ⚠️ OPTIONAL | Only for dashboards |
| **Node Exporter** | ⚠️ OPTIONAL | Only for deep metrics |

---

## 🎯 Summary

**Your optimal setup for personal development:**

1. **Always:** Redis in Docker (for BullMQ)
2. **Usually:** Backend + Frontend local with hot reload
3. **Sometimes:** Observability stack when debugging
4. **Never:** PostgreSQL, pgAdmin, Camunda, containerized app

This gives you the best balance of **resource efficiency**, **developer velocity**, and **production parity**.

---

**Ready to start?**

```bash
pnpm dev
```

**Need observability?**

```bash
pnpm dev:observability
```

**Questions?** See `DEV_SETUP.md` for detailed guides.
