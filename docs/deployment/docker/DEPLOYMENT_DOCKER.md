# Atlas Logistics — Docker & Deployment Guide

## Quick Start

### Development

```bash
# Start dev environment (Redis + auto-reload)
pnpm run dev

# Or manually:
./scripts/docker/docker.sh start-dev
pnpm run dev:minimal
```

### Production (Single-Host Docker Compose)

```bash
# 1. Prepare environment
cp .env.production.example .env.production
# Edit .env.production with real secrets

# 2. Pre-deployment checks
./scripts/docker/pre-deploy-check.sh

# 3. Deploy
./scripts/docker/docker.sh start-prod --with-observability

# 4. Verify
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐          ┌────────────────────────────┐   │
│  │   NGINX      │◄────────►│  FASTIFY BACKEND (3001)    │   │
│  │  :80/:443    │          │  - REST API                 │   │
│  │  :8080       │          │  - WebSocket               │   │
│  │  (Frontend   │          │  - Swagger Docs           │   │
│  │   SPA)       │          │  - Rate Limiting          │   │
│  └──────────────┘          └────────────────────────────┘   │
│                                     ▲                         │
│                    ┌────────────────┼────────────────┐       │
│                    ▼                ▼                ▼       │
│            ┌────────────────┐ ┌──────────────┐ ┌─────────┐  │
│            │ WORKER NODES   │ │   REDIS      │ │ SQLite  │  │
│            │ (BullMQ Jobs)  │ │ (Queue/Cache)│ │ (DB)    │  │
│            │ - AI Parsing   │ │ :6379        │ │ :data/  │  │
│            │ - OCR          │ └──────────────┘ └─────────┘  │
│            │ - PDF Gen      │                                │
│            └────────────────┘                                │
│                                                               │
│  Optional Observability Stack (--profile observability):     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Prometheus │  │   Grafana    │  │ Node Exporter│        │
│  │  :9090     │  │   :3002      │  │  :9100       │        │
│  └────────────┘  └──────────────┘  └──────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Services

### Frontend (Nginx Alpine)
- **Port**: 8080 (remapped to 80 in prod)
- **Purpose**: SPA + API reverse proxy + security headers
- **Image**: 80MB (production-only, no build tools)
- **Features**:
  - Gzip compression
  - 1-year cache for assets
  - SPA routing (/index.html fallback)
  - API proxy to backend (:3001)
  - WebSocket upgrade support

### Backend (Node.js + Fastify)
- **Port**: 3001
- **Purpose**: REST API, WebSocket, background job management
- **Image**: 300MB (prod deps only)
- **Features**:
  - Lucia JWT authentication
  - CORS + Rate limiting
  - Swagger documentation
  - BullMQ queue management UI
  - Prometheus metrics

### Worker (Node.js)
- **Purpose**: Background jobs (AI parsing, OCR, PDF generation)
- **Image**: 300MB (same as backend, no ports exposed)
- **Features**:
  - Graceful shutdown on SIGTERM
  - Multi-instance scaling
  - Redis-backed queues
  - Database connection pooling

### Redis (Alpine)
- **Port**: 6379
- **Storage**: RDB snapshots + AOF journal
- **Retention**: LRU eviction @ 512MB
- **Persistence**: Every second (configurable)

### SQLite Database
- **Location**: `/app/data/prod.db`
- **Volume**: Named `backend_data` (docker-compose managed)
- **Shared**: By backend + worker services
- **Backups**: Use `pnpm run backup-db` in backend container

---

## Environment Variables

### Required (Production)
```env
# Authentication (minimum 32 chars, use 'openssl rand -base64 32')
JWT_SECRET=your-secure-random-value-min-32-chars
COOKIE_SECRET=your-secure-random-value-min-32-chars

# Database
DATABASE_URL=file:./data/prod.db
# OR remote (Turso/LibSQL):
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token

# Redis
REDIS_URL=redis://redis:6379

# Observability
GRAFANA_ADMIN_PASSWORD=secure-password
```

### Optional
```env
GOOGLE_CLOUD_PROJECT=project-id  # For AI features
GOOGLE_API_KEY=api-key

LOG_LEVEL=info                    # debug|info|warn|error
ENABLE_WORKERS=true              # false to disable background jobs
```

---

## Deployment Scenarios

### 1. Local Development (Recommended)
```bash
pnpm run dev
# Runs: Redis + Backend (tsx watch) + Frontend (Vite dev server)
# Hot-reload enabled for all services
```

### 2. Single-Host Production (Docker Compose)
```bash
# Best for: MVP, small teams, proof-of-concept
# Limitations: No orchestration, single instance only

docker compose -f docker-compose.prod.yml up --pull always -d
```

**When to scale:**
- Add more worker instances: `docker compose -f docker-compose.prod.yml up -d --scale worker=3`
- Upgrade Redis: Managed Redis service (AWS ElastiCache, Azure Cache)
- Upgrade Database: Turso, Neon, or managed SQLite via LiteFS

### 3. Kubernetes (Multi-Node)
Create separate manifests (not provided here, use `docker-compose.prod.yml` as reference):
- Deployment for backend
- DaemonSet for workers
- StatefulSet for Redis (or use managed service)
- PersistentVolumeClaim for SQLite

### 4. Docker Swarm (Clustered)
```bash
docker swarm init
docker stack deploy -c docker-compose.prod.yml atlas
```

---

## Monitoring & Troubleshooting

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

### Health Status
```bash
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME              STATE      PORTS
# atlas-frontend    Up (healthy)
# atlas-backend     Up (healthy)
# atlas-worker      Up (healthy)
# atlas-redis       Up (healthy)
```

### Common Issues

**Backend won't start:**
```bash
# Check database connectivity
docker compose -f docker-compose.prod.yml exec backend node -e \
  "require('fs').existsSync('./data/prod.db') ? console.log('DB OK') : process.exit(1)"

