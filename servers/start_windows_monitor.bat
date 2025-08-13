@echo off
echo 🖥️ SAMS Windows Server Monitor Setup
echo =====================================
echo.

REM Check if Python is installed
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

REM Install required packages
echo 📦 Installing required packages...
pip install flask flask-cors psutil

if %errorlevel% neq 0 (
    echo ❌ Failed to install packages
    echo 🔧 Try running as Administrator or check your internet connection
    pause
    exit /b 1
)

echo ✅ Packages installed successfully
echo.

REM Get IP address
echo 🌐 Getting your Windows server IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "ip=%%a"
    goto :found_ip
)

:found_ip
set ip=%ip: =%
echo 📍 Your Windows server IP: %ip%
echo.

REM Start the monitor
echo 🚀 Starting SAMS Windows Server Monitor...
echo 📊 This will monitor:
echo    - CPU Usage
echo    - Memory Usage  
echo    - Disk Space
echo    - Windows Services
echo    - Running Processes
echo.
echo 🔧 Update your SAMS app with:
echo    API_BASE_URL = 'http://%ip%:8080'
echo.
echo 📱 Keep this window open while using SAMS app
echo ⏹️ Press Ctrl+C to stop the monitor
echo.

python windows_sams_server.py

pause
