# Atlas Logistics — Docker Quick Reference

## 🚀 Getting Started (30 seconds)

```bash
# Development (auto-reload everything)
./scripts/docker/docker.sh start-dev
pnpm run dev

# Production (single-host deployment)
./scripts/docker/docker.sh start-prod --with-observability
```

## 📁 Docker Files Structure

```
atlas-logistics/
├── Dockerfile                  # Frontend (SPA builder + Nginx)
├── Dockerfile.backend          # Backend API (5-stage optimized)
├── Dockerfile.worker           # Background jobs (BullMQ, OCR, AI)
├── docker-compose.yml          # Development (hot-reload)
├── docker-compose.prod.yml     # Production (with worker + observability)
├── .dockerignore               # Optimized build context
├── docker/
│   └── nginx.conf              # Frontend reverse proxy + security
├── scripts/docker/
│   ├── docker.sh               # Convenience CLI
│   └── pre-deploy-check.sh     # Pre-deployment validation
├── .env.production             # Production secrets template
├── DEPLOYMENT_DOCKER.md        # Comprehensive guide (550+ lines)
└── DOCKER_IMPROVEMENTS_SUMMARY.md  # This overview
```

## 🎯 Quick Commands

### Development
```bash
./scripts/docker/docker.sh start-dev      # Bootstrap (Redis + DB)
pnpm run dev                              # Auto-reload backend + frontend
./scripts/docker/docker.sh logs backend   # Stream logs
./scripts/docker/docker.sh shell backend  # Enter container
./scripts/docker/docker.sh stop           # Cleanup
```

### Production
```bash
# 1. Setup
cp .env.production.example .env.production
# 2. Validate
./scripts/docker/pre-deploy-check.sh
# 3. Deploy
./scripts/docker/docker.sh start-prod --with-observability
# 4. Monitor
docker compose -f docker-compose.prod.yml logs -f
```

### Scaling
```bash
# Run 5 worker instances in parallel
docker compose -f docker-compose.prod.yml up -d --scale worker=5

# View status
docker compose -f docker-compose.prod.yml ps
```

## 🏗️ What's Running?

| Service | Port | Purpose | Image Size |
|---------|------|---------|-----------|
| **Frontend** | 80/8080 | Nginx SPA + API proxy | 80MB |
| **Backend** | 3001 | Fastify REST API | 300MB |
| **Worker** | — | Background jobs | 300MB |
| **Redis** | 6379 | Queue & cache | 40MB |
| **Prometheus** | 9090 | Metrics (optional) | 200MB |
| **Grafana** | 3002 | Dashboards (optional) | 300MB |

## 🔐 Environment Setup

**Development** (`.env.local`):
```env
DATABASE_URL=file:./data/dev.db
REDIS_URL=redis://redis:6379
NODE_ENV=development
```

**Production** (`.env.production`):
```env
DATABASE_URL=file:./data/prod.db
REDIS_URL=redis://redis:6379
JWT_SECRET=<32+ char random>           # openssl rand -base64 32
COOKIE_SECRET=<32+ char random>        # openssl rand -base64 32
GRAFANA_ADMIN_PASSWORD=<strong pwd>
NODE_ENV=production
```

## 📊 Resource Allocation (Production)

```yaml
frontend:
  limits: { cpus: '1', memory: '512M' }
backend:
  limits: { cpus: '2', memory: '2.5G' }
worker:
  limits: { cpus: '1.5', memory: '1.5G' }
redis:
  limits: { cpus: '1', memory: '768M' }
```

**Adjust based on your server capacity.** Default = ~5GB total.

## 🔍 Troubleshooting

**Backend won't start?**
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml exec backend pnpm run db:migrate
```

**Redis disconnected?**
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Expected: PONG
```

**Worker not processing jobs?**
```bash
docker compose -f docker-compose.prod.yml logs worker | grep "Starting background"
```

**Out of memory?**
```bash
docker stats                          # Monitor in real-time
docker compose -f docker-compose.prod.yml restart backend  # Restart service
# Then increase memory limits in docker-compose.prod.yml
```

## 🆘 Emergency Commands

```bash
# Restart everything
docker compose -f docker-compose.prod.yml restart

# Hard reset (DESTRUCTIVE)
docker compose -f docker-compose.prod.yml down -v

# View all container processes
docker compose -f docker-compose.prod.yml ps

# Inspect network
docker network inspect atlas-network

# View volume data
docker volume ls
docker volume inspect atlas-network_redis_data
```

## 📝 Security Checklist

- [ ] JWT_SECRET is 32+ random chars (not placeholder)
- [ ] .env.production is in .gitignore
- [ ] Firewall blocks 3001, 6379, 9090 (internal only)
- [ ] HTTPS enabled with valid TLS certs
- [ ] Database backups automated
- [ ] Logs monitored for errors

## 🚄 Performance Tips

1. **Faster builds**: Use BuildKit with `DOCKER_BUILDKIT=1 docker build`
2. **Layer caching**: Copy `package.json` before `src/` in Dockerfile
3. **Image size**: Use `docker inspect` to see layer sizes
4. **Memory**: Monitor with `docker stats`
5. **Disk space**: Run `docker system prune` monthly

## 🔗 Related Files

- **Full guide**: `DEPLOYMENT_DOCKER.md` (550+ lines)
- **Summary**: `DOCKER_IMPROVEMENTS_SUMMARY.md`
- **Nginx config**: `docker/nginx.conf` (gzip, headers, SPA routing)
- **CI/CD**: `.github/workflows/ci.yml` (auto-build on main)

## 📚 External Resources

- Docker: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose/
- Fastify: https://fastify.dev
- BullMQ: https://docs.bullmq.io
- Nginx: https://nginx.org/en/docs/

---

**Questions?** Check `DEPLOYMENT_DOCKER.md` or run:
```bash
./scripts/docker/docker.sh help
```
