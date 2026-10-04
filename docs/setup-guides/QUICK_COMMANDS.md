#!/usr/bin/env bash
# ==============================================================================
# ATLAS LOGISTICS — QUICK REFERENCE COMMANDS
# ==============================================================================
# Copy this file as a handy reference: cat QUICK_COMMANDS.md
# ==============================================================================

## 🚀 START DEVELOPMENT

# Standard (Recommended - includes Redis for BullMQ)
pnpm dev

# Minimal (No Docker - fastest for UI-only work)
pnpm dev:minimal

# With Observability (Prometheus + Grafana for metrics)
pnpm dev:observability

# Stop all containers
pnpm dev:stop


## 🗄️  DATABASE OPERATIONS

# Run migrations on development database
pnpm db:migrate

# Populate test data
pnpm db:seed

# Reset database completely (delete + recreate schema + seed)
pnpm db:reset-and-seed

# Open Drizzle Studio UI (visual database explorer)
pnpm db:inspect
pnpm db:ui  # alias

# Generate migration files from schema changes
pnpm db:generate

# For production database
pnpm db:migrate:prod
pnpm db:seed:prod


## 🐳 DOCKER MANAGEMENT

# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs
docker logs atlas-redis-dev

# Access Redis CLI inside container
docker exec -it atlas-redis-dev redis-cli

# Stop all Atlas containers
docker compose down

# Stop only Redis
docker compose stop redis

# Restart Redis
docker compose restart redis

# Remove all volumes (WARNING: deletes data)
docker compose down -v

# Clean up system (remove orphaned images/containers)
docker system prune -a


## 🔍 DEBUGGING

# View backend logs with pretty formatting
docker logs -f <container_id> | tail -f

# Monitor Redis operations in real-time
docker exec -it atlas-redis-dev redis-cli MONITOR

# Check Redis memory usage
docker exec -it atlas-redis-dev redis-cli INFO memory

# View all Redis keys
docker exec -it atlas-redis-dev redis-cli KEYS '*'

# Clear all Redis data
docker exec -it atlas-redis-dev redis-cli FLUSHALL

# Check BullMQ job queue status
# Visit: http://localhost:3001/bull-board


## 📊 MONITORING & METRICS

# Prometheus endpoint
# http://localhost:9090

# Grafana dashboards
# http://localhost:3002 (user: admin, password: atlas2024)

# Application metrics
# http://localhost:3001/metrics

# Health check
curl http://localhost:3001/health


## 🧪 TESTING & LINTING

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run E2E tests (Playwright)
pnpm test:e2e

# Lint code
pnpm lint

# Format code with Prettier
pnpm format

# Type check TypeScript
pnpm type-check


## 🔨 BUILD & DEPLOYMENT

# Build all packages (Turborepo)
pnpm build

# Build production Docker images
docker compose build

# Full production build and start
docker compose up --build -d


## 📝 ENVIRONMENT & CONFIG

# Create local .env from template
cp .env.local.example .env.local

# Verify setup is correct
bash setup-verify.sh

# View env vars loaded
cat .env.local

# Set env var temporarily (this session only)
export NODE_ENV=development


## 📌 USEFUL PORTS & ENDPOINTS

# Backend API
http://localhost:3001
http://localhost:3001/docs (Swagger UI)
http://localhost:3001/health (Health check)
http://localhost:3001/metrics (Prometheus metrics)
http://localhost:3001/bull-board (BullMQ Dashboard)

# Frontend (Dev Server)
http://localhost:5173

# Frontend (SSR/Production-like)
http://localhost:3000

# Prometheus
http://localhost:9090

# Grafana
http://localhost:3002 (admin / atlas2024)

# Redis
localhost:6379


## 🛠️ TROUBLESHOOTING

# Redis won't start
docker compose up redis --remove-orphans
docker ps | grep redis

# Backend won't start (port in use)
lsof -i :3001
# Then kill the PID:
kill -9 <PID>

# Database locked
pnpm db:reset-and-seed

# Docker daemon not running
# macOS: Open Docker Desktop
# Linux: systemctl start docker
# Windows: Open Docker Desktop

# Out of memory
docker stats  # Check memory usage
docker system prune  # Free up space

