# Atlas Logistics — Deployment Checklist

## Pre-Deployment

- [ ] All Dockerfiles are built and tested locally
- [ ] `.env.production` is created (copy from `.env.production.example` and fill secrets)
- [ ] `.env.production` is added to `.gitignore` (never commit secrets)
- [ ] GitHub PAT or secrets are configured for `GITHUB_TOKEN` CI/CD access
- [ ] Container registry credentials are set up (ghcr.io automatic via GITHUB_TOKEN)

## Build & Push (CI/CD via GitHub Actions)

- [ ] Push to `main` branch triggers `.github/workflows/docker-build.yml`
- [ ] All three images built: `frontend-latest`, `backend-latest`, `worker-latest`
- [ ] Images tagged with git SHA for rollback: `frontend-<sha>`, etc.
- [ ] Trivy security scan runs and results uploaded to GitHub Security tab
- [ ] All images pushed to `ghcr.io/xpallares1987-ai/atlas-logistics:*`

## Deployment (Single Host with Docker Compose)

```bash
# On production host, clone the repo
git clone https://github.com/xpallares1987-ai/atlas-logistics.git
cd atlas-logistics

# Create production env file
cp .env.production.example .env.production
# Edit .env.production with actual secrets:
#   - DATABASE_URL (e.g. file:/app/data/prod.db or libsql://...)
#   - JWT_SECRET (generate new 32+ char hex)
#   - COOKIE_SECRET (generate new 32+ char hex)
#   - GRAFANA_ADMIN_PASSWORD

# Ensure .env.production is NOT committed
git check-ignore .env.production  # Should return .env.production

# Deploy services
docker compose -f docker-compose.prod.yml up -d

# Verify services are running
docker compose -f docker-compose.prod.yml ps

# Check health
docker compose -f docker-compose.prod.yml logs backend | grep health
docker compose -f docker-compose.prod.yml logs frontend | grep health

# (Optional) Deploy observability stack
docker compose -f docker-compose.prod.yml --profile observability up -d
```

- [ ] Backend service healthy and responding on port 3001
- [ ] Frontend service healthy and responding on port 80/443
- [ ] Redis service healthy and accessible
- [ ] Worker service processing jobs from queue
- [ ] Database migrations applied (if needed: `docker compose exec backend pnpm run db:migrate:prod`)

## Post-Deployment Verification

```bash
# Test backend API
curl -s http://localhost:3001/health | jq .

# Test frontend
curl -s http://localhost:80/ | head -20

# Check resource usage
docker compose -f docker-compose.prod.yml stats

# Follow logs
docker compose -f docker-compose.prod.yml logs -f backend
```

- [ ] Backend responds with `{ "status": "ok" }`
- [ ] Frontend serves SPA HTML
- [ ] No OOM (Out of Memory) errors in logs
- [ ] Redis queue processing backlog < 100 jobs

## Scaling & Load Testing

- [ ] Duplicate backend service in compose for horizontal scaling
- [ ] Place load balancer (Nginx/HAProxy) in front of multiple backends
- [ ] Test with `ab` or `k6` load test:
  ```bash
  ab -n 10000 -c 100 http://localhost:3001/health
  ```

## Monitoring Setup

- [ ] Prometheus scraping metrics from backend `/metrics`
- [ ] Grafana dashboards configured and accessible on port 3002
- [ ] Create alerts for:
  - Backend service down
  - High memory usage (> 80% limit)
  - Redis queue backlog > 1000 jobs
  - Database connection pool exhausted

## Rollback Plan

```bash
# If deployment fails, rollback to previous image:
docker compose -f docker-compose.prod.yml set-image backend=ghcr.io/xpallares1987-ai/atlas-logistics:backend-<previous-sha>
docker compose -f docker-compose.prod.yml up -d backend

# Or pull previous tag:
docker pull ghcr.io/xpallares1987-ai/atlas-logistics:backend-v1.0.0
```

- [ ] Previous image tags documented and accessible
- [ ] Database backups taken before each deployment
- [ ] Rollback tested in staging first

## Maintenance

### Regular Tasks

- [ ] Docker image cleanup (remove old tags): `docker system prune -a`
- [ ] Database backups scheduled (daily)
- [ ] Log rotation configured
- [ ] Update base images monthly: `docker compose -f docker-compose.prod.yml pull`

### Security

- [ ] Secrets stored in `.env.production` (not in code)
- [ ] Images scanned for vulnerabilities (Trivy runs on every push)
- [ ] Non-root user enforced (uid 1000)
- [ ] Network policies applied (if Kubernetes)
- [ ] TLS/HTTPS enabled on frontend (cert volume mounted or reverse proxy)
- [ ] CORS properly configured in backend

### Performance Tuning

- [ ] Node `--max-old-space-size` set appropriately (2GB for backend, 1.5GB for worker)
- [ ] Redis eviction policy set to `allkeys-lru` (prevents memory runaway)
- [ ] Database connection pool tuned for workload
- [ ] Frontend caching headers configured (nginx.conf)
- [ ] CDN enabled for static assets (if applicable)

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.prod.yml logs backend --tail=50
```

### Out of Memory
```bash
docker compose -f docker-compose.prod.yml stats  # Check memory
# Increase limits in docker-compose.prod.yml
```

### Database migration issues
```bash
docker compose -f docker-compose.prod.yml exec backend pnpm run db:push
```

### Redis queue backup
```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE
```

## Disaster Recovery

- [ ] Database backup procedure documented and tested
- [ ] Redis persistence enabled (AOF + RDB)
- [ ] Separate backup storage (S3, NAS)
- [ ] Recovery test scheduled monthly

---

**Last Updated**: 2025  
**Maintainer**: @xpallares1987-ai  
**Production URL**: https://api.example.com  
**Monitoring**: https://grafana.example.com
