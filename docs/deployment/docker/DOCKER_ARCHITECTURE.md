# Atlas Logistics — Docker Architecture & Deployment Models

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      END USER / CLIENT                            │
└────────────────────────┬─────────────────────────────────────────┘
                         │ HTTP/HTTPS (:80/:443)
                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  NGINX (Frontend)                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • SPA (index.html)                                         │ │
│  │ • Static assets (JS/CSS/IMG) — cached 1 year              │ │
│  │ • Gzip compression                                         │ │
│  │ • Security headers (CSP, X-Frame, etc.)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  • Reverse proxy: /api/* → Backend (:3001)                   │
│  • WebSocket upgrade: /api/ws → Backend                      │
│  • Swagger docs: /docs → Backend                             │
└────────────────────────┬─────────────────────────────────────────┘
                         │ (Internal Docker network)
        ┌────────────────┼────────────────┬──────────────────┐
        ▼                ▼                ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   BACKEND    │  │    WORKER    │  │    REDIS     │  │   SQLITE     │
│   (Fastify)  │  │  (BullMQ)    │  │  (Cache/Q)   │  │  (Database)  │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ :3001        │  │ No ports     │  │ :6379        │  │ /app/data/   │
│              │  │              │  │              │  │              │
│ • REST API   │  │ • AI parsing │  │ • Job queue  │  │ • Tables     │
│ • WebSocket  │  │ • OCR        │  │ • Cache      │  │ • Persisted  │
│ • JWT auth   │  │ • PDF gen    │  │ • AOF log    │  │   on volume  │
│ • Rate limit │  │ • Graceful   │  │ • RDB snap   │  │              │
│ • Metrics    │  │   shutdown   │  │ • Memory LRU │  │              │
│              │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
     │                   │                ▲                   │
     └───────────────────┴────────────────┼───────────────────┘
                                          │
                         ┌────────────────┘
                         │
                Optional Observability Stack (--profile observability)
                         │
        ┌────────────────┼────────────────┬──────────────────┐
        ▼                ▼                ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ PROMETHEUS   │  │   GRAFANA    │  │ NODE EXPORTER│  │   DASHBOARDS │
│  :9090       │  │   :3002      │  │   :9100      │  │              │
│              │  │              │  │              │  │ • CPU/Mem    │
│ • Metrics    │  │ • Dashboards │  │ • Host stats │  │ • Requests   │
│   collection │  │ • Alerting   │  │ • Processes  │  │ • Queues     │
│ • Time-series│  │ • GraphQL API│  │ • Network    │  │ • Database   │
│   DB         │  │              │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

## 🎯 Deployment Models

### Model 1: LOCAL DEVELOPMENT (Recommended for dev)
```
Developer's Machine
├─ Docker Daemon (running)
├─ docker-compose.yml
├─ Services:
│  ├─ Redis (port 6379)
│  ├─ Backend (port 3001, hot-reload via tsx watch)
│  ├─ Frontend (port 5173, Vite dev server)
│  └─ Volumes: ./src → /app/src (synced in real-time)
└─ Browser: http://localhost:5173
  └─ Connects to backend http://localhost:3001

✓ Fast feedback loop (~50ms reload)
✓ Full debugging capabilities
✓ No image builds needed
```

### Model 2: SINGLE-HOST PRODUCTION (Docker Compose)
```
Production Server (1 VM / 1 Machine)
├─ Docker Engine
├─ docker-compose.prod.yml
├─ Services:
│  ├─ Frontend (Nginx, port 80/443)
│  ├─ Backend (port 3001, internal)
│  ├─ Worker (no port, background)
│  ├─ Redis (port 6379, internal)
│  └─ SQLite (volumes: /app/data/prod.db)
└─ Volumes (persistent):
   ├─ backend_data → sqlite database
   ├─ redis_data → snapshots + AOF
   └─ prometheus_data (optional)

✓ Single command deployment: docker compose up
✓ Auto-restart on failure
✓ Resource limits prevent OOM
✓ All logs available
✗ No horizontal scaling
✗ Single point of failure (one server)

Best for: MVP, teams < 10, < 1000 req/sec
```

### Model 3: DOCKER SWARM (Multi-Machine Clustering)
```
Docker Swarm Cluster (3+ nodes)
├─ Manager Node (1)
├─ Worker Nodes (2+)
└─ Services (distributed):
   ├─ Frontend x2 (load balanced)
   ├─ Backend x3 (load balanced)
   ├─ Worker x5 (auto-scaled)
   ├─ Redis x1 (on dedicated node)
   └─ SQLite x1 (on manager)

Command:
  docker swarm init
  docker stack deploy -c docker-compose.prod.yml atlas

✓ Built-in load balancing
✓ Auto-failover to other nodes
✓ Rolling updates
✗ Manual cluster setup
✗ Limited orchestration features

Best for: Teams with infrastructure expertise
```

### Model 4: KUBERNETES (Advanced)
```
Kubernetes Cluster (3+ nodes)
├─ Master/Control Plane
├─ Worker Nodes (2+)
├─ Deployments:
│  ├─ Frontend (Deployment, replicas: 2)
│  ├─ Backend (Deployment, replicas: 3)
│  ├─ Worker (Deployment, replicas: 5)
│  ├─ Redis (StatefulSet, PVC)
│  └─ SQLite (ConfigMap + PVC)
├─ Services:
│  ├─ Frontend (LoadBalancer)
│  ├─ Backend (ClusterIP)
│  └─ Redis (ClusterIP)
└─ Storage: PersistentVolumeClaims

Example manifests (reference docker-compose.prod.yml):
  - deployment-frontend.yaml
  - deployment-backend.yaml
  - deployment-worker.yaml
  - statefulset-redis.yaml
  - pvc-data.yaml

✓ Industry standard
✓ Maximum scalability
✓ Auto-scaling (HPA)
✓ Self-healing
✗ Steep learning curve
✗ Complex setup

Best for: Enterprise, > 100k req/day, team > 20
```

### Model 5: MANAGED SERVICES (Recommended for Production)
```
Multi-region Setup
├─ Frontend
│  └─ Cloudflare / AWS CloudFront (CDN)
│     └─ Nginx container → Docker Hub Registry
├─ Backend
│  └─ AWS ECS / Google Cloud Run
│     ├─ Auto-scaling groups
│     └─ Load balancer
├─ Database
│  └─ Turso (SQLite cloud) / AWS RDS
│     └─ Automatic backups + replication
├─ Redis
│  └─ AWS ElastiCache / Azure Cache
│     └─ Cluster mode, replication
└─ Observability
   └─ Datadog / New Relic / CloudWatch

✓ Zero infrastructure management
✓ Auto-scaling + CDN
✓ Global redundancy
✓ Automated backups
✗ Vendor lock-in
✗ Higher costs

Best for: Scaling fast, no ops team available
```

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Client (Browser)                                        │
│ [Request: GET /api/shipments]                          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/1.1
                         ▼
┌─────────────────────────────────────────────────────────┐
│ NGINX (Reverse Proxy)                                   │
│ 1. Check cache (Redis via X-Cache-Key header)         │
│ 2. Route to backend: proxy_pass http://api:3001/...   │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/1.1 (internal docker network)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Fastify Backend (3001)                                  │
│ 1. Parse JWT token (verify sig against JWT_SECRET)    │
│ 2. Rate limiter (10 req/sec per IP)                    │
│ 3. Route handler (GET /shipments)                      │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼ (read)         ▼ (query)        ▼ (publish)
    ┌──────────┐   ┌──────────┐      ┌──────────┐
    │  SQLite  │   │  Redis   │      │  Redis   │
    │  (Query) │   │ (Cache)  │      │ (PubSub) │
    └──────────┘   └──────────┘      └────┬─────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Worker Node  │
                                    │ (Listening)  │
                                    └──────────────┘
                                           │
                                           ▼
                                    [Async Job]
                                    (AI Parsing)

Response Path (Reverse):
Fastify → Cache in Redis → NGINX → Client
```

## 🚀 Service Scaling Strategy

### Horizontal Scaling (Add more instances)

```bash
# Single host (limited by CPU/RAM)
docker compose -f docker-compose.prod.yml up -d --scale worker=5
# Runs 5 worker containers on same machine

# Multi-host (recommended)
# Machine A: Backend x2 + Worker x3
# Machine B: Backend x2 + Worker x3
# Shared: Redis (managed service), SQLite (managed DB)

docker-machine create prod-1
docker-machine create prod-2
docker swarm init  # on prod-1
docker swarm join --token ... prod-2
```

### Vertical Scaling (Bigger machine)

```yaml
# Increase resource limits (docker-compose.prod.yml)
backend:
  deploy:
    resources:
      limits:
        cpus: '4'      # was 2
        memory: 4G     # was 2.5G
```

### Cache Layer Optimization

```
Without Cache:
Client → NGINX → Backend → SQLite
  Latency: 100-500ms
  SQLite load: 50 queries/sec (bottleneck)

With Cache:
Client → NGINX → Redis ← Backend (populate on write)
  Latency: 5-50ms
  SQLite load: 5 queries/sec
```

## 📊 Typical Resource Usage

```
Memory (per service):
├─ Frontend: 50-100MB (Nginx, light)
├─ Backend: 300-800MB (Node.js, deps)
├─ Worker: 300-600MB (Node.js, background)
├─ Redis: 100-500MB (depends on data size)
└─ Prometheus (optional): 200-500MB

CPU (per service):
├─ Frontend: < 5% idle, 20% peak
├─ Backend: 10-30% normal, 80% peak (no caching)
├─ Worker: 5-15% (job dependent)
├─ Redis: < 5% (memory-based, fast)
└─ Total: 1-4 CPUs recommended

Disk:
├─ Images: 80MB (frontend) + 300MB (backend) + 40MB (redis)
├─ Data: 100MB-10GB (SQLite size)
├─ Logs: 10-100MB/day (depends on log level)
└─ Total: 20GB recommended for production
```

## 🔐 Network Isolation

```
Internet Layer (Public)
  ↓ (TLS/HTTPS :443)
┌─────────────────┐
│ Load Balancer   │ (optional, managed)
└────────┬────────┘
         │ (HTTP :80 → :8080)
         ▼
┌─────────────────────────────────────────────────────────┐
│ Docker Network (atlas-network - bridge driver)         │
│ ✓ Internal only (no external access)                    │
├──────────────────────────────────────────────────────────┤
│ NGINX (published :8080)                                 │
│   ↓ (DNS: backend:3001)                                │
│ Backend (NOT published, internal only)                 │
│   ↓ (DNS: redis:6379)                                  │
│ Redis (NOT published, internal only)                   │
│   ↓ (DNS: sqlite:/app/data/prod.db)                    │
│ SQLite (local volume only)                             │
└─────────────────────────────────────────────────────────┘

Benefits:
✓ Only NGINX exposed to internet
✓ Backend cannot be accessed directly
✓ Redis password not needed (internal network)
✓ Services find each other via DNS names
```

---

**For detailed deployment instructions, see `DEPLOYMENT_DOCKER.md`**

