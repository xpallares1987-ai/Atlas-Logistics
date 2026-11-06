# 🚀 PHASE 3.1 EXECUTION GUIDE: Self-Hosted VPS Deployment

**Target Platform:** DigitalOcean (or Linode, AWS EC2, Hetzner)  
**Estimated Time:** 30-45 minutes  
**Cost:** $12/month (2GB RAM, 40GB SSD)  
**Status:** Ready to Execute

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before starting, verify you have:

- [ ] DigitalOcean account created (or alternative VPS provider)
- [ ] `.env.production` file ready with secrets (JWT_SECRET, REDIS_PASSWORD, etc.)
- [ ] Domain name registered and DNS access available
- [ ] SSH key pair generated (for VPS access)
- [ ] GitHub repository access (for cloning)
- [ ] Approximately 45 minutes of uninterrupted time

---

## 🎯 STEP 1: PROVISION VPS (5 minutes)

### DigitalOcean Droplet Creation

**1.1 Log in to DigitalOcean**
- Go to https://cloud.digitalocean.com
- Click "Create" → "Droplets"

**1.2 Configure Droplet**

| Setting | Value | Notes |
|---------|-------|-------|
| Image | Ubuntu 22.04 LTS | Latest stable LTS |
| Size | 2GB RAM / 40GB SSD | ~$12/month |
| Region | Closest to users | e.g., NYC, London, Singapore |
| Auth | SSH Key | Better than password |
| Hostname | atlas-prod-001 | Descriptive name |
| Backups | Enable (optional +$2/month) | Recommended |

**1.3 Create SSH Key (if needed)**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/atlas-prod
# Press Enter twice (no passphrase for automation)
cat ~/.ssh/atlas-prod.pub
# Copy the output and paste in DigitalOcean SSH Key step
```

**1.4 Click "Create Droplet"**
- Wait 1-2 minutes for droplet to be ready
- Note the IP address (e.g., `192.0.2.123`)

**1.5 Add Domain to DigitalOcean** (optional but recommended)
- Go to Networking → Domains
- Add your domain
- Configure NS records with your registrar

---

## 🔑 STEP 2: INITIAL SERVER SETUP (10 minutes)

### 2.1 SSH Into Droplet

```bash
# Use SSH key from Step 1.3
ssh -i ~/.ssh/atlas-prod root@YOUR_DROPLET_IP

# Example:
# ssh -i ~/.ssh/atlas-prod root@192.0.2.123
```

### 2.2 Update System

```bash
# Update package lists
apt update

# Upgrade packages
apt upgrade -y

# Install essential tools
apt install -y \
    curl \
    wget \
    git \
    nano \
    htop \
    net-tools \
    ufw
```

### 2.3 Configure Firewall

```bash
# Enable UFW
ufw enable

# Allow SSH
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Verify
ufw status
# Should show: 22/tcp ALLOW, 80/tcp ALLOW, 443/tcp ALLOW
```

### 2.4 Create Non-Root User (Optional but Recommended)

```bash
# Create user
adduser --disabled-password --gecos "" atlas

# Add to sudo group
usermod -aG sudo atlas

# Add SSH key for new user
mkdir -p /home/atlas/.ssh
cat ~/.ssh/authorized_keys >> /home/atlas/.ssh/authorized_keys
chown -R atlas:atlas /home/atlas/.ssh
chmod 700 /home/atlas/.ssh
chmod 600 /home/atlas/.ssh/authorized_keys

# Test new user access (in new terminal)
ssh -i ~/.ssh/atlas-prod atlas@YOUR_DROPLET_IP
```

---

## 🐳 STEP 3: INSTALL DOCKER & DOCKER COMPOSE (5 minutes)

### 3.1 Install Docker

```bash
# Download and run Docker install script
curl -fsSL https://get.docker.com -o get-docker.sh
bash get-docker.sh

# Verify Docker installed
docker --version
# Output: Docker version 29.x.x, build xxxxx

# Allow docker commands without sudo (if using non-root user)
usermod -aG docker atlas
```

### 3.2 Install Docker Compose

```bash
# Download latest Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
chmod +x /usr/local/bin/docker-compose

# Verify
docker compose --version
# Output: Docker Compose version 2.x.x, build xxxxx
```

### 3.3 Start Docker Service

```bash
# Start Docker daemon
systemctl start docker

