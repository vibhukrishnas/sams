@echo off
echo 🚀 SAMS Java Backend Launcher
echo ============================

REM Check if Java is installed
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java is not installed or not in PATH
    echo Please install Java 17 or later
    pause
    exit /b 1
)

REM Check if Maven is installed
mvn -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Maven is not installed or not in PATH
    echo Please install Apache Maven
    pause
    exit /b 1
)

echo ✅ Java and Maven found

REM Change to Java backend directory
cd /d "%~dp0sams-java-backend"

echo 📦 Building SAMS Java Backend...
call mvn clean compile -q

if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build successful

echo 🚀 Starting SAMS Java Backend Server...
echo 🌐 Server will be available at: http://localhost:8080
echo 📊 Health Check: http://localhost:8080/api/v1/health
echo 📈 Metrics: http://localhost:8080/api/v1/metrics
echo 🚨 Alerts: http://localhost:8080/api/v1/alerts
echo 🖥️ Servers: http://localhost:8080/api/v1/servers
echo.
echo Press Ctrl+C to stop the server
echo.

call mvn spring-boot:run

pause
