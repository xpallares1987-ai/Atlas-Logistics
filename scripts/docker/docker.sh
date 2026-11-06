#!/bin/bash
# ==============================================================================
# Atlas Logistics — Docker Compose Convenience Scripts
# Usage: ./scripts/docker/start-dev.sh
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==============================================================================
# START - Development Environment
# ==============================================================================
start_dev() {
    echo -e "${BLUE}▶ Starting development environment...${NC}"
    
    if [ ! -f ".env.local" ]; then
        echo -e "${YELLOW}⚠ .env.local not found. Creating from template...${NC}"
        cp .env.local.example .env.local 2>/dev/null || echo "DATABASE_URL=file:./data/dev.db" > .env.local
    fi
    
    echo -e "${BLUE}• Starting Redis...${NC}"
    docker compose up -d redis
    
    # Wait for Redis to be healthy
    RETRY=0
    while [ $RETRY -lt 10 ]; do
        if docker compose exec -T redis redis-cli ping &>/dev/null; then
            echo -e "${GREEN}✓ Redis is healthy${NC}"
            break
        fi
        RETRY=$((RETRY + 1))
        sleep 2
    done
    
    echo -e "${BLUE}• Database migrations & seed...${NC}"
    pnpm run db:migrate
    pnpm run db:seed
    
    echo -e "${GREEN}✅ Development environment ready!${NC}"
    echo -e "${BLUE}Run: pnpm run dev${NC}"
}

# ==============================================================================
# START PROD - Production Single-Host Deployment
# ==============================================================================
start_prod() {
    echo -e "${BLUE}▶ Starting production environment...${NC}"
    
    if [ ! -f ".env.production" ]; then
        echo -e "${RED}✗ .env.production not found!${NC}"
        echo -e "${YELLOW}Create .env.production with required secrets:${NC}"
        echo "  - JWT_SECRET"
        echo "  - GRAFANA_ADMIN_PASSWORD"
        exit 1
    fi
    
    echo -e "${BLUE}• Building container images...${NC}"
    docker compose -f docker-compose.prod.yml build
    
    echo -e "${BLUE}• Starting services...${NC}"
    docker compose -f docker-compose.prod.yml up --pull always -d
    
    echo -e "${GREEN}✅ Production deployment started!${NC}"
    echo -e "${BLUE}Services:${NC}"
    echo "  • Frontend:    http://localhost"
    echo "  • API:         http://localhost/api"
    echo "  • Swagger:     http://localhost/docs"
    
    if [ "$1" == "--with-observability" ]; then
        echo -e "${BLUE}• Starting observability stack...${NC}"
        docker compose -f docker-compose.prod.yml --profile observability up -d
        echo "  • Prometheus:  http://localhost:9090"
        echo "  • Grafana:     http://localhost:3002"
    fi
    
    echo -e "${BLUE}View logs: docker compose -f docker-compose.prod.yml logs -f${NC}"
}

# ==============================================================================
# STOP - Stop all services
# ==============================================================================
stop() {
    COMPOSE_FILE="${1:-docker-compose.yml}"
    echo -e "${BLUE}▶ Stopping services (${COMPOSE_FILE})...${NC}"
    
    docker compose -f "$COMPOSE_FILE" down --remove-orphans
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# ==============================================================================
# RESTART - Restart specific service
# ==============================================================================
restart() {
    SERVICE="$1"
    COMPOSE_FILE="${2:-docker-compose.yml}"
    
    if [ -z "$SERVICE" ]; then
        echo "Usage: restart <service-name> [docker-compose file]"
        echo "Services: backend, frontend, redis, worker, prometheus, grafana"
        exit 1
    fi
    
    echo -e "${BLUE}▶ Restarting ${SERVICE}...${NC}"
    docker compose -f "$COMPOSE_FILE" restart "$SERVICE"
    echo -e "${GREEN}✅ ${SERVICE} restarted${NC}"
}

# ==============================================================================
# LOGS - View service logs
# ==============================================================================
logs() {
    SERVICE="${1:-backend}"
    COMPOSE_FILE="${2:-docker-compose.yml}"
    
    echo -e "${BLUE}▶ Tailing logs for ${SERVICE}...${NC}"
    docker compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
}

# ==============================================================================
# CLEAN - Clean volumes and containers
# ==============================================================================
clean() {
    COMPOSE_FILE="${1:-docker-compose.yml}"
    
    echo -e "${RED}⚠ This will remove all containers and volumes!${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
        echo -e "${GREEN}✅ Cleanup complete${NC}"
    fi
}

# ==============================================================================
# SHELL - Access container shell
# ==============================================================================
shell() {
    SERVICE="${1:-backend}"
    COMPOSE_FILE="${2:-docker-compose.yml}"
    
    echo -e "${BLUE}▶ Opening shell in ${SERVICE}...${NC}"
    docker compose -f "$COMPOSE_FILE" exec "$SERVICE" sh
}

# ==============================================================================
# STATUS - Show service status
# ==============================================================================
status() {
    COMPOSE_FILE="${1:-docker-compose.yml}"
    
    echo -e "${BLUE}▶ Service Status${NC}"
    docker compose -f "$COMPOSE_FILE" ps
    
    echo ""
    echo -e "${BLUE}Disk Usage:${NC}"
    docker system df
}

# ==============================================================================
# BUILD - Rebuild images
# ==============================================================================
build_images() {
    COMPOSE_FILE="${1:-docker-compose.yml}"
    
    echo -e "${BLUE}▶ Building images...${NC}"
    docker compose -f "$COMPOSE_FILE" build --no-cache
    echo -e "${GREEN}✅ Build complete${NC}"
}

# ==============================================================================
# Help
# ==============================================================================
show_help() {
    cat << EOF
${BLUE}Atlas Logistics — Docker Convenience Scripts${NC}

Usage: ./scripts/docker/docker.sh <command> [args]

Commands:
  start-dev               Start development environment (Redis + DB)
  start-prod [--obs]      Start production deployment (with optional observability)
  stop [file]             Stop all services
  restart <service>       Restart a specific service
  logs <service>          View service logs
  clean [file]            Remove all containers and volumes
  shell <service>         Open shell in container
  status [file]           Show service status and disk usage
  build [file]            Rebuild all images

Examples:
  ./scripts/docker/docker.sh start-dev
  ./scripts/docker/docker.sh logs backend
  ./scripts/docker/docker.sh restart worker docker-compose.prod.yml
  ./scripts/docker/docker.sh clean docker-compose.prod.yml

EOF
}

# ==============================================================================
# Main
# ==============================================================================
COMMAND="${1:-help}"

case "$COMMAND" in
    start-dev)
        start_dev
        ;;
    start-prod)
        start_prod "${2:-}"
        ;;
    stop)
        stop "${2:-docker-compose.yml}"
        ;;
    restart)
        restart "$2" "${3:-docker-compose.yml}"
        ;;
    logs)
        logs "${2:-backend}" "${3:-docker-compose.yml}"
        ;;
    clean)
        clean "${2:-docker-compose.yml}"
        ;;
    shell)
        shell "${2:-backend}" "${3:-docker-compose.yml}"
        ;;
    status)
        status "${2:-docker-compose.yml}"
        ;;
    build)
        build_images "${2:-docker-compose.yml}"
        ;;
    help)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac
