# ⚡ PHASE 3.1 QUICK REFERENCE CARD

**Time to Live:** 30-45 minutes  
**Estimated Cost:** $12/month

---

## 🎯 QUICK STEPS

### Step 1: Provision VPS (5 min)
```
1. Go to DigitalOcean → Create Droplet
2. Select: Ubuntu 22.04 LTS, 2GB RAM, 40GB SSD, SSH key auth
3. Copy droplet IP address
4. Wait for boot (1-2 min)
```

### Step 2: Initial Setup (10 min)
```bash
ssh -i ~/.ssh/atlas-prod root@YOUR_DROPLET_IP

apt update && apt upgrade -y
apt install -y curl wget git nano htop net-tools ufw
ufw enable
ufw allow 22/tcp 80/tcp 443/tcp
```

### Step 3: Install Docker (5 min)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
bash get-docker.sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Step 4: Deploy App (10 min)
```bash
mkdir -p /opt/atlas-logistics
cd /opt/atlas-logistics
git clone https://github.com/your-org/atlas-logistics.git .
cp docker-compose.prod.yml docker-compose.yml
mkdir -p data backups

# Copy .env.production securely (via scp or nano)
scp -i ~/.ssh/atlas-prod .env.production root@YOUR_DROPLET_IP:/opt/atlas-logistics/

docker compose pull
docker compose up -d
docker compose logs -f backend
```

### Step 5: Setup HTTPS (10 min)
```bash
apt install -y nginx certbot python3-certbot-nginx

# Update DNS to point to VPS IP first!
certbot certonly --standalone -d yourdomain.com

# Copy Nginx config from PHASE_3_1_DEPLOYMENT_STEPS.md section 6.3
nano /etc/nginx/sites-available/atlas
# Paste config, update yourdomain.com

ln -s /etc/nginx/sites-available/atlas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Step 6: Verify (5 min)
```bash
# Test from external machine
curl https://yourdomain.com/api/health
# Expected: {"status":"ok",...}

# Access browser
open https://yourdomain.com
# Should see Atlas Logistics frontend
```

---

## 📋 VERIFICATION CHECKLIST

```bash
✅ docker compose ps                           # All "Up"
✅ curl https://yourdomain.com/api/health     # 200 OK
✅ openssl s_client -connect yourdomain.com:443  # Valid SSL
✅ docker compose logs backend | grep -i error   # No errors
✅ ls /opt/atlas-logistics/data/atlas-prod.db   # DB exists
```

---

## 🔐 CRITICAL: Environment File

**NEVER commit to git!**

Required variables:
```env
NODE_ENV=production
DATABASE_URL=file:/data/atlas-prod.db
JWT_SECRET=<32-byte hex from Phase 2>
REDIS_PASSWORD=<32-byte hex from Phase 2>
VITE_API_URL=https://yourdomain.com
```

Deploy via:
- `scp` (secure copy)
- `1Password` / `LastPass`
- Manual `nano` editor (on server)

---

## 📊 Services After Deployment

| Service | Port | URL |
|---------|------|-----|
| Frontend | 8080 (internal) | https://yourdomain.com |
| Backend | 3001 (internal) | https://yourdomain.com/api |
| Redis | 6379 (internal) | N/A |
| Grafana | 3002 (internal) | https://yourdomain.com/grafana |
| Prometheus | 9090 (internal) | https://yourdomain.com/prometheus |

All routed through Nginx reverse proxy on ports 80/443

---

## 🆘 Emergency Commands

```bash
# View all logs
docker compose logs -f

# Restart services
docker compose restart

# Stop all services
docker compose down

# Check disk space
df -h

# Check memory usage
docker stats

# Restore from backup
cp /opt/atlas-logistics/backups/atlas-prod-TIMESTAMP.db /opt/atlas-logistics/data/atlas-prod.db
docker compose restart backend
```

---

## ✅ SUCCESS INDICATORS

After deployment, you should see:
- ✅ Frontend loads at https://yourdomain.com
- ✅ Can login with test credentials
- ✅ API returns metrics at /api/health
- ✅ No errors in `docker compose logs backend`
- ✅ Nginx logs show 200 responses
- ✅ SSL certificate valid (green lock in browser)
- ✅ Grafana accessible at /grafana/

---

## 📞 SUPPORT

**Full guide:** `PHASE_3_1_DEPLOYMENT_STEPS.md` (18.3 KB)  
**Docker reference:** `docker-compose.prod.yml`  
**Troubleshooting:** See PHASE_3_1_DEPLOYMENT_STEPS.md section "Troubleshooting"

---

**Total Time to Production:** ~45 minutes  
**Total Cost:** $12-14/month (VPS + backups)  

🚀 **Let's deploy!**

