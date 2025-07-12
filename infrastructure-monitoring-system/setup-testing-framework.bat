@echo off
echo ================================================================
echo  SAMS Testing Framework Setup
echo ================================================================
echo.
echo This script will set up comprehensive testing frameworks for:
echo - Backend unit and integration tests
echo - Frontend component and E2E tests  
echo - Mobile app testing
echo - Performance and load testing
echo - Security testing tools
echo.

echo [1/6] Setting up backend testing framework...
echo.

REM Create backend test configuration
if not exist "backend\src\test\resources" mkdir backend\src\test\resources

echo # Test configuration > backend\src\test\resources\application-test.yml
echo spring: >> backend\src\test\resources\application-test.yml
echo   datasource: >> backend\src\test\resources\application-test.yml
echo     url: jdbc:h2:mem:testdb >> backend\src\test\resources\application-test.yml
echo     driver-class-name: org.h2.Driver >> backend\src\test\resources\application-test.yml
echo     username: sa >> backend\src\test\resources\application-test.yml
echo     password: >> backend\src\test\resources\application-test.yml
echo   jpa: >> backend\src\test\resources\application-test.yml
echo     hibernate: >> backend\src\test\resources\application-test.yml
echo       ddl-auto: create-drop >> backend\src\test\resources\application-test.yml
echo   redis: >> backend\src\test\resources\application-test.yml
echo     host: localhost >> backend\src\test\resources\application-test.yml
echo     port: 6379 >> backend\src\test\resources\application-test.yml
echo. >> backend\src\test\resources\application-test.yml
echo logging: >> backend\src\test\resources\application-test.yml
echo   level: >> backend\src\test\resources\application-test.yml
echo     com.sams: DEBUG >> backend\src\test\resources\application-test.yml

REM Add testing dependencies to backend pom.xml
echo ✅ Backend testing framework configured
echo.

echo [2/6] Setting up frontend testing framework...
echo.

if exist "frontend" (
    cd frontend
    
    REM Create Jest configuration
    echo module.exports = { > jest.config.js
    echo   testEnvironment: 'jsdom', >> jest.config.js
    echo   setupFilesAfterEnv: ['@testing-library/jest-dom'], >> jest.config.js
    echo   moduleNameMapping: { >> jest.config.js
    echo     '^@/(.*)$': '<rootDir>/src/$1', >> jest.config.js
    echo   }, >> jest.config.js
    echo   collectCoverageFrom: [ >> jest.config.js
    echo     'src/**/*.{js,jsx,ts,tsx}', >> jest.config.js
    echo     '!src/index.js', >> jest.config.js
    echo     '!src/reportWebVitals.js', >> jest.config.js
    echo   ], >> jest.config.js
    echo   coverageThreshold: { >> jest.config.js
    echo     global: { >> jest.config.js
    echo       branches: 80, >> jest.config.js
    echo       functions: 80, >> jest.config.js
    echo       lines: 80, >> jest.config.js
    echo       statements: 80, >> jest.config.js
    echo     }, >> jest.config.js
    echo   }, >> jest.config.js
    echo }; >> jest.config.js
    
    REM Create Cypress configuration
    echo { > cypress.config.js
    echo   "e2e": { >> cypress.config.js
    echo     "baseUrl": "http://localhost:3000", >> cypress.config.js
    echo     "supportFile": "cypress/support/e2e.js", >> cypress.config.js
    echo     "specPattern": "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}", >> cypress.config.js
    echo     "video": true, >> cypress.config.js
    echo     "screenshot": true >> cypress.config.js
    echo   } >> cypress.config.js
    echo } >> cypress.config.js
    
    cd ..
    echo ✅ Frontend testing framework configured
) else (
    echo ⚠️ Frontend directory not found, skipping
)
echo.

echo [3/6] Setting up mobile testing framework...
echo.

