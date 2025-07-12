@echo off
echo ========================================
echo    Starting SAMS Mobile App
echo ========================================
echo.

echo Current directory: %CD%
echo.

echo 🔍 Checking environment...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json not found!
    echo Please run this script from the TestApp directory
    pause
    exit /b 1
)

echo ✅ Found package.json

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js available: 
node --version

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found!
    pause
    exit /b 1
)

echo ✅ npm available:
npm --version

REM Check React Native CLI
npx react-native --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ React Native CLI not found!
    echo Installing React Native CLI...
    npm install -g @react-native-community/cli
)

echo ✅ React Native CLI available

REM Check dependencies
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo ✅ Dependencies ready

echo.
echo 🚀 Starting SAMS Mobile App...
echo.

REM Start Metro bundler
echo 📱 Starting Metro bundler (npm start)...
start "Metro Bundler - SAMS" cmd /k "echo Metro Bundler for SAMS && echo ======================== && echo Metro will start on http://localhost:8081 && echo. && npm start"

echo ⏳ Waiting for Metro to initialize...
timeout /t 8 /nobreak >nul

echo.
echo 🔨 Building and running Android app...
echo ⏳ This may take a few minutes...

REM Run Android app
npx react-native run-android

if %errorlevel% equ 0 (
    echo.
    echo 🎉 SUCCESS! SAMS Mobile App should be running!
    echo.
    echo 📱 If you see the app in emulator:
    echo   • Login PIN: 1234
    echo   • Explore dashboard, servers, alerts
    echo   • Test real-time monitoring
    echo.
    echo 🖥️ Services running:
    echo   • Metro Bundler: http://localhost:8081
    echo   • Backend Server: http://localhost:8080
    echo.
    echo ✅ SAMS is ready for testing!
) else (
    echo.
    echo ❌ Failed to run Android app
    echo.
    echo 🔧 Common issues:
    echo   1. No Android emulator running
    echo   2. Android SDK not installed
    echo   3. USB debugging not enabled
    echo.
    echo 💡 Solutions:
    echo   1. Start Android emulator first
    echo   2. Install Android Studio
    echo   3. Check: npx react-native doctor
    echo.
    echo 📱 To check connected devices:
    echo   adb devices
    echo.
)

echo.
echo Press any key to continue...
pause >nul
