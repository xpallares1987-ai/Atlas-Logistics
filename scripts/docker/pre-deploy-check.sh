#!/bin/bash
# ==============================================================================
# Atlas Logistics — Pre-Production Deployment Checklist
# Run this before deploying to production
# ==============================================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0

check() {
    echo -n "• $1... "
}

pass() {
    echo -e "${GREEN}✓${NC}"
    ((CHECKS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

# ==============================================================================
# ENVIRONMENT
# ==============================================================================
echo -e "${BLUE}=== Environment Checks ===${NC}"

check "Checking .env.production exists"
if [ -f ".env.production" ]; then
    pass
else
    fail "Missing .env.production"
fi

check "Checking required secrets in .env.production"
REQUIRED_VARS=("JWT_SECRET" "COOKIE_SECRET" "GRAFANA_ADMIN_PASSWORD" "DATABASE_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" .env.production; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    pass
else
    fail "Missing environment variables: ${MISSING_VARS[*]}"
fi

check "Checking secrets meet minimum length (32 chars)"
JWT_SECRET=$(grep "^JWT_SECRET=" .env.production | cut -d'=' -f2 | tr -d ' ')
if [ ${#JWT_SECRET} -ge 32 ]; then
    pass
else
    fail "JWT_SECRET is less than 32 characters"
fi

# ==============================================================================
# DOCKER
# ==============================================================================
echo ""
echo -e "${BLUE}=== Docker Checks ===${NC}"

check "Docker daemon is running"
if docker ps &>/dev/null; then
    pass
else
    fail "Docker daemon is not accessible"
fi

check "docker-compose.prod.yml exists"
if [ -f "docker-compose.prod.yml" ]; then
    pass
else
    fail "docker-compose.prod.yml not found"
fi

check "Dockerfiles are valid"
if docker build -f Dockerfile --target production --dry-run . &>/dev/null 2>&1; then
    pass
else
    fail "Dockerfile validation failed"
fi

# ==============================================================================
# APPLICATION
# ==============================================================================
echo ""
echo -e "${BLUE}=== Application Checks ===${NC}"

check "package.json exists"
if [ -f "package.json" ]; then
    pass
else
    fail "package.json not found"
fi

check "pnpm-lock.yaml is present (frozen deps)"
if [ -f "pnpm-lock.yaml" ]; then
    pass
else
    fail "pnpm-lock.yaml missing — run 'pnpm install --frozen-lockfile'"
fi

check "Database migrations are up-to-date"
if [ -d "drizzle/migrations" ] || [ -f "drizzle.config.ts" ]; then
    pass
else
    fail "Database migration files missing"
fi

# ==============================================================================
# INFRASTRUCTURE
# ==============================================================================
echo ""
echo -e "${BLUE}=== Infrastructure Checks ===${NC}"

check "Redis configuration present"
if grep -q "REDIS_URL" .env.production; then
    pass
else
    fail "REDIS_URL not configured"
fi

check "Database persistence volume configured"
if grep -q "backend_data" docker-compose.prod.yml; then
    pass
else
    fail "Database volume not configured"
fi

check "Resource limits defined"
if grep -q "limits:" docker-compose.prod.yml; then
    pass
else
    fail "Resource limits not defined"
fi

# ==============================================================================
# SECURITY
# ==============================================================================
echo ""
echo -e "${BLUE}=== Security Checks ===${NC}"

check "Non-root user configured in Dockerfile"
if grep -q "USER" Dockerfile.backend && grep -q "USER" Dockerfile; then
    pass
else
    fail "Non-root user not configured"
fi

check ".env files are in .gitignore"
if grep -q "^\.env" .gitignore; then
    pass
else
    fail ".env files may be committed to git"
fi

check "Healthchecks configured"
HEALTHCHECKS=$(grep -c "HEALTHCHECK" Dockerfile Dockerfile.backend Dockerfile.worker 2>/dev/null || echo "0")
if [ "$HEALTHCHECKS" -ge 3 ]; then
    pass
else
    fail "Not all Dockerfiles have healthchecks"
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo -e "${BLUE}=== Deployment Readiness Summary ===${NC}"

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
echo "Passed: ${GREEN}${CHECKS_PASSED}${NC}/${TOTAL}"

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Ready for production deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review .env.production"
    echo "  2. Run: docker compose -f docker-compose.prod.yml up --pull always -d"
    echo "  3. Monitor: docker compose -f docker-compose.prod.yml logs -f"
    exit 0
else
    echo "Failed: ${RED}${CHECKS_FAILED}${NC}/${TOTAL}"
    echo -e "${RED}❌ Fix issues above before deploying${NC}"
    exit 1
fi
