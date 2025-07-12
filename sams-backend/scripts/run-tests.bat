@echo off
REM SAMS Backend Test Execution Script for Windows
REM Comprehensive test suite runner with coverage reporting

setlocal enabledelayedexpansion

echo 🧪 SAMS Backend Test Suite Runner
echo ==================================

REM Default values
set TEST_TYPE=all
set GENERATE_REPORT=true
set SKIP_INTEGRATION=false
set SKIP_PERFORMANCE=false
set SKIP_SECURITY=false

REM Parse command line arguments
:parse_args
if "%~1"=="" goto end_parse
if "%~1"=="--type" (
    set TEST_TYPE=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="--no-report" (
    set GENERATE_REPORT=false
    shift
    goto parse_args
)
if "%~1"=="--skip-integration" (
    set SKIP_INTEGRATION=true
    shift
    goto parse_args
)
if "%~1"=="--skip-performance" (
    set SKIP_PERFORMANCE=true
    shift
    goto parse_args
)
if "%~1"=="--skip-security" (
    set SKIP_SECURITY=true
    shift
    goto parse_args
)
if "%~1"=="--help" (
    echo Usage: %0 [OPTIONS]
    echo Options:
    echo   --type TYPE           Test type: unit, integration, performance, security, all
    echo   --no-report          Skip generating coverage report
    echo   --skip-integration   Skip integration tests
    echo   --skip-performance   Skip performance tests
    echo   --skip-security      Skip security tests
    echo   --help               Show this help message
    exit /b 0
)
echo Unknown option: %~1
exit /b 1

:end_parse

REM Check if Maven is installed
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Maven is not installed. Please install Maven to run tests.
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running. TestContainer tests may fail.
)

REM Create reports directory
if not exist target\test-reports mkdir target\test-reports

echo [INFO] Starting test execution with type: %TEST_TYPE%

REM Function to run unit tests
:run_unit_tests
echo [INFO] Running unit tests...
call mvn clean test -Dspring.profiles.active=test
if %errorlevel% equ 0 (
    echo [SUCCESS] Unit tests completed successfully
    goto :eof
) else (
    echo [ERROR] Unit tests failed
    exit /b 1
)

REM Function to run integration tests
:run_integration_tests
if "%SKIP_INTEGRATION%"=="true" (
    echo [WARNING] Skipping integration tests
    goto :eof
)
echo [INFO] Running integration tests...
call mvn verify -Dspring.profiles.active=test
if %errorlevel% equ 0 (
    echo [SUCCESS] Integration tests completed successfully
    goto :eof
) else (
    echo [ERROR] Integration tests failed
    exit /b 1
)

REM Function to run performance tests
:run_performance_tests
if "%SKIP_PERFORMANCE%"=="true" (
    echo [WARNING] Skipping performance tests
    goto :eof
)
echo [INFO] Running performance tests...
call mvn test -Pperformance -Dspring.profiles.active=test
if %errorlevel% equ 0 (
    echo [SUCCESS] Performance tests completed successfully
    goto :eof
) else (
    echo [ERROR] Performance tests failed
    exit /b 1
)

REM Function to run security tests
:run_security_tests
if "%SKIP_SECURITY%"=="true" (
    echo [WARNING] Skipping security tests
    goto :eof
)
echo [INFO] Running security tests...
call mvn test -Psecurity -Dspring.profiles.active=test
if %errorlevel% equ 0 (
    echo [SUCCESS] Security tests completed successfully
    goto :eof
) else (
    echo [ERROR] Security tests failed
    exit /b 1
)

REM Function to generate coverage report
:generate_coverage_report
if "%GENERATE_REPORT%"=="false" (
    echo [WARNING] Skipping coverage report generation
    goto :eof
)
echo [INFO] Generating coverage report...
call mvn jacoco:report
if %errorlevel% equ 0 (
    echo [SUCCESS] Coverage report generated successfully
    echo [INFO] Coverage report available at: target\site\jacoco\index.html
    goto :eof
) else (
    echo [ERROR] Failed to generate coverage report
    exit /b 1
)

REM Function to check coverage thresholds
:check_coverage_thresholds
echo [INFO] Checking coverage thresholds...
call mvn jacoco:check
if %errorlevel% equ 0 (
    echo [SUCCESS] Coverage thresholds met
    goto :eof
) else (
    echo [WARNING] Coverage thresholds not met
    exit /b 1
)

REM Function to generate test summary
:generate_test_summary
echo [INFO] Generating test summary...
echo 📊 Test Execution Summary
echo ========================

REM Count test files
set UNIT_TESTS=0
set INTEGRATION_TESTS=0

if exist target\surefire-reports (
    for %%f in (target\surefire-reports\*.xml) do set /a UNIT_TESTS+=1
)

if exist target\failsafe-reports (
    for %%f in (target\failsafe-reports\*.xml) do set /a INTEGRATION_TESTS+=1
)

echo Unit Tests: %UNIT_TESTS%
echo Integration Tests: %INTEGRATION_TESTS%

if exist target\site\jacoco\index.html (
    echo Code Coverage: Available in target\site\jacoco\index.html
)

echo Reports Location: target\test-reports\
echo Coverage Report: target\site\jacoco\index.html
goto :eof

REM Main execution logic
if "%TEST_TYPE%"=="unit" (
    call :run_unit_tests
) else if "%TEST_TYPE%"=="integration" (
    call :run_integration_tests
) else if "%TEST_TYPE%"=="performance" (
    call :run_performance_tests
) else if "%TEST_TYPE%"=="security" (
    call :run_security_tests
) else if "%TEST_TYPE%"=="all" (
    call :run_unit_tests
    if !errorlevel! equ 0 call :run_integration_tests
    if !errorlevel! equ 0 call :run_performance_tests
    if !errorlevel! equ 0 call :run_security_tests
) else (
    echo [ERROR] Invalid test type: %TEST_TYPE%
    echo [ERROR] Valid types: unit, integration, performance, security, all
    exit /b 1
)

REM Check if tests passed and generate reports
if %errorlevel% equ 0 (
    call :generate_coverage_report
    call :check_coverage_thresholds
    call :generate_test_summary
    echo [SUCCESS] All tests completed successfully! 🎉
) else (
    echo [ERROR] Some tests failed. Check the output above for details.
    exit /b 1
)

endlocal
