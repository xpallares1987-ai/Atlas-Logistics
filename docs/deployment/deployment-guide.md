# 🚀 DEPLOYMENT GUIDE — ATLAS LOGISTICS

## Overview

This guide documents the deployment process for Atlas Logistics from local development to production.

**Current Status:** Local development only (no GitHub CI/CD)
**Next Step:** Manual deployment process documented here

---

## Prerequisites

Before deploying, ensure:

- [ ] All tests pass: `pnpm test:coverage` (70%+ coverage)
- [ ] Build succeeds: `pnpm build` (no errors)
- [ ] No linting errors: `pnpm lint`
- [ ] Latest backup created: See BACKUP_CHECKLIST.md
- [ ] Environment variables prepared: See `.env.local` setup

---

## Pre-Deployment Checklist

```bash
# 1. Verify everything works locally
pnpm dev:minimal &
# (Test manually in browser)
# (Verify no console errors)

# 2. Run full test suite
pnpm test:coverage
# Verify: 70%+ coverage maintained

# 3. Run production build
pnpm build

# 4. Verify no uncommitted changes
git status
# Verify: All changes committed

# 5. Create backup BEFORE deployment
cp -r ~/atlas-logistics ~/backups/atlas-logistics-pre-deployment-$(date +%Y-%m-%d)
```

---

## Deployment Steps

### Step 1: Build for Production

```bash
# Clean previous builds
pnpm clean:cache

# Build production bundle
pnpm build

# Expected: Success, no warnings
# Output directory: dist/
```

**Verify:**
- Build completes without errors
- All bundles generated
- No security warnings

---

### Step 2: Verify Production Bundle

```bash
# Check bundle sizes
du -sh dist/

# Expected: Should be < 5MB (adjust based on actual)

# Verify no secrets in bundle
grep -r "PRIVATE_KEY\|SECRET\|PASSWORD" dist/ && echo "❌ FOUND SECRETS!" || echo "✓ No secrets found"
```

---

### Step 3: Prepare Production Environment

**On your production server/environment:**

```bash
# Create deployment directory
mkdir -p /opt/atlas-logistics
cd /opt/atlas-logistics

# Clone or download production code
git clone [your-repo] . # If using git
# OR manually copy files

# Install dependencies
pnpm install --prod

# Setup environment variables
cp .env.example .env.production
# Edit .env.production with production values:
# - Production database URL
# - Production Redis URL
# - Production API keys
# - Production secrets (rotate monthly)
```

---

### Step 4: Database Migrations

```bash
# Run database migrations
pnpm db:migrate:prod

# Expected: All migrations complete successfully
# Verify: `pnpm db:ui` to check database

# Seed initial data if needed
pnpm db:seed:prod
```

---

### Step 5: Start Production Server

```bash
# Using built-in start
pnpm start:prod

# OR using process manager (recommended for production)
pm2 start "pnpm start:prod" --name "atlas-logistics"

# OR using Docker (if implemented)
docker-compose -f docker-compose.prod.yml up -d
```

**Verify:**
- Server starts without errors
- Health check endpoint responds: `curl http://localhost:3001/health`
- No error logs in console

---

### Step 6: Verify Deployment

```bash
# Health check
curl http://your-production-url/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-10-02T...",
#   "version": "1.0.0"
# }

# Check logs for errors
pm2 logs atlas-logistics

# Performance check
curl http://your-production-url/api/test
# Response should be < 500ms
```

---

## Rollback Procedure

If deployment fails or issues arise:

### Immediate Rollback (< 5 minutes)

```bash
# Stop current deployment
pm2 stop atlas-logistics

# Restore from pre-deployment backup
cp -r ~/backups/atlas-logistics-pre-deployment-2024-10-02/* /opt/atlas-logistics/

# Restart with previous version
pm2 start atlas-logistics

# Verify it works
curl http://localhost:3001/health
```

### Database Rollback

```bash
# If migrations failed, rollback to previous snapshot
pnpm db:migrate:down  # (if using migration versioning)

# OR restore from database backup
# (Depends on your database system)
```

### Full Rollback to Previous Tag

```bash
git checkout previous-release-tag
pnpm install
pnpm build
# Redeploy using steps above
```

---

## Monitoring Post-Deployment

### Immediate Checks (First 5 minutes)

- [ ] Server is running
- [ ] Health check responds
- [ ] No error logs
- [ ] Response times < 500ms

### Short-term Monitoring (First 24 hours)

- [ ] Check application logs every hour
- [ ] Monitor CPU/Memory usage
- [ ] Monitor database connections
- [ ] Test key functionality manually

### Ongoing Monitoring

