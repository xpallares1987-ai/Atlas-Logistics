# 🚀 Atlas Logistics — Optimized Local Development Setup

> **Development-First Architecture**: Minimal containerization, maximum developer velocity.

---

## 📋 What Changed

Your previous `docker-compose.yml` was production-oriented. This new setup is **optimized for personal development** with only what you actually need:

| Service | Before | After | Reason |
|---------|--------|-------|--------|
| PostgreSQL | ✅ Always-on | ❌ Removed | You use SQLite locally |
| Redis | ✅ On-demand | ✅ Always available | BullMQ queues, sessions (critical) |
| Prometheus | ✅ Always-on | ⚠️ Optional | Only when debugging metrics |
| Grafana | ✅ Always-on | ⚠️ Optional | Only when debugging dashboards |
| API / Frontend / Worker | ✅ Containerized | ❌ Local Node.js | Fast hot-reload, easier debugging |

---

## 🎯 Three Development Modes

### 1️⃣ **Minimal Mode** (Recommended for daily work)

```bash
pnpm dev:minimal
```

**What runs:**
- Backend (Fastify) — local on port `3001`
- Frontend (React + Vite) — local on port `5173`
- MFE modules (Turborepo) — local

**What's containerized:**
- None (pure Node.js)

**Use case:** Fastest iteration, best DX.

---

### 2️⃣ **Standard Mode** (Recommended for testing queues)

```bash
pnpm dev
```

**What runs:**
- Backend (Fastify) — local on port `3001`
- Frontend (React + Vite) — local on port `5173`
- MFE modules (Turborepo) — local
- **Redis** — containerized on port `6379`

**What's containerized:**
- Redis (7.2-alpine, ~50MB)

**Use case:** Full development with BullMQ background jobs, session caching.

---

### 3️⃣ **Full Observability Mode** (For debugging metrics/performance)

```bash
pnpm dev:observability
```

**What runs:**
- Backend (Fastify) — local on port `3001`
- Frontend (React + Vite) — local on port `5173`
- MFE modules (Turborepo) — local
- **Redis** — containerized on port `6379`
- **Prometheus** — containerized on port `9090`
- **Grafana** — containerized on port `3002`
- **Node Exporter** — containerized on port `9100`

**What's containerized:**
- Redis + Prometheus + Grafana + Node Exporter (~500MB total)

**Ports:**
- http://localhost:3001 → Backend API
- http://localhost:5173 → Frontend (Vite dev server)
- http://localhost:3000 → Frontend + SSR
- http://localhost:3002 → **Grafana Dashboard** (user: `admin`, password: `atlas2024`)
- http://localhost:9090 → **Prometheus Metrics**

**Use case:** Profiling, monitoring, deep performance debugging.

---

## 🛠️ Common Commands

```bash
# Start standard development (Redis + local app)
pnpm dev

# Start minimal development (no containers)
pnpm dev:minimal

# Start with full observability stack
pnpm dev:observability

# Stop all containers
pnpm dev:stop

# Inspect/edit SQLite database with Drizzle UI
pnpm db:inspect

# Run database migrations
pnpm db:migrate

# Seed development data
pnpm db:seed

# Reset database (delete + recreate schema + seed)
pnpm db:reset-and-seed

# Only manage Redis (no app)
pnpm dev:redis:only

# Stop only Redis
pnpm dev:redis:stop
```

---

## 📊 Resource Usage Comparison

| Mode | CPU | RAM | Disk | Startup Time |
|------|-----|-----|------|--------------|
| **Minimal** (Node only) | Low | ~300MB | Local SQLite | <5s |
| **Standard** (+ Redis) | Low | ~400MB | Local SQLite | ~8s |
| **Observability** (+ Prom/Grafana) | Medium | ~1GB | Local + volumes | ~15s |

---

## 🔍 Troubleshooting

### ❌ "Redis connection refused"
```bash
# Check if Redis container is running
docker ps | grep redis

# Restart Redis
pnpm dev:redis:stop
pnpm dev:redis:only
```

### ❌ "PORT 3001 already in use"
```bash
# Find and kill process using port 3001
# macOS/Linux:
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### ❌ "Drizzle migration fails"
```bash
# Ensure .env.local exists
cp .env.local.example .env.local

# Reset database
pnpm db:reset-and-seed

# Try again
pnpm dev
```

### ❌ "Containers won't start"
```bash
# Clean up orphaned containers
docker compose down --remove-orphans

# Rebuild
pnpm dev
```

---

## 📝 Configuration

### Edit `.env.local` for your setup:

```bash
cp .env.local.example .env.local
# Then edit with your secrets/ports
```

### Profiles (Advanced)

Use `--profile observability` to selectively start services:

```bash
# Start only Prometheus + Grafana (no Redis, no backend)
docker compose --profile observability up prometheus grafana
```

---

## 🚀 Next Steps

1. **First time setup:**
   ```bash
   cp .env.local.example .env.local
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   pnpm dev
   ```

2. **Access your app:**
   - Frontend: http://localhost:5173 (dev) or http://localhost:3000 (SSR)
   - Backend: http://localhost:3001
   - Swagger API docs: http://localhost:3001/docs
   - BullMQ Dashboard: http://localhost:3001/bull-board

3. **Debug background jobs:**
   - BullMQ Dashboard: http://localhost:3001/bull-board
   - Redis CLI: `docker exec atlas-redis-dev redis-cli`

4. **Monitor performance (optional):**
   ```bash
   pnpm dev:observability
   # Then visit: http://localhost:3002 (Grafana)
   ```

---

## 📚 Further Reading

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Fastify Docs](https://www.fastify.io/)
- [BullMQ Docs](https://docs.bullmq.io/)
- [Redis CLI](https://redis.io/docs/manual/cli/)
- [Prometheus Queries](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

## 💡 Pro Tips

- Use `pnpm dev:minimal` for fastest iteration, add Redis only when testing queues.
- Use `drizzle-kit studio` to explore your SQLite schema visually.
- Use `redis-cli MONITOR` in container to debug Redis operations in real-time.
- Use Grafana only when profiling performance; it adds 200MB+ memory overhead.

---

**Questions?** Check [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.
