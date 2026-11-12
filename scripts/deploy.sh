#!/bin/bash
#
# Atlas Logistics — Production Deployment Script
# Usage: ./scripts/deploy.sh [environment] [image-tag]
#
# Examples:
#   ./scripts/deploy.sh production latest
#   ./scripts/deploy.sh staging v1.2.3
#   ./scripts/deploy.sh production frontend-abc123def456
#

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="atlas-logistics"
REGISTRY="ghcr.io/xpallares1987-ai/atlas-logistics"

# Arguments
ENVIRONMENT="${1:-production}"
IMAGE_TAG="${2:-latest}"
SERVICES=("backend" "frontend" "worker")

# Log functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[✓]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found. Please install kubectl."
    exit 1
  fi

  if ! command -v docker &> /dev/null; then
    log_error "docker not found. Please install Docker."
    exit 1
  fi

  # Check kubectl connection
  if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to Kubernetes cluster."
    exit 1
  fi

  # Check namespace exists
  if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log_warn "Namespace $NAMESPACE does not exist. Creating..."
    kubectl create namespace "$NAMESPACE"
    kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
  fi

  log_success "Prerequisites check passed"
}

# Verify images exist
verify_images() {
  log_info "Verifying container images..."

  for service in "${SERVICES[@]}"; do
    image="${REGISTRY}:${service}-${IMAGE_TAG}"
    log_info "Checking image: $image"
    
    # Try to pull the image to verify it exists
    if docker pull "$image" 2>/dev/null; then
      log_success "Image exists: $image"
    else
      log_error "Image not found: $image"
      log_error "Make sure the image is built and pushed to $REGISTRY"
      exit 1
    fi
  done
}

# Check environment secrets
check_secrets() {
  log_info "Checking Kubernetes secrets..."

  if kubectl get secret atlas-secrets -n "$NAMESPACE" &> /dev/null; then
    log_success "Secret 'atlas-secrets' exists"
  else
    log_error "Secret 'atlas-secrets' not found in namespace $NAMESPACE"
    log_error "Create it with:"
    log_error "  kubectl create secret generic atlas-secrets \\"
    log_error "    --from-literal=JWT_SECRET=\$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\") \\"
    log_error "    --from-literal=POSTGRES_PASSWORD=\$(openssl rand -base64 32) \\"
    log_error "    -n $NAMESPACE"
    exit 1
  fi
}

# Create/update ConfigMap
update_configmap() {
  log_info "Updating ConfigMap..."

  kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: atlas-config
  namespace: $NAMESPACE
data:
  NODE_ENV: "$ENVIRONMENT"
  LOG_LEVEL: "$([ "$ENVIRONMENT" = "production" ] && echo 'info' || echo 'debug')"
  ENABLE_WORKERS: "true"
  WORKER_CONCURRENCY: "10"
  WORKER_MAX_ATTEMPTS: "3"
  PROMETHEUS_ENABLED: "true"
  REDIS_URL: "redis://redis:6379"
  DATABASE_URL: "postgresql://postgres:5432/atlas"
EOF

  log_success "ConfigMap updated"
}

# Deploy using kubectl apply
deploy_manifests() {
  log_info "Deploying Kubernetes manifests..."

  # Apply configuration first
  kubectl apply -f "$PROJECT_ROOT/k8s/01-atlas-deployment.yaml" -n "$NAMESPACE"
  kubectl apply -f "$PROJECT_ROOT/k8s/02-prometheus-monitoring.yaml" -n "$NAMESPACE"

  log_success "Manifests applied"
}

# Update image tags
update_image_tags() {
  log_info "Updating image tags to: $IMAGE_TAG"

  for service in "${SERVICES[@]}"; do
    image="${REGISTRY}:${service}-${IMAGE_TAG}"
    log_info "Updating deployment: $service to $image"
    
    kubectl set image deployment/$service \
      $service="$image" \
      -n "$NAMESPACE" \
      --record
  done

  log_success "Image tags updated"
}

# Wait for rollout
wait_for_rollout() {
  log_info "Waiting for rollout to complete..."

  for service in "${SERVICES[@]}"; do
    log_info "Waiting for $service deployment..."
    if kubectl rollout status deployment/"$service" \
      -n "$NAMESPACE" \
      --timeout=5m; then
      log_success "$service rollout completed"
    else
      log_error "$service rollout failed or timed out"
      log_info "Checking pod status..."
      kubectl get pods -n "$NAMESPACE" -l app="$service"
      log_info "Pod logs (last 50 lines):"
      kubectl logs -n "$NAMESPACE" -l app="$service" --tail=50 --all-containers=true || true
      exit 1
    fi
  done

  log_success "All deployments rolled out successfully"
}

