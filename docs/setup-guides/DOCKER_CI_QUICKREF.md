# Atlas Logistics: Docker & CI/CD Quick Reference

## 🚀 Quick Start

### Local Development
```bash
# Clone and setup
git clone <repo>
cd Atlas-Logistics
pnpm install

# Start full stack with health checks
docker compose up --pull always -d

# Verify all services are healthy
bash scripts/check-compose-health.sh

# Logs
docker compose logs -f api
docker compose logs -f app
```

### First-Time GitHub Actions Setup
```bash
# 1. Create Docker Hub access token
# Go to: https://hub.docker.com/settings/security → New Access Token

# 2. Setup GitHub secrets (requires gh CLI)
bash scripts/setup-github-secrets.sh

# Or manually in GitHub UI:
# Settings → Secrets and variables → Actions → New repository secret
#   Name: DOCKER_USERNAME
#   Value: <your_docker_username>
#   Name: DOCKER_PASSWORD
#   Value: <your_docker_token>

# 3. Push to trigger workflow
git push origin main
```

---

## 📋 Files Changed

### Docker Configuration
| File | Change |
|------|--------|
| `Dockerfile` | Multi-stage build, pnpm prune, cache optimization, healthcheck |
| `Dockerfile.backend` | Pruned deps, dist-only copy, dist artifacts, healthcheck |
| `.dockerignore` | Expanded exclusions (.turbo, coverage, .env*, .github, etc.) |
| `docker-compose.yml` | Redis healthcheck, fixed depends_on, pull_policy optimization |

### CI/CD Configuration
| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | New 4-stage workflow: lint→build→image-push→e2e |

### Utilities
| File | Purpose |
|------|---------|
| `scripts/setup-github-secrets.sh` | Interactive GitHub secrets configuration |
| `scripts/check-compose-health.sh` | Verify docker-compose service health |
| `DOCKER_CI_OPTIMIZATION.md` | Detailed implementation guide |

---

## ✅ Verification Checklist

### Local
- [ ] `docker compose up --pull always -d` starts without errors
- [ ] `bash scripts/check-compose-health.sh` reports all services healthy
- [ ] `curl http://localhost:3001/health` returns success (Fastify API)
- [ ] `curl http://localhost:8080` returns HTML (Frontend)
- [ ] `docker images | grep atlas` shows both frontend & backend

### GitHub
- [ ] GitHub secrets `DOCKER_USERNAME` and `DOCKER_PASSWORD` are set
- [ ] Push to `main` or open PR to trigger workflow
- [ ] Workflow completes all 4 stages (lint, build, E2E, deploy)
- [ ] Coverage report shows ≥90%
- [ ] Docker images appear on Docker Hub (if pushing to main)

---

## 🔍 Troubleshooting

### Services not reaching healthy state
```bash
# Check individual service logs
docker compose logs db
docker compose logs redis
docker compose logs api

# Verify port availability
lsof -i :5432  # Postgres
lsof -i :6379  # Redis
lsof -i :3001  # API
lsof -i :8080  # Frontend
```

### Docker image build fails
```bash
# Check build context size
du -sh .

# Verify .dockerignore is excluding unnecessary files
git status -s | grep -v "^!!"

# Clean caches
docker system prune -a
pnpm store prune
rm -rf .turbo
```

### GitHub workflow fails at coverage gate
```bash
# Run coverage locally
pnpm test -- --coverage

# Check coverage-summary.json
cat coverage/coverage-summary.json | grep statements

# Increase coverage before commit
pnpm test -- --coverage --run
```

### docker-compose down fails to clean volumes
```bash
# Force cleanup
docker compose down -v --remove-orphans
docker volume prune -f
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI/CD                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Lint & Build (Every Push/PR)                            │
│     ├─ ESLint                                               │
│     ├─ TypeScript type-check                                │
│     ├─ pnpm build (Turborepo)                               │
│     ├─ Vitest unit/integration (384 tests)                  │
│     └─ Coverage gate (≥90%)                                 │
│                                                               │
│  2. Build & Push Images (main only)                         │
│     ├─ docker-compose.yml (frontend)                        │
│     │  └─ Chainguard nginx (30-40MB)                        │
│     └─ Dockerfile.backend                                   │
│        └─ Chainguard node (150-200MB)                       │
│                                                               │
│  3. E2E Tests (Every Push/PR)                               │
│     ├─ docker compose up                                    │
│     ├─ Health checks (redis, db, api, app)                  │
│     └─ Playwright test suite                                │
│                                                               │
│  4. Deploy Notification (main only)                         │
│     └─ Log success + image locations                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────────────────────┐
│              Production Deployment (Docker Hub)               │
│                                                               │
│  docker.io/{username}/atlas-frontend:latest                 │
│  docker.io/{username}/atlas-backend:latest                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Frontend image | ~80MB | ~30-40MB | -50-60% ↓ |
| Backend image | ~350MB | ~150-200MB | -55% ↓ |
| Build context | ~500MB | ~150-200MB | -70% ↓ |
| CI lint+build | ~4min | ~3min | -25% ↓ |
| docker-compose up | ~45s | ~30s | -33% ↓ |

---

## 🔐 Security Notes

1. **Never commit `.env` files** — use docker-compose `env_file:`
2. **Rotate Docker Hub tokens** — create short-lived tokens for CI/CD
3. **GitHub secrets are encrypted** — safe for production tokens
4. **Chainguard images** — minimal attack surface, no shell access
5. **CodeQL + ESLint** — catch security issues before merge

---

## 📚 References

- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [GitHub Actions Docker](https://docs.docker.com/build/ci/github-actions/)
- [Chainguard distroless images](https://www.chainguard.dev/)
- [docker-compose healthchecks](https://docs.docker.com/compose/compose-file/compose-file-v3/#healthcheck)

---

## ❓ Questions?

Refer to `DOCKER_CI_OPTIMIZATION.md` for detailed implementation notes and rationale for each change.
