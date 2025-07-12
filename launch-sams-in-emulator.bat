@echo off
echo 🚀 SAMS Mobile App - Local Emulator Launcher
echo ============================================
echo.

REM Set colors for output
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

echo %BLUE%📱 Starting SAMS Mobile App in Local Android Emulator%RESET%
echo.

REM Check if Android SDK is available
echo %YELLOW%🔍 Checking Android SDK...%RESET%
if not exist "%ANDROID_HOME%\emulator\emulator.exe" (
    if not exist "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" (
        if not exist "D:\Android\Sdk\emulator\emulator.exe" (
            echo %RED%❌ Android SDK not found. Please install Android Studio or set ANDROID_HOME%RESET%
            pause
            exit /b 1
        ) else (
            set "EMULATOR_PATH=D:\Android\Sdk\emulator\emulator.exe"
            set "ADB_PATH=D:\Android\Sdk\platform-tools\adb.exe"
        )
    ) else (
        set "EMULATOR_PATH=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe"
        set "ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    )
) else (
    set "EMULATOR_PATH=%ANDROID_HOME%\emulator\emulator.exe"
    set "ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe"
)

echo %GREEN%✅ Android SDK found%RESET%

REM Check available emulators
echo %YELLOW%🔍 Checking available emulators...%RESET%
"%EMULATOR_PATH%" -list-avds > temp_avds.txt 2>nul

if exist temp_avds.txt (
    findstr /C:"SAMS_Local" temp_avds.txt >nul
    if !errorlevel! equ 0 (
        set "EMULATOR_NAME=SAMS_Local"
        echo %GREEN%✅ Found SAMS_Local emulator%RESET%
    ) else (
        findstr /C:"SAMS_Fast" temp_avds.txt >nul
        if !errorlevel! equ 0 (
            set "EMULATOR_NAME=SAMS_Fast"
            echo %GREEN%✅ Found SAMS_Fast emulator%RESET%
        ) else (
            echo %RED%❌ No SAMS emulators found%RESET%
            echo Available emulators:
            type temp_avds.txt
            del temp_avds.txt
            pause
            exit /b 1
        )
    )
    del temp_avds.txt
) else (
    echo %RED%❌ Could not list emulators%RESET%
    pause
    exit /b 1
)

REM Check if emulator is already running
echo %YELLOW%🔍 Checking if emulator is already running...%RESET%
"%ADB_PATH%" devices > temp_devices.txt 2>nul
findstr /C:"emulator" temp_devices.txt >nul
if !errorlevel! equ 0 (
    echo %GREEN%✅ Emulator is already running%RESET%
    set "EMULATOR_RUNNING=true"
) else (
    echo %YELLOW%📱 Starting emulator: %EMULATOR_NAME%%RESET%
    start "Android Emulator" "%EMULATOR_PATH%" -avd %EMULATOR_NAME% -no-snapshot-load
    set "EMULATOR_RUNNING=false"
    
    REM Wait for emulator to boot
    echo %YELLOW%⏳ Waiting for emulator to boot...%RESET%
    timeout /t 10 /nobreak >nul
    
    :wait_for_emulator
    "%ADB_PATH%" devices | findstr /C:"device" >nul
    if !errorlevel! neq 0 (
        echo %YELLOW%⏳ Still waiting for emulator...%RESET%
        timeout /t 5 /nobreak >nul
        goto wait_for_emulator
    )
    
    echo %GREEN%✅ Emulator is ready%RESET%
)

if exist temp_devices.txt del temp_devices.txt

REM Navigate to SAMS mobile app directory
echo %YELLOW%📂 Navigating to SAMS mobile app...%RESET%
cd /d "%~dp0sams-mobile\TestApp"

if not exist "package.json" (
    echo %RED%❌ SAMS mobile app not found in expected location%RESET%
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo %GREEN%✅ Found SAMS mobile app%RESET%

REM Check if node_modules exists
if not exist "node_modules" (
    echo %YELLOW%📦 Installing dependencies...%RESET%
    call npm install
    if !errorlevel! neq 0 (
        echo %RED%❌ Failed to install dependencies%RESET%
        pause
        exit /b 1
    )
    echo %GREEN%✅ Dependencies installed%RESET%
)

REM Start the backend server first
echo %YELLOW%🖥️ Starting SAMS backend server...%RESET%
cd sams-backend-server
start "SAMS Backend" cmd /k "node server.js"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Clear Metro cache
echo %YELLOW%🧹 Clearing Metro cache...%RESET%
call npx react-native start --reset-cache --port 8081 > metro.log 2>&1 &

REM Wait for Metro to start
echo %YELLOW%⏳ Starting Metro bundler...%RESET%
timeout /t 5 /nobreak >nul

REM Build and install the app on emulator
echo %YELLOW%🔨 Building and installing SAMS app on emulator...%RESET%
call npx react-native run-android --port 8081

if !errorlevel! equ 0 (
    echo.
    echo %GREEN%🎉 SUCCESS! SAMS Mobile App launched in emulator%RESET%
    echo.
    echo %BLUE%📱 App Features Available:%RESET%
    echo   • 🔐 PIN Authentication (1234)
    echo   • 📊 Real-time Server Monitoring
    echo   • 🚨 Alert Management
    echo   • 📈 Performance Dashboards
    echo   • 🔧 Server Configuration
    echo   • 📱 Push Notifications
    echo.
    echo %BLUE%🖥️ Backend Server:%RESET%
    echo   • Running on: http://localhost:8080
    echo   • API Endpoints: /api/v1/*
    echo   • WebSocket: ws://localhost:8080
    echo.
    echo %BLUE%📱 Mobile App:%RESET%
    echo   • Running on Android Emulator: %EMULATOR_NAME%
    echo   • Metro Bundler: http://localhost:8081
    echo   • Hot Reload: Enabled
    echo.
    echo %YELLOW%💡 Tips:%RESET%
    echo   • Use Ctrl+M in emulator for developer menu
    echo   • Shake device or press Ctrl+M for reload
    echo   • Check Metro terminal for any errors
    echo   • Backend logs available in separate window
    echo.
    echo %GREEN%✅ SAMS is ready for testing and demonstration!%RESET%
) else (
    echo.
    echo %RED%❌ Failed to launch SAMS app%RESET%
    echo.
    echo %YELLOW%🔧 Troubleshooting steps:%RESET%
    echo   1. Check if emulator is running properly
    echo   2. Verify Android SDK installation
    echo   3. Check Metro bundler logs
    echo   4. Try running: npx react-native doctor
    echo.
    echo %BLUE%📋 Manual launch commands:%RESET%
    echo   1. cd sams-mobile\TestApp
    echo   2. npx react-native start --reset-cache
    echo   3. npx react-native run-android
    echo.
)

echo.
echo %BLUE%Press any key to continue...%RESET%
pause >nul