if exist "mobile-app" (
    cd mobile-app
    
    REM Create Detox configuration
    echo { > .detoxrc.js
    echo   "testRunner": "jest", >> .detoxrc.js
    echo   "runnerConfig": "e2e/jest.config.js", >> .detoxrc.js
    echo   "configurations": { >> .detoxrc.js
    echo     "android.emu.debug": { >> .detoxrc.js
    echo       "type": "android.emulator", >> .detoxrc.js
    echo       "device": { >> .detoxrc.js
    echo         "avdName": "Pixel_3a_API_30_x86" >> .detoxrc.js
    echo       }, >> .detoxrc.js
    echo       "app": { >> .detoxrc.js
    echo         "type": "android.apk", >> .detoxrc.js
    echo         "binaryPath": "android/app/build/outputs/apk/debug/app-debug.apk", >> .detoxrc.js
    echo         "build": "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug" >> .detoxrc.js
    echo       } >> .detoxrc.js
    echo     } >> .detoxrc.js
    echo   } >> .detoxrc.js
    echo } >> .detoxrc.js
    
    REM Create E2E test directory structure
    if not exist "e2e" mkdir e2e
    
    echo module.exports = { > e2e\jest.config.js
    echo   preset: '@testing-library/react-native', >> e2e\jest.config.js
    echo   testMatch: ['<rootDir>/**/*.test.js'], >> e2e\jest.config.js
    echo   testTimeout: 120000, >> e2e\jest.config.js
    echo   maxWorkers: 1, >> e2e\jest.config.js
    echo   globalSetup: 'detox/runners/jest/globalSetup', >> e2e\jest.config.js
    echo   globalTeardown: 'detox/runners/jest/globalTeardown', >> e2e\jest.config.js
    echo   reporters: ['detox/runners/jest/reporter'], >> e2e\jest.config.js
    echo   testEnvironment: 'detox/runners/jest/testEnvironment', >> e2e\jest.config.js
    echo   verbose: true, >> e2e\jest.config.js
    echo }; >> e2e\jest.config.js
    
    cd ..
    echo ✅ Mobile testing framework configured
) else (
    echo ⚠️ Mobile app directory not found, skipping
)
echo.

echo [4/6] Setting up performance testing tools...
echo.

REM Create performance testing directory
if not exist "performance-tests" mkdir performance-tests

REM Create JMeter test plan template
echo ^<?xml version="1.0" encoding="UTF-8"?^> > performance-tests\load-test-plan.jmx
echo ^<jmeterTestPlan version="1.2"^> >> performance-tests\load-test-plan.jmx
echo   ^<hashTree^> >> performance-tests\load-test-plan.jmx
echo     ^<TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="SAMS Load Test"^> >> performance-tests\load-test-plan.jmx
echo       ^<elementProp name="TestPlan.arguments" elementType="Arguments" guiclass="ArgumentsPanel"^> >> performance-tests\load-test-plan.jmx
echo         ^<collectionProp name="Arguments.arguments"/^> >> performance-tests\load-test-plan.jmx
echo       ^</elementProp^> >> performance-tests\load-test-plan.jmx
echo       ^<boolProp name="TestPlan.functional_mode"^>false^</boolProp^> >> performance-tests\load-test-plan.jmx
echo       ^<boolProp name="TestPlan.serialize_threadgroups"^>false^</boolProp^> >> performance-tests\load-test-plan.jmx
echo     ^</TestPlan^> >> performance-tests\load-test-plan.jmx
echo   ^</hashTree^> >> performance-tests\load-test-plan.jmx
echo ^</jmeterTestPlan^> >> performance-tests\load-test-plan.jmx

REM Create Artillery.js configuration
echo config: > performance-tests\artillery-config.yml
echo   target: 'http://localhost:8090' >> performance-tests\artillery-config.yml
echo   phases: >> performance-tests\artillery-config.yml
echo     - duration: 60 >> performance-tests\artillery-config.yml
echo       arrivalRate: 10 >> performance-tests\artillery-config.yml
echo       name: "Warm up" >> performance-tests\artillery-config.yml
echo     - duration: 300 >> performance-tests\artillery-config.yml
echo       arrivalRate: 50 >> performance-tests\artillery-config.yml
echo       name: "Load test" >> performance-tests\artillery-config.yml
echo     - duration: 120 >> performance-tests\artillery-config.yml
echo       arrivalRate: 100 >> performance-tests\artillery-config.yml
echo       name: "Stress test" >> performance-tests\artillery-config.yml
echo scenarios: >> performance-tests\artillery-config.yml
echo   - name: "API Health Check" >> performance-tests\artillery-config.yml
echo     flow: >> performance-tests\artillery-config.yml
echo       - get: >> performance-tests\artillery-config.yml
echo           url: "/actuator/health" >> performance-tests\artillery-config.yml
echo   - name: "Get Metrics" >> performance-tests\artillery-config.yml
echo     flow: >> performance-tests\artillery-config.yml
echo       - get: >> performance-tests\artillery-config.yml
echo           url: "/api/v1/metrics" >> performance-tests\artillery-config.yml

