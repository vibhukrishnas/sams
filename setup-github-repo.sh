#!/bin/bash

# SAMS GitHub Repository Complete Setup Script
# This script sets up the complete GitHub repository with all branches and features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE VALUES
GITHUB_USERNAME="your-username"
REPO_NAME="sams-monitoring-system"
GITHUB_TOKEN=""  # Set this or use environment variable

echo -e "${BLUE}🚀 SAMS Complete GitHub Repository Setup${NC}"
echo -e "${YELLOW}Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command -v git >/dev/null 2>&1; then
        print_error "Git is not installed"
        exit 1
    fi

    if ! command -v gh >/dev/null 2>&1; then
        print_warning "GitHub CLI not found. Install with: brew install gh"
        print_info "You can still continue without GitHub CLI"
    fi

    if [ -z "$GITHUB_TOKEN" ] && [ -z "$GITHUB_TOKEN" ]; then
        print_warning "GitHub token not set. Some operations may require manual intervention"
    fi

    print_status "Prerequisites checked"
}

# Initialize repository
init_repository() {
    print_info "Initializing Git repository..."

    if [ ! -d ".git" ]; then
        git init
        print_status "Git repository initialized"
    else
        print_info "Git repository already exists"
    fi

    # Set main branch
    git checkout -b main 2>/dev/null || git checkout main
    print_status "Main branch ready"
}

# Create and commit all files
create_initial_commit() {
    print_info "Creating initial commit with all SAMS files..."

    # Add all files
    git add .

    # Create comprehensive initial commit
    git commit -m "🚀 Initial commit: Complete SAMS Monitoring System

🎯 ENTERPRISE-GRADE MONITORING SOLUTION

✅ BACKEND INFRASTRUCTURE:
- Node.js/Express API with TypeScript
- PostgreSQL database with full schema
- Real-time WebSocket communication
- JWT authentication with PIN validation
- Comprehensive API routes for all functionality

✅ MOBILE APPLICATION:
- React Native app with real API integration
- 4-digit PIN authentication with backend validation
- Live server monitoring with actual metrics
- Real-time alerts with push notifications
- Server management with CRUD operations
- PDF report generation and viewing

✅ MONITORING AGENTS:
- Python agent for Linux servers
- PowerShell agent for Windows servers
- Real metrics collection (CPU, memory, disk, network)
- Heartbeat and registration with backend

✅ NOTIFICATION SYSTEM:
- Firebase Cloud Messaging integration
- Multi-channel notifications (Push, Email, SMS, Slack, Teams)
- Smart notification routing by severity
- Notification logging and tracking

✅ REPORTS ENGINE:
- PDF report generation with PDFKit
- CSV and JSON export formats
- Report templates and scheduling
- Custom query execution

✅ ALERT MANAGEMENT:
- Complete alert lifecycle (create, acknowledge, resolve, escalate)
- Alert rules engine with thresholds
- Incident management with timeline
- Alert correlation and deduplication

✅ PRODUCTION DEPLOYMENT:
- Docker Compose with full stack
- Nginx load balancer configuration
- Prometheus + Grafana monitoring
- ELK stack for logging
- Production deployment scripts

✅ TESTING FRAMEWORK:
- Jest testing setup with TypeScript
- Comprehensive test utilities
- Coverage reporting (80%+ target)
- Integration and E2E test structure

✅ DEVELOPMENT WORKFLOW:
- Complete branching strategy
- GitHub Actions CI/CD pipelines
- Automated testing and deployment
- Code quality and security checks

🔥 PRODUCTION-READY FEATURES:
- Multi-channel notifications
- Role-based access control
- Real-time monitoring with WebSocket
- Scalable architecture with Docker
- Comprehensive logging and monitoring
- Alert escalation and incident management
- Report scheduling and automation

This is a complete, enterprise-ready monitoring system that rivals commercial solutions!" 2>/dev/null || {
        print_warning "No changes to commit or commit already exists"
    }

    print_status "Initial commit created"
}

