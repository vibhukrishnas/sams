#!/bin/bash

# SAMS Feature Branches Creation Script
# For existing repository: https://github.com/vibhukrishnas/sams

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Creating SAMS Feature Branches${NC}"
echo -e "${YELLOW}Repository: https://github.com/vibhukrishnas/sams${NC}"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Ensure we're in the right directory and have the latest code
setup_repository() {
    print_info "Setting up repository..."
    
    # Fetch latest changes
    git fetch origin
    
    # Ensure we're on main branch
    git checkout main 2>/dev/null || git checkout master 2>/dev/null || {
        print_info "Creating main branch from current branch"
        git checkout -b main
    }
    
    # Pull latest changes
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
    
    print_status "Repository setup complete"
}

# Create develop branch if it doesn't exist
create_develop_branch() {
    print_info "Creating develop branch..."
    
    if git show-ref --verify --quiet refs/heads/develop; then
        print_info "Develop branch already exists"
        git checkout develop
        git pull origin develop 2>/dev/null || true
    else
        git checkout -b develop main
        git push -u origin develop
        print_status "Develop branch created and pushed"
    fi
}

# Create all feature branches
create_feature_branches() {
    print_info "Creating comprehensive feature branches..."
    
    # Ensure we're on develop
    git checkout develop
    
    # Backend Feature Branches
    declare -a backend_branches=(
        "feature/backend-api-core"
        "feature/database-schema-design"
        "feature/authentication-jwt-system"
        "feature/websocket-realtime-communication"
        "feature/monitoring-agents-integration"
        "feature/push-notifications-firebase"
        "feature/alert-management-system"
        "feature/report-generation-engine"
        "feature/security-middleware-implementation"
        "feature/api-documentation-swagger"
        "feature/performance-optimization-backend"
        "feature/logging-system-winston"
        "feature/backup-recovery-system"
        "feature/health-checks-monitoring"
        "feature/metrics-collection-prometheus"
        "feature/incident-management-lifecycle"
        "feature/notification-routing-multichannel"
        "feature/user-management-crud"
        "feature/role-based-access-control"
        "feature/audit-logging-system"
        "feature/data-retention-policies"
        "feature/api-rate-limiting-implementation"
        "feature/error-handling-middleware"
        "feature/configuration-management-system"
        "feature/cache-optimization-redis"
        "feature/database-optimization-postgresql"
    )
    
    # Mobile App Feature Branches
    declare -a mobile_branches=(
        "feature/mobile-app-core-structure"
        "feature/mobile-dashboard-screens"
        "feature/mobile-alerts-management-ui"
        "feature/mobile-server-management-screens"
        "feature/mobile-reports-generation-ui"
        "feature/mobile-authentication-pin-biometric"
        "feature/mobile-offline-support-implementation"
        "feature/mobile-push-notifications-integration"
        "feature/mobile-real-time-websocket-connection"
        "feature/mobile-dark-mode-theme"
        "feature/mobile-accessibility-features"
        "feature/mobile-performance-optimization"
        "feature/mobile-testing-framework"
        "feature/mobile-navigation-react-navigation"
        "feature/mobile-state-management-redux"
        "feature/mobile-ui-components-library"
        "feature/mobile-animations-implementation"
        "feature/mobile-localization-i18n"
    )
    
    # Infrastructure Feature Branches
    declare -a infrastructure_branches=(
        "feature/docker-deployment-containerization"
        "feature/monitoring-stack-prometheus-grafana"
        "feature/load-balancing-nginx-configuration"
        "feature/ssl-tls-configuration"
        "feature/ci-cd-pipeline-github-actions"
        "feature/kubernetes-deployment-orchestration"
        "feature/terraform-infrastructure-as-code"
        "feature/aws-cloud-integration"
        "feature/azure-cloud-integration"
        "feature/gcp-cloud-integration"
        "feature/elk-stack-logging"
        "feature/redis-cluster-caching"
        "feature/database-clustering-postgresql"
        "feature/auto-scaling-horizontal"
        "feature/disaster-recovery-procedures"
        "feature/security-scanning-vulnerability"
        "feature/compliance-reporting-automation"
    )
    
    # Testing Feature Branches
    declare -a testing_branches=(
        "feature/testing-framework-jest-setup"
        "feature/unit-testing-comprehensive"
        "feature/integration-testing-api"
        "feature/e2e-testing-cypress"
        "feature/performance-testing-load"
        "feature/security-testing-penetration"
        "feature/mobile-testing-detox-automation"
    )
    
    # Documentation Feature Branches
    declare -a documentation_branches=(
        "feature/api-documentation-openapi"
        "feature/user-documentation-guides"
        "feature/deployment-documentation"
        "feature/troubleshooting-guides"
        "feature/architecture-documentation"
    )
    
    # Combine all branches
    all_branches=(
        "${backend_branches[@]}"
        "${mobile_branches[@]}"
        "${infrastructure_branches[@]}"
        "${testing_branches[@]}"
        "${documentation_branches[@]}"
    )
    
    print_info "Creating ${#all_branches[@]} feature branches..."
    
    # Create each branch
    for branch in "${all_branches[@]}"; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            print_info "Branch $branch already exists"
        else
            git checkout -b "$branch" develop
            git push -u origin "$branch"
            print_status "Created and pushed: $branch"
            git checkout develop
        fi
    done
}

