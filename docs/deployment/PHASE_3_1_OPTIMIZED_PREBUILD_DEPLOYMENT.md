# 🚀 PHASE 3.1 OPTIMIZED: Pre-Built Images Deployment

**Status:** Ready for Execution  
**Approach:** Pre-built Docker images (no compilation on VPS)  
**Memory Required on VPS:** <100MB (images pre-built)  
**Deployment Time:** <5 minutes  
**Cost:** $12/month (2GB VPS)

---

## 🎯 WHY THIS APPROACH IS BETTER

### Problem with In-VPS Compilation
```
2GB RAM Droplet running: pnpm install + pnpm build
↓
Monorepo build consumes 2.5-3GB memory
↓
OOM Killer terminates processes
↓
Deployment fails
```

### Solution: Pre-Built Images
```
Local (your machine): Pre-built + tested images ✅
↓
Export: docker save → compressed archive (31MB + 293MB)
↓
Transfer: SCP to VPS (2-3 minutes)
↓
Import: docker load → 1 minute
↓
Start: docker compose up -d → live in 30 seconds
↓
Total: <5 minutes, zero compilation, zero OOM risk
```

---

## ✅ WHAT WE HAVE READY

### Pre-Built Images (from Phase 2)
```bash
atlas-logistics:frontend-prod    31 MB  (nginx:alpine + static)
atlas-logistics:backend-prod     293 MB (node:22-alpine + app)
```

### Configuration Files
```bash
docker-compose.prod.yml          (production orchestration)
.env.production                   (secrets, environment vars)
DEPLOY_QUICK_REFERENCE.md         (deployment guide)
```

---

## 🎯 3-STEP DEPLOYMENT WORKFLOW

### STEP 1: Export Pre-Built Images (5 minutes)

**On your local machine:**

```bash
# Navigate to project directory
cd /path/to/atlas-logistics

# Export both images into a compressed archive
docker save atlas-logistics:frontend-prod atlas-logistics:backend-prod | \
  gzip > atlas-prod-images.tar.gz

# Verify archive size
ls -lh atlas-prod-images.tar.gz
# Expected: ~300-350 MB compressed

# Verify archive contents
tar -tzf atlas-prod-images.tar.gz | head
# Expected: List of image layers
```

**Result:** `atlas-prod-images.tar.gz` (~330 MB compressed, extracts to ~600 MB on VPS)

---

### STEP 2: Provision VPS & Transfer Images (10 minutes)

#### 2.1 Provision Ubuntu 22.04 VPS

**DigitalOcean or equivalent:**
```
- OS: Ubuntu 22.04 LTS
- Size: 2GB RAM, 1 vCPU, 40GB SSD
- Region: Closest to users
- Auth: SSH key (recommended)
- Hostname: atlas-prod-001

After creation → Note the IP address (e.g., 192.0.2.123)
```

#### 2.2 Quick Server Hardening

```bash
# SSH into VPS
ssh -i ~/.ssh/atlas-prod root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git nano ufw

# Enable firewall
ufw enable
ufw allow 22/tcp 80/tcp 443/tcp

# Install Docker (one-liner)
curl -fsSL https://get.docker.com | bash
```

#### 2.3 Prepare Deployment Directory

```bash
# Create app directory
mkdir -p /opt/atlas-logistics
cd /opt/atlas-logistics

# Create subdirectories
mkdir -p data backups logs

# Set permissions
chmod 755 /opt/atlas-logistics
```

#### 2.4 Transfer Images & Config

**From your local machine:**

```bash
# Transfer pre-built images
scp -i ~/.ssh/atlas-prod atlas-prod-images.tar.gz \
  root@YOUR_DROPLET_IP:/opt/atlas-logistics/

# Transfer production compose file
scp -i ~/.ssh/atlas-prod docker-compose.prod.yml \
  root@YOUR_DROPLET_IP:/opt/atlas-logistics/

# Transfer production environment file (CRITICAL - SECURE!)
scp -i ~/.ssh/atlas-prod .env.production \
  root@YOUR_DROPLET_IP:/opt/atlas-logistics/

# Verify transfers
ssh -i ~/.ssh/atlas-prod root@YOUR_DROPLET_IP \
  "ls -lh /opt/atlas-logistics/"
# Expected output:
# atlas-prod-images.tar.gz (330 MB)
# docker-compose.prod.yml (2 KB)
# .env.production (1 KB)
```

---

### STEP 3: Load Images & Start Services (3 minutes)

**On VPS:**

```bash
cd /opt/atlas-logistics

# Load Docker images from archive
echo "Loading Docker images..."
docker load < atlas-prod-images.tar.gz
# Expected: "Loaded image: atlas-logistics:frontend-prod"
#           "Loaded image: atlas-logistics:backend-prod"

# Verify images loaded
docker images | grep atlas-logistics
# Expected:
# atlas-logistics   frontend-prod   <hash>  2 weeks ago   31MB
# atlas-logistics   backend-prod    <hash>  2 weeks ago   293MB

# Create docker-compose.yml (use prod config)
cp docker-compose.prod.yml docker-compose.yml

# Verify .env.production permissions
chmod 600 .env.production

# Start all services
docker compose up -d

# Watch startup logs
docker compose logs -f backend

# Wait for backend to be ready (~10-15 seconds)
# Look for: "Fastify listening on 0.0.0.0:3001"
```