# Enable on boot
systemctl enable docker

# Verify
docker ps
# Output: Empty list or running containers
```

---

## 📁 STEP 4: CLONE REPOSITORY & SETUP (10 minutes)

### 4.1 Create Application Directory

```bash
# Create app directory
mkdir -p /opt/atlas-logistics
cd /opt/atlas-logistics

# Set permissions (if using non-root user)
chown -R atlas:atlas /opt/atlas-logistics
chmod 755 /opt/atlas-logistics
```

### 4.2 Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/your-org/atlas-logistics.git .

# Verify clone successful
ls -la
# Should show: packages/, src/, docker-compose.yml, Dockerfile, etc.
```

### 4.3 Deploy Production Configuration

```bash
# Copy production compose file
cp docker-compose.prod.yml docker-compose.yml

# Create data directory for SQLite
mkdir -p /opt/atlas-logistics/data
chmod 755 /opt/atlas-logistics/data

# Create backups directory
mkdir -p /opt/atlas-logistics/backups
chmod 755 /opt/atlas-logistics/backups
```

### 4.4 Setup Environment File

**CRITICAL: Never commit `.env.production` to git!**

```bash
# Create .env.production securely
# Option A: Create locally and copy via scp
scp -i ~/.ssh/atlas-prod /path/to/.env.production root@YOUR_DROPLET_IP:/opt/atlas-logistics/

# Option B: Create on server using secure editor
nano /opt/atlas-logistics/.env.production
```

**Required .env.production content:**
```env
# Application
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info

# Database
DATABASE_URL=file:/data/atlas-prod.db

# Secrets (use values from Phase 2)
JWT_SECRET=YOUR_32_BYTE_HEX_KEY_FROM_PHASE_2
REDIS_PASSWORD=YOUR_32_BYTE_HEX_KEY_FROM_PHASE_2
COOKIE_SECRET=YOUR_32_BYTE_HEX_KEY_FROM_PHASE_2

# URLs
REDIS_URL=redis://redis:6379
VITE_API_URL=https://yourdomain.com
VITE_WS_URL=wss://yourdomain.com

# Observability
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=YOUR_GRAFANA_PASSWORD_FROM_PHASE_2
```

### 4.5 Verify Setup

```bash
# Check directory structure
ls -la /opt/atlas-logistics/
# Should show: docker-compose.yml, Dockerfile, .env.production, packages/, src/

# Check .env.production exists and is not readable by others
ls -la /opt/atlas-logistics/.env.production
chmod 600 /opt/atlas-logistics/.env.production

# Verify no secrets in git history
cd /opt/atlas-logistics
git log --all -S "SECRET" --oneline
# Should return: (no results)
```

---

## 🚀 STEP 5: START PRODUCTION SERVICES (5 minutes)

### 5.1 Build and Start Services

```bash
# Navigate to app directory
cd /opt/atlas-logistics

# Pull latest images
docker compose pull

# Start services in background
docker compose up -d

# Expected output:
# [+] Running 5/5
#  ✓ Network atlas-logistics_default  Created
#  ✓ Container atlas-redis           Started
#  ✓ Container atlas-database        Started
#  ✓ Container atlas-backend         Started
#  ✓ Container atlas-frontend        Started
```

### 5.2 Verify Services Started

```bash
# Check running containers
docker compose ps

# Expected output:
# NAME              STATUS           PORTS
# atlas-frontend    Up 2 minutes      0.0.0.0:8080->8080/tcp
# atlas-backend     Up 2 minutes      0.0.0.0:3001->3001/tcp
# atlas-redis       Up 2 minutes      6379/tcp

# Check for errors in logs
docker compose logs --tail 50

# If all good, should see: "Fastify listening on 0.0.0.0:3001"
```

### 5.3 Verify Database Migrations

```bash
# Run migrations
docker compose exec backend pnpm run db:migrate:prod

# Expected output:
# ✓ 0 to 1 migration(s) pending
# ✓ All migrations applied successfully

# Optional: Seed initial data
docker compose exec backend pnpm run db:seed:prod
```

### 5.4 Test Backend Health

```bash
# Test from VPS
curl http://localhost:3001/health

# Expected JSON response:
# {
#   "status": "ok",
#   "database": { "status": "up", "latency": 1 },
#   "redis": { "status": "up", "latency": 0 },
#   "uptime": 42.123
# }
```

