# Atlas Logistics — Docker Quick Start

## 🚀 One-Minute Setup

### Development

```bash
# 1. Generate environment file
bash scripts/docker-setup.sh dev

# 2. Start containers
docker compose up --pull always

# 3. Access the app
#    Frontend: http://localhost:8080
#    API: http://localhost:3001/docs
```

### Production

```bash
# 1. Generate secrets and .env.production
bash scripts/docker-setup.sh prod

# 2. Edit .env.production with your domain
nano .env.production

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📋 Common Commands

### Development

```bash
docker compose up                                # Start all services
docker compose down                              # Stop all services
docker compose logs -f backend                   # Watch backend logs
docker compose build                             # Rebuild images
docker compose --profile observability up        # Add monitoring (Grafana)
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d                # Start
docker compose -f docker-compose.prod.yml down                 # Stop
docker compose -f docker-compose.prod.yml logs -f backend      # Logs
docker compose -f docker-compose.prod.yml ps                   # Status
```

### Utilities

```bash
docker ps                                        # List running containers
docker stats                                     # View resource usage
docker exec atlas-backend-dev bash               # Shell into container
docker system prune                              # Clean up
```

---

## 🔐 Environment Variables

### Development (.env.local)
- Auto-created with `bash scripts/docker-setup.sh dev`
- Contains safe defaults for local development
- Never commit to git

### Production (.env.production)
- Auto-created with `bash scripts/docker-setup.sh prod` (generates secrets)
- Loaded by `docker-compose.prod.yml`
- Update domain URLs before deploying
- Never commit to git

---

## 📊 Service Ports

| Service | Dev Port | Purpose |
|---------|----------|---------|
| Frontend | 8080 | Web UI |
| Backend | 3001 | API / WebSockets |
| Redis | 6379 | Cache / Queues |
| Prometheus | 9090 | Metrics (optional) |
| Grafana | 3002 | Dashboards (optional) |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | `docker ps` to find container, `docker stop <id>` |
| Container fails to start | `docker logs <container>` to see errors |
| No database | `docker compose down -v` then `docker compose up` |
| Out of memory | Increase Docker memory in settings |
| `.env` not loading | Ensure file exists in project root |

---

## 📚 Documentation

- **Full Guide**: See `DOCKER_SETUP_GUIDE.md`
- **Dockerfiles**: `Dockerfile` (frontend), `Dockerfile.backend` (backend)
- **Compose Config**: `docker-compose.yml` (dev), `docker-compose.prod.yml` (prod)

---

## ✅ Checklist Before Production

- [ ] Run `bash scripts/docker-setup.sh prod`
- [ ] Update `VITE_API_URL` in `.env.production`
- [ ] Update `PROMETHEUS_EXTERNAL_URL` in `.env.production`
- [ ] Update `GRAFANA_EXTERNAL_URL` in `.env.production`
- [ ] Backup `.secrets/production-secrets.txt` to secure location
- [ ] Enable HTTPS/TLS on reverse proxy
- [ ] Test health checks: `docker compose -f docker-compose.prod.yml ps`
- [ ] Setup database backups
- [ ] Configure log rotation
- [ ] Monitor with `docker stats` and Grafana

---

Generated: Atlas Logistics Docker Configuration
