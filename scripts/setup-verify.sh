#!/usr/bin/env bash
# ==============================================================================
# ATLAS LOGISTICS — SETUP VERIFICATION SCRIPT
# ==============================================================================
# This script verifies your local development environment is configured correctly.
# Run: bash setup-verify.sh
# ==============================================================================

set -e

echo "🔍 Verifying Atlas Logistics Local Development Setup..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper function for checks
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description ($file)"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $description ($file) — MISSING"
        ((CHECKS_FAILED++))
    fi
}

check_command() {
    local cmd=$1
    local description=$2
    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>&1 | head -1)
        echo -e "${GREEN}✓${NC} $description ($version)"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}✗${NC} $description — NOT INSTALLED"
        ((CHECKS_FAILED++))
    fi
}

check_env() {
    local var=$1
    local description=$2
    if [ -f ".env.local" ] && grep -q "$var" ".env.local"; then
        echo -e "${GREEN}✓${NC} $description ($var configured)"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} $description ($var) — Please configure in .env.local"
    fi
}

# ==============================================================================
# 1. System Dependencies
# ==============================================================================
echo "📦 Checking System Dependencies..."
check_command "node" "Node.js"
check_command "pnpm" "pnpm (Package Manager)"
check_command "docker" "Docker"
check_command "docker-compose" "Docker Compose"
echo ""

# ==============================================================================
# 2. Project Files
# ==============================================================================
echo "📄 Checking Project Files..."
check_file "docker-compose.yml" "Docker Compose Configuration"
check_file ".env.local" "Local Environment Variables"
check_file "package.json" "Package Configuration"
check_file "drizzle.config.ts" "Drizzle ORM Configuration"
check_file "src/server.ts" "Backend Server"
check_file "src/worker-node.ts" "Worker Node"
echo ""

# ==============================================================================
# 3. Dependencies
# ==============================================================================
echo "📚 Checking Node Dependencies..."
if [ -d "node_modules/.pnpm" ] || [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Node modules installed"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗${NC} Node modules NOT installed — Run: pnpm install"
    ((CHECKS_FAILED++))
fi
echo ""

# ==============================================================================
# 4. Environment Configuration
# ==============================================================================
echo "⚙️  Checking Environment Configuration..."
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠${NC} .env.local NOT FOUND"
    echo "   → Copy from example: cp .env.local.example .env.local"
else
    echo -e "${GREEN}✓${NC} .env.local exists"
    ((CHECKS_PASSED++))
    
    check_env "NODE_ENV" "Node environment"
    check_env "DATABASE_URL" "Database URL"
    check_env "REDIS_HOST" "Redis host"
    check_env "JWT_SECRET" "JWT secret"
fi
echo ""

# ==============================================================================
# 5. Docker Verification
# ==============================================================================
echo "🐳 Checking Docker Setup..."
if docker ps &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
    ((CHECKS_PASSED++))
else
    echo -e "${RED}✗${NC} Docker daemon is NOT running"
    ((CHECKS_FAILED++))
fi
echo ""

# ==============================================================================
# 6. Available Scripts
# ==============================================================================
echo "🚀 Available Development Scripts:"
echo ""
echo "  Standard (recommended):"
echo -e "    ${GREEN}pnpm dev${NC}                  — Starts backend + frontend + Redis"
echo -e "    ${GREEN}pnpm dev:minimal${NC}         — Starts backend + frontend only (no Docker)"
echo -e "    ${GREEN}pnpm dev:observability${NC}   — Starts all + Prometheus + Grafana"
echo ""
echo "  Database:"
echo -e "    ${GREEN}pnpm db:migrate${NC}         — Run migrations"
echo -e "    ${GREEN}pnpm db:seed${NC}            — Populate test data"
echo -e "    ${GREEN}pnpm db:reset-and-seed${NC}  — Full reset"
echo -e "    ${GREEN}pnpm db:inspect${NC}         — Open Drizzle Studio (UI)"
echo ""
echo "  Management:"
echo -e "    ${GREEN}pnpm dev:stop${NC}           — Stop all containers"
echo -e "    ${GREEN}pnpm dev:redis:only${NC}     — Start only Redis"
echo -e "    ${GREEN}pnpm lint${NC}               — Run ESLint"
echo -e "    ${GREEN}pnpm test${NC}               — Run tests"
echo ""

# ==============================================================================
# 7. Summary
# ==============================================================================
echo "═══════════════════════════════════════════════════════════════════════"
echo "✅ VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════════════"
echo -e "Checks passed:  ${GREEN}${CHECKS_PASSED}${NC}"
if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "Checks failed:  ${RED}${CHECKS_FAILED}${NC}"
    echo ""
    echo "⚠️  Some checks failed. Please fix the issues above."
    exit 1
else
    echo -e "Checks failed:  ${GREEN}0${NC}"
    echo ""
    echo "🎉 Your Atlas Logistics development environment is ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Create/verify .env.local: cp .env.local.example .env.local"
    echo "  2. Install dependencies:     pnpm install"
    echo "  3. Run migrations:           pnpm db:migrate"
    echo "  4. Seed data:                pnpm db:seed"
    echo "  5. Start development:        pnpm dev"
    echo ""
    exit 0
fi
