#!/bin/bash

# SAMS Rollback Deployment Script
# Automated rollback mechanism for failed deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE_PRODUCTION="production"
NAMESPACE_STAGING="staging"
TIMEOUT=300

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

# Function to check prerequisites
check_prerequisites() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed or not in PATH"
        exit 1
    fi
}

# Function to get deployment history
get_deployment_history() {
    local environment=$1
    local service=$2
    local namespace=$environment
    local deployment_name="sams-$service"
    
    print_info "Getting deployment history for $deployment_name in $namespace"
    
    kubectl rollout history deployment/"$deployment_name" -n "$namespace"
}

# Function to get previous stable version
get_previous_version() {
    local environment=$1
    local service=$2
    local namespace=$environment
    local deployment_name="sams-$service"
    
    # Get the revision history
    local revisions=$(kubectl rollout history deployment/"$deployment_name" -n "$namespace" --output=json)
    
    # Get the current revision
    local current_revision=$(echo "$revisions" | jq -r '.metadata.generation')
    
    # Get the previous revision
    local previous_revision=$((current_revision - 1))
    
    if [[ $previous_revision -lt 1 ]]; then
        print_error "No previous revision found for rollback"
        return 1
    fi
    
    echo "$previous_revision"
}

# Function to perform rollback
perform_rollback() {
    local environment=$1
    local service=$2
    local target_revision=$3
    local namespace=$environment
    local deployment_name="sams-$service"
    
    print_info "Rolling back $deployment_name to revision $target_revision in $namespace"
    
    # Perform the rollback
    if [[ -n "$target_revision" ]]; then
        kubectl rollout undo deployment/"$deployment_name" -n "$namespace" --to-revision="$target_revision"
    else
        kubectl rollout undo deployment/"$deployment_name" -n "$namespace"
    fi
    
    # Wait for rollback to complete
    print_info "Waiting for rollback to complete..."
    kubectl rollout status deployment/"$deployment_name" -n "$namespace" --timeout=${TIMEOUT}s
    
    if [[ $? -eq 0 ]]; then
        print_success "Rollback completed successfully"
        return 0
    else
        print_error "Rollback failed"
        return 1
    fi
}

# Function to verify rollback
verify_rollback() {
    local environment=$1
    local service=$2
    local namespace=$environment
    local deployment_name="sams-$service"
    
    print_info "Verifying rollback for $deployment_name in $namespace"
    
    # Check deployment status
    local ready_replicas=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.status.readyReplicas}')
    local desired_replicas=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.spec.replicas}')
    
    if [[ "$ready_replicas" == "$desired_replicas" ]]; then
        print_success "✓ Deployment status: $ready_replicas/$desired_replicas replicas ready"
    else
        print_error "✗ Deployment status: $ready_replicas/$desired_replicas replicas ready"
        return 1
    fi
    
    # Run health checks
    print_info "Running health checks after rollback..."
    if ./scripts/health-check.sh "$environment" "$service"; then
        print_success "✓ Health checks passed after rollback"
        return 0
    else
        print_error "✗ Health checks failed after rollback"
        return 1
    fi
}

# Function to create rollback report
create_rollback_report() {
    local environment=$1
    local service=$2
    local target_revision=$3
    local rollback_status=$4
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local report_file="rollback-report-${environment}-${service}-$(date +%Y%m%d_%H%M%S).json"
    
    # Get current deployment info
    local namespace=$environment
    local deployment_name="sams-$service"
    local current_image=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.spec.template.spec.containers[0].image}')
    local current_revision=$(kubectl get deployment "$deployment_name" -n "$namespace" -o jsonpath='{.metadata.generation}')
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "$environment",
  "service": "$service",
  "rollback_status": "$rollback_status",
  "target_revision": "$target_revision",
  "current_revision": "$current_revision",
  "current_image": "$current_image",
  "deployment_name": "$deployment_name",
  "namespace": "$namespace",
  "metadata": {
    "script": "rollback-deployment.sh",
    "version": "1.0.0",
    "operator": "${USER:-unknown}"
  }
}
EOF
    
    print_info "Rollback report created: $report_file"
}

