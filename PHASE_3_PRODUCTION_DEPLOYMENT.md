# 🚀 PHASE 3: Production Deployment

**Status:** Ready for Execution  
**Completed by Antigravity:** Phase 1.1 & Phase 2  
**Deployment Readiness:** ✅ 100%

---

## 📊 Phase 2 Results Summary

| Component | Status | Details |
|-----------|--------|---------|
| Secrets Generation | ✅ COMPLETE | 32-byte keys: JWT, Redis, Cookie, Grafana |
| Environment Isolation | ✅ SECURE | `.env.production` git-ignored, pre-commit guards active |
| Environment Validation | ✅ PASSED | 11/11 schema checks passed |
| Frontend Image | ✅ BUILT | 31 MB (nginx:alpine + static files) |
| Backend Image | ✅ BUILT | 293 MB (node:22-alpine + deps + app) |
| Docker Compose | ✅ VALIDATED | Production config validated cleanly |
| Security Audit | ✅ PASSED | 1,844 files scanned, 0 leaks |
| Local Commits | ✅ STORED | aaaacdc on main (no remote pushes) |

---

## 🎯 Phase 3 Objectives

### 3.1 Production Deployment (Choose Your Platform)
**Goal:** Deploy Atlas Logistics to production environment  
**Platforms:**
- **Option A:** Self-hosted VPS (DigitalOcean, Linode, AWS EC2, Hetzner)
- **Option B:** Managed Container Platform (Render, Railway, Heroku, Fly.io)
- **Option C:** Kubernetes Cluster (if scaling requirements)

### 3.2 Backup & Disaster Recovery Testing
**Goal:** Implement and test backup procedures  
**Deliverables:** Automated SQLite backups, recovery testing, RTO/RPO SLAs

### 3.3 Monitoring & Observability Setup
**Goal:** Deploy monitoring stack (Prometheus + Grafana)  
**Deliverables:** Dashboards, alerts, log aggregation

### 3.4 CI/CD Pipeline Configuration
**Goal:** Automate testing, building, and deployment  
**Deliverables:** GitHub Actions workflow, automated tests on push, auto-deploy on release

---

## 🌍 DEPLOYMENT PLATFORM COMPARISON

### Option A: Self-Hosted VPS (Recommended for Full Control)

**Best For:** Production apps requiring full control, custom domain, direct database access

| Aspect | Details |
|--------|---------|
| **Providers** | DigitalOcean, Linode, AWS EC2, Hetzner, Vultr |
| **Cost** | $5-20/month (entry), scales linearly |
| **Effort** | Moderate (setup OS, Docker, monitoring) |
| **Scaling** | Manual (upgrade or add instances + load balancer) |
| **Backups** | Your responsibility (but fully controlled) |
| **Uptime SLA** | Provider guarantees (99.9% typical), you operate |

**Recommended Setup:**
- VPS: 2GB RAM, 40GB SSD (~$8-12/month, DigitalOcean/Linode)
- OS: Ubuntu 22.04 LTS
- Runtime: Docker + Docker Compose
- Reverse Proxy: Nginx (for SSL/TLS termination)
- Backups: Automated via cron to S3 or local

**Pros:**
- ✅ Full control over infrastructure
- ✅ No vendor lock-in
- ✅ Direct database access
- ✅ Cost-effective for steady-state workloads

**Cons:**
- ⚠️ You manage OS updates, Docker updates, security
- ⚠️ Must set up backups, monitoring, alerting
- ⚠️ Manual scaling (horizontal scaling requires load balancer)

---

### Option B: Managed Container Platform (Recommended for Speed)

**Best For:** Quick deployment, minimal DevOps, platform manages infrastructure

| Platform | Cost | Setup Time | Features |
|----------|------|-----------|----------|
| **Render** | $5-50/month | 5 minutes | Auto deploys from git, free SSL |
| **Railway** | $5-50/month | 5 minutes | Simple UI, ephemeral deployments |
| **Fly.io** | $3-30/month | 10 minutes | Global regions, auto-scaling |
| **Heroku** | $50-500+/month | 5 minutes | Full platform, expensive post-free tier |

**Recommended Setup:** Render or Railway (best price/features balance)