# Run migrations
docker compose -f docker-compose.prod.yml exec backend pnpm run db:migrate
```

**Redis connection fails:**
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Expected: PONG
```

**Worker not processing jobs:**
```bash
docker compose -f docker-compose.prod.yml logs worker
# Look for "Starting background workers" message
```

**Out of memory:**
```bash
docker stats

# Increase limits in docker-compose.prod.yml under deploy.resources.limits
# Restart: docker compose -f docker-compose.prod.yml restart backend
```

---

## Performance Tuning

### Resource Allocation (docker-compose.prod.yml)
```yaml
backend:
  deploy:
    resources:
      limits:      # Hard limit (OOM if exceeded)
        cpus: '2'
        memory: 2.5G
      reservations: # Guaranteed availability
        cpus: '1'
        memory: 1.5G
```

**Recommendations:**
- **Backend**: 2 CPU, 2-3GB RAM (handles ~1000 req/sec)
- **Worker**: 1-2 CPU, 1-1.5GB RAM (scales horizontally)
- **Redis**: 0.5 CPU, 512MB RAM
- **Frontend**: 0.5-1 CPU, 256-512MB RAM

### Database
```bash
# Check SQLite file size
docker compose -f docker-compose.prod.yml exec backend ls -lh /app/data/prod.db

# Optimize (defragment)
docker compose -f docker-compose.prod.yml exec backend sqlite3 /app/data/prod.db "PRAGMA optimize;"
```

---

## Backup & Restore

### Backup Database
```bash
# Inside container
docker compose -f docker-compose.prod.yml exec backend pnpm run backup-db

# Via host
docker compose -f docker-compose.prod.yml exec backend cat /app/data/prod.db > backup-$(date +%Y%m%d).db
```

### Backup Redis
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE
# Copies /data/dump.rdb to host volume: docker volume inspect atlas-network_redis_data
```

### Restore
```bash
# Database: Copy .db file back to /app/data/prod.db
docker cp backup-20240101.db atlas-backend-prod:/app/data/prod.db

# Redis: Restore dump.rdb volume
docker compose -f docker-compose.prod.yml stop redis
docker volume rm atlas-network_redis_data
docker cp dump.rdb $(docker volume inspect -f '{{.Mountpoint}}' atlas-network_redis_data)
docker compose -f docker-compose.prod.yml up -d redis
```

---

## Security Checklist

- [ ] Secrets in `.env.production` (never in image/git)
- [ ] HTTPS enabled (add TLS certs volume to frontend)
- [ ] Firewall: Only expose 80/443 (not 3001, 6379, 9090)
- [ ] Database: Disable network access (local volume only)
- [ ] Worker: No external ports exposed
- [ ] Rate limiting: Enabled in backend (default: 100 req/min)
- [ ] CORS: Configured for frontend domain only
- [ ] Logs: Monitored for suspicious activity

---

## Scaling Beyond Single-Host

For production at scale, migrate to:

1. **Managed Services** (Recommended):
   - Database: Turso, Neon, AWS RDS
   - Redis: AWS ElastiCache, Azure Cache
   - Container Registry: Docker Hub, AWS ECR
   - Orchestration: AWS ECS, DigitalOcean App Platform

2. **Kubernetes** (if >10GB RAM needed):
   - Use docker-compose.prod.yml as reference
   - Create Helm charts for templating
   - Use PersistentVolumeClaims for data

3. **Docker Swarm** (lightweight alternative):
   - `docker stack deploy`
   - Service constraints for worker placement
   - Manual rollback support

---

## CI/CD Integration

Your GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:
- Builds frontend/backend/worker images on `main` push
- Pushes to Docker Hub with semantic versioning
- Caches layers via GitHub Actions
- Runs E2E tests before build

To enable:
1. Add `secrets.DOCKER_USERNAME` and `secrets.DOCKER_PASSWORD` to GitHub
2. Push to `main` branch
3. Images auto-publish as `docker.io/your-username/atlas-{frontend,backend,worker}:latest`

---

## Convenience Scripts

```bash
# Start development
./scripts/docker/docker.sh start-dev

# Start production with observability
./scripts/docker/docker.sh start-prod --with-observability

# View logs
./scripts/docker/docker.sh logs backend

# Restart service
./scripts/docker/docker.sh restart worker docker-compose.prod.yml

# Pre-deployment checks
./scripts/docker/pre-deploy-check.sh

# Clean volumes
./scripts/docker/docker.sh clean docker-compose.prod.yml
```

---

## Resources

- Docker Docs: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose
- Fastify: https://fastify.dev
- BullMQ: https://docs.bullmq.io
- SQLite: https://www.sqlite.org/cli.html
