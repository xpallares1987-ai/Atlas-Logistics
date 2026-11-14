# Staging Environment Setup Guide

**Purpose:** Mirror production environment for testing before live deployment  
**Duration:** 4 hours  
**Requirements:** Docker, Docker Compose, access to staging infrastructure

---

## 1. INFRASTRUCTURE SETUP

### 1.1 Staging Database (SQLite with WAL Mode)

```bash
# Initialize staging SQLite database with WAL mode and mandatory foreign keys
mkdir -p data
sqlite3 data/staging.db "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;"
```

### 1.2 Staging Redis

```bash
docker run -d \
  --name atlas-staging-redis \
  -p 6379:6379 \
  -v redis_staging_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

### 1.3 Staging Docker Compose

Create `docker-compose.staging.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      NODE_ENV: staging
      DATABASE_URL: file:/app/data/staging.db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
      LOG_LEVEL: debug
    ports:
      - "3001:3001"
    volumes:
      - staging_data:/app/data
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    depends_on:
      - backend
    environment:
      VITE_API_URL: http://localhost:3001
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_staging_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  staging_data:
  redis_staging_data:
```

---

## 2. DATABASE MIGRATIONS

### 2.1 Apply All Migrations

```bash
# Set staging environment
export NODE_ENV=staging
export DATABASE_URL=file:./data/staging.db

# Verify schema parity and run migrations
pnpm run audit:ddl-drift
pnpm run db:migrate

# Seed deterministic baseline data
pnpm run db:seed
```

### 2.2 Verify Database Integrity and Indexes

```bash
# Integrity and foreign key verification
sqlite3 data/staging.db "PRAGMA integrity_check;"
sqlite3 data/staging.db "PRAGMA foreign_key_check;"

# Verify indexes
sqlite3 data/staging.db "SELECT count(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';"
# Expected: 40+ indexes
```

---

## 3. ENVIRONMENT CONFIGURATION

### 3.1 Create .env.staging

```bash
cat > .env.staging << 'EOF'
# Application
NODE_ENV=staging
PORT=3001
LOG_LEVEL=debug

# Security
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENFORCE_HTTPS=true

# Database
DATABASE_URL=file:/app/data/staging.db
DATABASE_AUTH_TOKEN=

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
USE_REDIS_MOCK=false

# CORS (staging allows localhost and test domains)
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:3100,http://localhost:8080,http://127.0.0.1:3100

# Google AI
GEMINI_API_KEY=test-key-for-staging

# Monitoring
ENABLE_METRICS=true
ENABLE_TRACING=true

# Rate Limiting
RATE_LIMIT_MAX=5000
RATE_LIMIT_WINDOW=15m

# Tenancy
DEFAULT_TENANT_ID=org_default
EOF
```

### 3.2 Load Environment

```bash
set -a
source .env.staging
set +a
```

---

## 4. DEPLOYMENT

### 4.1 Build Staging Images

```bash
# Build backend
docker build \
  -f Dockerfile.backend \
  --target production \
  -t atlas-logistics:backend-staging \
  --build-arg NODE_VERSION=22 \
  --build-arg PNPM_VERSION=11.5.1 \
  .

# Build frontend
docker build \
  -f Dockerfile \
  --target production \
  -t atlas-logistics:frontend-staging \
  --build-arg NODE_VERSION=22 \
  --build-arg PNPM_VERSION=11.5.1 \
  --build-arg NGINX_IMAGE=nginx:alpine \
  .

# Build worker (if needed)
docker build \
  -f Dockerfile.worker \
  --target production \
  -t atlas-logistics:worker-staging \
  --build-arg NODE_VERSION=22 \
  --build-arg PNPM_VERSION=11.5.1 \
  .
```

### 4.2 Start Staging Environment

```bash
# Start with compose
docker compose -f docker-compose.staging.yml up -d

# Verify all services are running
docker compose -f docker-compose.staging.yml ps

# Check logs
docker compose -f docker-compose.staging.yml logs -f backend

# Wait for health checks to pass (30s)
sleep 30

# Verify endpoints
curl -s http://localhost:3001/api/health | jq .
curl -s http://localhost:8080/healthz
```

### 4.3 Verify Staging Deployment

```bash
#!/bin/bash

echo "🔍 Verifying Staging Environment..."

# Check backend health
if curl -s http://localhost:3001/api/health | grep -q '"status":"ok"'; then
  echo "✅ Backend health check passed"
else
  echo "❌ Backend health check FAILED"
  exit 1
fi

# Check frontend health
if curl -s http://localhost:8080/healthz | grep -q "ok"; then
  echo "✅ Frontend health check passed"