# Permission denied errors
# Make scripts executable:
chmod +x setup-verify.sh


## 📚 FILE LOCATIONS

# Main configuration
docker-compose.yml
.env.local (your local secrets)
package.json (scripts)

# Database
atlas-erp-v2.db (development SQLite)
atlas-erp-prod.db (production SQLite)
drizzle/ (migrations)

# Backend
src/server.ts (Fastify server)
src/worker-node.ts (BullMQ worker)
src/db/ (database schema & migrations)

# Frontend
packages/frontend/ (React Super-App)
packages/dashboard/ (Analytics dashboard)
packages/rate-comparer/ (Pricing module)
packages/warehouse-ops/ (Digital twin)
packages/bpmn-modeler/ (Workflow designer)

# Observability
grafana/ (config & dashboards)


## 💡 TIPS & TRICKS

# Use minimal mode for fast UI iteration
pnpm dev:minimal

# Use standard mode when testing APIs/queues
pnpm dev

# Use observability only when debugging performance
pnpm dev:observability

# Access Redis directly for debugging
docker exec -it atlas-redis-dev redis-cli

# Monitor all database queries
# Add this to .env.local: DEBUG=drizzle:*

# Count running tests
pnpm test 2>&1 | grep "✓\|✕" | wc -l

# Watch mode for development
pnpm dev:redis:only  # Start Redis only
# Then in another terminal:
pnpm start:backend  # Start Fastify with watch
# And in another:
turbo run dev  # Start Vite + MFEs


## 🔐 SECURITY REMINDERS

# Never commit .env.local to git
echo ".env.local" >> .gitignore

# Never store production secrets in Docker Compose
# Use Docker Secrets or a secrets manager

# Rotate JWT_SECRET and COOKIE_SECRET regularly
# Update .env.local and restart

# Check for security vulnerabilities
pnpm audit
pnpm audit --fix

# Scan code with CodeQL
# (Runs automatically in GitHub Actions)


## 📖 DOCUMENTATION

# Complete setup guide
cat DEV_SETUP.md

# Simplified architecture
cat ARCHITECTURE_SIMPLIFIED.md

# Recommended Docker setup (detailed)
cat RECOMMENDED_DOCKER_SETUP.md

# Full system architecture
cat ARCHITECTURE.md

# System design overview
cat README.md

# Observability guide
cat OBSERVABILITY.md


## 🆘 NEED HELP?

# Run verification script
bash setup-verify.sh

# Check Docker daemon logs (macOS)
cat ~/Library/Containers/com.docker.docker/Data/log/vm/dockerd.log

# Check Docker daemon logs (Linux)
journalctl -u docker

# View full Docker Compose config
docker compose config

# Validate docker-compose.yml
docker-compose --file docker-compose.yml validate


## 🎯 RECOMMENDED WORKFLOW

# 1. Start development (first time)
cp .env.local.example .env.local
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev

# 2. Every day
pnpm dev

# 3. If you need to add/modify features
# Edit code (hot reload works instantly)

# 4. If you need to test background jobs
# Visit http://localhost:3001/bull-board

# 5. If you need to profile/debug
pnpm dev:observability
# Visit http://localhost:3002 (Grafana)

# 6. Before committing
pnpm lint
pnpm test
pnpm type-check

# 7. Stop when done
pnpm dev:stop


## 📞 QUICK HELP MATRIX

| Problem | Solution |
|---------|----------|
| Redis won't start | `docker compose up redis --remove-orphans` |
| Port conflict | `lsof -i :3001 \| awk '{print $2}' \| xargs kill -9` |
| DB locked | `pnpm db:reset-and-seed` |
| Code won't compile | `pnpm install && pnpm type-check` |
| Tests fail | `pnpm test -- --reporter=verbose` |
| Metrics not showing | Start with `pnpm dev:observability` |
| Can't connect to DB | Check `atlas-erp-v2.db` exists, run `pnpm db:migrate` |
| BullMQ jobs stuck | Check Redis, clear with `docker exec atlas-redis-dev redis-cli FLUSHALL` |
| Frontend won't hot reload | Restart: `pnpm dev:stop && pnpm dev` |

---

**Save this file as a bookmark or print it out!**

💡 Most common: `pnpm dev` → Everything just works!