---

## 🔐 STEP 6: CONFIGURE HTTPS & REVERSE PROXY (10 minutes)

### 6.1 Install Nginx & Certbot

```bash
# Install Nginx
apt install -y nginx

# Install Certbot (for Let's Encrypt SSL)
apt install -y certbot python3-certbot-nginx
```

### 6.2 Get SSL Certificate

```bash
# Ensure domain DNS points to this VPS IP first!
# Then generate certificate:

certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Expected output:
# Congratulations! Your certificate has been issued.
# Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Verify certificate
ls -la /etc/letsencrypt/live/yourdomain.com/
```

### 6.3 Configure Nginx Reverse Proxy

```bash
# Create Nginx config
cat > /etc/nginx/sites-available/atlas << 'EOF'
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    # Increase upload limit
    client_max_body_size 50M;

    # Frontend (static files)
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # WebSocket support
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

    # WebSocket endpoint
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

    # Grafana (monitoring dashboard)
    location /grafana/ {
        proxy_pass http://localhost:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect / /grafana/;
    }

    # Prometheus (metrics)
    location /prometheus/ {
        proxy_pass http://localhost:9090/;
        proxy_set_header Host $host;
    }

    # Health check endpoint (no logging)
    location /health {
        access_log off;
        proxy_pass http://localhost:3001/health;
    }

    location /api/health {
        access_log off;
        proxy_pass http://localhost:3001/api/health;
    }
}
EOF
```

### 6.4 Enable Nginx Configuration

```bash
# Test Nginx config
nginx -t
# Expected: "syntax is ok" and "test is successful"

# Enable site
ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Restart Nginx
systemctl restart nginx

# Verify running
systemctl status nginx
```

### 6.5 Test SSL Certificate

```bash
# Check certificate validity
openssl s_client -connect yourdomain.com:443 -showcerts

# Expected: Certificate chain shows Let's Encrypt certificate

# Or use online checker
# https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

---

## ✅ STEP 7: VERIFY PRODUCTION ACCESS (5 minutes)

### 7.1 Test from External Machine

```bash
# Test frontend
curl -k https://yourdomain.com/
# Expected: HTML response (200 OK)

# Test API health
curl -k https://yourdomain.com/api/health
# Expected: JSON health status

# Test user access from browser
open https://yourdomain.com
# Should see Atlas Logistics frontend
```

### 7.2 Check Service Health

```bash
# From VPS, verify all containers healthy
docker compose ps
# All should show "Up" status

# Check logs for errors
docker compose logs backend | grep -i error
# Should return: (no results or few warnings)

# Check frontend status
docker compose logs frontend | tail -10
# Should show nginx running normally
```

### 7.3 Verify Database Connectivity

```bash
# Test database query
docker compose exec backend npm run db:select-count

# Expected: Returns count of records from database

# Check Redis connection
docker compose exec backend redis-cli -a YOUR_REDIS_PASSWORD ping
# Expected: PONG
```

---

## 📊 STEP 8: CONFIGURE MONITORING (Optional but Recommended)

### 8.1 Start Observability Stack

```bash
# Start Prometheus + Grafana
docker compose --profile observability up -d

# Verify
docker compose ps | grep -E "prometheus|grafana"
```

### 8.2 Access Grafana Dashboard

```bash
# From browser, visit:
https://yourdomain.com/grafana/

# Login:
# Username: admin
# Password: (from .env.production GRAFANA_ADMIN_PASSWORD)

# Add Prometheus data source:
# URL: http://prometheus:9090
# Save & Test
```

---

## 🔄 STEP 9: SETUP AUTOMATED BACKUPS

### 9.1 Create Backup Script

```bash
# Create backup script
cat > /opt/atlas-logistics/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/atlas-logistics/backups"
DB_PATH="/opt/atlas-logistics/data/atlas-prod.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/atlas-prod-$TIMESTAMP.db"
LOG_FILE="/var/log/atlas-backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup
cp "$DB_PATH" "$BACKUP_FILE"
if [ $? -eq 0 ]; then
    echo "[$(date)] Backup created: $BACKUP_FILE" >> "$LOG_FILE"
else
    echo "[$(date)] ERROR: Backup failed" >> "$LOG_FILE"
    exit 1
fi

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
echo "[$(date)] Cleanup complete" >> "$LOG_FILE"
EOF