# Function to send notifications
send_notifications() {
    local environment=$1
    local service=$2
    local rollback_status=$3
    local target_revision=$4
    
    # Slack notification (if webhook is configured)
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        local color="good"
        local status_text="SUCCESS"
        
        if [[ "$rollback_status" != "SUCCESS" ]]; then
            color="danger"
            status_text="FAILED"
        fi
        
        local payload=$(cat << EOF
{
  "channel": "#deployments",
  "username": "SAMS Rollback Bot",
  "icon_emoji": ":warning:",
  "attachments": [
    {
      "color": "$color",
      "title": "Rollback $status_text",
      "fields": [
        {
          "title": "Environment",
          "value": "$environment",
          "short": true
        },
        {
          "title": "Service",
          "value": "$service",
          "short": true
        },
        {
          "title": "Target Revision",
          "value": "$target_revision",
          "short": true
        },
        {
          "title": "Status",
          "value": "$rollback_status",
          "short": true
        }
      ],
      "footer": "SAMS Deployment System",
      "ts": $(date +%s)
    }
  ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" \
             "$SLACK_WEBHOOK_URL" || print_warning "Failed to send Slack notification"
    fi
    
    # Email notification (if configured)
    if [[ -n "${EMAIL_RECIPIENTS}" ]]; then
        local subject="SAMS Rollback $rollback_status: $service in $environment"
        local body="Rollback operation for $service in $environment environment has $rollback_status.\n\nTarget Revision: $target_revision\nTimestamp: $(date)"
        
        echo -e "$body" | mail -s "$subject" "$EMAIL_RECIPIENTS" || print_warning "Failed to send email notification"
    fi
}

# Function to emergency rollback (skip health checks)
emergency_rollback() {
    local environment=$1
    local service=$2
    local target_revision=$3
    
    print_warning "Performing EMERGENCY rollback (skipping health checks)"
    
    if perform_rollback "$environment" "$service" "$target_revision"; then
        print_success "Emergency rollback completed"
        create_rollback_report "$environment" "$service" "$target_revision" "EMERGENCY_SUCCESS"
        send_notifications "$environment" "$service" "EMERGENCY_SUCCESS" "$target_revision"
        return 0
    else
        print_error "Emergency rollback failed"
        create_rollback_report "$environment" "$service" "$target_revision" "EMERGENCY_FAILED"
        send_notifications "$environment" "$service" "EMERGENCY_FAILED" "$target_revision"
        return 1
    fi
}

# Function to interactive rollback
interactive_rollback() {
    local environment=$1
    local service=$2
    
    print_info "Interactive rollback mode for $service in $environment"
    
    # Show deployment history
    get_deployment_history "$environment" "$service"
    
    echo ""
    read -p "Enter the revision number to rollback to (or 'auto' for previous): " revision
    
    if [[ "$revision" == "auto" ]]; then
        revision=$(get_previous_version "$environment" "$service")
        if [[ $? -ne 0 ]]; then
            print_error "Failed to determine previous version"
            return 1
        fi
        print_info "Auto-selected revision: $revision"
    fi
    
    echo ""
    read -p "Are you sure you want to rollback to revision $revision? (y/N): " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        print_info "Rollback cancelled by user"
        return 0
    fi
    
    # Perform rollback
    if perform_rollback "$environment" "$service" "$revision"; then
        if verify_rollback "$environment" "$service"; then
            print_success "Interactive rollback completed successfully"
            create_rollback_report "$environment" "$service" "$revision" "SUCCESS"
            send_notifications "$environment" "$service" "SUCCESS" "$revision"
            return 0
        else
            print_error "Rollback verification failed"
            create_rollback_report "$environment" "$service" "$revision" "VERIFICATION_FAILED"
            send_notifications "$environment" "$service" "VERIFICATION_FAILED" "$revision"
            return 1
        fi
    else
        print_error "Rollback failed"
        create_rollback_report "$environment" "$service" "$revision" "FAILED"
        send_notifications "$environment" "$service" "FAILED" "$revision"
        return 1
    fi
}

# Function to automatic rollback
automatic_rollback() {
    local environment=$1
    local service=$2
    
    print_info "Automatic rollback mode for $service in $environment"
    
    # Get previous version automatically
    local target_revision=$(get_previous_version "$environment" "$service")
    if [[ $? -ne 0 ]]; then
        print_error "Failed to determine previous version for automatic rollback"
        return 1
    fi
    
    print_info "Auto-selected revision: $target_revision"
    
    # Perform rollback
    if perform_rollback "$environment" "$service" "$target_revision"; then
        if verify_rollback "$environment" "$service"; then
            print_success "Automatic rollback completed successfully"
            create_rollback_report "$environment" "$service" "$target_revision" "SUCCESS"
            send_notifications "$environment" "$service" "SUCCESS" "$target_revision"
            return 0
        else
            print_error "Rollback verification failed"
            create_rollback_report "$environment" "$service" "$target_revision" "VERIFICATION_FAILED"
            send_notifications "$environment" "$service" "VERIFICATION_FAILED" "$target_revision"
            return 1
        fi
    else
        print_error "Rollback failed"
        create_rollback_report "$environment" "$service" "$target_revision" "FAILED"
        send_notifications "$environment" "$service" "FAILED" "$target_revision"
        return 1
    fi
}

# Main function
main() {
    local mode=$1
    local environment=$2
    local service=$3
    local target_revision=$4
    
    if [[ -z "$mode" || -z "$environment" || -z "$service" ]]; then
        print_error "Usage: $0 <mode> <environment> <service> [revision]"
        print_error "Mode: auto, interactive, emergency"
        print_error "Environment: production, staging"
        print_error "Service: backend, frontend"
        print_error "Revision: specific revision number (optional for emergency mode)"
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
    check_prerequisites
    
    # Execute based on mode
    case "$mode" in
        "auto")
            automatic_rollback "$environment" "$service"
            ;;
        "interactive")
            interactive_rollback "$environment" "$service"
            ;;
        "emergency")
            if [[ -z "$target_revision" ]]; then
                target_revision=$(get_previous_version "$environment" "$service")
            fi
            emergency_rollback "$environment" "$service" "$target_revision"
            ;;
        *)
            print_error "Invalid mode: $mode"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
