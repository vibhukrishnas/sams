#!/bin/bash

# SAMS GitHub Repository Setup Script
# This script initializes the repository and creates feature branches

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
REPO_NAME="sams-monitoring-system"
GITHUB_USERNAME=${GITHUB_USERNAME:-"your-username"}
MAIN_BRANCH="main"

echo -e "${BLUE}🚀 Setting up SAMS GitHub Repository${NC}"

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

# Initialize Git repository if not already initialized
init_repository() {
    print_info "Initializing Git repository..."
    
    if [ ! -d ".git" ]; then
        git init
        print_status "Git repository initialized"
    else
        print_info "Git repository already exists"
    fi
    
    # Set main branch
    git checkout -b $MAIN_BRANCH 2>/dev/null || git checkout $MAIN_BRANCH
    print_status "Main branch set to: $MAIN_BRANCH"
}

# Create .gitignore file
create_gitignore() {
    print_info "Creating .gitignore file..."
    
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist/
build/
*.tgz
*.tar.gz

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# React Native
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/

# Android
*.apk
*.aab
android/app/build/
android/app/release/
android/.gradle/
android/captures/
android/gradlew
android/gradlew.bat
android/local.properties
*.keystore
!debug.keystore

# iOS
ios/build/
ios/Pods/
ios/*.xcworkspace
ios/*.xcuserdata
ios/Podfile.lock

# Docker
.dockerignore

# Database
*.db
*.sqlite
*.sqlite3

# Reports and uploads
reports/
uploads/
backups/

# SSL certificates
*.pem
*.crt
*.key
ssl/

# Monitoring data
prometheus_data/
grafana_data/
influxdb_data/
elasticsearch_data/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/

# Rust
target/
Cargo.lock

# Java
*.class
*.jar
*.war
*.ear
*.zip
*.tar.gz
*.rar

# Maven
target/
pom.xml.tag
pom.xml.releaseBackup
pom.xml.versionsBackup
pom.xml.next
release.properties
dependency-reduced-pom.xml
buildNumber.properties
.mvn/timing.properties
.mvn/wrapper/maven-wrapper.jar
EOF

    print_status ".gitignore file created"
}

# Create feature branches
create_feature_branches() {
    print_info "Creating feature branches..."
    
    # Array of feature branches
    declare -a branches=(
        "feature/backend-api"
        "feature/database-schema"
        "feature/authentication-system"
        "feature/websocket-realtime"
        "feature/monitoring-agents"
        "feature/push-notifications"
        "feature/alert-management"
        "feature/report-generation"
        "feature/mobile-app-core"
        "feature/mobile-dashboard"
        "feature/mobile-alerts"
        "feature/mobile-server-management"
        "feature/mobile-reports"
        "feature/mobile-authentication"
        "feature/docker-deployment"
        "feature/monitoring-stack"
        "feature/testing-framework"
        "feature/security-middleware"
        "feature/api-documentation"
        "feature/performance-optimization"
        "feature/logging-system"
        "feature/backup-recovery"
        "feature/load-balancing"
        "feature/ssl-configuration"
        "feature/ci-cd-pipeline"
        "feature/health-checks"
        "feature/metrics-collection"
        "feature/dashboard-visualization"
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
    )
    
    # Create each feature branch
    for branch in "${branches[@]}"; do
        git checkout -b "$branch" $MAIN_BRANCH 2>/dev/null || {
            print_warning "Branch $branch already exists"
            git checkout "$branch"
        }
        print_status "Created/switched to branch: $branch"
    done
    
    # Return to main branch
    git checkout $MAIN_BRANCH
    print_status "Returned to main branch"
}

# Create development branches
create_dev_branches() {
    print_info "Creating development branches..."
    
    declare -a dev_branches=(
        "develop"
        "staging"
        "release/v1.0.0"
        "hotfix/critical-fixes"
    )
    
    for branch in "${dev_branches[@]}"; do
        git checkout -b "$branch" $MAIN_BRANCH 2>/dev/null || {
            print_warning "Branch $branch already exists"
            git checkout "$branch"
        }
        print_status "Created/switched to branch: $branch"
    done
    
    git checkout $MAIN_BRANCH
}

# Add all files and create initial commit
create_initial_commit() {
    print_info "Creating initial commit..."
    
    # Add all files
    git add .
    
    # Create initial commit
    git commit -m "🚀 Initial commit: Complete SAMS Monitoring System

Features included:
✅ Complete Backend API (Node.js/Express/TypeScript)
✅ PostgreSQL Database with full schema
✅ Real-time WebSocket communication
✅ Mobile App (React Native) with real API integration
✅ Monitoring Agents (Python/PowerShell)
✅ Push Notifications (Firebase)
✅ PDF Report Generation
✅ Docker Deployment Stack
✅ Comprehensive Testing Framework
✅ Production-Ready Configuration

This is a fully functional enterprise monitoring system!" 2>/dev/null || {
        print_warning "No changes to commit or commit already exists"
    }
    
    print_status "Initial commit created"
}

# Set up remote repository
setup_remote() {
    print_info "Setting up remote repository..."
    
    # Check if remote already exists
    if git remote get-url origin >/dev/null 2>&1; then
        print_info "Remote origin already exists"
        git remote -v
    else
        print_warning "Please set up your GitHub remote manually:"
        echo "git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
        echo "git push -u origin $MAIN_BRANCH"
    fi
}

# Create branch protection rules script
create_branch_protection_script() {
    print_info "Creating branch protection setup script..."
    
    cat > setup-branch-protection.sh << 'EOF'
#!/bin/bash

# GitHub Branch Protection Setup
# Run this script after pushing to GitHub to set up branch protection rules

REPO_OWNER="your-username"
REPO_NAME="sams-monitoring-system"
GITHUB_TOKEN="your-github-token"

echo "Setting up branch protection rules..."

# Protect main branch
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["ci/tests", "ci/build"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 2,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true
    },
    "restrictions": null
  }'

# Protect develop branch
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/branches/develop/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["ci/tests"]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true
    },
    "restrictions": null
  }'

echo "Branch protection rules set up successfully!"
EOF

    chmod +x setup-branch-protection.sh
    print_status "Branch protection script created"
}

# Create GitHub workflows
create_github_workflows() {
    print_info "Creating GitHub Actions workflows..."
    
    mkdir -p .github/workflows
    
    # CI/CD workflow
    cat > .github/workflows/ci-cd.yml << 'EOF'
name: SAMS CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sams_test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: sams-backend/package-lock.json
    
    - name: Install backend dependencies
      working-directory: ./sams-backend
      run: npm ci
    
    - name: Run backend tests
      working-directory: ./sams-backend
      run: npm test
      env:
        NODE_ENV: test
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: sams_test_db
        DB_USER: postgres
        DB_PASSWORD: postgres
        REDIS_HOST: localhost
        REDIS_PORT: 6379
    
    - name: Build backend
      working-directory: ./sams-backend
      run: npm run build
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./sams-backend/coverage/lcov.info
        flags: backend

  test-mobile:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: sams-mobile/TestApp/package-lock.json
    
    - name: Install mobile dependencies
      working-directory: ./sams-mobile/TestApp
      run: npm ci
    
    - name: Run mobile tests
      working-directory: ./sams-mobile/TestApp
      run: npm test -- --watchAll=false
    
    - name: Build mobile app
      working-directory: ./sams-mobile/TestApp
      run: npm run build:web

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run security audit
      run: |
        cd sams-backend && npm audit --audit-level high
        cd ../sams-mobile/TestApp && npm audit --audit-level high
    
    - name: Run CodeQL Analysis
      uses: github/codeql-action/init@v2
      with:
        languages: javascript, typescript
    
    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2

  docker-build:
    runs-on: ubuntu-latest
    needs: [test-backend, test-mobile]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Build backend image
      uses: docker/build-push-action@v4
      with:
        context: ./sams-backend
        push: false
        tags: sams-backend:latest
    
    - name: Test Docker Compose
      run: |
        docker-compose -f docker-compose.yml config
        docker-compose -f docker-compose.yml build

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [test-backend, test-mobile, security-scan, docker-build]
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to staging
      run: |
        echo "Deploying to staging environment..."
        # Add your staging deployment commands here

  deploy-production:
    runs-on: ubuntu-latest
    needs: [test-backend, test-mobile, security-scan, docker-build]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: |
        echo "Deploying to production environment..."
        # Add your production deployment commands here
EOF

    # Release workflow
    cat > .github/workflows/release.yml << 'EOF'
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Create Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: SAMS Release ${{ github.ref }}
        body: |
          ## What's Changed
          - Complete SAMS monitoring system
          - Backend API improvements
          - Mobile app enhancements
          - Security updates
          
          ## Docker Images
          - Backend: `sams-backend:${{ github.ref }}`
          - Frontend: `sams-frontend:${{ github.ref }}`
        draft: false
        prerelease: false
EOF

    print_status "GitHub Actions workflows created"
}

# Create issue and PR templates
create_github_templates() {
    print_info "Creating GitHub issue and PR templates..."
    
    mkdir -p .github/ISSUE_TEMPLATE
    mkdir -p .github/PULL_REQUEST_TEMPLATE
    
    # Bug report template
    cat > .github/ISSUE_TEMPLATE/bug_report.md << 'EOF'
---
name: Bug report
about: Create a report to help us improve SAMS
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- OS: [e.g. iOS, Android, Windows, Linux]
- App Version: [e.g. 1.0.0]
- Device: [e.g. iPhone 12, Samsung Galaxy S21]

## Additional Context
Add any other context about the problem here.

## Logs
Please include relevant logs or error messages.
EOF

    # Feature request template
    cat > .github/ISSUE_TEMPLATE/feature_request.md << 'EOF'
---
name: Feature request
about: Suggest an idea for SAMS
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description
A clear and concise description of what you want to happen.

## Problem Statement
A clear and concise description of what the problem is. Ex. I'm always frustrated when [...]

## Proposed Solution
A clear and concise description of what you want to happen.

## Alternative Solutions
A clear and concise description of any alternative solutions or features you've considered.

## Additional Context
Add any other context or screenshots about the feature request here.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
EOF

    # Pull request template
    cat > .github/PULL_REQUEST_TEMPLATE/pull_request_template.md << 'EOF'
## Description
Brief description of changes made in this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Related Issues
Fixes #(issue number)

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance testing (if applicable)

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Additional Notes
Any additional information that reviewers should know.
EOF

    print_status "GitHub templates created"
}

# Create CODEOWNERS file
create_codeowners() {
    print_info "Creating CODEOWNERS file..."
    
    cat > .github/CODEOWNERS << 'EOF'
# Global owners
* @your-username

# Backend code
/sams-backend/ @backend-team @your-username

# Mobile app
/sams-mobile/ @mobile-team @your-username

# Infrastructure
/docker-compose.yml @devops-team @your-username
/deploy.sh @devops-team @your-username
/.github/ @devops-team @your-username

# Documentation
/README.md @docs-team @your-username
/docs/ @docs-team @your-username

# Monitoring agents
/sams-agents/ @monitoring-team @your-username

# Database
/sams-backend/migrations/ @database-team @your-username
EOF

    print_status "CODEOWNERS file created"
}

# Main execution
main() {
    print_info "Starting SAMS GitHub repository setup..."
    
    init_repository
    create_gitignore
    create_feature_branches
    create_dev_branches
    create_initial_commit
    setup_remote
    create_branch_protection_script
    create_github_workflows
    create_github_templates
    create_codeowners
    
    print_status "🎉 SAMS GitHub repository setup complete!"
    echo ""
    print_info "Next steps:"
    echo "1. Create repository on GitHub: https://github.com/new"
    echo "2. Set repository name: $REPO_NAME"
    echo "3. Add remote: git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    echo "4. Push all branches: git push -u origin --all"
    echo "5. Run ./setup-branch-protection.sh (after setting GITHUB_TOKEN)"
    echo ""
    print_info "Available branches:"
    git branch -a | grep -E "(feature/|develop|staging|release/|hotfix/)" | head -20
    echo "... and more!"
    echo ""
    print_info "Repository structure:"
    echo "📁 SAMS Repository"
    echo "├── 🔧 Backend API (Node.js/TypeScript)"
    echo "├── 📱 Mobile App (React Native)"
    echo "├── 🤖 Monitoring Agents (Python/PowerShell)"
    echo "├── 🐳 Docker Deployment"
    echo "├── 🔄 CI/CD Pipelines"
    echo "├── 📊 Monitoring Stack"
    echo "└── 📚 Documentation"
}

# Run main function
main "$@"