# Make executable
chmod +x /opt/atlas-logistics/backup.sh

# Test backup
/opt/atlas-logistics/backup.sh
```

### 9.2 Schedule Daily Backups

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM UTC):
0 2 * * * /opt/atlas-logistics/backup.sh >> /var/log/atlas-backup.log 2>&1

# Verify cron job added
crontab -l
```

### 9.3 Test Backup Restoration

```bash
# Verify backup file exists
ls -lah /opt/atlas-logistics/backups/

# Simulate restore (do NOT delete original)
cp /opt/atlas-logistics/data/atlas-prod.db /opt/atlas-logistics/data/atlas-prod.db.backup
cp /opt/atlas-logistics/backups/atlas-prod-*.db /opt/atlas-logistics/data/atlas-prod.db.test

# Verify restored database
file /opt/atlas-logistics/data/atlas-prod.db.test
# Expected: SQLite 3.x database

# Cleanup test files
rm /opt/atlas-logistics/data/atlas-prod.db.test /opt/atlas-logistics/data/atlas-prod.db.backup
```

---

## 📋 DEPLOYMENT VERIFICATION CHECKLIST

```bash
# ✅ Service Health
docker compose ps                          # All containers "Up"

# ✅ Frontend Accessible
curl https://yourdomain.com/               # 200 OK

# ✅ API Responding
curl https://yourdomain.com/api/health     # JSON response

# ✅ Database Connected
docker compose logs backend | grep -i database  # No errors

# ✅ Redis Working
docker compose exec backend redis-cli ping     # PONG

# ✅ SSL Valid
openssl s_client -connect yourdomain.com:443   # Certificate valid

# ✅ Backups Created
ls -lah /opt/atlas-logistics/backups/          # Files present

# ✅ Nginx Proxy Working
curl -v https://yourdomain.com/ 2>&1 | grep -i "< HTTP"  # 200

# ✅ Logs Clean
docker compose logs --tail 50 | grep -i error  # Few/no errors
```

---

## 🎯 DEPLOYMENT COMPLETE!

| Component | Status | Details |
|-----------|--------|---------|
| VPS Provisioned | ✅ | Ubuntu 22.04, 2GB RAM, 40GB SSD |
| Docker Installed | ✅ | Docker 29.x + Compose 2.x |
| Application Deployed | ✅ | All 5 containers running |
| Database Ready | ✅ | Migrations applied, data persistent |
| HTTPS Enabled | ✅ | Let's Encrypt SSL certificate |
| Reverse Proxy | ✅ | Nginx routing to backend/frontend |
| Backups Running | ✅ | Daily automated backups at 2 AM |
| Monitoring | ✅ | Prometheus + Grafana operational |

---

## 📞 TROUBLESHOOTING

### Services Won't Start
```bash
# Check Docker daemon
docker ps

# Check logs
docker compose logs -f

# Common issues:
# - Port already in use: Stop other containers or change port
# - Out of memory: Check available RAM with 'free -h'
# - Permission denied: Ensure running as root or in docker group
```

### Database Errors
```bash
# Check database file exists
ls -la /opt/atlas-logistics/data/atlas-prod.db

# Check permissions
chmod 666 /opt/atlas-logistics/data/atlas-prod.db

# Restart backend
docker compose restart backend
```

### HTTPS Not Working
```bash
# Check certificate exists
ls -la /etc/letsencrypt/live/yourdomain.com/

# Check Nginx config
nginx -t

# Check Nginx status
systemctl status nginx

# Restart Nginx
systemctl restart nginx
```

### High Memory Usage
```bash
# Check container memory usage
docker stats

# If backend using too much: Restart
docker compose restart backend

# If persistent: Increase swap or upgrade droplet
```

---

## 🚀 WHAT'S NEXT?

**Phase 3.1 complete!** Your application is now live at `https://yourdomain.com` ✅

**Next steps:**

1. **Phase 3.2:** Test backup restoration (already configured)
2. **Phase 3.3:** Setup monitoring alerts in Grafana
3. **Phase 3.4:** Configure CI/CD pipeline (GitHub Actions)

---

**Estimated Time Spent:** 30-45 minutes  
**Status:** ✅ Production Deployment Complete  
**Application URL:** https://yourdomain.com  
**Admin Dashboard:** https://yourdomain.com/grafana/

🎉 **Atlas Logistics is now live in production!**

