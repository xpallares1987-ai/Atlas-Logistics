# Atlas Logistics — Docker & Container Infrastructure Guide

This guide is the single authoritative source for running, developing, and deploying Atlas Logistics using Docker and container infrastructure.

---

## 1. Quick Start

### Local Development (Zero-Cost Local Stack)

```bash
# 1. Initialize environment configuration
pnpm run env:setup
# Or on Windows PowerShell:
.\scripts\QUICK_START_WINDOWS.ps1

# 2. Start containerized dependencies (Redis, Grafana/Prometheus if needed)
docker compose up -d

# 3. Access endpoints
# - Frontend: http://localhost:8080 (or Vite PWA on http://localhost:3000)
# - Fastify API: http://localhost:3001
# - Swagger Docs: http://localhost:3001/documentation
# - Grafana (Observability profile): http://localhost:3002 (admin / admin)
```

### Production Deployment

```bash
# 1. Deploy with validated production compose
docker compose -f docker-compose.prod.yml up -d --build

# 2. Check container health
docker compose -f docker-compose.prod.yml ps
```

---

## 2. Container Architecture & Published Images

Atlas Logistics microservices are packaged and published to GitHub Container Registry (GHCR):

| Microservice | Dockerfile | Registry URI | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Host** | `Dockerfile` | `ghcr.io/xpallares1987-ai/atlas-frontend` | React 19 + Vite static PWA served via Nginx |
| **Backend API** | `Dockerfile.backend` | `ghcr.io/xpallares1987-ai/atlas-backend` | Fastify 5 REST API & WebSocket server |
| **Async Worker** | `Dockerfile.worker` | `ghcr.io/xpallares1987-ai/atlas-worker` | BullMQ asynchronous background queue worker |

Every published image includes cryptographically signed **SLSA v1.0 Build Provenance** attestations. See the [Container Provenance Verification Guide](file:///C:/Users/xpall/Source/Atlas-Logistics/docs/setup-guides/container-provenance-verification.md) for details.

### Profiles

| Profile | Services Included | Default Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Default** | `backend`, `frontend`, `redis` | 3001, 8080, 6379 | Core application runtime |
| **Observability** | `prometheus`, `grafana`, `loki`, `promtail` | 9090, 3002, 3100 | Metrics, dashboards, structured logs |
| **Worker** | `background-worker` | - | BullMQ asynchronous job processor |

To start with observability enabled:
```bash
docker compose --profile observability up -d
```

---

## 3. Docker CI & Build Optimization

To maintain fast CI pipeline execution, the Docker configuration implements:
* **Multi-Stage Builds**: Distinct stages for dependencies (`deps`), builder (`build`), and lightweight runtime (`runner`).
* **Layer Caching**: `pnpm-lock.yaml` is copied and cached before workspace source files.
* **BuildKit Cache Mounts**: `RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile`.

### Manual Image Build & Pruning
```bash
# Build frontend container
DOCKER_BUILDKIT=1 docker build -t atlas-frontend:latest -f Dockerfile .

# Build backend API container
DOCKER_BUILDKIT=1 docker build -t atlas-backend:latest -f Dockerfile.backend .

# Build async worker container
DOCKER_BUILDKIT=1 docker build -t atlas-worker:latest -f Dockerfile.worker .

# Clean build caches and dangling images
docker image prune -f
docker builder prune -f
```

---

## 4. Environment Configuration Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` / `production` | Node runtime environment mode |
| `PORT` | `3001` | Fastify backend listening port |
| `DATABASE_URL` | `file:/app/data/prod.db` (prod) / `file:./data/dev.db` (dev) | SQLite database location |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection for queues and cache |
| `ENABLE_OBSERVABILITY` | `false` | Enables Prometheus metrics collection |
| `LOG_LEVEL` | `info` / `debug` | Pino structured logger level |

---

## 5. Troubleshooting & Health Checks

* **Port Conflict (3001 or 6379 in use)**:
  Check for existing host processes:
  ```powershell
  Get-NetTCPConnection -LocalPort 3001, 6379 | Select-Object OwningProcess, State
  ```
* **Logs Streaming**:
  ```bash
  docker compose logs -f backend
  ```
* **Container Reset**:
  ```bash
  docker compose down -v
  docker compose up -d
  ```