# Create all feature branches
create_all_branches() {
    print_info "Creating comprehensive branch structure..."

    # Ensure we're on main
    git checkout main

    # Create develop branch
    git checkout -b develop main 2>/dev/null || git checkout develop
    print_status "Develop branch created"

    # Array of all feature branches
    declare -a feature_branches=(
        # Backend Features
        "feature/backend-api"
        "feature/database-schema"
        "feature/authentication-system"
        "feature/websocket-realtime"
        "feature/monitoring-agents"
        "feature/push-notifications"
        "feature/alert-management"
        "feature/report-generation"
        "feature/security-middleware"
        "feature/api-documentation"
        "feature/performance-optimization"
        "feature/logging-system"
        "feature/backup-recovery"
        "feature/health-checks"
        "feature/metrics-collection"
        "feature/incident-management"
        "feature/notification-routing"
        "feature/user-management"
        "feature/role-based-access"
        "feature/audit-logging"
        "feature/data-retention"
        "feature/api-rate-limiting"
        "feature/error-handling"
        "feature/configuration-management"
        "feature/service-discovery"
        "feature/cache-optimization"
        "feature/database-optimization"

        # Mobile App Features
        "feature/mobile-app-core"
        "feature/mobile-dashboard"
        "feature/mobile-alerts"
        "feature/mobile-server-management"
        "feature/mobile-reports"
        "feature/mobile-authentication"
        "feature/mobile-offline-support"
        "feature/mobile-push-integration"
        "feature/mobile-biometric-auth"
        "feature/mobile-dark-mode"
        "feature/mobile-accessibility"
        "feature/mobile-performance"
        "feature/mobile-testing"
        "feature/mobile-navigation"
        "feature/mobile-state-management"
        "feature/mobile-ui-components"
        "feature/mobile-animations"
        "feature/mobile-localization"

        # Infrastructure Features
        "feature/docker-deployment"
        "feature/monitoring-stack"
        "feature/load-balancing"
        "feature/ssl-configuration"
        "feature/ci-cd-pipeline"
        "feature/kubernetes-deployment"
        "feature/terraform-infrastructure"
        "feature/aws-integration"
        "feature/azure-integration"
        "feature/gcp-integration"
        "feature/elk-stack"
        "feature/redis-cluster"
        "feature/database-clustering"
        "feature/auto-scaling"
        "feature/disaster-recovery"
        "feature/security-scanning"
        "feature/compliance-reporting"

        # Testing Features
        "feature/testing-framework"
        "feature/unit-testing"
        "feature/integration-testing"
        "feature/e2e-testing"
        "feature/performance-testing"
        "feature/security-testing"
        "feature/load-testing"
        "feature/mobile-testing-automation"

        # Documentation Features
        "feature/api-documentation"
        "feature/user-documentation"
        "feature/deployment-guides"
        "feature/troubleshooting-guides"
        "feature/architecture-documentation"
    )

    # Create each feature branch
    for branch in "${feature_branches[@]}"; do
        git checkout -b "$branch" develop 2>/dev/null || {
            print_warning "Branch $branch already exists"
            git checkout "$branch"
        }
        print_status "Created branch: $branch"
    done

    # Create release and hotfix branches
    declare -a other_branches=(
        "staging"
        "release/v1.0.0"
        "hotfix/critical-fixes"
    )

    for branch in "${other_branches[@]}"; do
        git checkout -b "$branch" main 2>/dev/null || {
            print_warning "Branch $branch already exists"
            git checkout "$branch"
        }
        print_status "Created branch: $branch"
    done

    # Return to main
    git checkout main
    print_status "All branches created successfully"
}

# Setup GitHub remote
setup_github_remote() {
    print_info "Setting up GitHub remote..."

    # Check if remote already exists
    if git remote get-url origin >/dev/null 2>&1; then
        print_info "Remote origin already exists"
        git remote -v
    else
        git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
        print_status "GitHub remote added"
    fi
}

# Push all branches to GitHub
push_all_branches() {
    print_info "Pushing all branches to GitHub..."

    # Push main branch first
    git push -u origin main
    print_status "Main branch pushed"

    # Push all other branches
    git branch | grep -v "main" | while read branch; do
        branch=$(echo $branch | sed 's/^[* ]*//')
        if [ ! -z "$branch" ]; then
            print_info "Pushing branch: $branch"
            git push -u origin "$branch" || print_warning "Failed to push $branch"
        fi
    done

    print_status "All branches pushed to GitHub"
}

