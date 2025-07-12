#!/bin/bash

# SAMS Backend Test Execution Script
# Comprehensive test suite runner with coverage reporting

set -e

echo "🧪 SAMS Backend Test Suite Runner"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    print_error "Maven is not installed. Please install Maven to run tests."
    exit 1
fi

# Check if Docker is running (for TestContainers)
if ! docker info &> /dev/null; then
    print_warning "Docker is not running. TestContainer tests may fail."
fi

# Parse command line arguments
TEST_TYPE="all"
GENERATE_REPORT="true"
SKIP_INTEGRATION="false"
SKIP_PERFORMANCE="false"
SKIP_SECURITY="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            TEST_TYPE="$2"
            shift 2
            ;;
        --no-report)
            GENERATE_REPORT="false"
            shift
            ;;
        --skip-integration)
            SKIP_INTEGRATION="true"
            shift
            ;;
        --skip-performance)
            SKIP_PERFORMANCE="true"
            shift
            ;;
        --skip-security)
            SKIP_SECURITY="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --type TYPE           Test type: unit, integration, performance, security, all"
            echo "  --no-report          Skip generating coverage report"
            echo "  --skip-integration   Skip integration tests"
            echo "  --skip-performance   Skip performance tests"
            echo "  --skip-security      Skip security tests"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create reports directory
mkdir -p target/test-reports

print_status "Starting test execution with type: $TEST_TYPE"

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    mvn clean test -Dspring.profiles.active=test
    if [ $? -eq 0 ]; then
        print_success "Unit tests completed successfully"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    if [ "$SKIP_INTEGRATION" = "true" ]; then
        print_warning "Skipping integration tests"
        return 0
    fi
    
    print_status "Running integration tests..."
    mvn verify -Dspring.profiles.active=test
    if [ $? -eq 0 ]; then
        print_success "Integration tests completed successfully"
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    if [ "$SKIP_PERFORMANCE" = "true" ]; then
        print_warning "Skipping performance tests"
        return 0
    fi
    
    print_status "Running performance tests..."
    mvn test -Pperformance -Dspring.profiles.active=test
    if [ $? -eq 0 ]; then
        print_success "Performance tests completed successfully"
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    if [ "$SKIP_SECURITY" = "true" ]; then
        print_warning "Skipping security tests"
        return 0
    fi
    
    print_status "Running security tests..."
    mvn test -Psecurity -Dspring.profiles.active=test
    if [ $? -eq 0 ]; then
        print_success "Security tests completed successfully"
    else
        print_error "Security tests failed"
        return 1
    fi
}

# Function to generate coverage report
generate_coverage_report() {
    if [ "$GENERATE_REPORT" = "false" ]; then
        print_warning "Skipping coverage report generation"
        return 0
    fi
    
    print_status "Generating coverage report..."
    mvn jacoco:report
    if [ $? -eq 0 ]; then
        print_success "Coverage report generated successfully"
        print_status "Coverage report available at: target/site/jacoco/index.html"
    else
        print_error "Failed to generate coverage report"
        return 1
    fi
}

# Function to check coverage thresholds
check_coverage_thresholds() {
    print_status "Checking coverage thresholds..."
    mvn jacoco:check
    if [ $? -eq 0 ]; then
        print_success "Coverage thresholds met"
    else
        print_warning "Coverage thresholds not met"
        return 1
    fi
}

# Function to generate test summary
generate_test_summary() {
    print_status "Generating test summary..."
    
    # Count test results
    UNIT_TESTS=$(find target/surefire-reports -name "*.xml" 2>/dev/null | wc -l)
    INTEGRATION_TESTS=$(find target/failsafe-reports -name "*.xml" 2>/dev/null | wc -l)
    
    echo "📊 Test Execution Summary"
    echo "========================"
    echo "Unit Tests: $UNIT_TESTS"
    echo "Integration Tests: $INTEGRATION_TESTS"
    
    if [ -f target/site/jacoco/index.html ]; then
        # Extract coverage percentage from JaCoCo report
        COVERAGE=$(grep -o 'Total[^%]*%' target/site/jacoco/index.html | tail -1 | grep -o '[0-9]*%' || echo "N/A")
        echo "Code Coverage: $COVERAGE"
    fi
    
    echo "Reports Location: target/test-reports/"
    echo "Coverage Report: target/site/jacoco/index.html"
}

# Main execution logic
case $TEST_TYPE in
    "unit")
        run_unit_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "performance")
        run_performance_tests
        ;;
    "security")
        run_security_tests
        ;;
    "all")
        run_unit_tests && \
        run_integration_tests && \
        run_performance_tests && \
        run_security_tests
        ;;
    *)
        print_error "Invalid test type: $TEST_TYPE"
        print_error "Valid types: unit, integration, performance, security, all"
        exit 1
        ;;
esac

# Check if tests passed
if [ $? -eq 0 ]; then
    generate_coverage_report
    check_coverage_thresholds
    generate_test_summary
    print_success "All tests completed successfully! 🎉"
else
    print_error "Some tests failed. Check the output above for details."
    exit 1
fi
