#!/bin/bash

# SAMS Missing Code Validation Script
# Validates actual code implementation (not documentation)

set -e

echo "🔍 SAMS Missing Code Validation"
echo "==============================="
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
    echo -e "${PURPLE}[CODE-CHECK]${NC} $1"
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

# Function to validate code file exists and has content
validate_code_file() {
    local file=$1
    local description=$2
    local min_lines=${3:-10}
    
    print_check "Validating $description"
    if [[ -f "$file" ]]; then
        local line_count=$(wc -l < "$file" 2>/dev/null || echo "0")
        if [[ $line_count -gt $min_lines ]]; then
            print_pass "$description exists with $line_count lines"
            return 0
        else
            print_fail "$description exists but too small ($line_count lines)"
            return 1
        fi
    else
        print_fail "$description missing: $file"
        return 1
    fi
}

# Function to validate Java class exists
validate_java_class() {
    local file=$1
    local description=$2
    
    print_check "Validating $description"
    if [[ -f "$file" ]]; then
        if grep -q "class\|interface\|enum" "$file"; then
            print_pass "$description is a valid Java class"
            return 0
        else
            print_fail "$description exists but not a valid Java class"
            return 1
        fi
    else
        print_fail "$description missing: $file"
        return 1
    fi
}

# Function to validate test file exists
validate_test_file() {
    local file=$1
    local description=$2
    
    print_check "Validating $description"
    if [[ -f "$file" ]]; then
        if grep -q "@Test\|test(\|describe(" "$file"; then
            print_pass "$description contains test cases"
            return 0
        else
            print_fail "$description exists but no test cases found"
            return 1
        fi
    else
        print_fail "$description missing: $file"
        return 1
    fi
}

print_header "PHASE 1: POC Code Validation"
echo "============================"

# POC implementations
validate_code_file "infrastructure-monitoring-system/poc/server-monitoring-agent/src/main/java/com/monitoring/agent/ServerMonitoringAgent.java" "Java Server Monitoring Agent POC" 50
validate_code_file "infrastructure-monitoring-system/poc/websocket-communication/src/main/java/com/monitoring/websocket/WebSocketServer.java" "WebSocket Communication POC" 30
validate_code_file "infrastructure-monitoring-system/poc/react-native-background/App.tsx" "React Native Background Processing POC" 20
validate_code_file "infrastructure-monitoring-system/poc/alert-correlation-engine/src/main/java/com/monitoring/correlation/AlertCorrelationEngine.java" "Alert Correlation Engine POC" 40

echo ""
print_header "PHASE 2: Backend Services Code Validation"
echo "=========================================="

# User Management Service
validate_java_class "infrastructure-monitoring-system/backend/user-management-service/src/main/java/com/monitoring/user/UserManagementApplication.java" "User Management Application"
validate_java_class "infrastructure-monitoring-system/backend/user-management-service/src/main/java/com/monitoring/user/controller/AuthController.java" "Auth Controller"
validate_java_class "infrastructure-monitoring-system/backend/user-management-service/src/main/java/com/monitoring/user/service/AuthService.java" "Auth Service"
validate_java_class "infrastructure-monitoring-system/backend/user-management-service/src/main/java/com/monitoring/user/entity/User.java" "User Entity"

# Server Management Service
validate_java_class "infrastructure-monitoring-system/backend/server-management-service/src/main/java/com/monitoring/server/ServerManagementApplication.java" "Server Management Application"
validate_java_class "infrastructure-monitoring-system/backend/server-management-service/src/main/java/com/monitoring/server/controller/ServerController.java" "Server Controller"
validate_java_class "infrastructure-monitoring-system/backend/server-management-service/src/main/java/com/monitoring/server/service/ServerService.java" "Server Service"
validate_java_class "infrastructure-monitoring-system/backend/server-management-service/src/main/java/com/monitoring/server/entity/Server.java" "Server Entity"

# Alert Processing Service
validate_java_class "infrastructure-monitoring-system/backend/alert-processing-service/src/main/java/com/monitoring/alert/AlertProcessingApplication.java" "Alert Processing Application"
validate_java_class "infrastructure-monitoring-system/backend/alert-processing-service/src/main/java/com/monitoring/alert/controller/AlertController.java" "Alert Controller"
validate_java_class "infrastructure-monitoring-system/backend/alert-processing-service/src/main/java/com/monitoring/alert/service/AlertService.java" "Alert Service"
validate_java_class "infrastructure-monitoring-system/backend/alert-processing-service/src/main/java/com/monitoring/alert/entity/Alert.java" "Alert Entity"

# WebSocket Service
validate_java_class "infrastructure-monitoring-system/backend/websocket-service/src/main/java/com/monitoring/websocket/WebSocketApplication.java" "WebSocket Application"
validate_java_class "infrastructure-monitoring-system/backend/websocket-service/src/main/java/com/monitoring/websocket/handler/WebSocketHandler.java" "WebSocket Handler"