# Create release and hotfix branches
create_release_branches() {
    print_info "Creating release and hotfix branches..."
    
    # Release branches
    declare -a release_branches=(
        "release/v1.0.0-backend-api"
        "release/v1.0.0-mobile-app"
        "release/v1.0.0-monitoring-agents"
        "release/v1.0.0-deployment-stack"
        "release/v1.1.0-advanced-features"
        "release/v2.0.0-enterprise-features"
    )
    
    # Hotfix branches
    declare -a hotfix_branches=(
        "hotfix/critical-security-patches"
        "hotfix/production-bug-fixes"
        "hotfix/performance-issues"
        "hotfix/mobile-app-crashes"
        "hotfix/backend-api-errors"
    )
    
    # Environment branches
    declare -a env_branches=(
        "staging"
        "production"
        "development"
    )
    
    # Create release branches from main
    git checkout main
    for branch in "${release_branches[@]}"; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            print_info "Branch $branch already exists"
        else
            git checkout -b "$branch" main
            git push -u origin "$branch"
            print_status "Created release branch: $branch"
            git checkout main
        fi
    done
    
    # Create hotfix branches from main
    for branch in "${hotfix_branches[@]}"; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            print_info "Branch $branch already exists"
        else
            git checkout -b "$branch" main
            git push -u origin "$branch"
            print_status "Created hotfix branch: $branch"
            git checkout main
        fi
    done
    
    # Create environment branches from main
    for branch in "${env_branches[@]}"; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            print_info "Branch $branch already exists"
        else
            git checkout -b "$branch" main
            git push -u origin "$branch"
            print_status "Created environment branch: $branch"
            git checkout main
        fi
    done
}

# Create component-specific branches
create_component_branches() {
    print_info "Creating component-specific branches..."
    
    git checkout develop
    
    # Component branches for organized development
    declare -a component_branches=(
        "component/authentication-module"
        "component/monitoring-dashboard"
        "component/alert-system"
        "component/report-engine"
        "component/notification-service"
        "component/user-interface"
        "component/database-layer"
        "component/api-gateway"
        "component/mobile-components"
        "component/monitoring-agents"
        "component/deployment-scripts"
        "component/testing-utilities"
    )
    
    for branch in "${component_branches[@]}"; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            print_info "Branch $branch already exists"
        else
            git checkout -b "$branch" develop
            git push -u origin "$branch"
            print_status "Created component branch: $branch"
            git checkout develop
        fi
    done
}

# Show branch summary
show_branch_summary() {
    print_info "Branch creation summary:"
    
    echo ""
    echo "🌳 SAMS Repository Branch Structure:"
    echo ""
    echo "📋 Main Branches:"
    echo "├── main (production)"
    echo "├── develop (integration)"
    echo "├── staging (pre-production)"
    echo "└── production (live environment)"
    echo ""
    echo "🔧 Backend Features (26 branches):"
    git branch -r | grep "feature/.*backend\|feature/.*api\|feature/.*database\|feature/.*auth" | head -5
    echo "   ... and 21 more backend branches"
    echo ""
    echo "📱 Mobile Features (18 branches):"
    git branch -r | grep "feature/mobile" | head -5
    echo "   ... and 13 more mobile branches"
    echo ""
    echo "🏗️ Infrastructure Features (17 branches):"
    git branch -r | grep "feature/.*docker\|feature/.*kubernetes\|feature/.*aws" | head -5
    echo "   ... and 12 more infrastructure branches"
    echo ""
    echo "🧪 Testing Features (7 branches):"
    git branch -r | grep "feature/.*testing\|feature/.*test" | head -3
    echo "   ... and 4 more testing branches"
    echo ""
    echo "🚀 Release Branches (6 branches):"
    git branch -r | grep "release/" | head -3
    echo "   ... and 3 more release branches"
    echo ""
    echo "🔥 Hotfix Branches (5 branches):"
    git branch -r | grep "hotfix/" | head -3
    echo "   ... and 2 more hotfix branches"
    echo ""
    echo "🧩 Component Branches (12 branches):"
    git branch -r | grep "component/" | head -3
    echo "   ... and 9 more component branches"
    echo ""
    
    total_branches=$(git branch -r | wc -l)
    print_status "Total branches created: $total_branches"
    echo ""
    print_info "🎯 Repository URL: https://github.com/vibhukrishnas/sams/branches"
    print_info "🔗 All branches are now available for development!"
}

# Main execution
main() {
    print_info "Starting SAMS branch creation for existing repository..."
    
    setup_repository
    create_develop_branch
    create_feature_branches
    create_release_branches
    create_component_branches
    
    # Return to main branch
    git checkout main
    
    show_branch_summary
    
    print_status "🎉 All SAMS feature branches created successfully!"
    echo ""
    print_info "Next steps:"
    echo "1. Visit: https://github.com/vibhukrishnas/sams/branches"
    echo "2. Set up branch protection for main and develop"
    echo "3. Start development on feature branches"
    echo "4. Create pull requests for code review"
    echo ""
    print_info "Example workflow:"
    echo "git checkout feature/backend-api-core"
    echo "# Make your changes"
    echo "git add ."
    echo "git commit -m 'feat: implement core API endpoints'"
    echo "git push origin feature/backend-api-core"
    echo "# Create PR on GitHub"
}

# Run main function
main "$@"
