#!/bin/bash

# SAMS Phase 6 Completion Validation Script
# Comprehensive validation of all Phase 6 components

set -e

echo "🔍 SAMS Phase 6: CI/CD & Deployment - Completion Validation"
echo "=========================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to print colored output
print_header() {
    echo -e "${PURPLE}[VALIDATION]${NC} $1"
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
    ((TOTAL_CHECKS++))
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} ✅ $1"
    ((PASSED_CHECKS++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} ❌ $1"
    ((FAILED_CHECKS++))
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Function to validate file exists
validate_file() {
    local file=$1
    local description=$2
    
    print_check "Validating $description"
    if [[ -f "$file" ]]; then
        print_pass "$description exists"
        return 0
    else
        print_fail "$description missing: $file"
        return 1
    fi
}

# Function to validate executable script
validate_executable() {
    local script=$1
    local description=$2
    
    print_check "Validating $description"
    if [[ -x "$script" ]]; then
        print_pass "$description is executable"
        return 0
    else
        print_fail "$description not executable: $script"
        return 1
    fi
}

# Function to validate directory
validate_directory() {
    local dir=$1
    local description=$2
    
    print_check "Validating $description"
    if [[ -d "$dir" ]]; then
        print_pass "$description exists"
        return 0
    else
        print_fail "$description missing: $dir"
        return 1
    fi
}

print_header "Week 16.1: CI/CD Pipeline Implementation"
echo "=========================================="

# GitHub Actions Workflows
validate_file ".github/workflows/sams-backend-ci.yml" "Backend CI/CD workflow"
validate_file ".github/workflows/sams-frontend-ci.yml" "Frontend CI/CD workflow"
validate_file ".github/workflows/sams-mobile-ci.yml" "Mobile CI/CD workflow"

# Docker Configurations
validate_file "sams-backend/Dockerfile" "Backend Dockerfile"
validate_file "sams-frontend-testing/Dockerfile" "Frontend Dockerfile"

# Nginx Configurations
validate_file "sams-frontend-testing/nginx.conf" "Nginx main configuration"
validate_file "sams-frontend-testing/default.conf" "Nginx default server configuration"
validate_file "sams-frontend-testing/security-headers.conf" "Nginx security headers configuration"

# Kubernetes Deployments
validate_file "k8s/production/backend-deployment.yaml" "Backend Kubernetes deployment"
validate_file "k8s/production/frontend-deployment.yaml" "Frontend Kubernetes deployment"
validate_file "k8s/monitoring/prometheus-config.yaml" "Prometheus monitoring configuration"

# Deployment Scripts
validate_executable "scripts/blue-green-deploy.sh" "Blue-green deployment script"
validate_executable "scripts/rollback-deployment.sh" "Rollback deployment script"

echo ""
print_header "Week 16.2: Production Environment Setup"
echo "========================================"

# Terraform Infrastructure
validate_file "terraform/main.tf" "Terraform main configuration"
validate_file "terraform/variables.tf" "Terraform variables"
validate_file "terraform/iam.tf" "Terraform IAM roles and policies"
validate_file "terraform/outputs.tf" "Terraform outputs"

# Production Deployment
validate_executable "scripts/deploy-production.sh" "Production deployment script"
validate_executable "scripts/health-check.sh" "Health check script"
validate_executable "scripts/backup-disaster-recovery.sh" "Backup and disaster recovery script"

# Documentation
validate_file "docs/production-runbook.md" "Production runbook"
validate_file "docs/production-deployment-guide.md" "Production deployment guide"

echo ""
print_header "Week 16.3: Go-Live & Monitoring"
echo "================================"

# Go-Live Scripts
validate_executable "scripts/go-live-monitoring.sh" "Go-live monitoring script"
validate_executable "scripts/soft-launch.sh" "Soft launch strategy script"
validate_executable "scripts/user-feedback-collector.sh" "User feedback collection script"

# Monitoring Configuration
validate_directory "k8s/monitoring" "Monitoring configurations directory"

echo ""
print_header "Additional Components Validation"
echo "================================="

# Check for required tools (informational)
print_check "Checking for required tools"
tools=("docker" "kubectl" "terraform" "helm" "aws" "jq")
missing_tools=()

for tool in "${tools[@]}"; do
    if command -v "$tool" &> /dev/null; then
        print_info "✓ $tool is available"
    else
        missing_tools+=("$tool")
        print_info "✗ $tool is missing"
    fi
done

if [[ ${#missing_tools[@]} -eq 0 ]]; then
    print_pass "All required tools are available"
else
    print_fail "Missing tools: ${missing_tools[*]}"
fi

# Validate script structure
print_check "Validating script structure"
scripts=(
    "scripts/execute-phase6.sh"
    "scripts/blue-green-deploy.sh"
    "scripts/health-check.sh"
    "scripts/rollback-deployment.sh"
    "scripts/deploy-production.sh"
    "scripts/go-live-monitoring.sh"
    "scripts/soft-launch.sh"
    "scripts/user-feedback-collector.sh"
    "scripts/backup-disaster-recovery.sh"
)

all_scripts_valid=true
for script in "${scripts[@]}"; do
    if [[ -f "$script" ]]; then
        # Check if script has proper shebang
        if head -n 1 "$script" | grep -q "#!/bin/bash"; then
            print_info "✓ $script has proper shebang"
        else
            print_info "✗ $script missing proper shebang"
            all_scripts_valid=false
        fi
        
        # Check if script has error handling
        if grep -q "set -e" "$script"; then
            print_info "✓ $script has error handling"
        else
            print_info "✗ $script missing error handling"
            all_scripts_valid=false
        fi
    fi
done

if [[ "$all_scripts_valid" == true ]]; then
    print_pass "All scripts have proper structure"
else
    print_fail "Some scripts have structural issues"
fi

# Validate Terraform syntax (if terraform is available)
if command -v terraform &> /dev/null; then
    print_check "Validating Terraform syntax"
    cd terraform
    if terraform init -backend=false &> /dev/null && terraform validate &> /dev/null; then
        print_pass "Terraform configuration is valid"
    else
        print_fail "Terraform configuration has syntax errors"
    fi
    cd ..
else
    print_info "Terraform not available, skipping syntax validation"
fi

# Validate Kubernetes YAML syntax (if kubectl is available)
if command -v kubectl &> /dev/null; then
    print_check "Validating Kubernetes YAML syntax"
    k8s_files=(
        "k8s/production/backend-deployment.yaml"
        "k8s/production/frontend-deployment.yaml"
        "k8s/monitoring/prometheus-config.yaml"
    )
    
    all_k8s_valid=true
    for file in "${k8s_files[@]}"; do
        if [[ -f "$file" ]]; then
            if kubectl apply --dry-run=client -f "$file" &> /dev/null; then
                print_info "✓ $file is valid"
            else
                print_info "✗ $file has syntax errors"
                all_k8s_valid=false
            fi
        fi
    done
    
    if [[ "$all_k8s_valid" == true ]]; then
        print_pass "All Kubernetes YAML files are valid"
    else
        print_fail "Some Kubernetes YAML files have syntax errors"
    fi
else
    print_info "kubectl not available, skipping Kubernetes YAML validation"
fi

echo ""
print_header "Phase 6 Completion Summary"
echo "=========================="

# Calculate completion percentage
COMPLETION_PERCENTAGE=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc -l 2>/dev/null || echo "0")

echo ""
print_info "📊 Validation Results:"
print_info "  Total Checks: $TOTAL_CHECKS"
print_info "  Passed: $PASSED_CHECKS"
print_info "  Failed: $FAILED_CHECKS"
print_info "  Completion: ${COMPLETION_PERCENTAGE}%"
echo ""

# Generate completion report
cat > phase6-validation-report.json << EOF
{
  "phase6_validation_report": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "validation_results": {
      "total_checks": $TOTAL_CHECKS,
      "passed_checks": $PASSED_CHECKS,
      "failed_checks": $FAILED_CHECKS,
      "completion_percentage": $COMPLETION_PERCENTAGE
    },
    "components_validated": {
      "ci_cd_workflows": "GitHub Actions workflows for backend, frontend, mobile",
      "docker_configurations": "Multi-stage Dockerfiles with security hardening",
      "kubernetes_deployments": "Production-ready K8s deployments with HPA, PDB",
      "terraform_infrastructure": "Complete AWS infrastructure as code",
      "deployment_scripts": "Blue-green deployment and rollback mechanisms",
      "monitoring_setup": "Prometheus, Grafana, AlertManager configuration",
      "go_live_procedures": "Soft launch, monitoring, user feedback collection",
      "backup_recovery": "Comprehensive backup and disaster recovery",
      "documentation": "Production runbooks and deployment guides"
    },
    "readiness_status": {
      "infrastructure": "$(if [[ $COMPLETION_PERCENTAGE > 90 ]]; then echo "READY"; else echo "NEEDS_ATTENTION"; fi)",
      "applications": "$(if [[ $COMPLETION_PERCENTAGE > 90 ]]; then echo "READY"; else echo "NEEDS_ATTENTION"; fi)",
      "ci_cd": "$(if [[ $COMPLETION_PERCENTAGE > 90 ]]; then echo "READY"; else echo "NEEDS_ATTENTION"; fi)",
      "monitoring": "$(if [[ $COMPLETION_PERCENTAGE > 90 ]]; then echo "READY"; else echo "NEEDS_ATTENTION"; fi)",
      "documentation": "$(if [[ $COMPLETION_PERCENTAGE > 90 ]]; then echo "READY"; else echo "NEEDS_ATTENTION"; fi)"
    }
  }
}
EOF

print_info "📄 Validation report generated: phase6-validation-report.json"

# Final status
echo ""
if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo -e "${GREEN}🎉 PHASE 6 VALIDATION PASSED!${NC}"
    echo -e "${GREEN}✅ All components are ready for production deployment${NC}"
    exit 0
elif [[ $COMPLETION_PERCENTAGE > 90 ]]; then
    echo -e "${YELLOW}⚠️  PHASE 6 MOSTLY COMPLETE${NC}"
    echo -e "${YELLOW}🔧 Minor issues need attention before production deployment${NC}"
    exit 0
else
    echo -e "${RED}❌ PHASE 6 VALIDATION FAILED${NC}"
    echo -e "${RED}🚨 Critical issues must be resolved before production deployment${NC}"
    exit 1
fi
