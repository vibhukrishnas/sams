#!/bin/bash

# SAMS Health Check Script
# Comprehensive health monitoring for deployed services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TIMEOUT=300
MAX_RETRIES=10
RETRY_INTERVAL=30

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

# Function to check service health
check_service_health() {
    local environment=$1
    local service=$2
    local namespace=$environment
    
    print_info "Checking health for $service in $environment environment"
    
    # Get service endpoint
    local service_url=""
    if [[ "$environment" == "production" ]]; then
        case "$service" in
            "backend")
                service_url="https://api.sams.production.com"
                ;;
            "frontend")
                service_url="https://sams.production.com"
                ;;
            *)
                print_error "Unknown service: $service"
                return 1
                ;;
        esac
    elif [[ "$environment" == "staging" ]]; then
        case "$service" in
            "backend")
                service_url="https://api.sams.staging.com"
                ;;
            "frontend")
                service_url="https://sams.staging.com"
                ;;
            *)
                print_error "Unknown service: $service"
                return 1
                ;;
        esac
    else
        print_error "Unknown environment: $environment"
        return 1
    fi
    
    # Perform health checks
    local health_passed=true
    
    # 1. Basic connectivity check
    print_info "Checking basic connectivity..."
    if curl -f -s --max-time 10 "$service_url/health" > /dev/null; then
        print_success "✓ Basic connectivity check passed"
    else
        print_error "✗ Basic connectivity check failed"
        health_passed=false
    fi
    
    # 2. Service-specific health checks
    if [[ "$service" == "backend" ]]; then
        # Backend health checks
        print_info "Checking backend-specific endpoints..."
        
        # Database connectivity
        if curl -f -s --max-time 10 "$service_url/actuator/health/db" > /dev/null; then
            print_success "✓ Database connectivity check passed"
        else
            print_error "✗ Database connectivity check failed"
            health_passed=false
        fi
        
        # Redis connectivity
        if curl -f -s --max-time 10 "$service_url/actuator/health/redis" > /dev/null; then
            print_success "✓ Redis connectivity check passed"
        else
            print_error "✗ Redis connectivity check failed"
            health_passed=false
        fi
        
        # API endpoints
        if curl -f -s --max-time 10 "$service_url/api/servers" -H "Authorization: Bearer test-token" > /dev/null; then
            print_success "✓ API endpoints check passed"
        else
            print_warning "⚠ API endpoints check failed (may require authentication)"
        fi
        
        # Metrics endpoint
        if curl -f -s --max-time 10 "$service_url/actuator/prometheus" > /dev/null; then
            print_success "✓ Metrics endpoint check passed"
        else
            print_error "✗ Metrics endpoint check failed"
            health_passed=false
        fi
        
    elif [[ "$service" == "frontend" ]]; then
        # Frontend health checks
        print_info "Checking frontend-specific endpoints..."
        
        # Static assets
        if curl -f -s --max-time 10 "$service_url/static/js/main.js" > /dev/null; then
            print_success "✓ Static assets check passed"
        else
            print_warning "⚠ Static assets check failed"
        fi
        
        # Main page load
        if curl -f -s --max-time 10 "$service_url/" | grep -q "SAMS"; then
            print_success "✓ Main page load check passed"
        else
            print_error "✗ Main page load check failed"
            health_passed=false
        fi
    fi
    
    # 3. Performance checks
    print_info "Checking response times..."
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' --max-time 10 "$service_url/health")
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        print_success "✓ Response time check passed (${response_time_ms}ms)"
    else
        print_warning "⚠ Response time check slow (${response_time_ms}ms)"
    fi
    
    # 4. SSL/TLS checks (for production)
    if [[ "$environment" == "production" ]]; then
        print_info "Checking SSL/TLS configuration..."
        if echo | openssl s_client -connect "$(echo $service_url | sed 's|https://||')" -servername "$(echo $service_url | sed 's|https://||')" 2>/dev/null | openssl x509 -noout -dates | grep -q "notAfter"; then
            print_success "✓ SSL/TLS check passed"
        else
            print_error "✗ SSL/TLS check failed"
            health_passed=false
        fi
    fi
    
    return $health_passed
}

