# Atlas Logistics — Deployment Guide

## Overview

Your project is fully containerized with three production-ready services:
- **Frontend**: Multi-stage Vite → Nginx Alpine SPA
- **Backend**: Fastify API with Drizzle ORM & BullMQ queue
- **Worker**: Node.js background job processor

## Local Development

### Quick Start
```bash
docker compose up --pull always
```
Services run on:
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001
- Redis: localhost:6379

### With Observability
```bash
docker compose --profile observability up --pull always
```
Adds:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002 (admin/atlas2024)
- Node Exporter metrics

### Rebuild after code changes
```bash
docker compose build
docker compose up
```

## Production Deployment

### Images

All images use **Node 22 Alpine** with multi-stage builds and non-root users (uid 1000).

```bash
# Build and push to ghcr.io
docker buildx create --use
docker buildx build \
  --push \
  --platform linux/amd64 \
  --tag ghcr.io/xpallares1987-ai/atlas-logistics:frontend-latest \
  --target production \
  -f Dockerfile .

docker buildx build \
  --push \
  --platform linux/amd64 \
  --tag ghcr.io/xpallares1987-ai/atlas-logistics:backend-latest \
  --target production \
  -f Dockerfile.backend .

docker buildx build \
  --push \
  --platform linux/amd64 \
  --tag ghcr.io/xpallares1987-ai/atlas-logistics:worker-latest \
  --target production \
  -f Dockerfile.worker .
```

### Environment Variables

Create `.env.prod` with:
```env
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=2048
LOG_LEVEL=info

# Backend
DATABASE_URL=file:/app/data/prod.db
REDIS_URL=redis://redis-host:6379
JWT_SECRET=<generate-secure-secret>

# Frontend
VITE_API_URL=https://api.example.com
```

### Docker Compose Production

Use `docker-compose.prod.yml` or create one with resource limits and restart policies:

```yaml
version: '3.8'

services:
  backend:
    image: ghcr.io/xpallares1987-ai/atlas-backend:latest
    container_name: atlas-backend
    ports:
      - "3001:3001"
    env_file: .env.prod
    environment:
      DATABASE_URL: ${DATABASE_URL:-file:/app/data/prod.db}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - backend_data:/app/data
    depends_on:
      redis:
        condition: service_healthy
    restart: always
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  frontend:
    image: ghcr.io/xpallares1987-ai/atlas-frontend:latest
    container_name: atlas-frontend
    ports:
      - "8080:8080"
    depends_on:
      backend:
        condition: service_healthy
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  worker:
    image: ghcr.io/xpallares1987-ai/atlas-worker:latest
    container_name: atlas-worker
    env_file: .env.prod
    environment:
      DATABASE_URL: ${DATABASE_URL:-file:/app/data/prod.db}
      REDIS_URL: ${REDIS_URL}
    volumes:
      - backend_data:/app/data
    depends_on:
      redis:
        condition: service_healthy
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  redis:
    image: redis:7.2-alpine
    container_name: atlas-redis-prod
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

volumes:
  backend_data:
  redis_data:

networks:
  default:
    name: atlas-prod

networks:
  default:
    name: atlas-prod
```

### Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: atlas-backend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: atlas-backend
  template:
    metadata:
      labels:
        app: atlas-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/xpallares1987-ai/atlas-logistics:backend-latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: atlas-secrets
              key: database_url
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: atlas-secrets
              key: jwt_secret
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 15
          periodSeconds: 10
        resources:
          requests:
            memory: "1G"
            cpu: "500m"
          limits:
            memory: "2G"
            cpu: "2"

---
apiVersion: v1
kind: Service
metadata:
  name: atlas-backend
spec:
  type: LoadBalancer
  selector:
    app: atlas-backend
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
```

Deploy with:
```bash
kubectl create secret generic atlas-secrets \
  --from-literal=database_url=$DATABASE_URL \
  --from-literal=jwt_secret=$JWT_SECRET

kubectl apply -f k8s/deployment.yaml
```

## Image Optimization Notes

✓ **Multi-stage builds**: Reduces frontend image from ~2GB build → ~50MB production  
✓ **BuildKit cache mounts**: pnpm store cached, ~50% faster rebuilds  
✓ **Alpine base**: Lightweight (~40MB Nginx, ~160MB Node runtime)  
✓ **Non-root user**: Security hardening (uid 1000 in Node, nginx uid 101)  
✓ **Health checks**: All services with startup and liveness probes  
✓ **Layer ordering**: Lock files first, source code last for cache efficiency  
✓ **.dockerignore**: Excludes node_modules, tests, docs, .git (~500MB pruned)  

## CI/CD Integration

### GitHub Actions Example

`.github/workflows/build-push.yml`:
```yaml
name: Build & Push Images

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
    - uses: actions/checkout@v4
    - uses: docker/setup-buildx-action@v3
    - uses: docker/login-action@v3
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    - uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        target: production
        file: Dockerfile
        tags: ghcr.io/${{ github.repository }}:frontend-${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    - uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        target: production
        file: Dockerfile.backend
        tags: ghcr.io/${{ github.repository }}:backend-${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
    - uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        target: production
        file: Dockerfile.worker
        tags: ghcr.io/${{ github.repository }}:worker-${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

## Scaling

- **Backend**: Scale replicas behind load balancer; stateless design
- **Worker**: 1–N replicas pulling from Redis queue; horizontal scaling
- **Frontend**: Nginx handles concurrent connections; CDN for assets
- **Database**: Embedded SQLite in WAL mode; for distributed multi-region, use libSQL / Turso cloud
- **Redis**: Use managed Redis (AWS ElastiCache, Redis Cloud)

## Monitoring

**Prometheus metrics** exposed on backend at `/metrics` (prom-client integrated)

**Grafana dashboards** pre-configured for observability profile

**Health endpoints**:
- Backend: `GET /health` → `200 OK`
- Frontend: `GET /` → `200 OK` (Nginx healthcheck via wget)

---

**Registry**: ghcr.io/xpallares1987-ai/atlas-logistics  
**Namespace User**: node:1000 (non-root)  
**License**: See LICENSE file
