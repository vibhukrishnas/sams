@echo off
echo ========================================
echo 🚀 SAMS - Complete Web Application Launcher
echo ========================================
echo.

echo 📋 Starting Complete Backend-to-Frontend Stack...
echo.

REM Check if Java backend is already running
echo 🔍 Checking if Java backend (port 8080) is running...
netstat -an | findstr ":8080" >nul
if %errorlevel% equ 0 (
    echo ✅ Java backend already running on port 8080
) else (
    echo 🚀 Starting Java Spring Boot backend...
    start "SAMS Java Backend" cmd /k "cd /d D:\Projects\SAMS\backend && mvn spring-boot:run"
    echo ⏳ Waiting for Java backend to start...
    timeout /t 30 /nobreak >nul
)

REM Check if Python backend is already running
echo 🔍 Checking if Python backend (port 8081) is running...
netstat -an | findstr ":8081" >nul
if %errorlevel% equ 0 (
    echo ✅ Python backend already running on port 8081
) else (
    echo 🐍 Starting Python Flask backend...
    start "SAMS Python Backend" cmd /k "cd /d D:\Projects\SAMS && python python_backend_server.py"
    echo ⏳ Waiting for Python backend to start...
    timeout /t 10 /nobreak >nul
)

echo.
echo 🌐 Opening Web Dashboard...
start "" "D:\Projects\SAMS\web_dashboard.html"

echo.
echo ========================================
echo ✅ SAMS Web Application Successfully Launched!
echo ========================================
echo.
echo 🔗 Backend URLs:
echo   Java Spring Boot:  http://localhost:8080
echo   Python Flask:      http://localhost:8081
echo.
echo 🎯 Web Dashboard: file:///D:/Projects/SAMS/web_dashboard.html
echo.
echo 🌟 Features Available:
echo   ✅ Real-time system monitoring
echo   ✅ WebSocket streaming (Java backend)
echo   ✅ Dual backend comparison
echo   ✅ Interactive dashboard
echo   ✅ Live metrics and alerts
echo.
echo 💡 You can switch between backends or compare both using the dashboard buttons!
echo.
pause
