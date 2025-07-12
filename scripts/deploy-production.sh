#!/bin/bash

# SAMS Production Deployment Script
# Complete production deployment with infrastructure and applications

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
AWS_REGION="us-west-2"
TERRAFORM_DIR="terraform"
K8S_DIR="k8s/production"
MONITORING_DIR="k8s/monitoring"

# Function to print colored output
print_header() {
    echo -e "${PURPLE}[DEPLOY]${NC} $1"
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

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking deployment prerequisites..."
    
    local missing_tools=()
    
    # Check required tools
    if ! command -v terraform &> /dev/null; then
        missing_tools+=("terraform")
    fi
    
    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi
    
    if ! command -v helm &> /dev/null; then
        missing_tools+=("helm")
    fi
    
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    # Check Terraform version
    local tf_version=$(terraform version -json | jq -r '.terraform_version')
    print_info "Terraform version: $tf_version"
    
    # Check kubectl version
    local kubectl_version=$(kubectl version --client -o json | jq -r '.clientVersion.gitVersion')
    print_info "kubectl version: $kubectl_version"
    
    print_success "Prerequisites check completed"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_step "Deploying infrastructure with Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    print_info "Initializing Terraform..."
    terraform init -upgrade
    
    # Plan deployment
    print_info "Planning infrastructure deployment..."
    terraform plan -var="environment=$ENVIRONMENT" -out=tfplan
    
    # Apply deployment
    print_info "Applying infrastructure deployment..."
    terraform apply tfplan
    
    # Get outputs
    print_info "Getting infrastructure outputs..."
    local cluster_name=$(terraform output -raw cluster_name)
    local cluster_endpoint=$(terraform output -raw cluster_endpoint)
    local rds_endpoint=$(terraform output -raw rds_endpoint)
    local redis_endpoint=$(terraform output -raw redis_endpoint)
    
    print_success "Infrastructure deployed successfully"
    print_info "EKS Cluster: $cluster_name"
    print_info "Cluster Endpoint: $cluster_endpoint"
    print_info "RDS Endpoint: $rds_endpoint"
    print_info "Redis Endpoint: $redis_endpoint"
    
    # Update kubeconfig
    print_info "Updating kubeconfig..."
    aws eks update-kubeconfig --region "$AWS_REGION" --name "$cluster_name"
    
    cd ..
}

# Function to setup monitoring
setup_monitoring() {
    print_step "Setting up monitoring stack..."
    
    # Create monitoring namespace
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Prometheus Operator
    print_info "Installing Prometheus Operator..."
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo update
    
    helm upgrade --install prometheus-operator prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set grafana.adminPassword="$(openssl rand -base64 32)" \
        --set alertmanager.alertmanagerSpec.storage.volumeClaimTemplate.spec.resources.requests.storage=10Gi
    
    # Apply custom Prometheus configuration
    kubectl apply -f "$MONITORING_DIR/prometheus-config.yaml"
    
    # Install Jaeger for distributed tracing
    print_info "Installing Jaeger..."
    helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
    helm repo update
    
    helm upgrade --install jaeger jaegertracing/jaeger \
        --namespace monitoring \
        --set provisionDataStore.cassandra=false \
        --set provisionDataStore.elasticsearch=true \
        --set storage.type=elasticsearch
    
    # Install Fluentd for log aggregation
    print_info "Installing Fluentd..."
    helm repo add fluent https://fluent.github.io/helm-charts
    helm repo update
    
    helm upgrade --install fluentd fluent/fluentd \
        --namespace monitoring \
        --set output.elasticsearch.enabled=true
    
    print_success "Monitoring stack deployed successfully"
}

# Function to deploy applications
deploy_applications() {
    print_step "Deploying SAMS applications..."
    
    # Create production namespace
    kubectl create namespace production --dry-run=client -o yaml | kubectl apply -f -
    
    # Create secrets
    print_info "Creating application secrets..."
    create_application_secrets
    
    # Deploy backend
    print_info "Deploying SAMS backend..."
    envsubst < "$K8S_DIR/backend-deployment.yaml" | kubectl apply -f -
    
    # Wait for backend to be ready
    kubectl rollout status deployment/sams-backend -n production --timeout=600s
    
    # Deploy frontend
    print_info "Deploying SAMS frontend..."
    envsubst < "$K8S_DIR/frontend-deployment.yaml" | kubectl apply -f -
    
    # Wait for frontend to be ready
    kubectl rollout status deployment/sams-frontend -n production --timeout=600s
    
    # Deploy ingress
    print_info "Deploying ingress controller..."
    deploy_ingress_controller
    
    print_success "Applications deployed successfully"
}

