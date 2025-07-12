@echo off
echo 🚀 SAMS Server Deployment Script
echo ================================
echo.

REM Check if IP address is provided
if "%1"=="" (
    echo ❌ Error: IP address required
    echo.
    echo Usage: deploy_sams_to_server.bat ^<IP_ADDRESS^> [SERVER_NAME]
    echo Example: deploy_sams_to_server.bat 192.168.1.100 "Production Server"
    echo.
    pause
    exit /b 1
)

set TARGET_IP=%1
set SERVER_NAME=%2
if "%SERVER_NAME%"=="" set SERVER_NAME=Server-%TARGET_IP%

echo 🎯 Target Server: %SERVER_NAME% (%TARGET_IP%)
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo 📥 Please install Python from: https://www.python.org/downloads/
    echo    Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo ✅ Python found
echo.

REM Check network connectivity
echo 🔍 Testing network connectivity to %TARGET_IP%...
ping -n 1 %TARGET_IP% >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Cannot reach %TARGET_IP% - please verify:
    echo    • Server is online
    echo    • IP address is correct
    echo    • Network connectivity
    pause
    exit /b 1
)

echo ✅ Network connectivity verified
echo.

REM Install required packages locally
echo 📦 Installing required packages...
pip install flask flask-cors psutil requests >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️ Package installation warning - continuing anyway
)

echo ✅ Packages ready
echo.

REM Run the auto-installer
echo 🚀 Starting SAMS auto-installation...
echo.
python sams_auto_installer.py %TARGET_IP% "%SERVER_NAME%"

if %errorlevel% equ 0 (
    echo.
    echo 🎉 DEPLOYMENT SUCCESSFUL!
    echo ========================
    echo.
    echo ✅ SAMS monitor installed on: %SERVER_NAME% (%TARGET_IP%)
    echo 🌐 API endpoint: http://%TARGET_IP%:8080/api/v1/health
    echo 📱 Update your SAMS app with: API_BASE_URL = 'http://%TARGET_IP%:8080'
    echo.
    echo 🔧 Next steps:
    echo    1. Open SAMS mobile app
    echo    2. Go to Server Management
    echo    3. Add server with IP: %TARGET_IP%
    echo    4. Verify connection and monitoring
    echo.
) else (
    echo.
    echo ❌ DEPLOYMENT FAILED!
    echo ===================
    echo.
    echo 🔧 Troubleshooting steps:
    echo    1. Verify server is accessible
    echo    2. Check Windows firewall settings
    echo    3. Ensure Python is installed on target server
    echo    4. Try manual installation
    echo.
)

pause
