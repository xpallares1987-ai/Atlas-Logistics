#!/bin/bash

# Docker Compose Health Check Validator
# Ensures all services reach healthy state before proceeding

set -e

TIMEOUT=${1:-120}
INTERVAL=2
ELAPSED=0

echo "🏥 Docker Compose Health Check"
echo "=============================="
echo "Waiting for services (timeout: ${TIMEOUT}s)..."
echo ""

# Define expected services
declare -A SERVICES=(
    [db]="Postgres"
    [redis]="Redis"
    [api]="API (Fastify)"
    [app]="Frontend"
    [worker]="Worker"
)

check_service_health() {
    local service=$1
    local status=$(docker compose ps "$service" --format '{{.Status}}' 2>/dev/null || echo "not-running")
    
    if [[ "$status" == *"healthy"* ]]; then
        return 0  # Healthy
    elif [[ "$status" == *"running"* ]] || [[ "$status" == *"Up"* ]]; then
        return 1  # Running but not healthy
    else
        return 2  # Not running
    fi
}

while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTHY=0
    RUNNING=0
    
    for service in "${!SERVICES[@]}"; do
        status=$(docker compose ps "$service" --format '{{.Status}}' 2>/dev/null || echo "not-running")
        
        if [[ "$status" == *"healthy"* ]]; then
            echo "✅ ${SERVICES[$service]} ($service): $status"
            HEALTHY=$((HEALTHY + 1))
        elif [[ "$status" == *"running"* ]] || [[ "$status" == *"Up"* ]]; then
            echo "🔄 ${SERVICES[$service]} ($service): $status (checking...)"
            RUNNING=$((RUNNING + 1))
        else
            echo "❌ ${SERVICES[$service]} ($service): $status"
        fi
    done
    
    TOTAL_SERVICES=${#SERVICES[@]}
    if [ $HEALTHY -eq $TOTAL_SERVICES ]; then
        echo ""
        echo "🎉 All services are healthy!"
        exit 0
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
    echo ""
done

echo "❌ Timeout reached. Not all services reached healthy state."
echo ""
echo "Debug info:"
docker compose ps
echo ""
echo "Recent logs:"
docker compose logs --tail=20
exit 1