**Deploy to Render Example:**
```bash
# 1. Create account at render.com
# 2. Connect GitHub repository
# 3. Create new Web Service
# 4. Configure:
#    - Runtime: Docker
#    - Docker file path: Dockerfile.backend
#    - Environment: Copy vars from .env.production
#    - Health check: /health
# 5. Deploy
```

**Pros:**
- ✅ Deploy in minutes (from git push)
- ✅ Automatic SSL/TLS
- ✅ Managed backups (depends on provider)
- ✅ Auto-scaling available
- ✅ One-command deployment

**Cons:**
- ⚠️ Less control (platform-managed)
- ⚠️ Potential vendor lock-in
- ⚠️ Can be expensive at scale
- ⚠️ Limited customization

---

### Option C: Kubernetes (For Scale & Complex Deployments)

**Best For:** Apps requiring orchestration, multi-region, complex microservices

| Aspect | Details |
|--------|---------|
| **Providers** | DigitalOcean K8s, AWS EKS, Google GKE, Azure AKS |
| **Cost** | $10-50+/month (K8s cluster) |
| **Effort** | High (requires K8s knowledge) |
| **Scaling** | Automatic (horizontal pod autoscaling) |
| **Complexity** | High (manifests, helm, operators) |

**Current Recommendation:** Not needed for Phase 3 (monolithic app, single region). Consider for Phase 4+ if scaling to 10+ microservices or multi-region.

---

## 🎯 RECOMMENDED PATH: Option A (Self-Hosted VPS)

**Why:** Full control, cost-effective, no vendor lock-in, educational value  
**Platform:** DigitalOcean or Linode ($10-12/month starter)  
**Time to Production:** 30-45 minutes

---

## 📋 DEPLOYMENT STEPS (Self-Hosted VPS)

### Step 1: Provision VPS

**DigitalOcean Example:**
1. Create account
2. Create Droplet:
   - Image: Ubuntu 22.04 LTS
   - Size: 2GB RAM, 40GB SSD ($12/month)
   - Region: Closest to users
   - Enable automatic backups ($2/month additional)
3. Note the IP address

### Step 2: Connect & Setup Docker

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
bash get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker compose --version
```

### Step 3: Clone Repository & Setup

```bash
# Create app directory
mkdir -p /opt/atlas-logistics
cd /opt/atlas-logistics

# Clone repository (assuming public; use deploy key for private)
git clone https://github.com/your-org/atlas-logistics.git .

# Copy production config
cp docker-compose.prod.yml docker-compose.yml

# Create production environment file
cat > .env.production << 'EOF'
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info

DATABASE_URL=file:/data/atlas-prod.db
JWT_SECRET=YOUR_32_BYTE_HEX_KEY_HERE
REDIS_PASSWORD=YOUR_32_BYTE_HEX_KEY_HERE
REDIS_URL=redis://redis:6379
COOKIE_SECRET=YOUR_32_BYTE_HEX_KEY_HERE

VITE_API_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com

PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=YOUR_GRAFANA_PASSWORD
EOF

# IMPORTANT: Never commit .env.production to git
# Use secure methods: scp, 1Password, LastPass, Vault, etc.
```

### Step 4: Setup SSL/TLS (Let's Encrypt)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Generate certificate (replace with your domain)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Verify certificate created
ls -lah /etc/letsencrypt/live/yourdomain.com/
```

