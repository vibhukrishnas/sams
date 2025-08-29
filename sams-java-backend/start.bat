@echo off
REM 🚀 SAMS Java Backend - Windows Start Script

echo 🚀 Starting SAMS Java Backend...
echo ==================================

REM Check if Java is installed
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java is not installed. Please install Java 17 or higher.
    pause
    exit /b 1
)

echo ✅ Java is installed

REM Check if Maven is installed
mvn -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Maven is not installed. Please install Maven 3.6 or higher.
    pause
    exit /b 1
)

echo ✅ Maven is installed

REM Build the application
echo.
echo 🔨 Building SAMS Java Backend...
mvn clean compile -q

if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Start the application
echo.
echo 🚀 Starting SAMS Java Backend Server...
echo.
echo 📊 Server will be available at: http://localhost:8080
echo 🏥 Health Check: http://localhost:8080/api/v1/health
echo 📈 Metrics: http://localhost:8080/api/v1/metrics/current
echo 🖥️ Servers API: http://localhost:8080/api/v1/servers
echo 🔌 WebSocket: ws://localhost:8080/ws
echo 💾 H2 Database Console: http://localhost:8080/h2-console
echo.
echo 📱 Mobile App Compatible API Endpoints:
echo    - GET /api/v1/servers (list servers)
echo    - GET /api/v1/metrics/current (current metrics)
echo    - WebSocket /ws (real-time updates)
echo.
echo 🌐 Web Dashboard Compatible:
echo    - Real-time metrics broadcasting
echo    - Server status updates
echo    - Alert notifications
echo.
echo Press Ctrl+C to stop the server
echo ==================================

mvn spring-boot:run