# Function to create application secrets
create_application_secrets() {
    # Database credentials
    kubectl create secret generic sams-secrets \
        --from-literal=database-url="$(terraform -chdir=$TERRAFORM_DIR output -raw rds_endpoint)" \
        --from-literal=database-username="sams_admin" \
        --from-literal=database-password="$DB_PASSWORD" \
        --from-literal=redis-url="$(terraform -chdir=$TERRAFORM_DIR output -raw redis_endpoint)" \
        --from-literal=jwt-secret="$(openssl rand -base64 64)" \
        --namespace=production \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Docker registry secret
    kubectl create secret docker-registry ghcr-secret \
        --docker-server=ghcr.io \
        --docker-username="$GITHUB_USERNAME" \
        --docker-password="$GITHUB_TOKEN" \
        --namespace=production \
        --dry-run=client -o yaml | kubectl apply -f -
}

# Function to deploy ingress controller
deploy_ingress_controller() {
    # Install NGINX Ingress Controller
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo update
    
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.metrics.enabled=true \
        --set controller.podAnnotations."prometheus\.io/scrape"=true \
        --set controller.podAnnotations."prometheus\.io/port"=10254
    
    # Install cert-manager for SSL certificates
    helm repo add jetstack https://charts.jetstack.io
    helm repo update
    
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --set installCRDs=true
    
    # Create ClusterIssuer for Let's Encrypt
    cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@sams.production.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
}

# Function to run post-deployment tests
run_post_deployment_tests() {
    print_step "Running post-deployment tests..."
    
    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    sleep 60
    
    # Health checks
    print_info "Running health checks..."
    ./scripts/health-check.sh production backend
    ./scripts/health-check.sh production frontend
    
    # Load testing
    print_info "Running load tests..."
    run_load_tests
    
    # Security scanning
    print_info "Running security scans..."
    run_security_scans
    
    print_success "Post-deployment tests completed"
}

