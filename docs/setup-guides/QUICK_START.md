# Atlas Logistics — Deployment & Execution Quick Start

## 📋 Architecture Summary

Atlas Logistics is a containerized Supply Chain & Freight Forwarding Management platform engineered as an Event-Driven Modular Monolith.

- **Frontend**: Single-page application built with React 19, TypeScript, and Vite (`packages/frontend`).
- **Backend**: High-throughput REST & WebSocket API engine powered by Node.js 22, Fastify, and Drizzle ORM (`src/`).
- **Worker**: Asynchronous background job processor powered by BullMQ and Redis (`src/worker.ts`).
- **Persistence**: High-performance embedded SQLite in WAL mode (`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`) using `@libsql/client`.
- **Containers & Registry**: Published OCI microservice images on GitHub Container Registry (GHCR):
  - `ghcr.io/xpallares1987-ai/atlas-frontend`
  - `ghcr.io/xpallares1987-ai/atlas-backend`
  - `ghcr.io/xpallares1987-ai/atlas-worker`
- **Supply-Chain Security**: SLSA v1.0 Build Level 2 provenance attestations generated during CI and verified via `gh attestation verify`.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js >= 22.0.0
- pnpm >= 11.5.0
- Docker & Docker Compose (for Redis and optional containerized execution)

### 2. Install Dependencies & Build Workspace
```bash
# Install all dependencies across monorepo packages
pnpm install

# Build shared packages and contracts
pnpm build
```

### 3. Initialize SQLite Database & Run Migrations
```bash
# Push Drizzle schema to local SQLite database (data/dev.db)
pnpm run db:push

# Seed initial operational master catalogs and demo shipments
pnpm run db:seed
```

### 4. Start Development Services
```bash
# Start Redis container
docker compose up -d redis

# Launch backend API and frontend Vite dev servers concurrently
pnpm dev
```
- Frontend UI: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- Health check: `curl http://localhost:3001/health`

---

## 🐳 Quick Start (Production with Docker Compose)

### 1. Configure Production Environment
Copy `.env.production.example` to `.env.production` and generate cryptographically secure secrets:

```bash
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

cat > .env.production << EOF
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DATABASE_URL=file:/app/data/prod.db
REDIS_URL=redis://redis:6379
JWT_SECRET=$JWT_SECRET
EOF
```

### 2. Build & Launch Containers
```bash
# Build production images and start services in background
docker compose -f docker-compose.prod.yml up -d --build

# Verify container health status
docker compose -f docker-compose.prod.yml ps
```

### 3. Verify Endpoints
```bash
# Backend health endpoint
curl -s http://localhost:3001/health | jq .

# Frontend web server
curl -I http://localhost:8080/
```

---

## 🔐 Verifying SLSA Container Provenance

All published GHCR container images include cryptographic SLSA v1.0 attestations signed by GitHub Actions. Verify image integrity and provenance before production deployment:

```bash
# Verify backend image provenance
gh attestation verify \
  oci://ghcr.io/xpallares1987-ai/atlas-backend:latest \
  --repo xpallares1987-ai/Atlas-Logistics \
  --signer-workflow xpallares1987-ai/Atlas-Logistics/.github/workflows/ci.yml

# Verify frontend image provenance
gh attestation verify \
  oci://ghcr.io/xpallares1987-ai/atlas-frontend:latest \
  --repo xpallares1987-ai/Atlas-Logistics \
  --signer-workflow xpallares1987-ai/Atlas-Logistics/.github/workflows/ci.yml

# Verify worker image provenance
gh attestation verify \
  oci://ghcr.io/xpallares1987-ai/atlas-worker:latest \
  --repo xpallares1987-ai/Atlas-Logistics \
  --signer-workflow xpallares1987-ai/Atlas-Logistics/.github/workflows/ci.yml
```

---

## 💾 Database Backup & Integrity Verification

SQLite runs in WAL mode with active foreign key constraints. Backups must be performed online without interrupting active read/write transactions:

```bash
# Create an atomic, consistent online snapshot
sqlite3 data/dev.db "VACUUM INTO 'data/backups/backup-$(date +%Y%m%d%H%M%S).db';"

# Verify integrity and foreign key constraints on the backup
sqlite3 data/backups/backup-latest.db "PRAGMA integrity_check;"
sqlite3 data/backups/backup-latest.db "PRAGMA foreign_key_check;"

# Execute checkpoint to truncate WAL log when needed
sqlite3 data/dev.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

You can also run the automated backup & recovery verification script:
```bash
pnpm run test:backup-restore
```

---

## 📚 Related Documentation

- [Deployment Handbook](../deployment/DEPLOYMENT_HANDBOOK.md) — Comprehensive operations manual.
- [Container Provenance Verification](container-provenance-verification.md) — Detailed SLSA verification guide.
- [Security Backup Policy](security-backup-policy.md) — Backup schedules and disaster recovery playbooks.
- [Database Migration Workflow](database-migration-workflow.md) — Drizzle ORM migrations in SQLite WAL mode.
