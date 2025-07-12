@echo off
echo ================================================
echo  SAMS Server Monitoring Agent - POC Launcher
echo ================================================
echo.

REM Check if Maven is installed
where mvn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Maven is not installed or not in PATH
    echo Please install Maven and try again
    pause
    exit /b 1
)

REM Check if Java is installed
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Java is not installed or not in PATH
    echo Please install Java 17 or higher and try again
    pause
    exit /b 1
)

echo Checking Java version...
java -version

echo.
echo Building the application...
call mvn clean compile

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Running tests...
call mvn test

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Some tests failed, but continuing...
)

echo.
echo Starting SAMS Server Monitoring Agent POC...
echo.
echo The application will start on http://localhost:8080
echo.
echo Available endpoints:
echo - API Status: http://localhost:8080/api/v1/status
echo - System Metrics: http://localhost:8080/api/v1/metrics
echo - Health Check: http://localhost:8080/api/v1/health
echo - WebSocket: ws://localhost:8080/ws/metrics
echo - H2 Console: http://localhost:8080/h2-console
echo.
echo Press Ctrl+C to stop the application
echo.

call mvn spring-boot:run

echo.
echo Application stopped.
pause
