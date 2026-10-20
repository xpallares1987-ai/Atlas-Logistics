#!/bin/bash
#
# Environment Validation Script for Atlas Logistics
# Purpose: Validate development environment before running pnpm commands
# Usage: bash scripts/check-env.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================

REQUIRED_NODE_VERSION=20
REQUIRED_PNPM_VERSION=10
REQUIRED_GIT_VERSION=2.25

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  🔍 ATLAS LOGISTICS ENVIRONMENT CHECK${NC}"
    echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_pass() {
    local message=$1
    echo -e "${GREEN}✓${NC} $message"
}

check_fail() {
    local message=$1
    local fix=$2
    echo -e "${RED}✗${NC} $message"
    if [ -n "$fix" ]; then
        echo -e "  ${YELLOW}Fix: $fix${NC}"
    fi
}

check_warn() {
    local message=$1
    echo -e "${YELLOW}⚠${NC} $message"
}

# ============================================================================
# CHECK 1: Node.js
# ============================================================================

check_node() {
    echo "📋 Checking Node.js..."
    
    if ! command -v node &> /dev/null; then
        check_fail "Node.js not installed" "Install from https://nodejs.org (v$REQUIRED_NODE_VERSION.x)"
        return 1
    fi
    
    CURRENT_NODE=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    CURRENT_NODE_FULL=$(node -v)
    
    if [ "$CURRENT_NODE" != "$REQUIRED_NODE_VERSION" ]; then
        check_fail "Node.js version mismatch" "Install v$REQUIRED_NODE_VERSION.x (current: $CURRENT_NODE_FULL)"
        return 1
    fi
    
    check_pass "Node.js $CURRENT_NODE_FULL"
    return 0
}

# ============================================================================
# CHECK 2: pnpm
# ============================================================================

check_pnpm() {
    echo "📋 Checking pnpm..."
    
    if ! command -v pnpm &> /dev/null; then
        check_fail "pnpm not installed" "npm install -g pnpm@$REQUIRED_PNPM_VERSION"
        return 1
    fi
    
    PNPM_VERSION=$(pnpm -v)
    PNPM_MAJOR=$(echo $PNPM_VERSION | cut -d '.' -f 1)
    
    if [ "$PNPM_MAJOR" -lt "$REQUIRED_PNPM_VERSION" ]; then
        check_warn "pnpm version old ($PNPM_VERSION, recommended: $REQUIRED_PNPM_VERSION+)"
        echo "  Update: npm install -g pnpm@latest"
    else
        check_pass "pnpm $PNPM_VERSION"
    fi
    
    return 0
}

# ============================================================================
# CHECK 3: Git
# ============================================================================

check_git() {
    echo "📋 Checking Git..."
    
    if ! command -v git &> /dev/null; then
        check_fail "Git not installed" "Install from https://git-scm.com"
        return 1
    fi
    
    GIT_VERSION=$(git --version | awk '{print $3}')
    check_pass "Git $GIT_VERSION"
    return 0
}

# ============================================================================
# CHECK 4: Git Configuration
# ============================================================================

check_git_config() {
    echo "📋 Checking Git configuration..."
    
    if ! git config user.name > /dev/null 2>&1; then
        check_fail "Git user.name not configured" "git config --global user.name 'Your Name'"
        return 1
    fi
    
    if ! git config user.email > /dev/null 2>&1; then
        check_fail "Git user.email not configured" "git config --global user.email 'you@example.com'"
        return 1
    fi
    
    check_pass "Git configured as $(git config user.name)"
    return 0
}

# ============================================================================
# CHECK 5: Git Hooks
# ============================================================================

check_git_hooks() {
    echo "📋 Checking Git hooks..."
    
    if [ -f ".git/hooks/pre-commit" ] && [ -x ".git/hooks/pre-commit" ]; then
        check_pass "Pre-commit hook installed"
    else
        check_warn "Pre-commit hook not found (will be installed by pnpm prepare)"
    fi
    
    if [ -f ".git/hooks/pre-push" ] && [ -x ".git/hooks/pre-push" ]; then
        check_pass "Pre-push hook installed"
    else
        check_warn "Pre-push hook not found (manually create: cp .githooks/pre-push .git/hooks/pre-push)"
    fi
    
    return 0
}

# ============================================================================
# CHECK 6: Project Structure
# ============================================================================