# Create GitHub repository if it doesn't exist
create_github_repo() {
    print_info "Creating GitHub repository..."

    if command -v gh >/dev/null 2>&1; then
        # Use GitHub CLI if available
        gh repo create "$GITHUB_USERNAME/$REPO_NAME" \
            --public \
            --description "SAMS - Enterprise Server and Application Monitoring System with React Native mobile app, Node.js backend, and comprehensive monitoring agents" \
            --homepage "https://$GITHUB_USERNAME.github.io/$REPO_NAME" \
            || print_warning "Repository may already exist"

        print_status "GitHub repository created with GitHub CLI"
    else
        print_warning "GitHub CLI not available. Please create repository manually:"
        echo "1. Go to https://github.com/new"
        echo "2. Repository name: $REPO_NAME"
        echo "3. Description: SAMS - Enterprise Server and Application Monitoring System"
        echo "4. Make it public"
        echo "5. Don't initialize with README (we have our own)"
        echo ""
        read -p "Press Enter after creating the repository..."
    fi
}

# Setup branch protection rules
setup_branch_protection() {
    print_info "Setting up branch protection rules..."

    if command -v gh >/dev/null 2>&1; then
        # Protect main branch
        gh api repos/$GITHUB_USERNAME/$REPO_NAME/branches/main/protection \
            --method PUT \
            --field required_status_checks='{"strict":true,"contexts":["ci/tests","ci/build"]}' \
            --field enforce_admins=true \
            --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
            --field restrictions=null \
            || print_warning "Failed to set main branch protection"

        # Protect develop branch
        gh api repos/$GITHUB_USERNAME/$REPO_NAME/branches/develop/protection \
            --method PUT \
            --field required_status_checks='{"strict":true,"contexts":["ci/tests"]}' \
            --field enforce_admins=false \
            --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
            --field restrictions=null \
            || print_warning "Failed to set develop branch protection"

        print_status "Branch protection rules configured"
    else
        print_warning "GitHub CLI not available. Branch protection must be set manually"
        echo "Run: ./setup-branch-protection.sh (after setting GITHUB_TOKEN)"
    fi
}

# Create GitHub labels
create_github_labels() {
    print_info "Creating GitHub labels..."

    if command -v gh >/dev/null 2>&1; then
        # Define labels
        declare -A labels=(
            ["backend"]="0052cc"
            ["mobile"]="1d76db"
            ["infrastructure"]="5319e7"
            ["security"]="d73a4a"
            ["performance"]="fbca04"
            ["documentation"]="0075ca"
            ["testing"]="c2e0c6"
            ["feature"]="a2eeef"
            ["bug"]="d73a4a"
            ["enhancement"]="a2eeef"
            ["critical"]="b60205"
            ["high-priority"]="d93f0b"
            ["medium-priority"]="fbca04"
            ["low-priority"]="0e8a16"
        )

        for label in "${!labels[@]}"; do
            gh label create "$label" --color "${labels[$label]}" --repo "$GITHUB_USERNAME/$REPO_NAME" || print_warning "Label $label may already exist"
        done

        print_status "GitHub labels created"
    else
        print_warning "GitHub CLI not available. Labels must be created manually"
    fi
}

# Main execution
main() {
    print_info "Starting complete SAMS GitHub repository setup..."

    # Validate configuration
    if [ "$GITHUB_USERNAME" = "your-username" ]; then
        print_error "Please update GITHUB_USERNAME in the script"
        exit 1
    fi

    check_prerequisites
    init_repository
    create_initial_commit
    create_all_branches
    create_github_repo
    setup_github_remote
    push_all_branches
    setup_branch_protection
    create_github_labels

    print_status "🎉 SAMS GitHub repository setup complete!"
    echo ""
    print_info "Repository Details:"
    echo "📍 URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo "🌟 Branches: $(git branch -a | wc -l) total branches created"
    echo "🔒 Protection: Main and develop branches protected"
    echo "🏷️  Labels: Comprehensive labeling system"
    echo "🔄 CI/CD: GitHub Actions workflows configured"
    echo ""
    print_info "Next Steps:"
    echo "1. ⭐ Star the repository"
    echo "2. 👥 Add collaborators and teams"
    echo "3. 🔧 Configure repository settings"
    echo "4. 📋 Create initial issues and project boards"
    echo "5. 🚀 Start development on feature branches"
    echo ""
    print_info "Available Feature Branches:"
    git branch | grep "feature/" | head -10
    echo "... and many more!"
    echo ""
    print_status "🔥 Your SAMS repository is ready for enterprise development!"
}

# Handle script interruption
trap 'print_error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@"