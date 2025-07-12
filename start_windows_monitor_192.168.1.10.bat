@echo off
echo ========================================
echo 🖥️ SAMS Windows Server Monitor Setup
echo ========================================
echo.
echo 📍 Your Windows Server: 192.168.1.10
echo 🔧 Setting up monitoring for SAMS...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo.
    echo 📥 Please install Python from: https://python.org/downloads/
    echo ⚠️  IMPORTANT: Check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

echo ✅ Python is installed
echo.

REM Install required packages
echo 📦 Installing required Python packages...
echo.
pip install flask flask-cors psutil

if %errorlevel% neq 0 (
    echo ❌ Failed to install packages
    echo 💡 Try running as Administrator
    pause
    exit /b 1
)

echo.
echo ✅ All packages installed successfully!
echo.

REM Get IP address
echo 📍 Detecting your Windows server IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "ip=%%a"
    goto :found
)
:found
set ip=%ip: =%
echo 🌐 Your Windows server IP: %ip%
echo.

REM Check if IP matches expected
if "%ip%"=="192.168.1.10" (
    echo ✅ IP matches! SAMS app is already configured for this IP.
) else (
    echo ⚠️  IP mismatch detected!
    echo 🔧 Expected: 192.168.1.10
    echo 📍 Actual: %ip%
    echo.
    echo 💡 You may need to update SAMS app with:
    echo    API_BASE_URL = 'http://%ip%:8080'
)

echo.
echo ========================================
echo 🚀 Starting Windows Server Monitor...
echo ========================================
echo.
echo 📊 Monitoring your Windows system:
echo    • CPU Usage
echo    • Memory Usage  
echo    • Disk Space
echo    • Windows Services
echo    • Running Processes
echo    • System Alerts
echo.
echo 🌐 API will be available at:
echo    • http://localhost:8080
echo    • http://%ip%:8080
echo.
echo 📱 SAMS app will connect automatically!
echo.
echo ⏹️  Press Ctrl+C to stop monitoring
echo ========================================
echo.

REM Start the Python server
python windows_sams_server.py

echo.
echo 🛑 Windows Server Monitor stopped.
pause
