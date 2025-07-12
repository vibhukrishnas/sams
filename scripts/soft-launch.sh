#!/bin/bash

# SAMS Soft Launch Strategy Implementation
# Gradual rollout with limited users and comprehensive monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
ENVIRONMENT="production"
NAMESPACE="production"
SOFT_LAUNCH_PERCENTAGE=10  # Start with 10% of traffic
MONITORING_INTERVAL=60     # Monitor every minute
PHASE_DURATION=1800        # 30 minutes per phase

# Function to print colored output
print_header() {
    echo -e "${PURPLE}[SOFT-LAUNCH]${NC} $1"
}

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

print_metric() {
    echo -e "${CYAN}[METRIC]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking soft launch prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    # Check if services are running
    if ! kubectl get deployment sams-backend -n "$NAMESPACE" &> /dev/null; then
        print_error "Backend deployment not found"
        exit 1
    fi
    
    if ! kubectl get deployment sams-frontend -n "$NAMESPACE" &> /dev/null; then
        print_error "Frontend deployment not found"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Function to create canary deployment
create_canary_deployment() {
    local service=$1
    local percentage=$2
    
    print_info "Creating canary deployment for $service with $percentage% traffic"
    
    # Create canary deployment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service}-canary
  namespace: ${NAMESPACE}
  labels:
    app: ${service}
    version: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${service}
      version: canary
  template:
    metadata:
      labels:
        app: ${service}
        version: canary
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
    spec:
      containers:
      - name: ${service}
        image: ghcr.io/sams/${service}:${IMAGE_TAG:-latest}
        ports:
        - containerPort: 8080
        env:
        - name: ENVIRONMENT
          value: "production-canary"
        - name: CANARY_DEPLOYMENT
          value: "true"
        resources:
          requests:
            memory: "256Mi"
            cpu: "125m"
          limits:
            memory: "512Mi"
            cpu: "250m"
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
    
    # Wait for canary deployment to be ready
    kubectl rollout status deployment/${service}-canary -n "$NAMESPACE" --timeout=300s
    
    print_success "Canary deployment for $service created and ready"
}

# Function to configure traffic splitting
configure_traffic_splitting() {
    local service=$1
    local canary_percentage=$2
    local stable_percentage=$((100 - canary_percentage))
    
    print_info "Configuring traffic splitting: $stable_percentage% stable, $canary_percentage% canary"
    
    # Create VirtualService for traffic splitting (Istio)
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ${service}-vs
  namespace: ${NAMESPACE}
spec:
  hosts:
  - ${service}-service
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: ${service}-service
        subset: canary
  - route:
    - destination:
        host: ${service}-service
        subset: stable
      weight: ${stable_percentage}
    - destination:
        host: ${service}-service
        subset: canary
      weight: ${canary_percentage}
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: ${service}-dr
  namespace: ${NAMESPACE}
spec:
  host: ${service}-service
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
EOF
    
    print_success "Traffic splitting configured for $service"
}

# Function to monitor canary metrics
monitor_canary_metrics() {
    local service=$1
    local duration=$2
    
    print_info "Monitoring canary metrics for $service for ${duration}s"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        
        # Get pod metrics
        local stable_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$service",version=stable --no-headers | wc -l)
        local canary_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$service",version=canary --no-headers | wc -l)
        local stable_ready=$(kubectl get pods -n "$NAMESPACE" -l app="$service",version=stable --no-headers | grep -c "Running" || echo "0")
        local canary_ready=$(kubectl get pods -n "$NAMESPACE" -l app="$service",version=canary --no-headers | grep -c "Running" || echo "0")
        
        print_metric "[$timestamp] Stable: $stable_ready/$stable_pods, Canary: $canary_ready/$canary_pods"
        
        # Check error rates
        local stable_errors=$(kubectl logs -l app="$service",version=stable -n "$NAMESPACE" --since=1m | grep -c "ERROR" || echo "0")
        local canary_errors=$(kubectl logs -l app="$service",version=canary -n "$NAMESPACE" --since=1m | grep -c "ERROR" || echo "0")
        
        print_metric "[$timestamp] Errors - Stable: $stable_errors, Canary: $canary_errors"
        
        # Check response times (simplified)
        local stable_response_time=$(curl -s -w "%{time_total}" -o /dev/null "http://$service-service.$NAMESPACE.svc.cluster.local/actuator/health" 2>/dev/null | awk '{print int($1*1000)}' || echo "0")
        local canary_response_time=$(curl -s -w "%{time_total}" -o /dev/null -H "canary: true" "http://$service-service.$NAMESPACE.svc.cluster.local/actuator/health" 2>/dev/null | awk '{print int($1*1000)}' || echo "0")
        
        print_metric "[$timestamp] Response Time - Stable: ${stable_response_time}ms, Canary: ${canary_response_time}ms"
        
        # Alert on high error rates
        if [[ $canary_errors -gt 5 ]]; then
            print_warning "High error rate detected in canary deployment: $canary_errors errors"
            send_alert "CANARY_HIGH_ERRORS" "Canary deployment has $canary_errors errors in the last minute"
        fi
        
        # Alert on high response times
        if [[ $canary_response_time -gt 2000 ]]; then
            print_warning "High response time detected in canary deployment: ${canary_response_time}ms"
            send_alert "CANARY_HIGH_RESPONSE_TIME" "Canary deployment response time: ${canary_response_time}ms"
        fi
        
        # Store metrics
        echo "$timestamp,$service,stable,$stable_pods,$stable_ready,$stable_errors,$stable_response_time" >> soft-launch-metrics.csv
        echo "$timestamp,$service,canary,$canary_pods,$canary_ready,$canary_errors,$canary_response_time" >> soft-launch-metrics.csv
        
        sleep $MONITORING_INTERVAL
    done
}

# Function to validate canary performance
validate_canary_performance() {
    local service=$1
    
    print_info "Validating canary performance for $service"
    
    # Get metrics from the last monitoring period
    local canary_errors=$(tail -n 10 soft-launch-metrics.csv | grep "canary" | awk -F',' '{sum+=$6} END {print sum+0}')
    local stable_errors=$(tail -n 10 soft-launch-metrics.csv | grep "stable" | awk -F',' '{sum+=$6} END {print sum+0}')
    
    local canary_avg_response=$(tail -n 10 soft-launch-metrics.csv | grep "canary" | awk -F',' '{sum+=$7; count++} END {print (count>0) ? sum/count : 0}')
    local stable_avg_response=$(tail -n 10 soft-launch-metrics.csv | grep "stable" | awk -F',' '{sum+=$7; count++} END {print (count>0) ? sum/count : 0}')
    
    print_metric "Canary Errors: $canary_errors, Stable Errors: $stable_errors"
    print_metric "Canary Avg Response: ${canary_avg_response}ms, Stable Avg Response: ${stable_avg_response}ms"
    
    # Validation criteria
    local validation_passed=true
    
    # Error rate should not be significantly higher than stable
    if [[ $canary_errors -gt $((stable_errors * 2)) ]]; then
        print_error "Canary error rate is too high compared to stable"
        validation_passed=false
    fi
    
    # Response time should not be significantly higher than stable
    local response_threshold=$(echo "$stable_avg_response * 1.5" | bc -l 2>/dev/null || echo "3000")
    if (( $(echo "$canary_avg_response > $response_threshold" | bc -l 2>/dev/null || echo "0") )); then
        print_error "Canary response time is too high compared to stable"
        validation_passed=false
    fi
    
    if [[ "$validation_passed" == true ]]; then
        print_success "Canary validation passed for $service"
        return 0
    else
        print_error "Canary validation failed for $service"
        return 1
    fi
}

# Function to promote canary
promote_canary() {
    local service=$1
    
    print_info "Promoting canary deployment for $service"
    
    # Update stable deployment with canary image
    kubectl patch deployment "$service" -n "$NAMESPACE" -p '{"spec":{"template":{"metadata":{"labels":{"version":"stable"}}}}}'
    kubectl set image deployment/"$service" "$service"="$(kubectl get deployment ${service}-canary -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')" -n "$NAMESPACE"
    
    # Wait for rollout
    kubectl rollout status deployment/"$service" -n "$NAMESPACE" --timeout=300s
    
    # Remove canary deployment
    kubectl delete deployment "${service}-canary" -n "$NAMESPACE"
    
    # Remove traffic splitting
    kubectl delete virtualservice "${service}-vs" -n "$NAMESPACE" || true
    kubectl delete destinationrule "${service}-dr" -n "$NAMESPACE" || true
    
    print_success "Canary promoted to stable for $service"
}

# Function to rollback canary
rollback_canary() {
    local service=$1
    
    print_error "Rolling back canary deployment for $service"
    
    # Remove canary deployment
    kubectl delete deployment "${service}-canary" -n "$NAMESPACE" || true
    
    # Remove traffic splitting
    kubectl delete virtualservice "${service}-vs" -n "$NAMESPACE" || true
    kubectl delete destinationrule "${service}-dr" -n "$NAMESPACE" || true
    
    # Send alert
    send_alert "CANARY_ROLLBACK" "Canary deployment for $service has been rolled back due to performance issues"
    
    print_success "Canary rollback completed for $service"
}

# Function to send alerts
send_alert() {
    local alert_type=$1
    local message=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Log alert
    echo "[$timestamp] ALERT: $alert_type - $message" >> soft-launch-alerts.log
    
    # Send Slack notification if configured
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        local payload=$(cat << EOF
{
  "channel": "#soft-launch",
  "username": "SAMS Soft Launch Bot",
  "icon_emoji": ":warning:",
  "attachments": [
    {
      "color": "warning",
      "title": "Soft Launch Alert: $alert_type",
      "text": "$message",
      "fields": [
        {
          "title": "Environment",
          "value": "$ENVIRONMENT",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "$timestamp",
          "short": true
        }
      ],
      "footer": "SAMS Soft Launch Monitoring"
    }
  ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" &> /dev/null || true
    fi
}

# Function to execute soft launch phases
execute_soft_launch() {
    local service=$1
    
    print_header "Starting soft launch for $service"
    
    # Initialize metrics file
    echo "timestamp,service,version,pods,ready_pods,errors,response_time" > soft-launch-metrics.csv
    
    # Phase 1: 10% traffic
    print_info "Phase 1: 10% canary traffic"
    create_canary_deployment "$service"
    configure_traffic_splitting "$service" 10
    monitor_canary_metrics "$service" $PHASE_DURATION
    
    if validate_canary_performance "$service"; then
        print_success "Phase 1 validation passed"
    else
        rollback_canary "$service"
        return 1
    fi
    
    # Phase 2: 25% traffic
    print_info "Phase 2: 25% canary traffic"
    configure_traffic_splitting "$service" 25
    monitor_canary_metrics "$service" $PHASE_DURATION
    
    if validate_canary_performance "$service"; then
        print_success "Phase 2 validation passed"
    else
        rollback_canary "$service"
        return 1
    fi
    
    # Phase 3: 50% traffic
    print_info "Phase 3: 50% canary traffic"
    configure_traffic_splitting "$service" 50
    monitor_canary_metrics "$service" $PHASE_DURATION
    
    if validate_canary_performance "$service"; then
        print_success "Phase 3 validation passed"
    else
        rollback_canary "$service"
        return 1
    fi
    
    # Phase 4: 100% traffic (promotion)
    print_info "Phase 4: Promoting canary to stable"
    promote_canary "$service"
    
    print_success "Soft launch completed successfully for $service"
    return 0
}

# Function to generate soft launch report
generate_soft_launch_report() {
    local service=$1
    local status=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Calculate metrics
    local total_errors=$(awk -F',' '{sum+=$6} END {print sum+0}' soft-launch-metrics.csv)
    local avg_response_time=$(awk -F',' '{sum+=$7; count++} END {print (count>0) ? sum/count : 0}' soft-launch-metrics.csv)
    local total_alerts=$(wc -l < soft-launch-alerts.log 2>/dev/null || echo "0")
    
    cat > soft-launch-report.json << EOF
{
  "soft_launch_report": {
    "timestamp": "$timestamp",
    "service": "$service",
    "environment": "$ENVIRONMENT",
    "status": "$status",
    "phases_completed": 4,
    "metrics": {
      "total_errors": $total_errors,
      "average_response_time_ms": $avg_response_time,
      "total_alerts": $total_alerts,
      "monitoring_duration_minutes": $((PHASE_DURATION * 4 / 60))
    },
    "validation_criteria": {
      "error_rate_threshold": "2x stable rate",
      "response_time_threshold": "1.5x stable time",
      "monitoring_interval_seconds": $MONITORING_INTERVAL
    },
    "recommendations": [
      "Continue monitoring for 24 hours post-launch",
      "Review performance metrics and optimize if needed",
      "Update monitoring thresholds based on baseline data"
    ]
  }
}
EOF
    
    print_success "Soft launch report generated: soft-launch-report.json"
}

# Main function
main() {
    local service=${1:-"backend"}
    
    print_header "🚀 SAMS Soft Launch Strategy"
    print_header "============================"
    print_info "Service: $service"
    print_info "Environment: $ENVIRONMENT"
    print_info "Phase Duration: ${PHASE_DURATION}s each"
    
    check_prerequisites
    
    if execute_soft_launch "$service"; then
        generate_soft_launch_report "$service" "SUCCESS"
        print_success "🎉 Soft launch completed successfully!"
    else
        generate_soft_launch_report "$service" "FAILED"
        print_error "❌ Soft launch failed and was rolled back"
        exit 1
    fi
}

# Signal handling
trap 'print_info "Soft launch interrupted, rolling back..."; rollback_canary "${1:-backend}"; exit 1' INT TERM

# Execute main function
main "$@"