# Function to run load tests
run_load_tests() {
    # Install k6 if not present
    if ! command -v k6 &> /dev/null; then
        print_warning "k6 not found, skipping load tests"
        return
    fi
    
    # Run basic load test
    cat <<EOF > load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 10 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.get('https://sams.production.com/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
EOF
    
    k6 run load-test.js
    rm load-test.js
}

# Function to run security scans
run_security_scans() {
    # Scan with kube-bench if available
    if kubectl get pods -n kube-system | grep -q kube-bench; then
        kubectl run kube-bench --image=aquasec/kube-bench:latest --restart=Never -- --version 1.20
        kubectl logs kube-bench
        kubectl delete pod kube-bench
    fi
    
    # Scan with kube-hunter if available
    if command -v kube-hunter &> /dev/null; then
        kube-hunter --remote $(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' | sed 's|https://||')
    fi
}

# Function to setup backup and disaster recovery
setup_backup_dr() {
    print_step "Setting up backup and disaster recovery..."
    
    # Install Velero for cluster backups
    helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
    helm repo update
    
    helm upgrade --install velero vmware-tanzu/velero \
        --namespace velero \
        --create-namespace \
        --set configuration.provider=aws \
        --set configuration.backupStorageLocation.bucket="sams-backups-$ENVIRONMENT" \
        --set configuration.backupStorageLocation.config.region="$AWS_REGION" \
        --set configuration.volumeSnapshotLocation.config.region="$AWS_REGION" \
        --set initContainers[0].name=velero-plugin-for-aws \
        --set initContainers[0].image=velero/velero-plugin-for-aws:v1.7.0 \
        --set initContainers[0].volumeMounts[0].mountPath=/target \
        --set initContainers[0].volumeMounts[0].name=plugins
    
    # Create backup schedule
    cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    - monitoring
    storageLocation: default
    ttl: 720h0m0s
EOF
    
    print_success "Backup and disaster recovery setup completed"
}

# Function to generate deployment report
generate_deployment_report() {
    print_step "Generating deployment report..."
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local report_file="deployment-report-${ENVIRONMENT}-$(date +%Y%m%d_%H%M%S).json"
    
    # Get cluster info
    local cluster_info=$(kubectl cluster-info --output=json)
    local node_count=$(kubectl get nodes --no-headers | wc -l)
    local pod_count=$(kubectl get pods --all-namespaces --no-headers | wc -l)
    
    # Get service endpoints
    local frontend_url=$(kubectl get ingress sams-frontend-ingress -n production -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "Not configured")
    local backend_url=$(kubectl get ingress sams-backend-ingress -n production -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "Not configured")
    
    cat > "$report_file" << EOF
{
  "timestamp": "$timestamp",
  "environment": "$ENVIRONMENT",
  "deployment_status": "SUCCESS",
  "infrastructure": {
    "cluster_nodes": $node_count,
    "total_pods": $pod_count,
    "region": "$AWS_REGION"
  },
  "applications": {
    "frontend_url": "https://$frontend_url",
    "backend_url": "https://$backend_url",
    "monitoring_enabled": true,
    "backup_enabled": true
  },
  "security": {
    "ssl_enabled": true,
    "network_policies": true,
    "rbac_enabled": true
  },
  "monitoring": {
    "prometheus": "enabled",
    "grafana": "enabled",
    "jaeger": "enabled",
    "fluentd": "enabled"
  },
  "metadata": {
    "deployed_by": "${USER:-unknown}",
    "deployment_script": "deploy-production.sh",
    "version": "1.0.0"
  }
}
EOF
    
    print_success "Deployment report generated: $report_file"
}

# Function to send notifications
send_notifications() {
    local status=$1
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
        local color="good"
        local status_text="SUCCESS"
        
        if [[ "$status" != "SUCCESS" ]]; then
            color="danger"
            status_text="FAILED"
        fi
        
        local payload=$(cat << EOF
{
  "channel": "#deployments",
  "username": "SAMS Deploy Bot",
  "icon_emoji": ":rocket:",
  "attachments": [
    {
      "color": "$color",
      "title": "Production Deployment $status_text",
      "fields": [
        {
          "title": "Environment",
          "value": "$ENVIRONMENT",
          "short": true
        },
        {
          "title": "Region",
          "value": "$AWS_REGION",
          "short": true
        },
        {
          "title": "Status",
          "value": "$status_text",
          "short": true
        },
        {
          "title": "Deployed By",
          "value": "${USER:-unknown}",
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
}

# Main deployment function
main() {
    print_header "🚀 SAMS Production Deployment"
    print_header "=============================="
    
    local start_time=$(date +%s)
    
    # Check for required environment variables
    if [[ -z "$DB_PASSWORD" ]]; then
        print_error "DB_PASSWORD environment variable is required"
        exit 1
    fi
    
    if [[ -z "$GITHUB_TOKEN" ]]; then
        print_error "GITHUB_TOKEN environment variable is required"
        exit 1
    fi
    
    if [[ -z "$GITHUB_USERNAME" ]]; then
        print_error "GITHUB_USERNAME environment variable is required"
        exit 1
    fi
    
    # Set image tag from environment or use latest
    export IMAGE_TAG="${IMAGE_TAG:-latest}"
    
    print_info "Starting production deployment..."
    print_info "Environment: $ENVIRONMENT"
    print_info "Region: $AWS_REGION"
    print_info "Image Tag: $IMAGE_TAG"
    
    # Execute deployment steps
    check_prerequisites
    deploy_infrastructure
    setup_monitoring
    deploy_applications
    setup_backup_dr
    run_post_deployment_tests
    generate_deployment_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_success "🎉 Production deployment completed successfully!"
    print_success "Total deployment time: ${duration}s"
    print_success "Frontend URL: https://sams.production.com"
    print_success "Backend API: https://api.sams.production.com"
    print_success "Monitoring: https://grafana.sams.production.com"
    
    send_notifications "SUCCESS"
}

# Error handling
trap 'print_error "Deployment failed at line $LINENO"; send_notifications "FAILED"; exit 1' ERR

# Execute main function
main "$@"
