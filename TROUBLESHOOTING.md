# 🔧 TROUBLESHOOTING GUIDE — ATLAS LOGISTICS

## Quick Navigation

- [Development Issues](#development-issues)
- [Build Issues](#build-issues)
- [Testing Issues](#testing-issues)
- [Git Issues](#git-issues)
- [Performance Issues](#performance-issues)
- [Dependency Issues](#dependency-issues)
- [Environment Issues](#environment-issues)
- [Emergency Procedures](#emergency-procedures)

---

## Development Issues

### Issue: `pnpm dev:minimal` hangs or won't start

**Symptoms:**
- Command runs but never shows "ready"
- No "listening on port 3001" message
- Application seems stuck

**Troubleshooting:**

```bash
# 1. Check running processes
ps aux | grep node
ps aux | grep tsx

# 2. Kill zombie processes
pkill -f "tsx.*server"
pkill -f "node"

# 3. Check if port is already in use
lsof -i :3001    # macOS/Linux
netstat -ano | findstr :3001  # Windows

# 4. Kill process using the port
kill -9 <PID>    # macOS/Linux
taskkill /PID <PID> /F  # Windows

# 5. Try again
pnpm dev:minimal

# 6. If still doesn't work, check backend directly
cd packages/@atlas/api
tsx src/server.ts  # Run directly to see errors
```

**Common Causes:**
- Previous process didn't fully shut down
- Port 3001 already in use
- Memory insufficient
- Corrupted hot-reload cache

---

### Issue: Hot reload not working

**Symptoms:**
- Changes don't reflect in browser
- Need to manually restart server

**Solution:**

```bash
# 1. Clear hot reload cache
rm -rf node_modules/.vite
rm -rf packages/*/dist

# 2. Restart dev server
pnpm dev:minimal

# 3. Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (macOS)

# 4. If still broken, restart everything
pkill -f tsx
pnpm dev:minimal
```

**Prevention:**
- Don't edit node_modules directly
- Clear cache before major updates
- Use `.gitignore` for generated files

---

### Issue: Backend API errors (500 errors)

**Symptoms:**
- Requests return HTTP 500
- "Internal Server Error"
- Logs show unexpected errors

**Investigation:**

```bash
# 1. Check server logs
tail -f ~/atlas-logistics/logs/server.log

# 2. Check console output
# (Look in terminal where pnpm dev:minimal is running)

# 3. Check database connection
pnpm db:ui

# 4. Test health endpoint
curl http://localhost:3001/health

# 5. Run direct query test
curl http://localhost:3001/api/test

# 6. Check Redis connection
redis-cli ping
```

**Common Causes:**
- Database not running or unreachable
- Redis not running
- Missing environment variables
- Database migration failed

---

## Build Issues

### Issue: `pnpm build` fails with "insufficient memory"

**Symptoms:**
- Build crashes halfway
- "JavaScript heap out of memory"
- Process killed unexpectedly

**Solution:**

```bash
# 1. Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# 2. Or permanently set in .npmrc
# Add line: node-options=--max-old-space-size=4096

# 3. Or split build into parts
pnpm --filter @atlas/frontend build
pnpm --filter @atlas/api build
# ... (build each package separately)

# 4. Check available memory
free -h  # Linux
vm_stat  # macOS
wmic OS get TotalVisibleMemorySize  # Windows
```

**Long-term Fix:**
- Add machine RAM
- Optimize dependencies
- Split monorepo if it grows

---

### Issue: Build warnings about unused dependencies

**Symptoms:**
- Build completes but with warnings
- "unused dependency: X"

**Solution:**

```bash
# 1. Identify unused package
pnpm audit --json | grep unused

# 2. Verify it's not imported
grep -r "import.*from.*package-name" packages/

# 3. If truly unused, remove it
pnpm remove unused-package

# 4. Test build
pnpm build

# 5. If errors appear, the package WAS needed
pnpm add unused-package
```

---

### Issue: Build includes secrets

**Symptoms:**
- Bundle size unexpectedly large
- `.env` file contents appear in bundle

**Solution:**

```bash
# 1. Check for secrets in dist
grep -r "SECRET\|PASSWORD\|KEY" dist/

# 2. Ensure .env files aren't included
cat .gitignore | grep "\.env"

# 3. Never import .env directly
# ❌ WRONG: import env from '.env'
# ✅ RIGHT: const apiKey = process.env.API_KEY

# 4. Use dotenv for development only
# Production should use environment variables

# 5. Rebuild
pnpm build

# 6. Verify
strings dist/*.js | grep -i secret
```

---

## Testing Issues

### Issue: Tests fail with "cannot find module"

**Symptoms:**
- Import errors in tests
- "Cannot find module X"
- Tests can't locate files

**Solution:**

```bash
# 1. Check file exists
ls -la packages/*/src/path/to/file

# 2. Check import path
cat packages/*/src/__tests__/mytest.test.ts | grep import

# 3. Verify aliases in tsconfig
cat tsconfig.json | grep paths

# 4. Clear test cache
rm -rf node_modules/.vitest

# 5. Reinstall dependencies
pnpm install

# 6. Run tests again
pnpm test

# 7. If still broken, run specific test with verbose output
pnpm test --reporter=verbose mytest.test.ts
```

---

### Issue: Tests timeout or hang

**Symptoms:**
- Tests run but never complete
- "Timeout of Xms exceeded"
- Process hangs indefinitely

**Solution:**

```bash
# 1. Run tests with longer timeout
pnpm test --testTimeout=30000

# 2. Check for infinite loops in test code
cat mytest.test.ts | grep -A5 "while\|for"

# 3. Look for missing async/await
# ❌ WRONG: test(() => { asyncFunc() })
# ✅ RIGHT: test(async () => { await asyncFunc() })

# 4. Check for stuck mocks
cat mytest.test.ts | grep mock

# 5. Run single test to isolate
pnpm test mytest.test.ts

# 6. Kill the process and try again
pkill -f vitest
pnpm test
```

---

### Issue: Test coverage below 70%

**Symptoms:**
- Coverage report shows < 70%
- Pre-push hook blocks commits

**Investigation:**

```bash
# 1. Generate coverage report
pnpm test:coverage

# 2. Open HTML report
open coverage/index.html  # macOS
start coverage\index.html  # Windows
firefox coverage/index.html  # Linux

# 3. Identify uncovered lines
# (Red lines in coverage report)

# 4. Write tests for uncovered code
cat packages/*/src/__tests__/coverage-gap.test.ts

# 5. Rerun coverage
pnpm test:coverage

# 6. Verify improvement
grep "statements" coverage/index.html
```

**Coverage Improvement Strategy:**
- Focus on critical paths first
- Aim for 75%+ (higher than 70% requirement)
- Don't test third-party libraries
- Use `.test.skip` for future tests

---

## Git Issues

### Issue: Pre-commit hook blocks commit

**Symptoms:**
- `git commit` shows linting/format errors
- Commit is blocked

**Solution:**

```bash
# 1. Let pre-commit hook fix it
pnpm format

# 2. Stage fixed files
git add .

# 3. Try commit again
git commit -m "message"

# 4. If still blocked, manually review errors
pnpm lint

# 5. Fix identified issues
# (Edit files manually)

# 6. Try commit again
git commit -m "message"
```

---

### Issue: Pre-push hook blocks push

**Symptoms:**
- `git push` shows test failures
- Push is blocked

**Solution:**

```bash
# 1. Fix test failures
pnpm test

# 2. Fix coverage issues
pnpm test:coverage

# 3. Fix linting issues
pnpm lint && pnpm format

# 4. Stage and commit fixes
git add .
git commit -m "fix: test/lint issues"

# 5. Try push again
git push

# 6. Emergency: Bypass (NOT RECOMMENDED)
git push --no-verify
# (This skips hooks - only for emergencies!)
```

---

### Issue: Cannot push (no remote)

**Symptoms:**
- `git push` shows "no such remote"
- "fatal: 'origin' does not appear"

**Explanation:**
This is normal - GitHub is disconnected!

**Solution:**
```bash
# You're in local-only mode
# This is expected behavior

# Don't push to GitHub
# Keep working locally

# Backup instead
cp -r ~/atlas-logistics ~/backups/atlas-logistics-$(date +%Y-%m-%d)

# See LOCAL_DEVELOPMENT_ONLY.md
```

---

### Issue: Accidentally committed secrets

**Symptoms:**
- API key in git history
- Password in commit

**Solution:**

```bash
# 1. Check what was committed
git log -p --all | grep -i secret

# 2. Immediate: Rotate compromised secrets
# (Change API keys, passwords, etc. immediately!)

# 3. Remove from history (complex)
# Use: git-filter-repo or BFG

# 4. Push security notice to team
# (Secret was committed but now rotated)

# Prevention:
# - Never commit .env files
# - Use pre-commit hooks (already setup)
# - Use .env.local for local development
```

---

## Performance Issues

### Issue: Build time is slow (> 60 seconds)

**Symptoms:**
- `pnpm build` takes > 60 seconds
- Builds getting progressively slower

**Investigation:**

```bash
# 1. Profile the build
pnpm build --profile

# 2. Check which packages are slow
turbo run build --profile

# 3. Identify largest bundles
du -sh packages/*/dist

# 4. Check for unused dependencies
pnpm audit --json | grep unused

# 5. Clear cache and rebuild
pnpm clean:cache
pnpm build

# 6. Monitor during build
watch -n 1 "du -sh dist packages/*/dist"
```

**Optimization Strategies:**
- Upgrade machine RAM/CPU
- Split large packages
- Use dynamic imports
- Implement code splitting
- Review datos.ts size (109KB)

---

### Issue: Development server is slow (> 1 second hot reload)

**Symptoms:**
- Changes take > 1 second to appear
- Gradual slowdown over time

**Solution:**

```bash
# 1. Check memory usage
ps aux | grep tsx | head -5
top  # Look for nodejs process

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Check number of open files
lsof -p $PID | wc -l  # Should be < 1000

# 4. Restart dev server
pkill -f "tsx"
pnpm dev:minimal

# 5. If persists, check file watching limits
# Linux: Increase inotify limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Dependency Issues

### Issue: Dependencies out of date

**Symptoms:**
- Warnings about old versions
- Security vulnerabilities

**Solution:**

```bash
# 1. Check for outdated packages
pnpm outdated

# 2. Check for vulnerabilities
pnpm audit

# 3. Update non-breaking versions
pnpm update

# 4. Test everything still works
pnpm build
pnpm test
pnpm dev:minimal

# 5. Commit updates
git add pnpm-lock.yaml package.json
git commit -m "chore: update dependencies"
```

---

### Issue: Lock file conflicts

**Symptoms:**
- `pnpm-lock.yaml` has merge conflicts
- Cannot install dependencies

**Solution:**

```bash
# 1. Resolve conflict manually
# Edit pnpm-lock.yaml and keep correct version

# 2. Or regenerate lock file
rm pnpm-lock.yaml
pnpm install

# 3. Stage fix
git add pnpm-lock.yaml

# 4. Commit
git commit -m "resolve: pnpm-lock.yaml conflicts"
```

---

## Environment Issues

### Issue: Node version mismatch

**Symptoms:**
- Scripts work for some devs, not others
- "You are running Node.js vX.X.X"

**Solution:**

```bash
# 1. Check current version
node -v

# 2. Check required version
cat .nvmrc

# 3. Install/use correct version

# If using nvm:
nvm install 20.11.0
nvm use 20.11.0

# If using fnm:
fnm use 20.11.0

# If using volta:
volta install node@20.11.0

# If manual install:
# Download from https://nodejs.org

# 4. Verify
node -v  # Should match .nvmrc

# 5. Reinstall dependencies
pnpm install
```

---

### Issue: Database connection fails

**Symptoms:**
- "Cannot connect to database"
- "ECONNREFUSED" error

**Solution:**

```bash
# 1. Check if database is running
pnpm db:ui

# 2. Verify connection string
cat .env.local | grep DATABASE_URL

# 3. Test database directly
sqlite3 dev.db ".tables"

# 4. Reset database if corrupted
pnpm db:reset

# 5. Reseed data
pnpm db:seed

# 6. Try again
pnpm dev:minimal
```

---

### Issue: Redis connection fails

**Symptoms:**
- "Cannot connect to Redis"
- Full mode (with Redis) fails

**Solution:**

```bash
# 1. Check if Redis is running
redis-cli ping

# 2. Start Redis if using dev mode with Redis
docker-compose up redis

# 3. Check Redis connection string
cat .env.local | grep REDIS_URL

# 4. Test Redis directly
redis-cli
# > PING
# > QUIT

# 5. If needed, use minimal mode (no Redis)
pnpm dev:minimal
```

---

## Emergency Procedures

### Nuclear Option: Complete Reset

Use only when everything is broken:

```bash
# 1. Backup current state
cp -r ~/atlas-logistics ~/backups/atlas-logistics-emergency-$(date +%Y-%m-%d-%H%M%S)

# 2. Clean everything
rm -rf node_modules
rm -rf dist
rm pnpm-lock.yaml
rm -rf .turbo

# 3. Reinstall
pnpm install

# 4. Reset database
pnpm db:reset
pnpm db:seed

# 5. Try again
pnpm dev:minimal
```

---

### Recover from Git Disaster

If git history is corrupted:

```bash
# 1. Restore from backup
cp -r ~/backups/atlas-logistics-2024-10-02/.git ~/.git

# 2. Verify history
git log --oneline | head -10

# 3. Continue development
git status
```

---

### Get Help

If issue isn't here:

1. **Check Logs:**
   ```bash
   tail -f ~/atlas-logistics/logs/*.log
   ```

2. **Run Validation:**
   ```bash
   bash scripts/check-env.sh
   ```

3. **Check Documentation:**
   - LOCAL_DEVELOPMENT_ONLY.md
   - DEPLOYMENT_GUIDE.md
   - DEV_SETUP.md

4. **Create Issue:**
   - Document error
   - List steps to reproduce
   - Include logs
   - Include environment info

---

**Status:** Complete troubleshooting guide  
**Last Updated:** 2024-10-02  
**Add to this guide:** New issues as they arise
