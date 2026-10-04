# 🔧 MAINTENANCE CHECKLIST — ATLAS LOGISTICS

Regular maintenance keeps your development environment running smoothly.

---

## 📅 DAILY (5 minutes)

- [ ] Start: `pnpm dev` in Terminal 1
- [ ] Monitor: Check Terminal 1 for errors
- [ ] End: `pnpm dev:stop` or CTRL+C
- [ ] Backup: Auto-backup happens (if configured)

---

## 📆 WEEKLY (Friday)

### Code Quality
- [ ] `pnpm lint` — Find code issues
- [ ] `pnpm type-check` — Catch TypeScript errors
- [ ] `pnpm test` — Verify tests pass
- [ ] `pnpm test:coverage` — Check coverage is stable

### Database
- [ ] `pnpm db:inspect` — Visual check of data
- [ ] Verify no orphaned records
- [ ] Note database size growth

### Performance
- [ ] `time pnpm dev:minimal` — Record startup time
- [ ] Check memory usage: `docker stats`
- [ ] Note any performance changes

### Git
- [ ] `git log --oneline | head -10` — Review commits
- [ ] `git status` — Verify all committed
- [ ] Check for uncommitted changes

### Documentation
- [ ] Update PERFORMANCE_BENCHMARKS.md
- [ ] Review CUSTOM_SETUP.md for needed updates
- [ ] Check if docs are still accurate

### Checklist
```bash
# Run this script weekly
pnpm lint && pnpm type-check && pnpm test

# Check performance
time pnpm dev:minimal

# Monitor resources
docker stats atlas-redis-dev --no-stream

# Verify nothing uncommitted
git status

# Show recent activity
git log --oneline | head -10
```

---

## 📊 MONTHLY (First Monday)

### Full Benchmarking
- [ ] Clean install: `rm -rf node_modules && pnpm install`
- [ ] Fresh database: `rm -rf atlas-erp-v2.db*`
- [ ] Run all benchmarks (see PERFORMANCE_BENCHMARKING.md)
- [ ] Update PERFORMANCE_BENCHMARKS.md with results
- [ ] Compare with previous month

### Secrets Rotation
- [ ] Generate new JWT_SECRET and COOKIE_SECRET
- [ ] Update .env.local
- [ ] Restart development: `pnpm dev:stop && pnpm dev`
- [ ] Update SECRETS_ROTATION_POLICY.md log

### Dependencies
- [ ] `pnpm outdated` — Check for updates
- [ ] Review security advisories: `pnpm audit`
- [ ] Update critical packages only (be conservative)
- [ ] Test thoroughly after updates

### Database Maintenance
- [ ] Verify database integrity
- [ ] Backup production database: `pnpm backup-db`
- [ ] Check backup file exists: `ls -lh /backups/`
- [ ] Document any issues

### Docker
- [ ] Remove unused images: `docker image prune -a`
- [ ] Remove unused volumes: `docker volume prune`
- [ ] Verify Redis is latest: `docker pull redis:7.2-alpine`

### Documentation Update
- [ ] Review all .md files
- [ ] Update CUSTOM_SETUP.md with changes
- [ ] Update SECRETS_ROTATION_POLICY.md
- [ ] Update PERFORMANCE_BENCHMARKS.md
- [ ] Check for dead links

### Monitoring
- [ ] `pnpm dev:observability` for 1 hour
- [ ] Review Grafana dashboards
- [ ] Note any anomalies
- [ ] Document findings

### Checklist
```bash
# Comprehensive monthly check
pnpm install
rm -rf atlas-erp-v2.db*
pnpm db:migrate && pnpm db:seed

# Benchmarks
time pnpm dev:minimal
time pnpm build
time pnpm test
pnpm lint
pnpm type-check

# Security
pnpm audit
pnpm audit fix

# Docker cleanup
docker system prune -a --volumes

# Backup
pnpm backup-db
```

---

## 🔄 QUARTERLY (Every 3 months)

### Major Review
- [ ] Review ARCHITECTURE_SIMPLIFIED.md — Still accurate?
- [ ] Review DEV_SETUP.md — Still accurate?
- [ ] Check for deprecated dependencies
- [ ] Review security updates

### Performance Trend Analysis
- [ ] Compare last 3 months of benchmarks
- [ ] Identify trends (faster/slower?)
- [ ] Root cause analysis of any regressions
- [ ] Document findings

### Team Sync
- [ ] Share performance trends with team
- [ ] Discuss any setup improvements
- [ ] Standardize across team
- [ ] Update team documentation