# Verify deployment
verify_deployment() {
  log_info "Verifying deployment..."

  # Check pod status
  log_info "Pod status:"
  kubectl get pods -n "$NAMESPACE"

  # Check services
  log_info "Services:"
  kubectl get svc -n "$NAMESPACE"

  # Check for any pending pods
  pending_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Pending -o json | jq '.items | length')
  if [ "$pending_pods" -gt 0 ]; then
    log_warn "Found $pending_pods pending pods"
    kubectl describe pods -n "$NAMESPACE" --field-selector=status.phase=Pending
  fi

  # Check for pod errors
  error_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Failed -o json | jq '.items | length')
  if [ "$error_pods" -gt 0 ]; then
    log_error "Found $error_pods failed pods"
    kubectl describe pods -n "$NAMESPACE" --field-selector=status.phase=Failed
    exit 1
  fi

  log_success "Deployment verified"
}

# Test endpoints
test_endpoints() {
  log_info "Testing service endpoints..."

  # Get LoadBalancer IP for frontend
  frontend_ip=$(kubectl get svc frontend -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
  
  if [ "$frontend_ip" != "pending" ]; then
    log_info "Frontend URL: http://$frontend_ip"
    if curl -s -f "http://$frontend_ip/" > /dev/null; then
      log_success "Frontend is responding"
    else
      log_warn "Frontend not yet responding (may still be starting)"
    fi
  else
    log_warn "Frontend LoadBalancer IP not yet assigned (it's pending)"
    log_info "Run: kubectl get svc -n $NAMESPACE to check status"
  fi

  # Test backend through port-forward
  log_info "Testing backend health (via port-forward)..."
  
  # Find a running backend pod
  backend_pod=$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
  
  if [ -n "$backend_pod" ]; then
    if kubectl exec -n "$NAMESPACE" "$backend_pod" -- curl -s -f http://localhost:3001/health > /dev/null; then
      log_success "Backend health check passed"
    else
      log_warn "Backend health check failed"
    fi
  else
    log_warn "No backend pods found to test"
  fi
}

# Rollback function
rollback() {
  log_warn "Rolling back deployment..."

  for service in "${SERVICES[@]}"; do
    kubectl rollout undo deployment/"$service" -n "$NAMESPACE"
  done

  log_success "Rollback completed"
}

# Main deployment flow
main() {
  log_info "=========================================="
  log_info "Atlas Logistics — Production Deployment"
  log_info "=========================================="
  log_info "Environment: $ENVIRONMENT"
  log_info "Image Tag:   $IMAGE_TAG"
  log_info "Namespace:   $NAMESPACE"
  log_info "Registry:    $REGISTRY"
  log_info "=========================================="

  # Trap errors and rollback
  trap 'rollback' ERR

  check_prerequisites
  verify_images
  check_secrets
  update_configmap
  deploy_manifests
  update_image_tags
  wait_for_rollout
  verify_deployment
  test_endpoints

  log_success "=========================================="
  log_success "Deployment completed successfully!"
  log_success "=========================================="
  log_info "Monitor deployment with:"
  log_info "  kubectl logs -f deployment/backend -n $NAMESPACE"
  log_info "  kubectl logs -f deployment/frontend -n $NAMESPACE"
  log_info "  kubectl logs -f deployment/worker -n $NAMESPACE"
}

# Display help
show_help() {
  cat <<EOF
Atlas Logistics — Production Deployment Script

Usage: $0 [ENVIRONMENT] [IMAGE_TAG]

Arguments:
  ENVIRONMENT  Environment to deploy to (default: production)
  IMAGE_TAG    Container image tag (default: latest)

Examples:
  $0 production latest
  $0 staging v1.2.3
  $0 production frontend-abc123def456

Prerequisites:
  - kubectl configured and connected to cluster
  - Docker installed and authenticated to ghcr.io
  - atlas-secrets secret created in kubernetes cluster
  - Sufficient RBAC permissions

Commands:
  $0 --help     Show this help message
  $0 --status   Check deployment status
  $0 --logs     Tail deployment logs

Environment Variables:
  NAMESPACE    Kubernetes namespace (default: atlas-logistics)
  REGISTRY     Container registry (default: ghcr.io/xpallares1987-ai/atlas-logistics)

For more information, see DEPLOYMENT.md
EOF
}

# Handle special commands
case "${1:-}" in
  --help)
    show_help
    exit 0
    ;;
  --status)
    kubectl get all -n "$NAMESPACE"
    exit 0
    ;;
  --logs)
    kubectl logs -f deployment/backend -n "$NAMESPACE"
    exit 0
    ;;
esac

# Run main deployment
main "$@"
