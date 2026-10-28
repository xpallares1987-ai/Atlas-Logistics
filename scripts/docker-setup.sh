#!/bin/bash
# ==============================================================================
# ATLAS LOGISTICS — Docker Setup & Configuration Script
# ==============================================================================
# This script sets up environment variables and Docker configuration
# for local development and production deployments.
#
# Usage: bash scripts/docker-setup.sh [dev|prod]
# ==============================================================================

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}===============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===============================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

generate_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    else
        head -c 32 /dev/urandom | base64
    fi
}

setup_dev() {
    print_header "Setting up Development Environment"
    
    # Check if .env.local exists
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        print_warning ".env.local already exists. Skipping."
        return
    fi
    
    # Copy from example
    if [ ! -f "$PROJECT_ROOT/.env.local.example" ]; then
        print_error ".env.local.example not found"
        return 1
    fi
    
    cp "$PROJECT_ROOT/.env.local.example" "$PROJECT_ROOT/.env.local"
    print_success "Created .env.local from template"
    
    echo ""
    echo "Development environment variables set to defaults:"
    echo "  NODE_ENV: development"
    echo "  DATABASE_URL: file:./data/dev.db"
    echo "  REDIS_URL: redis://redis:6379"
    echo "  JWT_SECRET: dev-super-secret-jwt-key-change-in-production"
    echo ""
    echo "Next steps:"
    echo "  1. Review .env.local and update any custom values"
    echo "  2. Run: docker compose up --pull always"
    echo "  3. Access: http://localhost:8080 (frontend)"
    echo "  4. Access: http://localhost:3001/docs (API docs)"
}

setup_prod() {
    print_header "Setting up Production Environment"
    
    # Check if .env.production exists
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        print_warning ".env.production already exists"
        read -p "Overwrite with new secrets? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Generate secrets
    print_warning "Generating new production secrets..."
    JWT_SECRET=$(generate_secret)
    COOKIE_SECRET=$(generate_secret)
    REDIS_PASSWORD=$(generate_secret)
    GRAFANA_PASSWORD=$(generate_secret)
    
    print_success "Generated JWT_SECRET"
    print_success "Generated COOKIE_SECRET"
    print_success "Generated REDIS_PASSWORD"
    print_success "Generated GRAFANA_ADMIN_PASSWORD"
    
    # Create .env.production
    cat > "$PROJECT_ROOT/.env.production" << EOF
# ==============================================================================
# ATLAS LOGISTICS — PRODUCTION ENVIRONMENT VARIABLES (.env.production)
# ==============================================================================
# PRODUCTION DEPLOYMENT ONLY — Never commit to git with real secrets
# Generated: $(date)
# ==============================================================================

NODE_ENV=production
LOG_LEVEL=info

# Database: SQLite (local) or libSQL (remote Turso)
DATABASE_URL=file:/data/prod.db

# Redis: Production instance
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=$REDIS_PASSWORD

# Backend Port
BACKEND_PORT=3001

# Frontend: Production API endpoint (UPDATE THIS!)
VITE_API_URL=https://api.yourdomain.com

# Authentication: Strong, randomly-generated secrets
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET

# Observability
GRAFANA_ADMIN_PASSWORD=$GRAFANA_PASSWORD
PROMETHEUS_RETENTION=30d
PROMETHEUS_EXTERNAL_URL=https://monitoring.yourdomain.com
GRAFANA_EXTERNAL_URL=https://monitoring.yourdomain.com

# Google Cloud / Firebase (Optional)
# GOOGLE_CLOUD_PROJECT=atlas-logistics-prod
# GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-key.json
# FIREBASE_TOKEN=/run/secrets/firebase-token
# GEMINI_API_KEY=/run/secrets/gemini-api-key
EOF
    
    print_success "Created .env.production with generated secrets"
    
    echo ""
    print_warning "IMPORTANT: Before deploying to production:"
    echo "  1. Update VITE_API_URL, PROMETHEUS_EXTERNAL_URL, GRAFANA_EXTERNAL_URL in .env.production"
    echo "  2. Move secrets to Docker Secrets or a secrets manager"
    echo "  3. Enable HTTPS/TLS on reverse proxy"
    echo "  4. Backup .env.production in a secure location"
    echo "  5. Run: docker compose -f docker-compose.prod.yml up -d --build"
    
    # Save secrets for reference
    mkdir -p "$PROJECT_ROOT/.secrets"
    cat > "$PROJECT_ROOT/.secrets/production-secrets.txt" << EOF
Generated Production Secrets: $(date)

JWT_SECRET: $JWT_SECRET
COOKIE_SECRET: $COOKIE_SECRET
REDIS_PASSWORD: $REDIS_PASSWORD
GRAFANA_ADMIN_PASSWORD: $GRAFANA_PASSWORD

IMPORTANT: Keep this file in a secure location. Move to a secrets manager before production.
EOF
    
    print_success "Backed up secrets to .secrets/production-secrets.txt (KEEP SECURE!)"
}

show_usage() {
    echo "Usage: bash $0 [dev|prod]"
    echo ""
    echo "Commands:"
    echo "  dev     Setup development environment (.env.local)"
    echo "  prod    Setup production environment (.env.production) with generated secrets"
    echo ""
    echo "Examples:"
    echo "  bash $0 dev"
    echo "  bash $0 prod"
}

# Main
if [ -z "$1" ]; then
    show_usage
    exit 1
fi

case "$1" in
    dev)
        setup_dev
        ;;
    prod)
        setup_prod
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac

print_header "Setup Complete!"
