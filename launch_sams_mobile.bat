@echo off
echo 🚀 SAMS Mobile App Launcher
echo ===========================
echo.

echo 📱 Setting up mobile environment...
echo.

REM Set up ADB port forwarding
echo 🔗 Setting up ADB port forwarding...
adb reverse tcp:3001 tcp:3001
if %errorlevel% neq 0 (
    echo ⚠️ ADB not found or no device connected
    echo Please ensure Android emulator is running
    pause
    exit /b 1
)

echo ✅ Port forwarding established: localhost:3001 -> device:3001
echo.

REM Check if server is running
echo 🖥️ Checking SAMS server status...
curl -s http://localhost:3001/api/v1/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SAMS server not running on localhost:3001
    echo Please start the server first:
    echo   python windows_sams_server.py
    echo.
    pause
    exit /b 1
)

echo ✅ SAMS server is running and accessible
echo.

REM Launch mobile app in browser
echo 📱 Launching SAMS Mobile App...
start "" "SAMS_Mobile_Production_Ready.html"

echo.
echo 🎉 SAMS Mobile App launched successfully!
echo.
echo 📋 Instructions:
echo   1. The app should open in your default browser
echo   2. Use browser dev tools to simulate mobile device
echo   3. Or access from Android emulator browser
echo.
echo 🔧 Troubleshooting:
echo   - If connection fails, check server is running
echo   - Ensure ADB port forwarding is active
echo   - Try refreshing the app
echo.
echo Press any key to exit...
pause >nul