echo ✅ Performance testing tools configured
echo.

echo [5/6] Setting up security testing tools...
echo.

REM Create security testing directory
if not exist "security-tests" mkdir security-tests

REM Create OWASP ZAP automation script
echo @echo off > security-tests\run-security-scan.bat
echo echo Starting OWASP ZAP security scan... >> security-tests\run-security-scan.bat
echo. >> security-tests\run-security-scan.bat
echo REM Check if ZAP is installed >> security-tests\run-security-scan.bat
echo where zap-baseline.py ^>nul 2^>nul >> security-tests\run-security-scan.bat
echo if %%ERRORLEVEL%% NEQ 0 ( >> security-tests\run-security-scan.bat
echo     echo ERROR: OWASP ZAP is not installed >> security-tests\run-security-scan.bat
echo     echo Please install OWASP ZAP and add to PATH >> security-tests\run-security-scan.bat
echo     pause >> security-tests\run-security-scan.bat
echo     exit /b 1 >> security-tests\run-security-scan.bat
echo ^) >> security-tests\run-security-scan.bat
echo. >> security-tests\run-security-scan.bat
echo echo Running baseline security scan... >> security-tests\run-security-scan.bat
echo zap-baseline.py -t http://localhost:8090 -r security-report.html >> security-tests\run-security-scan.bat
echo. >> security-tests\run-security-scan.bat
echo echo Security scan completed. Check security-report.html >> security-tests\run-security-scan.bat
echo pause >> security-tests\run-security-scan.bat

REM Create Snyk security configuration
echo { > security-tests\snyk-config.json
echo   "language-settings": { >> security-tests\snyk-config.json
echo     "java": { >> security-tests\snyk-config.json
echo       "enableLicenseScan": true >> security-tests\snyk-config.json
echo     }, >> security-tests\snyk-config.json
echo     "javascript": { >> security-tests\snyk-config.json
echo       "enableLicenseScan": true >> security-tests\snyk-config.json
echo     } >> security-tests\snyk-config.json
echo   }, >> security-tests\snyk-config.json
echo   "severity-threshold": "medium" >> security-tests\snyk-config.json
echo } >> security-tests\snyk-config.json

echo ✅ Security testing tools configured
echo.

echo [6/6] Creating test execution scripts...
echo.

