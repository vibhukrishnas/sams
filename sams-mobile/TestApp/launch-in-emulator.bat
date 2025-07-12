@echo off
echo ========================================
echo    SAMS Mobile App - Emulator Launcher
echo ========================================
echo.

REM Check if Node.js is available
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js is available

REM Check if React Native CLI is available
echo Checking React Native CLI...
npx react-native --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ React Native CLI not found. Installing...
    npm install -g @react-native-community/cli
)
echo ✅ React Native CLI is available

REM Check for Android devices/emulators
echo.
echo Checking for Android devices...
adb devices

echo.
echo Checking if emulator is running...
adb devices | findstr "device" | findstr -v "List"
if %errorlevel% neq 0 (
    echo ⚠️ No Android device/emulator detected.
    echo.
    echo Please start an Android emulator:
    echo 1. Open Android Studio
    echo 2. Go to Tools ^> AVD Manager  
    echo 3. Start SAMS_Local or SAMS_Fast emulator
    echo.
    echo Or run: emulator -avd SAMS_Local
    echo.
    set /p choice="Do you want to continue anyway? (y/n): "
    if /i not "%choice%"=="y" (
        pause
        exit /b 1
    )
)

REM Check if dependencies are installed
echo.
echo Checking dependencies...
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)

REM Start backend server in background
echo.
echo 🖥️ Starting backend server...
if exist "sams-backend-server\server.js" (
    start "SAMS Backend Server" cmd /k "cd sams-backend-server && node server.js"
    timeout /t 3 /nobreak >nul
    echo ✅ Backend server started on http://localhost:8080
) else (
    echo ⚠️ Backend server not found, continuing without it
)

REM Start Metro bundler
echo.
echo 📱 Starting Metro bundler...
start "Metro Bundler" cmd /k "npx react-native start --reset-cache --port 8081"
echo ⏳ Waiting for Metro to start...
timeout /t 8 /nobreak >nul

REM Build and run the app
echo.
echo 🔨 Building and running SAMS app...
echo This may take a few minutes for the first build...
npx react-native run-android --port 8081

if %errorlevel% equ 0 (
    echo.
    echo 🎉 SUCCESS! SAMS Mobile App launched in emulator!
    echo.
    echo 📱 App Features Available:
    echo   • 🔐 PIN Authentication ^(default: 1234^)
    echo   • 📊 Real-time Server Monitoring
    echo   • 🚨 Alert Management System
    echo   • 📈 Performance Dashboards
    echo   • 🔧 Server Configuration
    echo   • 📱 Push Notifications
    echo   • 🌙 Dark Mode Support
    echo   • 🔄 Offline Functionality
    echo.
    echo 🖥️ Services Running:
    echo   • Backend Server: http://localhost:8080
    echo   • Metro Bundler: http://localhost:8081
    echo   • Mobile App: Running on Android Emulator
    echo.
    echo 💡 Developer Tips:
    echo   • Press Ctrl+M in emulator for developer menu
    echo   • Shake device ^(Ctrl+Shift+Z^) for reload menu
    echo   • Use 'r' in Metro terminal to reload
    echo   • Use 'd' in Metro terminal for dev menu
    echo   • Check Metro terminal for any build errors
    echo.
    echo 🔧 Troubleshooting:
    echo   • If app crashes, check Metro logs
    echo   • If backend errors, check backend terminal
    echo   • For build issues, try: npx react-native doctor
    echo   • For cache issues, try: npx react-native start --reset-cache
    echo.
    echo ✅ SAMS is ready for testing and demonstration!
    echo.
    echo 📋 Test Scenarios:
    echo   1. Login with PIN: 1234
    echo   2. View dashboard with real-time metrics
    echo   3. Check server list and status
    echo   4. Review alerts and notifications
    echo   5. Test offline functionality
    echo   6. Configure server settings
    echo.
) else (
    echo.
    echo ❌ Failed to build/run SAMS app
    echo.
    echo 🔧 Troubleshooting Steps:
    echo   1. Check if Android emulator is running: adb devices
    echo   2. Verify Android SDK installation
    echo   3. Check Metro bundler logs for errors
    echo   4. Try running: npx react-native doctor
    echo   5. Clear cache: npx react-native start --reset-cache
    echo   6. Reinstall dependencies: rm -rf node_modules ^&^& npm install
    echo.
    echo 📋 Manual Commands:
    echo   1. npx react-native start --reset-cache
    echo   2. npx react-native run-android
    echo.
    echo 📞 Common Issues:
    echo   • Metro port conflict: Kill process on port 8081
    echo   • Build errors: Check Android SDK and Java installation
    echo   • Emulator issues: Restart emulator or create new AVD
    echo.
)

echo.
echo Press any key to continue...
pause >nul