- [ ] Setup automated health checks
- [ ] Monitor error rates
- [ ] Track performance metrics
- [ ] Alert on anomalies

---

## Performance Baseline

After deployment, establish baseline metrics:

```bash
# Response time
ab -n 100 http://your-production-url/

# Load testing (optional, careful with production!)
# Use: Apache Bench, wrk, or similar

# Expected baseline:
# - Response time: < 200ms (p50)
# - Response time: < 500ms (p95)
# - Error rate: < 0.1%
# - Memory: < 500MB
```

---

## Environment Configuration

### Production `.env.production`

```bash
# Server
NODE_ENV=production
PORT=3001

# Database (production)
DATABASE_URL=your-production-database-url
DATABASE_USER=your-prod-user
DATABASE_PASS=your-prod-password  # Use secrets manager!

# Redis (production)
REDIS_URL=your-production-redis-url

# Secrets (rotate monthly!)
JWT_SECRET=generate-new-secret-monthly
COOKIE_SECRET=generate-new-secret-monthly

# API Keys (production)
API_KEY_X=production-api-key
API_KEY_Y=production-api-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
SENTRY_DSN=your-sentry-dsn (optional)
```

**⚠️ IMPORTANT:** Never commit production secrets to git. Use:
- Environment variables
- Secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Encrypted `.env.production` (git-crypt)

---

## Deployment Frequency

### Recommended Schedule

- **Critical bugs:** Deploy immediately (follow emergency procedure)
- **Security patches:** Deploy within 24 hours
- **Features:** Deploy weekly (Sunday evening after testing)
- **Dependencies:** Deploy monthly (after testing)

---

## Emergency Deployment

For critical issues:

```bash
# 1. Create emergency backup
cp -r /opt/atlas-logistics ~/backups/atlas-logistics-emergency-$(date +%Y-%m-%d-%H%M%S)

# 2. Quick fix and build
git checkout main
git pull
pnpm build

# 3. Fast deploy
pm2 restart atlas-logistics

# 4. Verify
curl http://localhost:3001/health

# 5. Document incident
# Add to: INCIDENTS.md
```

---

## Post-Deployment Tasks

After successful deployment:

- [ ] Update deployment log
- [ ] Notify team members
- [ ] Create backup of deployed version
- [ ] Monitor for 24 hours
- [ ] Document any issues encountered
- [ ] Schedule next deployment

---

## Deployment Log Template

```markdown
# Deployment Log

**Date:** 2024-10-XX
**Deployed By:** Your Name
**Version:** X.Y.Z
**Time to Deployment:** XX minutes

## Pre-deployment Checks
- [ ] Tests pass (70%+ coverage)
- [ ] Build succeeds
- [ ] No uncommitted changes
- [ ] Backup created

## Deployment Steps
1. Build: ✓ Success (XX seconds)
2. Migrate: ✓ Success (X migrations)
3. Start: ✓ Success
4. Verify: ✓ Health check responds

## Post-deployment Status
- Performance: Good (p50: XXms)
- Errors: None
- Issues: None

## Notes
(Any observations or notes)
```

---

## Troubleshooting Deployments

### Build Fails

```bash
# Clear cache and try again
pnpm clean:cache
pnpm install
pnpm build

# Check Node version
node -v  # Should be 20.11.0

# Check disk space
df -h

# Check memory
free -h
```

### Server Won't Start

```bash
# Check if port is already in use
lsof -i :3001

# Kill process using port
kill -9 $(lsof -t -i:3001)

# Try starting again
pnpm start:prod
```

### Database Connection Failed

```bash
# Verify connection string
echo $DATABASE_URL

# Test database connection
pnpm db:ui  # Should connect

# Check database credentials
# Check network connectivity to database server
```

### Slow Performance After Deployment

```bash
# Check current metrics
curl http://localhost:3001/health

# Review logs
pm2 logs atlas-logistics

# Check resource usage
top

# If suspected code issue:
pm2 restart atlas-logistics

# If persists, rollback to previous version
```

---

## CI/CD Future Plans

Currently: Manual deployment

When GitHub reconnects or you scale team:
- [ ] Setup GitHub Actions
- [ ] Auto-run tests on pull requests
- [ ] Auto-deploy to staging on merge
- [ ] Require approval for production deploy
- [ ] Automated rollback on health check failure

---

## Support & Questions

For deployment issues:

1. Check TROUBLESHOOTING.md
2. Review logs: `pm2 logs atlas-logistics`
3. Check health endpoint: `curl http://localhost:3001/health`
4. Document issue and create DEPLOYMENT_INCIDENT_YYYY-MM-DD.md

---

**Status:** Ready for production deployment
**Last Updated:** 2024-10-02
**Next Review:** After first production deployment