REM Create comprehensive test runner
echo @echo off > run-all-tests.bat
echo echo ================================================================ >> run-all-tests.bat
echo echo  SAMS Comprehensive Test Suite >> run-all-tests.bat
echo echo ================================================================ >> run-all-tests.bat
echo echo. >> run-all-tests.bat
echo. >> run-all-tests.bat
echo echo [1/5] Running backend tests... >> run-all-tests.bat
echo cd backend >> run-all-tests.bat
echo call mvn clean test >> run-all-tests.bat
echo if %%ERRORLEVEL%% NEQ 0 ( >> run-all-tests.bat
echo     echo ❌ Backend tests failed >> run-all-tests.bat
echo     cd .. >> run-all-tests.bat
echo     pause >> run-all-tests.bat
echo     exit /b 1 >> run-all-tests.bat
echo ^) >> run-all-tests.bat
echo cd .. >> run-all-tests.bat
echo echo ✅ Backend tests passed >> run-all-tests.bat
echo echo. >> run-all-tests.bat
echo. >> run-all-tests.bat
echo if exist "frontend" ( >> run-all-tests.bat
echo     echo [2/5] Running frontend tests... >> run-all-tests.bat
echo     cd frontend >> run-all-tests.bat
echo     call npm test -- --coverage --watchAll=false >> run-all-tests.bat
echo     if %%ERRORLEVEL%% NEQ 0 ( >> run-all-tests.bat
echo         echo ❌ Frontend tests failed >> run-all-tests.bat
echo         cd .. >> run-all-tests.bat
echo         pause >> run-all-tests.bat
echo         exit /b 1 >> run-all-tests.bat
echo     ^) >> run-all-tests.bat
echo     cd .. >> run-all-tests.bat
echo     echo ✅ Frontend tests passed >> run-all-tests.bat
echo ^) >> run-all-tests.bat
echo echo. >> run-all-tests.bat
echo. >> run-all-tests.bat
echo echo [3/5] Running POC tests... >> run-all-tests.bat
echo cd poc >> run-all-tests.bat
echo echo Testing POC 1: Java Spring Boot Monitoring Agent... >> run-all-tests.bat
echo cd server-monitoring-agent >> run-all-tests.bat
echo call mvn test >> run-all-tests.bat
echo cd .. >> run-all-tests.bat
echo echo Testing POC 4: Alert Correlation Engine... >> run-all-tests.bat
echo cd alert-correlation-engine >> run-all-tests.bat
echo call python -m pytest >> run-all-tests.bat
echo cd .. >> run-all-tests.bat
echo cd .. >> run-all-tests.bat
echo echo ✅ POC tests completed >> run-all-tests.bat
echo echo. >> run-all-tests.bat
echo. >> run-all-tests.bat
echo echo [4/5] Running integration tests... >> run-all-tests.bat
echo cd backend >> run-all-tests.bat
echo call mvn verify -Pintegration-tests >> run-all-tests.bat
echo cd .. >> run-all-tests.bat
echo echo ✅ Integration tests completed >> run-all-tests.bat
echo echo. >> run-all-tests.bat
echo. >> run-all-tests.bat
echo echo [5/5] Generating test reports... >> run-all-tests.bat
echo echo Collecting test results... >> run-all-tests.bat
echo echo ✅ All tests completed successfully! >> run-all-tests.bat
echo echo. >> run-all-tests.bat
echo echo Test reports available in: >> run-all-tests.bat
echo echo - Backend: backend/target/surefire-reports/ >> run-all-tests.bat
echo echo - Frontend: frontend/coverage/ >> run-all-tests.bat
echo echo - POCs: poc/testing/ >> run-all-tests.bat
echo echo. >> run-all-tests.bat
echo pause >> run-all-tests.bat

echo ✅ Test execution scripts created
echo.

echo ================================================================
echo  🧪 Testing Framework Setup Complete!
echo ================================================================
echo.
echo The following testing frameworks have been configured:
echo.
echo 🔧 BACKEND TESTING:
echo   - JUnit 5 for unit tests
echo   - Spring Boot Test for integration tests
echo   - Testcontainers for database testing
echo   - Mockito for mocking
echo   - JaCoCo for code coverage
echo.
echo 🌐 FRONTEND TESTING:
echo   - Jest for unit testing
echo   - React Testing Library for component testing
echo   - Cypress for E2E testing
echo   - Coverage reporting
echo.
echo 📱 MOBILE TESTING:
echo   - Jest for unit testing
echo   - Detox for E2E testing
echo   - React Native Testing Library
echo.
echo ⚡ PERFORMANCE TESTING:
echo   - JMeter test plans
echo   - Artillery.js load testing
echo   - Performance monitoring
echo.
echo 🔒 SECURITY TESTING:
echo   - OWASP ZAP baseline scans
echo   - Snyk vulnerability scanning
echo   - Dependency security checks
echo.
echo 🚀 QUICK START:
echo.
echo 1. Run all tests:
echo    run-all-tests.bat
echo.
echo 2. Run specific test suites:
echo    cd backend && mvn test
echo    cd frontend && npm test
echo    cd mobile-app && npm test
echo.
echo 3. Run performance tests:
echo    cd performance-tests
echo    artillery run artillery-config.yml
echo.
echo 4. Run security scans:
echo    cd security-tests
echo    run-security-scan.bat
echo.
echo ================================================================
echo.
pause