### OS Updates
- [ ] Check for Windows/Mac updates
- [ ] Check for Docker Desktop updates
- [ ] Check for Node.js LTS updates
- [ ] Plan upgrade if major version

### Git Hygiene
- [ ] Review git history
- [ ] Clean up old branches
- [ ] Verify no credentials in history
- [ ] Document any lessons learned

---

## 🚨 WHEN SOMETHING BREAKS

### Immediate Response

```bash
# 1. Stop everything
pnpm dev:stop

# 2. Check Docker
docker ps -a
docker logs atlas-redis-dev

# 3. Check file system
ls -la atlas-erp-v2.db*
df -h  # Check disk space

# 4. Check git
git status
git log --oneline | head -5

# 5. Try restart
pnpm dev
```

### If Issue Persists

```bash
# Full clean
pnpm clean:cache
rm -rf node_modules .turbo
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### Document for Future

```markdown
# Incident Log

## 2024-10-02 - [Issue Description]

### Symptoms
- [What went wrong]

### Root Cause
- [Why it happened]

### Fix
- [What you did]

### Prevention
- [How to prevent next time]

### Learning
- [What you learned]
```

---

## 🗂️ File Rotation

### Database Backups
```bash
# Keep last 7 backups, delete older ones
ls -ltr /backups/ | head -n -7 | awk '{print $NF}' | xargs rm -f

# Or monthly cleanup
find /backups -name "*.db" -mtime +30 -delete
```

### Logs
```bash
# Clean old logs if you have any
find .logs -name "*.log" -mtime +7 -delete
```

### Cache
```bash
# Clean build cache
pnpm clean:cache

# Clean Docker
docker system prune --volumes
```

---

## 📝 Maintenance Log

Keep a log of all maintenance:

```markdown
# MAINTENANCE_LOG.md

## 2024-10-02 - Weekly Maintenance
- ✓ Tests passed (18s)
- ✓ Linting passed
- ✓ Startup time: 8.2s (stable)
- ✓ Memory: 245MB (stable)
- ✓ All dependencies up to date

## 2024-10-09 - Weekly Maintenance
- ✓ Tests passed (19s)
- ✗ Linting found 3 warnings (fixed)
- ✓ Startup time: 8.3s (+0.1s, acceptable)
- ⚠️ Memory: 268MB (+23MB from last week)
  - Investigation: New dependency added
- ✓ All dependencies up to date

## 2024-10-01 - Monthly Maintenance
- ✓ Full benchmark run
- ✓ Secrets rotated (JWT_SECRET, COOKIE_SECRET)
- ✓ Docker pruned (freed 2.3GB)
- ✓ Documentation updated
- ✓ Backups verified
```

---

## ⚠️ Red Flags

Check these and act immediately:

```
🚩 Memory growing daily
   → Likely memory leak
   → Use pnpm dev:observability to debug

🚩 Startup time > 15 seconds  
   → Something changed recently
   → Review git log, revert if needed

🚩 Redis won't start
   → Docker Desktop may not be running
   → Check port 6379 not in use

🚩 Disk space < 5GB
   → Run: pnpm dev:stop && pnpm clean:cache
   → Run: docker system prune

🚩 Tests failing randomly
   → Likely race condition or timeout
   → Increase test timeout, investigate

🚩 HMR not working
   → File watcher may be stuck
   → Restart Terminal 1 (pnpm dev:stop then pnpm dev)

🚩 Database growing rapidly
   → Check for memory leaks or runaway writes
   → Review recent db:seed changes
```

---

## 🎯 Prevention Checklist

Prevent common issues:

- [ ] Never commit .env.local to git
- [ ] Always backup before major changes
- [ ] Always test before committing
- [ ] Keep Terminal 1 running (don't randomly close)
- [ ] Check git status before pushing
- [ ] Review performance metrics weekly
- [ ] Keep documentation updated
- [ ] Monitor disk space monthly

---

## 🔗 Related Documents

- PERFORMANCE_BENCHMARKING.md — Detailed benchmarking guide
- SECRETS_ROTATION_POLICY.md — Security practices
- PRECOMMIT_HOOKS_SETUP.md — Git hooks validation
- TWO_TERMINAL_WORKFLOW.md — Efficient workflow
- MONITORING_DASHBOARD.md — Performance monitoring

---

## ✅ Maintenance Schedule Summary

```
DAILY:      Start/stop dev, monitor Terminal 1
WEEKLY:     Lint, test, benchmark, git review
MONTHLY:    Full benchmark, secrets rotation, dependencies
QUARTERLY:  Major review, trend analysis, team sync
```

---

**Print this checklist and keep it accessible. Review it every Monday morning.**