else
  echo "❌ Frontend health check FAILED"
  exit 1
fi

# Check database connectivity and integrity
if sqlite3 data/staging.db "PRAGMA integrity_check;" | grep -q "ok"; then
  echo "✅ Database connectivity and integrity check passed"
else
  echo "❌ Database integrity check FAILED"
  exit 1
fi

# Check Redis connectivity
if docker exec atlas-staging-redis redis-cli ping | grep -q "PONG"; then
  echo "✅ Redis connectivity verified"
else
  echo "❌ Redis connectivity FAILED"
  exit 1
fi

# Check security headers
HEADERS=$(curl -sI http://localhost:3001/api/health)
if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
  echo "✅ Security headers verified"
else
  echo "⚠️  HTTPS headers not present (expected for HTTP test)"
fi

# Check audit logging / outbox table
if sqlite3 data/staging.db "SELECT count(*) FROM scm_outbox_messages;" &>/dev/null; then
  echo "✅ Transactional outbox table exists"
else
  echo "❌ Transactional outbox table missing"
  exit 1
fi

# Check database indexes
INDEX_COUNT=$(sqlite3 data/staging.db "SELECT count(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';")
if [ "$INDEX_COUNT" -ge 30 ]; then
  echo "✅ Database indexes verified ($INDEX_COUNT indexes)"
else
  echo "⚠️  Low index count ($INDEX_COUNT, expected 40+)"
fi

echo ""
echo "🟢 Staging environment verification COMPLETE"
echo ""
echo "Endpoints:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:8080"
echo "  Docs:     http://localhost:3001/docs"
echo ""
```

### 4.4 Run Verification Script

```bash
chmod +x verify-staging.sh
./verify-staging.sh
```

---

## 5. TEST DATA LOADING

### 5.1 Create Test Users

```bash
# Admin user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@staging.local",
    "password": "AdminPassword123!@#",
    "role": "ADMIN"
  }'

# Regular user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@staging.local",
    "password": "UserPassword123!@#",
    "role": "USER"
  }'
```

### 5.2 Generate Test Data

```bash
# Load seed data
pnpm db:seed

# Or load in phases
pnpm db:seed:phase1  # Users, companies, locations
pnpm db:seed:phase2  # Shipments, bookings, quotes
pnpm db:seed:phase3  # Complex relationships
```

---

## 6. MONITORING SETUP

### 6.1 Enable Metrics

```bash
# Access Prometheus metrics
curl -s http://localhost:3001/metrics | head -20

# Access Swagger documentation
open http://localhost:3001/docs
```

### 6.2 Log Aggregation

```bash
# View combined logs
docker compose -f docker-compose.staging.yml logs -f

# View backend logs only
docker compose -f docker-compose.staging.yml logs -f backend

# View frontend logs only
docker compose -f docker-compose.staging.yml logs -f frontend
```

### 6.3 Monitor Performance

```bash
# Watch resource usage
docker stats atlas-staging-backend atlas-staging-frontend atlas-staging-db atlas-staging-redis

# Check disk usage
docker system df
```

---

## 7. TROUBLESHOOTING

### 7.1 Backend won't start

```bash
# Check logs
docker compose -f docker-compose.staging.yml logs backend

# Common issues:
# - Missing JWT_SECRET: Set in .env.staging
# - Database connection: Verify DATABASE_URL
# - Port already in use: Change port mapping
```

### 7.2 Frontend can't reach backend

```bash
# Verify API URL
curl -s http://localhost:8080/config.js | grep API

# Check CORS settings
curl -sI -H "Origin: http://localhost:8080" http://localhost:3001/api/shipments
```

### 7.3 Database connection issues

```bash
# Test SQLite database connection and integrity
sqlite3 data/staging.db "PRAGMA integrity_check;"

# Test Redis connection
redis-cli -h localhost ping
```

---

## 8. CLEANUP

### 8.1 Stop Staging Environment

```bash
docker compose -f docker-compose.staging.yml down

# Keep volumes for data persistence
docker compose -f docker-compose.staging.yml down -v  # Remove volumes
```

### 8.2 Reset Staging (Full Reset)

```bash
docker compose -f docker-compose.staging.yml down -v
rm data/staging.db
docker compose -f docker-compose.staging.yml up -d
sleep 30
./verify-staging.sh
```

---

## ✅ STAGING SETUP COMPLETE

Your staging environment is ready for:
- Integration testing
- Load testing
- Security testing
- Performance verification
- GDPR compliance testing

**Next Step:** Run integration tests (Task 3.2)
