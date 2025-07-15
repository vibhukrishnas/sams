#!/bin/bash

# GitHub Workflow Health Check Script
# This script validates that all workflow dependencies are properly configured

set -e

echo "🔍 SAMS GitHub Workflow Health Check"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
SUCCESS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "ERROR")
            echo -e "${RED}❌ ERROR: $message${NC}"
            ((ERRORS++))
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  WARNING: $message${NC}"
            ((WARNINGS++))
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ SUCCESS: $message${NC}"
            ((SUCCESS++))
            ;;
        "INFO")
            echo -e "ℹ️  INFO: $message"
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -d ".github/workflows" ]; then
    print_status "ERROR" "Not in repository root or .github/workflows directory not found"
    exit 1
fi

print_status "INFO" "Checking workflow files..."

# Check workflow files exist
WORKFLOW_FILES=(
    ".github/workflows/branch-management.yml"
    ".github/workflows/sams-advanced-features.yml"
    ".github/workflows/sams-backend-ci.yml"
    ".github/workflows/sams-frontend-ci.yml"
    ".github/workflows/sams-mobile-ci.yml"
    ".github/workflows/sams-simple-ci.yml"
    ".github/workflows/sams-simple-test.yml"
)

for workflow in "${WORKFLOW_FILES[@]}"; do
    if [ -f "$workflow" ]; then
        print_status "SUCCESS" "Workflow file exists: $workflow"
    else
        print_status "ERROR" "Workflow file missing: $workflow"
    fi
done

print_status "INFO" "Checking project dependencies..."

# Check backend dependencies
if [ -f "sams-backend/package.json" ]; then
    print_status "SUCCESS" "Backend package.json exists"
    
    # Check for required scripts
    BACKEND_SCRIPTS=("build" "test" "lint" "start" "test:coverage")
    for script in "${BACKEND_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" sams-backend/package.json; then
            print_status "SUCCESS" "Backend script exists: $script"
        else
            print_status "WARNING" "Backend script missing: $script"
        fi
    done
else
    print_status "ERROR" "Backend package.json not found"
fi

# Check frontend dependencies
if [ -f "sams-frontend-testing/package.json" ]; then
    print_status "SUCCESS" "Frontend package.json exists"
    
    # Check for required scripts
    FRONTEND_SCRIPTS=("build" "test" "lint" "start")
    for script in "${FRONTEND_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" sams-frontend-testing/package.json; then
            print_status "SUCCESS" "Frontend script exists: $script"
        else
            print_status "WARNING" "Frontend script missing: $script"
        fi
    done
else
    print_status "ERROR" "Frontend package.json not found"
fi

# Check mobile dependencies
if [ -f "sams-mobile/TestApp/package.json" ]; then
    print_status "SUCCESS" "Mobile package.json exists"
    
    # Check for required scripts
    MOBILE_SCRIPTS=("android" "ios" "test" "lint")
    for script in "${MOBILE_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" sams-mobile/TestApp/package.json; then
            print_status "SUCCESS" "Mobile script exists: $script"
        else
            print_status "WARNING" "Mobile script missing: $script"
        fi
    done
else
    print_status "ERROR" "Mobile package.json not found"
fi

print_status "INFO" "Checking configuration files..."

# Check configuration files
CONFIG_FILES=(
    "docker-compose.test.yml"
    "nginx/test.conf"
    ".env.example"
    ".env.test"
)

for config in "${CONFIG_FILES[@]}"; do
    if [ -f "$config" ]; then
        print_status "SUCCESS" "Configuration file exists: $config"
    else
        print_status "WARNING" "Configuration file missing: $config"
    fi
done

# Check test setup files
TEST_FILES=(
    "sams-backend/jest.config.js"
    "sams-backend/src/test/setup.ts"
    "sams-frontend-testing/src/test/setupTests.js"
    "sams-mobile/TestApp/e2e/config.json"
)

for test_file in "${TEST_FILES[@]}"; do
    if [ -f "$test_file" ]; then
        print_status "SUCCESS" "Test configuration exists: $test_file"
    else
        print_status "WARNING" "Test configuration missing: $test_file"
    fi
done

print_status "INFO" "Checking Docker configurations..."

# Check Dockerfiles
DOCKERFILES=(
    "sams-backend/Dockerfile"
    "sams-frontend-testing/Dockerfile"
)

for dockerfile in "${DOCKERFILES[@]}"; do
    if [ -f "$dockerfile" ]; then
        print_status "SUCCESS" "Dockerfile exists: $dockerfile"
    else
        print_status "WARNING" "Dockerfile missing: $dockerfile"
    fi
done

# Summary
echo ""
echo "📊 Health Check Summary"
echo "======================"
echo -e "${GREEN}✅ Successes: $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo -e "${RED}🚨 Critical issues found! Please fix errors before running workflows.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some warnings found. Workflows may have reduced functionality.${NC}"
    exit 0
else
    echo ""
    echo -e "${GREEN}🎉 All checks passed! Workflows should run successfully.${NC}"
    exit 0
fi