### Step 5: Configure Reverse Proxy (Nginx)

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/atlas << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Grafana (optional, restrict access)
    location /grafana/ {
        proxy_pass http://localhost:3002/;
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 6: Start Production Services

```bash
cd /opt/atlas-logistics

# Start services
docker compose up -d

# Check status
docker compose ps

# Verify backend health
curl http://localhost:3001/health

# Check logs
docker compose logs -f backend
```

### Step 7: Verify Production Access

```bash
# Test from external machine
curl https://yourdomain.com/health
curl https://yourdomain.com/  # Should show frontend

# Check SSL certificate
openssl s_client -connect yourdomain.com:443
```

### Step 8: Configure Automatic Backups

```bash
# Create backup script
cat > /opt/atlas-logistics/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/atlas-logistics"
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp /opt/atlas-logistics/data/atlas-prod.db $BACKUP_DIR/atlas-prod-$TIMESTAMP.db
# Keep only last 30 days
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
EOF

chmod +x /opt/atlas-logistics/backup.sh

# Schedule daily backups at 2 AM
echo "0 2 * * * /opt/atlas-logistics/backup.sh" | crontab -
```

### Step 9: Enable Monitoring

```bash
# Start observability stack
docker compose --profile observability up -d

# Access Grafana
# https://yourdomain.com/grafana/
# Username: admin
# Password: (from .env.production GRAFANA_ADMIN_PASSWORD)

# Access Prometheus
# https://yourdomain.com:9090 (if exposed)
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

| Check | Command | Expected Result |
|-------|---------|-----------------|
| Frontend accessible | `curl https://yourdomain.com` | 200 OK, HTML response |
| Backend health | `curl https://yourdomain.com/api/health` | 200 OK, JSON with status |
| Database connected | Check Grafana dashboard | Query latency <5ms |
| Redis working | Check backend logs | No Redis connection errors |
| SSL valid | `openssl s_client -connect yourdomain.com:443` | Certificate valid, no warnings |
| Backups running | `ls -lah /backups/atlas-logistics/` | Files present with timestamps |
| Logs clean | `docker compose logs backend` | No error messages |
| Monitoring active | `curl http://localhost:9090/api/v1/query?query=up` | Prometheus metrics available |

---

## 🔄 PHASE 3.2: Backup & Disaster Recovery Testing

### Automated Backup Script (Cross-Platform)

**Windows PowerShell (`scripts/backup-atlas.ps1`):**
```powershell
$BackupDir = "D:\backups\atlas-logistics"
$DbPath = "D:\atlas-logistics\data\atlas-prod.db"
$Timestamp = (Get-Date -Format "yyyyMMdd_HHmmss")
$BackupFile = "$BackupDir\atlas-prod-$Timestamp.db"

# Create backup
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Copy-Item -Path $DbPath -Destination $BackupFile -Force

# Retention: Keep last 30 days
Get-ChildItem -Path $BackupDir -Filter "*.db" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item -Force

Write-Host "Backup completed: $BackupFile"
```

**Linux/Mac (`scripts/backup-atlas.sh`):**
```bash
#!/bin/bash
BACKUP_DIR="/opt/atlas-logistics/backups"
DB_PATH="/opt/atlas-logistics/data/atlas-prod.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/atlas-prod-$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_FILE"

# Retention: Keep last 30 days
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

### Schedule Backups

**Windows Task Scheduler:**
```powershell
# Run PowerShell as Administrator
$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File C:\path\to\backup-atlas.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At 02:00
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "AtlasBackup" -Description "Daily backup of Atlas Logistics database"
```

**Linux Crontab:**
```bash
# Run crontab -e and add:
0 2 * * * /opt/atlas-logistics/scripts/backup-atlas.sh >> /var/log/atlas-backup.log 2>&1
```

### Test Disaster Recovery

```bash
# 1. Create backup
./scripts/backup-atlas.sh

# 2. Simulate database corruption
rm /opt/atlas-logistics/data/atlas-prod.db

# 3. Restore from backup
cp /opt/atlas-logistics/backups/atlas-prod-20240101_020000.db /opt/atlas-logistics/data/atlas-prod.db

# 4. Restart services
docker compose restart backend

# 5. Verify data integrity
curl https://yourdomain.com/api/health
```

---

## 🔄 PHASE 3.3: Monitoring & Observability

### Start Observability Stack

```bash
cd /opt/atlas-logistics
docker compose --profile observability up -d

# Services:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3002 (admin/atlas2024)
# - Loki (logs): Integrated in Grafana
```

### Create Grafana Dashboard

1. Open Grafana: `http://yourdomain.com/grafana`
2. Add Prometheus data source: `http://prometheus:9090`
3. Import dashboards:
   - Node Exporter (system metrics)
   - Fastify/Node.js application metrics
   - Redis metrics
4. Set up alerts:
   - CPU >80%
   - Memory >85%
   - Disk >90%
   - Error rate >1%

### Example Alert Rule (Prometheus)

```yaml
groups:
  - name: atlas_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.85
        for: 10m
        annotations:
          summary: "Container memory usage >85%"
```

---

## 🔄 PHASE 3.4: CI/CD Pipeline (GitHub Actions)

### GitHub Actions Workflow

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm run audit:leaks

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/atlas-logistics:${{ github.ref_name }}
            ${{ secrets.DOCKER_USERNAME }}/atlas-logistics:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/atlas-logistics
            docker compose pull
            docker compose up -d
            docker compose exec -T backend pnpm run db:migrate:prod
```

### Setup GitHub Secrets

In your repository settings, add:
- `DOCKER_USERNAME` — Docker Hub username
- `DOCKER_PASSWORD` — Docker Hub access token
- `DEPLOY_HOST` — VPS IP/domain
- `DEPLOY_USER` — SSH user (usually `root`)
- `DEPLOY_KEY` — SSH private key

### Deploy via Git Tag

```bash
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions automatically builds and deploys
```

---

## 📋 PRODUCTION DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All Phase 2 deliverables completed and verified
- [ ] Production environment file (`.env.production`) ready
- [ ] Docker images tested locally
- [ ] VPS/platform provisioned
- [ ] Domain DNS records configured
- [ ] SSL certificate obtained (Let's Encrypt free)
- [ ] Backup script tested
- [ ] Monitoring setup planned

### Deployment Day
- [ ] SSH into VPS / connect to platform
- [ ] Clone repository
- [ ] Deploy `.env.production` securely (never commit to git)
- [ ] Run database migrations: `docker compose exec backend pnpm run db:migrate:prod`
- [ ] Seed initial data: `docker compose exec backend pnpm run db:seed:prod` (optional)
- [ ] Start services: `docker compose up -d`
- [ ] Verify health checks pass
- [ ] Configure reverse proxy (Nginx)
- [ ] Enable SSL/TLS
- [ ] Test external connectivity

### Post-Deployment
- [ ] Monitor logs for errors
- [ ] Verify all API endpoints respond
- [ ] Test user workflows (login, create shipment, etc.)
- [ ] Confirm backups running
- [ ] Verify monitoring dashboards show metrics
- [ ] Document deployment details (IP, domain, credentials)
- [ ] Notify team of production availability

---

## 🚨 TROUBLESHOOTING

### Services Won't Start
```bash
# Check Docker daemon
docker ps

# Check logs
docker compose logs -f backend

# Common issues:
# - .env.production missing → Copy from .env.production.example
# - Port already in use → Change PORT in docker-compose.yml
# - Out of memory → Increase Docker memory limit
```

### Database Connection Failed
```bash
# Check SQLite file exists
ls -lah /opt/atlas-logistics/data/atlas-prod.db

# Check permissions
chmod 666 /opt/atlas-logistics/data/atlas-prod.db

# Restart backend
docker compose restart backend
```

### SSL Certificate Issues
```bash
# Renew Let's Encrypt certificate
certbot renew --dry-run
certbot renew  # If dry-run successful

# Check certificate
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout
```

---

## 📞 PHASE 3 SUCCESS CRITERIA

✅ Phase 3.1 complete when:
- Production application accessible at yourdomain.com
- Frontend loads correctly
- API endpoints respond
- Database queries execute <100ms

✅ Phase 3.2 complete when:
- Automated backups run daily
- Disaster recovery test passed
- Old backups automatically deleted (30-day retention)

✅ Phase 3.3 complete when:
- Prometheus collecting metrics
- Grafana dashboards displaying data
- Alerts configured and tested

✅ Phase 3.4 complete when:
- GitHub Actions workflow created
- Test suite runs on push
- Auto-deploy on version tag
- All secrets stored in GitHub Secrets

---

## 📊 PHASE 3 SUMMARY

| Phase | Objective | Platform | Est. Time |
|-------|-----------|----------|-----------|
| 3.1 | Production Deployment | Self-hosted VPS | 30-45 min |
| 3.2 | Backup & DR | Cron + Scripts | 15-20 min |
| 3.3 | Monitoring | Prometheus + Grafana | 20-30 min |
| 3.4 | CI/CD | GitHub Actions | 15-20 min |
| **Total** | **All Phase 3** | **Complete** | **~1.5-2 hours** |

---

**Next Step:** Execute Phase 3.1 (Production Deployment)  
**Estimated Timeline to Live:** 1.5-2 hours  
**Rollback Plan:** Restore database from backup, restart services