**Expected output:**
```
✓ Network atlas-logistics_default  Created
✓ Container atlas-redis            Started
✓ Container atlas-database         Started
✓ Container atlas-backend          Started
✓ Container atlas-frontend         Started
```

---

## ⚡ QUICK VERIFICATION CHECKLIST

```bash
# ✅ All containers running
docker compose ps
# Expected: 5/5 containers "Up"

# ✅ Backend health check (local)
curl http://localhost:3001/health
# Expected: {"status":"ok","database":{"status":"up"},...}

# ✅ Frontend responding (local)
curl http://localhost:8080
# Expected: HTML response

# ✅ No errors in logs
docker compose logs --tail 50 backend | grep -i error
# Expected: (empty or minimal warnings)

# ✅ Database initialized
docker compose exec backend ls -la /data/
# Expected: atlas-prod.db exists
```

---

## 🔐 STEP 4: SETUP HTTPS & REVERSE PROXY (10 minutes)

### 4.1 Install Nginx & Certbot

```bash
apt install -y nginx certbot python3-certbot-nginx
```

### 4.2 Setup DNS (PREREQUISITE)

**Point your domain to VPS IP:**
```
yourdomain.com → A record → YOUR_DROPLET_IP
```

Wait for DNS propagation (test with: `nslookup yourdomain.com`)

### 4.3 Get SSL Certificate

```bash
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
# Expected: "Congratulations! Your certificate has been issued."
```

### 4.4 Configure Nginx Reverse Proxy

```bash
cat > /etc/nginx/sites-available/atlas << 'EOF'
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL config
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
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
    }

    # Grafana (monitoring)
    location /grafana/ {
        proxy_pass http://localhost:3002/;
        proxy_set_header Host $host;
        proxy_redirect / /grafana/;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## ✅ FINAL VERIFICATION

```bash
# From external machine (not VPS):

# ✅ Frontend accessible
curl https://yourdomain.com/
# Expected: HTML response (200 OK)

# ✅ API responding
curl https://yourdomain.com/api/health
# Expected: {"status":"ok",...}

# ✅ SSL certificate valid
openssl s_client -connect yourdomain.com:443 -showcerts | grep -A 5 "subject="
# Expected: Let's Encrypt certificate

# ✅ Browser test
open https://yourdomain.com
# Expected: Atlas Logistics loads, no SSL warnings
```

---

## 🔄 OPTIONAL: SETUP BACKUPS & MONITORING

### Automated Backups

```bash
cat > /opt/atlas-logistics/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/atlas-logistics/backups"
DB_PATH="/opt/atlas-logistics/data/atlas-prod.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/atlas-prod-$TIMESTAMP.db"

# Keep last 30 days
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete

echo "[$(date)] Backup completed"
EOF

chmod +x /opt/atlas-logistics/backup.sh

# Schedule daily at 2 AM
echo "0 2 * * * /opt/atlas-logistics/backup.sh" | crontab -
```

### Monitoring (Optional)

```bash
# Start Prometheus + Grafana
docker compose --profile observability up -d

# Access: https://yourdomain.com/grafana/
# Login: admin / (password from .env.production)
```

---

## 📊 DEPLOYMENT SUMMARY

| Component | Time | Status |
|-----------|------|--------|
| Export images (local) | 2 min | ✅ Pre-done |
| Provision VPS | 2 min | 🟡 Your action |
| Setup hardening | 3 min | 🟡 Your action |
| Transfer files | 3 min | 🟡 Your action |
| Load images | 1 min | 🟡 Your action |
| Start containers | 1 min | 🟡 Your action |
| Configure Nginx+SSL | 5 min | 🟡 Your action |
| Verify health | 2 min | 🟡 Your action |
| **TOTAL** | **<20 min** | 🟡 Ready |

---

## 🎯 WHAT YOU NEED TO PROVIDE

To proceed with deployment:

```
1. DigitalOcean Droplet IP:     [your-droplet-ip]
2. Domain Name:                  [yourdomain.com]
3. SSH Key Path (local):         [~/.ssh/atlas-prod]
4. .env.production Location:     [path on your machine]
```

---

## ✅ SUCCESS INDICATORS

After complete deployment, you should have:

✅ Application live at https://yourdomain.com  
✅ Frontend loads without SSL warnings  
✅ API responds at https://yourdomain.com/api/health  
✅ Database persisted at /opt/atlas-logistics/data/atlas-prod.db  
✅ Daily backups created automatically  
✅ Monitoring dashboard at https://yourdomain.com/grafana/  
✅ Zero OOM errors (no server compilation)  
✅ All containers healthy and running  

---

## 🚀 READY TO DEPLOY

**Next action:**
1. Provision DigitalOcean droplet (2GB, Ubuntu 22.04)
2. Point DNS to droplet IP
3. Provide connection info below
4. I'll handle server setup + deployment verification

```
Format to provide:
─────────────────
Droplet IP:     192.0.2.123
Domain:         yourdomain.com
SSH Key:        ~/.ssh/atlas-prod
.env.production: [location]
```

**Time to Live:** <20 minutes  
**No risk of OOM:** ✅ Images pre-built  
**All configuration ready:** ✅ Yes  

🎉 **Let's go live!**