# Function to check Kubernetes resources
check_k8s_resources() {
    local environment=$1
    local service=$2
    local namespace=$environment
    
    print_info "Checking Kubernetes resources for $service in $namespace"
    
    # Check deployment status
    local deployment_name="sams-$service"
    if kubectl get deployment "$deployment_name" -n "$namespace" &> /dev/null; then
        local ready_replicas=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.status.readyReplicas}')
        local desired_replicas=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.spec.replicas}')
        
        if [[ "$ready_replicas" == "$desired_replicas" ]]; then
            print_success "✓ Deployment status: $ready_replicas/$desired_replicas replicas ready"
        else
            print_error "✗ Deployment status: $ready_replicas/$desired_replicas replicas ready"
            return 1
        fi
    else
        print_error "✗ Deployment $deployment_name not found"
        return 1
    fi
    
    # Check pod status
    local pods=$(kubectl get pods -n "$namespace" -l app="sams-$service" --no-headers)
    local total_pods=$(echo "$pods" | wc -l)
    local running_pods=$(echo "$pods" | grep -c "Running" || echo "0")
    
    if [[ "$running_pods" == "$total_pods" ]]; then
        print_success "✓ Pod status: $running_pods/$total_pods pods running"
    else
        print_error "✗ Pod status: $running_pods/$total_pods pods running"
        return 1
    fi
    
    # Check service status
    local service_name="sams-$service-service"
    if kubectl get service "$service_name" -n "$namespace" &> /dev/null; then
        print_success "✓ Service $service_name exists"
    else
        print_error "✗ Service $service_name not found"
        return 1
    fi
    
    # Check HPA status (if exists)
    local hpa_name="sams-$service-hpa"
    if kubectl get hpa "$hpa_name" -n "$namespace" &> /dev/null; then
        local current_replicas=$(kubectl get hpa "$hpa_name" -n "$namespace" -o jsonpath='{.status.currentReplicas}')
        local desired_replicas=$(kubectl get hpa "$hpa_name" -n "$namespace" -o jsonpath='{.status.desiredReplicas}')
        print_success "✓ HPA status: $current_replicas/$desired_replicas replicas"
    fi
    
    return 0
}

# Function to check resource usage
check_resource_usage() {
    local environment=$1
    local service=$2
    local namespace=$environment
    
    print_info "Checking resource usage for $service in $namespace"
    
    # Get pod metrics
    local pods=$(kubectl get pods -n "$namespace" -l app="sams-$service" -o jsonpath='{.items[*].metadata.name}')
    
    for pod in $pods; do
        if kubectl top pod "$pod" -n "$namespace" &> /dev/null; then
            local metrics=$(kubectl top pod "$pod" -n "$namespace" --no-headers)
            print_info "Pod $pod: $metrics"
        else
            print_warning "⚠ Unable to get metrics for pod $pod"
        fi
    done
    
    return 0
}

# Function to run comprehensive health check
comprehensive_health_check() {
    local environment=$1
    local service=$2
    
    print_info "Starting comprehensive health check for $service in $environment"
    
    local overall_health=true
    
    # 1. Kubernetes resources check
    if ! check_k8s_resources "$environment" "$service"; then
        overall_health=false
    fi
    
    # 2. Service health check
    if ! check_service_health "$environment" "$service"; then
        overall_health=false
    fi
    
    # 3. Resource usage check
    check_resource_usage "$environment" "$service"
    
    # 4. Generate health report
    generate_health_report "$environment" "$service" "$overall_health"
    
    if [[ "$overall_health" == true ]]; then
        print_success "Overall health check PASSED for $service in $environment"
        return 0
    else
        print_error "Overall health check FAILED for $service in $environment"
        return 1
    fi
}

# Function to generate health report
generate_health_report() {
    local environment=$1
    local service=$2
    local health_status=$3
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    local report_file="health-report-${environment}-${service}-$(date +%Y%m%d_%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "$environment",
  "service": "$service",
  "overall_status": "$health_status",
  "checks": {
    "kubernetes_resources": "$(check_k8s_resources "$environment" "$service" && echo "PASS" || echo "FAIL")",
    "service_health": "$(check_service_health "$environment" "$service" && echo "PASS" || echo "FAIL")",
    "resource_usage": "CHECKED"
  },
  "metadata": {
    "checker": "health-check.sh",
    "version": "1.0.0"
  }
}
EOF
    
    print_info "Health report generated: $report_file"
}

# Main function
main() {
    local environment=$1
    local service=$2
    
    if [[ -z "$environment" || -z "$service" ]]; then
        print_error "Usage: $0 <environment> <service>"
        print_error "Environment: production, staging"
        print_error "Service: backend, frontend"
        exit 1
    fi
    
    # Validate inputs
    if [[ "$environment" != "production" && "$environment" != "staging" ]]; then
        print_error "Invalid environment: $environment"
        exit 1
    fi
    
    if [[ "$service" != "backend" && "$service" != "frontend" ]]; then
        print_error "Invalid service: $service"
        exit 1
    fi
    
    # Check prerequisites
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed or not in PATH"
        exit 1
    fi
    
    # Run comprehensive health check
    comprehensive_health_check "$environment" "$service"
}

# Execute main function
main "$@"