check_project_structure() {
    echo "📋 Checking project structure..."
    
    local REQUIRED_FILES=(
        "pnpm-workspace.yaml"
        "package.json"
        "vitest.config.ts"
        ".nvmrc"
        ".gitignore"
    )
    
    local MISSING_FILES=()
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            MISSING_FILES+=("$file")
        fi
    done
    
    if [ ${#MISSING_FILES[@]} -gt 0 ]; then
        check_fail "Missing project files: ${MISSING_FILES[*]}"
        return 1
    fi
    
    check_pass "Project structure valid"
    return 0
}

# ============================================================================
# CHECK 7: Environment Files
# ============================================================================

check_env_files() {
    echo "📋 Checking environment files..."
    
    if [ ! -f ".env.local" ]; then
        check_warn ".env.local not found (create from .env.example)"
        echo "  Recommended: cp .env.example .env.local && edit .env.local"
    else
        check_pass ".env.local found"
    fi
    
    if [ ! -f ".env.example" ]; then
        check_warn ".env.example not found"
    else
        check_pass ".env.example found"
    fi
    
    return 0
}

# ============================================================================
# CHECK 8: Node Modules
# ============================================================================

check_node_modules() {
    echo "📋 Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        check_warn "node_modules not found (run: pnpm install)"
        return 1
    fi
    
    local NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | awk '{print $1}' || echo "unknown")
    check_pass "node_modules ready ($NODE_MODULES_SIZE)"
    return 0
}

# ============================================================================
# CHECK 9: .nvmrc Compatibility
# ============================================================================

check_nvmrc() {
    echo "📋 Checking .nvmrc compatibility..."
    
    if [ ! -f ".nvmrc" ]; then
        check_fail ".nvmrc not found" "Create: echo '20.11.0' > .nvmrc"
        return 1
    fi
    
    NVMRC_VERSION=$(cat .nvmrc)
    CURRENT_VERSION=$(node -v | cut -d 'v' -f 2)
    
    if [[ "$CURRENT_VERSION" == "$NVMRC_VERSION"* ]]; then
        check_pass "Node version matches .nvmrc ($NVMRC_VERSION)"
    else
        check_warn "Node version mismatch (expected: $NVMRC_VERSION, current: $CURRENT_VERSION)"
        echo "  Run: nvm use (if using nvm)"
    fi
    
    return 0
}

# ============================================================================
# CHECK 10: Disk Space
# ============================================================================

check_disk_space() {
    echo "📋 Checking disk space..."
    
    local AVAILABLE=$(df . | awk 'NR==2 {print $4}')
    local REQUIRED_MB=1000  # 1GB minimum
    
    if [ "$AVAILABLE" -lt "$((REQUIRED_MB * 1024))" ]; then
        check_fail "Low disk space (available: $((AVAILABLE / 1024))MB, required: ${REQUIRED_MB}MB)"
        return 1
    fi
    
    local AVAILABLE_GB=$((AVAILABLE / 1024 / 1024))
    check_pass "Disk space available ($AVAILABLE_GB GB)"
    return 0
}

# ============================================================================
# CHECK 11: Memory
# ============================================================================

check_memory() {
    echo "📋 Checking available memory..."
    
    if command -v free &> /dev/null; then
        # Linux
        local AVAILABLE=$(free -m | awk 'NR==2 {print $7}')
        local REQUIRED=1000  # 1GB recommended
        
        if [ "$AVAILABLE" -lt "$REQUIRED" ]; then
            check_warn "Low available memory ($AVAILABLE MB, recommended: ${REQUIRED}MB)"
        else
            check_pass "Memory available ($AVAILABLE MB)"
        fi
    elif command -v vm_stat &> /dev/null; then
        # macOS
        check_pass "Memory check (macOS detected)"
    else
        check_warn "Could not determine available memory"
    fi
    
    return 0
}

# ============================================================================
# SUMMARY
# ============================================================================

print_summary() {
    echo ""
    echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
    
    if [ $TOTAL_FAILURES -eq 0 ]; then
        echo -e "${GREEN}✓ Environment validation passed!${NC}"
        echo ""
        echo "Ready to start development:"
        echo "  pnpm dev:minimal          # Fast mode (recommended)"
        echo "  pnpm dev                  # Full mode with Redis"
        echo "  pnpm dev:observability    # With monitoring"
        echo ""
    else
        echo -e "${RED}✗ Environment has $TOTAL_FAILURES issue(s)${NC}"
        echo ""
        echo "Fix the issues above and run this script again."
        echo ""
    fi
    
    echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

TOTAL_FAILURES=0

print_header

# Run all checks
check_node || ((TOTAL_FAILURES++))
check_pnpm
check_git || ((TOTAL_FAILURES++))
check_git_config || ((TOTAL_FAILURES++))
check_git_hooks
check_project_structure || ((TOTAL_FAILURES++))
check_env_files
check_node_modules || ((TOTAL_FAILURES++))
check_nvmrc
check_disk_space || ((TOTAL_FAILURES++))
check_memory

print_summary

exit $TOTAL_FAILURES
