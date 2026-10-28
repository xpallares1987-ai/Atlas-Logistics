# Docker Setup Guide for Atlas Logistics

This guide walks you through setting up and running the Atlas Logistics application using Docker.

## Quick Start (Development)

### 1. Setup Environment Variables

```bash
# Create .env.local from the template (or run setup script)
bash scripts/docker-setup.sh dev
```

Or manually:
```bash
cp .env.local.example .env.local
```

### 2. Build and Run

```bash
# Start all services (backend, frontend, Redis)
docker compose up --pull always

# In another terminal, follow logs
docker compose logs -f backend
```

Access the application:
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/docs
- **Redis**: localhost:6379

### 3. Common Development Commands

```bash
# Stop all services
docker compose down

# Rebuild images
docker compose build

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Clean up (remove volumes)
docker compose down -v

# Run with observability stack (Prometheus + Grafana)
docker compose --profile observability up -d
# Grafana: http://localhost:3002 (admin/atlas2024)
# Prometheus: http://localhost:9090
```

---

## Production Setup

### 1. Generate Production Secrets

```bash
# Automated setup with generated secrets
bash scripts/docker-setup.sh prod

# Secrets are generated and saved to:
# - .env.production (loaded by docker compose)
# - .secrets/production-secrets.txt (keep in safe location!)
```

Or manually:

```bash
# Generate secure secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For COOKIE_SECRET
openssl rand -hex 32  # For REDIS_PASSWORD
openssl rand -hex 32  # For GRAFANA_ADMIN_PASSWORD

# Copy and edit
cp .env.production.example .env.production

# Edit .env.production with your values and domain URLs
nano .env.production
```

### 2. Update Configuration

Edit `.env.production` and update:

```bash
# Set your production domain
VITE_API_URL=https://api.yourdomain.com
PROMETHEUS_EXTERNAL_URL=https://monitoring.yourdomain.com
GRAFANA_EXTERNAL_URL=https://monitoring.yourdomain.com
```

### 3. Build and Deploy

```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Start production stack
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f backend
```

Access:
- **Frontend**: http://your-server (or https via reverse proxy)
- **API**: http://your-server/api
- **Grafana**: http://your-server:3002
- **Prometheus**: http://your-server:9090

### 4. Production Best Practices

#### Use Docker Secrets (for Swarm)

```bash
# Create secrets from files
docker secret create jwt_secret - < .secrets/jwt_secret.txt
docker secret create redis_password - < .secrets/redis_password.txt
docker secret create grafana_password - < .secrets/grafana_password.txt

# Reference in docker-compose.prod.yml:
# secrets:
#   - jwt_secret
#   - redis_password
# 
# environment:
#   JWT_SECRET_FILE: /run/secrets/jwt_secret
```

#### Use Kubernetes Secrets (for K8s)

```bash
# Create namespace and secrets
kubectl create namespace atlas
kubectl create secret generic atlas-secrets \
  --from-literal=jwt-secret=$(openssl rand -hex 32) \
  --from-literal=redis-password=$(openssl rand -hex 32) \
  -n atlas

# Reference in Kubernetes manifests:
# valueFrom:
#   secretKeyRef:
#     name: atlas-secrets
#     key: jwt-secret
```

#### Setup HTTPS/TLS

Use a reverse proxy (Nginx, Caddy, Traefik) to:
1. Terminate TLS/SSL
2. Forward traffic to http://localhost:8080
3. Add security headers

Example Nginx config:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Enable Logging & Monitoring

```bash
# View container logs
docker compose -f docker-compose.prod.yml logs --tail 100

# Stream logs
docker compose -f docker-compose.prod.yml logs -f

# Check service health
docker compose -f docker-compose.prod.yml ps

# Monitor resource usage
docker stats
```

#### Backup Data

```bash
# Backup SQLite database
docker cp atlas-backend-prod:/data/prod.db ./backups/prod-$(date +%Y%m%d).db

# Backup Redis
docker exec atlas-redis-prod redis-cli BGSAVE
docker cp atlas-redis-prod:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb
```

---

## Environment Variables Reference

### Development (.env.local)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Node environment |
| `DATABASE_URL` | `file:./data/dev.db` | SQLite database path |
| `REDIS_URL` | `redis://redis:6379` | Redis connection |
| `JWT_SECRET` | `dev-secret-...` | JWT signing key |
| `VITE_API_URL` | `http://localhost:3001` | Frontend API endpoint |
| `GRAFANA_ADMIN_PASSWORD` | `atlas2024` | Grafana admin password |

### Production (.env.production)

| Variable | Purpose | Required |
|----------|---------|----------|
| `NODE_ENV` | Must be `production` | Yes |
| `DATABASE_URL` | SQLite or libSQL URL | Yes |
| `JWT_SECRET` | Strong random secret (32 bytes) | Yes |
| `REDIS_PASSWORD` | Strong random password (32 bytes) | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `VITE_API_URL` | Production API domain | Yes |
| `GRAFANA_ADMIN_PASSWORD` | Strong random password (32 bytes) | Yes |

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or run on different port
docker compose up -p 8001:3001
```

### Database Issues

```bash
# Reset development database
docker compose down -v
docker compose up

# Check database file
ls -lah data/dev.db
```

### Out of Memory

```bash
# Increase Docker memory limit
docker update --memory 4g atlas-backend-dev

# Or check resource usage
docker stats
```

### Containers Won't Start

```bash
# Check logs
docker compose logs backend

# Inspect container
docker inspect atlas-backend-dev

# Recreate
docker compose down
docker compose up --build
```

---

## File Structure

```
.
├── docker-compose.yml                # Development config (loads .env.local)
├── docker-compose.prod.yml           # Production config (loads .env.production)
├── Dockerfile                        # Frontend build (Nginx)
├── Dockerfile.backend                # Backend build (Node.js)
├── docker/nginx.conf                 # Nginx config
├── .env.local                        # Dev env vars (auto-loaded)
├── .env.local.example                # Dev template
├── .env.production                   # Prod env vars (auto-loaded)
├── .env.production.example           # Prod template
├── scripts/docker-setup.sh           # Setup helper script
└── data/                             # Volume mounts
    ├── dev.db                        # SQLite database (dev)
    ├── prod.db                       # SQLite database (prod)
    ├── redis/                        # Redis data
    ├── prometheus/                   # Prometheus data
    └── grafana/                      # Grafana data
```

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. View container logs: `docker compose logs [service]`
3. Run `docker compose ps` to verify all services are running
4. Ensure `.env.local` or `.env.production` exists and has correct values