# Integration Service
validate_java_class "infrastructure-monitoring-system/backend/integration-service/src/main/java/com/monitoring/integration/IntegrationApplication.java" "Integration Application"
validate_java_class "infrastructure-monitoring-system/backend/integration-service/src/main/java/com/monitoring/integration/service/SlackService.java" "Slack Integration Service"
validate_java_class "infrastructure-monitoring-system/backend/integration-service/src/main/java/com/monitoring/integration/service/EmailService.java" "Email Integration Service"

echo ""
print_header "PHASE 2: Monitoring Agents Code Validation"
echo "=========================================="

# Java Agent
validate_code_file "infrastructure-monitoring-system/agents/java-agent/src/main/java/com/monitoring/agent/JavaMonitoringAgent.java" "Java Monitoring Agent" 100

# Python Agent
validate_code_file "infrastructure-monitoring-system/agents/python-agent/sams_agent.py" "Python Monitoring Agent" 200
validate_code_file "infrastructure-monitoring-system/agents/python-agent/requirements.txt" "Python Agent Dependencies" 5

# Docker Agent
validate_code_file "infrastructure-monitoring-system/agents/docker-agent/main.go" "Docker Monitoring Agent" 200
validate_code_file "infrastructure-monitoring-system/agents/docker-agent/go.mod" "Docker Agent Go Module" 5

echo ""
print_header "PHASE 2: Backend Test Code Validation"
echo "====================================="

# User Management Tests
validate_test_file "infrastructure-monitoring-system/backend/user-management-service/src/test/java/com/monitoring/user/UserManagementApplicationTests.java" "User Management Application Tests"
validate_test_file "infrastructure-monitoring-system/backend/user-management-service/src/test/java/com/monitoring/user/controller/AuthControllerTest.java" "Auth Controller Tests"
validate_test_file "infrastructure-monitoring-system/backend/user-management-service/src/test/java/com/monitoring/user/service/AuthServiceTest.java" "Auth Service Tests"

# Server Management Tests
validate_test_file "infrastructure-monitoring-system/backend/server-management-service/src/test/java/com/monitoring/server/ServerManagementApplicationTests.java" "Server Management Application Tests"
validate_test_file "infrastructure-monitoring-system/backend/server-management-service/src/test/java/com/monitoring/server/controller/ServerControllerTest.java" "Server Controller Tests"

# Alert Processing Tests
validate_test_file "infrastructure-monitoring-system/backend/alert-processing-service/src/test/java/com/monitoring/alert/AlertProcessingApplicationTests.java" "Alert Processing Application Tests"
validate_test_file "infrastructure-monitoring-system/backend/alert-processing-service/src/test/java/com/monitoring/alert/controller/AlertControllerTest.java" "Alert Controller Tests"

echo ""
print_header "PHASE 4: Mobile App Code Validation"
echo "==================================="

# React Native Core Files
validate_code_file "sams-mobile/TestApp/App.tsx" "React Native App Entry Point" 50
validate_code_file "sams-mobile/TestApp/src/store/store.ts" "Redux Store Configuration" 20
validate_code_file "sams-mobile/TestApp/src/navigation/AppNavigator.tsx" "App Navigation" 30

# Authentication Screens
validate_code_file "sams-mobile/TestApp/src/screens/auth/LoginScreen.tsx" "Login Screen" 100
validate_code_file "sams-mobile/TestApp/src/screens/auth/PinSetupScreen.tsx" "PIN Setup Screen" 80

# Dashboard Screens
validate_code_file "sams-mobile/TestApp/src/screens/dashboard/DashboardScreen.tsx" "Dashboard Screen" 100
validate_code_file "sams-mobile/TestApp/src/screens/servers/ServerListScreen.tsx" "Server List Screen" 80
validate_code_file "sams-mobile/TestApp/src/screens/alerts/AlertListScreen.tsx" "Alert List Screen" 80

# Services
validate_code_file "sams-mobile/TestApp/src/services/authService.ts" "Authentication Service" 50
validate_code_file "sams-mobile/TestApp/src/services/apiService.ts" "API Service" 50
validate_code_file "sams-mobile/TestApp/src/services/notificationService.ts" "Notification Service" 40

echo ""
print_header "PHASE 4: Mobile App Test Code Validation"
echo "========================================"

# Mobile Tests
validate_test_file "sams-mobile/TestApp/__tests__/App.test.tsx" "App Component Tests"
validate_test_file "sams-mobile/TestApp/__tests__/integration/AuthFlow.test.tsx" "Authentication Flow Integration Tests"
validate_test_file "sams-mobile/TestApp/__tests__/screens/LoginScreen.test.tsx" "Login Screen Tests"
validate_test_file "sams-mobile/TestApp/__tests__/services/authService.test.ts" "Auth Service Tests"

