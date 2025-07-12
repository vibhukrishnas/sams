#!/bin/bash

# SAMS Blue-Green Deployment Script
# Implements zero-downtime deployment strategy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="production"
TIMEOUT=300
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
}

# Function to check if namespace exists
check_namespace() {
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
}

# Function to get current active color
get_active_color() {
    local service_name=$1
    local current_selector=$(kubectl get service "${service_name}-service" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "")
    
    if [[ "$current_selector" == "blue" ]]; then
        echo "blue"
    elif [[ "$current_selector" == "green" ]]; then
        echo "green"
    else
        echo "blue"  # Default to blue if no color is set
    fi
}

# Function to get inactive color
get_inactive_color() {
    local active_color=$1
    if [[ "$active_color" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to deploy to inactive environment
deploy_inactive() {
    local service_name=$1
    local image_tag=$2
    local active_color=$3
    local inactive_color=$4
    
    print_info "Deploying $service_name:$image_tag to $inactive_color environment"
    
    # Create deployment for inactive color
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service_name}-${inactive_color}
  namespace: ${NAMESPACE}
  labels:
    app: ${service_name}
    color: ${inactive_color}
    version: ${image_tag}
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: ${service_name}
      color: ${inactive_color}
  template:
    metadata:
      labels:
        app: ${service_name}
        color: ${inactive_color}
        version: ${image_tag}
    spec:
      containers:
      - name: ${service_name}
        image: ghcr.io/sams/${service_name}:${image_tag}
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "production"
        - name: COLOR
          value: "${inactive_color}"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
EOF
    
    # Wait for deployment to be ready
    print_info "Waiting for $inactive_color deployment to be ready..."
    kubectl rollout status deployment/${service_name}-${inactive_color} -n "$NAMESPACE" --timeout=${TIMEOUT}s
    
    if [[ $? -eq 0 ]]; then
        print_success "$inactive_color deployment is ready"
    else
        print_error "$inactive_color deployment failed"
        return 1
    fi
}

# Function to perform health checks
health_check() {
    local service_name=$1
    local color=$2
    
    print_info "Performing health checks on $color environment"
    
    local pod_name=$(kubectl get pods -n "$NAMESPACE" -l app="$service_name",color="$color" -o jsonpath='{.items[0].metadata.name}')
    
    if [[ -z "$pod_name" ]]; then
        print_error "No pods found for $service_name-$color"
        return 1
    fi
    
    for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
        print_info "Health check attempt $i/$HEALTH_CHECK_RETRIES"
        
        if kubectl exec -n "$NAMESPACE" "$pod_name" -- curl -f http://localhost:8080/actuator/health &> /dev/null; then
            print_success "Health check passed"
            return 0
        fi
        
        if [[ $i -lt $HEALTH_CHECK_RETRIES ]]; then
            print_warning "Health check failed, retrying in ${HEALTH_CHECK_INTERVAL}s..."
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done
    
    print_error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Function to switch traffic
switch_traffic() {
    local service_name=$1
    local new_color=$2
    
    print_info "Switching traffic to $new_color environment"
    
    kubectl patch service "${service_name}-service" -n "$NAMESPACE" -p '{"spec":{"selector":{"color":"'$new_color'"}}}'
    
    if [[ $? -eq 0 ]]; then
        print_success "Traffic switched to $new_color environment"
    else
        print_error "Failed to switch traffic"
        return 1
    fi
}

# Function to cleanup old deployment
cleanup_old() {
    local service_name=$1
    local old_color=$2
    
    print_info "Cleaning up $old_color environment"
    
    kubectl delete deployment "${service_name}-${old_color}" -n "$NAMESPACE" --ignore-not-found=true
    
    if [[ $? -eq 0 ]]; then
        print_success "Cleaned up $old_color environment"
    else
        print_warning "Failed to cleanup $old_color environment"
    fi
}

# Function to rollback deployment
rollback() {
    local service_name=$1
    local safe_color=$2
    
    print_error "Rolling back to $safe_color environment"
    
    kubectl patch service "${service_name}-service" -n "$NAMESPACE" -p '{"spec":{"selector":{"color":"'$safe_color'"}}}'
    
    if [[ $? -eq 0 ]]; then
        print_success "Rollback completed to $safe_color environment"
    else
        print_error "Rollback failed"
        exit 1
    fi
}

# Function to create service if it doesn't exist
ensure_service() {
    local service_name=$1
    
    if ! kubectl get service "${service_name}-service" -n "$NAMESPACE" &> /dev/null; then
        print_info "Creating service for $service_name"
        
        cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: ${service_name}-service
  namespace: ${NAMESPACE}
  labels:
    app: ${service_name}
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
    name: http
  selector:
    app: ${service_name}
    color: blue
EOF
    fi
}

# Main deployment function
main() {
    local service_name=$1
    local image_tag=$2
    
    if [[ -z "$service_name" || -z "$image_tag" ]]; then
        print_error "Usage: $0 <service-name> <image-tag>"
        exit 1
    fi
    
    print_info "Starting blue-green deployment for $service_name:$image_tag"
    
    # Prerequisites
    check_kubectl
    check_namespace
    ensure_service "$service_name"
    
    # Get current state
    local active_color=$(get_active_color "$service_name")
    local inactive_color=$(get_inactive_color "$active_color")
    
    print_info "Current active environment: $active_color"
    print_info "Deploying to inactive environment: $inactive_color"
    
    # Deploy to inactive environment
    if ! deploy_inactive "$service_name" "$image_tag" "$active_color" "$inactive_color"; then
        print_error "Deployment to $inactive_color failed"
        exit 1
    fi
    
    # Perform health checks
    if ! health_check "$service_name" "$inactive_color"; then
        print_error "Health checks failed for $inactive_color"
        cleanup_old "$service_name" "$inactive_color"
        exit 1
    fi
    
    # Switch traffic
    if ! switch_traffic "$service_name" "$inactive_color"; then
        print_error "Traffic switch failed"
        rollback "$service_name" "$active_color"
        cleanup_old "$service_name" "$inactive_color"
        exit 1
    fi
    
    # Final health check after traffic switch
    sleep 10
    if ! health_check "$service_name" "$inactive_color"; then
        print_error "Post-switch health checks failed"
        rollback "$service_name" "$active_color"
        cleanup_old "$service_name" "$inactive_color"
        exit 1
    fi
    
    # Cleanup old environment
    cleanup_old "$service_name" "$active_color"
    
    print_success "Blue-green deployment completed successfully!"
    print_success "Service $service_name is now running $image_tag in $inactive_color environment"
}

# Execute main function
main "$@"