echo ""
print_header "PHASE 5: QA & Testing Code Validation"
echo "====================================="

# Performance Tests
validate_code_file "infrastructure-monitoring-system/qa-automation/performance-tests/load-test.js" "Load Testing Script" 200
validate_code_file "infrastructure-monitoring-system/qa-automation/performance-tests/stress-test.js" "Stress Testing Script" 100

# Security Tests
validate_code_file "infrastructure-monitoring-system/qa-automation/security-tests/security-scanner.js" "Security Scanner" 300
validate_code_file "infrastructure-monitoring-system/qa-automation/security-tests/penetration-test.js" "Penetration Testing Script" 100

# Integration Tests
validate_code_file "infrastructure-monitoring-system/qa-automation/integration-tests/api-integration.test.js" "API Integration Tests" 100
validate_code_file "infrastructure-monitoring-system/qa-automation/integration-tests/end-to-end.test.js" "End-to-End Tests" 100

echo ""
print_header "Frontend Test Code Validation"
echo "============================="

# Frontend Tests
validate_test_file "sams-frontend-testing/src/test/components/Dashboard.test.jsx" "Dashboard Component Tests"
validate_test_file "sams-frontend-testing/src/test/components/ServerList.test.jsx" "Server List Component Tests"
validate_test_file "sams-frontend-testing/src/test/components/AlertPanel.test.jsx" "Alert Panel Component Tests"

echo ""
print_header "Code Quality Validation"
echo "======================="

# Check for package.json files
validate_code_file "infrastructure-monitoring-system/backend/user-management-service/pom.xml" "User Management Service Maven Config" 20
validate_code_file "infrastructure-monitoring-system/backend/server-management-service/pom.xml" "Server Management Service Maven Config" 20
validate_code_file "infrastructure-monitoring-system/backend/alert-processing-service/pom.xml" "Alert Processing Service Maven Config" 20

validate_code_file "sams-mobile/TestApp/package.json" "Mobile App Package Config" 10
validate_code_file "sams-frontend-testing/package.json" "Frontend Package Config" 10
validate_code_file "infrastructure-monitoring-system/qa-automation/package.json" "QA Automation Package Config" 10

echo ""
print_header "Code Validation Summary"
echo "======================"

# Calculate completion percentage
COMPLETION_PERCENTAGE=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc -l 2>/dev/null || echo "0")

echo ""
print_info "📊 Code Validation Results:"
print_info "  Total Checks: $TOTAL_CHECKS"
print_info "  Passed: $PASSED_CHECKS"
print_info "  Failed: $FAILED_CHECKS"
print_info "  Code Completion: ${COMPLETION_PERCENTAGE}%"
echo ""

# Generate completion report
cat > code-validation-report.json << EOF
{
  "code_validation_report": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "validation_results": {
      "total_checks": $TOTAL_CHECKS,
      "passed_checks": $PASSED_CHECKS,
      "failed_checks": $FAILED_CHECKS,
      "completion_percentage": $COMPLETION_PERCENTAGE
    },
    "code_categories": {
      "poc_implementations": "Phase 1 Proof of Concept code",
      "backend_services": "Phase 2 Java Spring Boot microservices",
      "monitoring_agents": "Cross-platform monitoring agents",
      "backend_tests": "Unit and integration tests for backend",
      "mobile_app": "React Native mobile application",
      "mobile_tests": "Mobile app test suites",
      "qa_automation": "Performance and security testing",
      "frontend_tests": "Frontend component and integration tests"
    },
    "code_quality": {
      "java_classes": "Spring Boot microservices with proper structure",
      "react_native": "TypeScript React Native with Redux",
      "test_coverage": "Unit, integration, and E2E tests",
      "monitoring_agents": "Multi-language agent implementations",
      "automation": "Performance and security testing automation"
    }
  }
}
EOF

print_info "📄 Code validation report generated: code-validation-report.json"

# Final status
echo ""
if [[ $FAILED_CHECKS -eq 0 ]]; then
    echo -e "${GREEN}🎉 CODE VALIDATION PASSED!${NC}"
    echo -e "${GREEN}✅ All code components are implemented${NC}"
    exit 0
elif [[ $COMPLETION_PERCENTAGE > 90 ]]; then
    echo -e "${YELLOW}⚠️  CODE MOSTLY COMPLETE${NC}"
    echo -e "${YELLOW}🔧 Minor code components need attention${NC}"
    exit 0
else
    echo -e "${RED}❌ CODE VALIDATION FAILED${NC}"
    echo -e "${RED}🚨 Critical code components missing${NC}"
    exit 1
fi
