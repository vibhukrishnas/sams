@echo off
echo 🚀 SAMS Direct Emulator & App Launcher
echo =====================================
echo.

REM Set the AVD path from your configuration
set "AVD_PATH=D:\Projects\SAMS\avd"
set "AVD_NAME=SAMS_Local"

echo 📱 Using AVD: %AVD_NAME%
echo 📂 AVD Path: %AVD_PATH%
echo.

REM Find Android SDK
echo 🔍 Finding Android SDK...

if exist "%ANDROID_HOME%\emulator\emulator.exe" (
    set "EMULATOR_PATH=%ANDROID_HOME%\emulator\emulator.exe"
    set "ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe"
    echo ✅ Found SDK via ANDROID_HOME: %ANDROID_HOME%
) else if exist "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" (
    set "EMULATOR_PATH=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe"
    set "ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    echo ✅ Found SDK in AppData: %LOCALAPPDATA%\Android\Sdk
) else if exist "D:\Android\Sdk\emulator\emulator.exe" (
    set "EMULATOR_PATH=D:\Android\Sdk\emulator\emulator.exe"
    set "ADB_PATH=D:\Android\Sdk\platform-tools\adb.exe"
    echo ✅ Found SDK on D: drive: D:\Android\Sdk
) else (
    echo ❌ Android SDK not found!
    echo.
    echo Please install Android Studio or set ANDROID_HOME environment variable
    echo Common locations:
    echo   - %LOCALAPPDATA%\Android\Sdk
    echo   - D:\Android\Sdk
    echo   - C:\Android\Sdk
    echo.
    pause
    exit /b 1
)

REM Check if AVD exists
echo.
echo 🔍 Checking AVD configuration...
if exist "%AVD_PATH%\%AVD_NAME%.avd\config.ini" (
    echo ✅ Found %AVD_NAME% AVD configuration
) else (
    echo ❌ AVD configuration not found at: %AVD_PATH%\%AVD_NAME%.avd
    echo.
    echo Available AVDs:
    "%EMULATOR_PATH%" -list-avds
    echo.
    pause
    exit /b 1
)

REM Check if emulator is already running
echo.
echo 🔍 Checking for running emulators...
"%ADB_PATH%" devices | findstr "emulator.*device" >nul
if %errorlevel% equ 0 (
    echo ✅ Emulator is already running:
    "%ADB_PATH%" devices
    set "EMULATOR_RUNNING=true"
) else (
    echo 📱 No emulator currently running
    set "EMULATOR_RUNNING=false"
)

REM Launch emulator if not running
if "%EMULATOR_RUNNING%"=="false" (
    echo.
    echo 🚀 Launching %AVD_NAME% emulator...
    echo ⏳ This may take a few minutes...
    
    REM Set AVD path environment variable
    set "ANDROID_AVD_HOME=%AVD_PATH%"
    
    REM Launch emulator with specific AVD path
    start "SAMS Android Emulator" "%EMULATOR_PATH%" -avd "%AVD_NAME%" -avd-dir "%AVD_PATH%" -no-snapshot-load -no-boot-anim
    
    echo ⏳ Waiting for emulator to boot...
    
    REM Wait for emulator to be ready
    set "WAIT_COUNT=0"
    :wait_loop
    timeout /t 5 /nobreak >nul
    "%ADB_PATH%" devices | findstr "emulator.*device" >nul
    if %errorlevel% equ 0 (
        echo ✅ Emulator is ready!
        goto :emulator_ready
    )
    
    set /a WAIT_COUNT+=1
    if %WAIT_COUNT% lss 30 (
        echo ⏳ Still waiting... (%WAIT_COUNT%/30)
        goto :wait_loop
    ) else (
        echo ❌ Emulator took too long to start
        echo Please check if emulator window opened and is responsive
        pause
        exit /b 1
    )
)

:emulator_ready
echo.
echo 🎉 Android Emulator is ready!
echo.
echo 📱 Current devices:
"%ADB_PATH%" devices
echo.

REM Ask if user wants to launch SAMS app
set /p "launch_app=Do you want to launch SAMS mobile app now? (y/n): "

if /i "%launch_app%"=="y" (
    echo.
    echo 🚀 Launching SAMS Mobile App...
    
    REM Navigate to SAMS mobile app directory
    if exist "sams-mobile\TestApp\package.json" (
        cd /d "sams-mobile\TestApp"
        echo ✅ Found SAMS mobile app
        
        REM Check Node.js
        node --version >nul 2>&1
        if %errorlevel% neq 0 (
            echo ❌ Node.js not found. Please install Node.js
            pause
            exit /b 1
        )
        echo ✅ Node.js is available
        
        REM Install dependencies if needed
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
        
        REM Start backend server
        if exist "sams-backend-server\server.js" (
            echo 🖥️ Starting backend server...
            start "SAMS Backend Server" cmd /k "cd sams-backend-server && echo Starting SAMS Backend Server... && node server.js"
            timeout /t 3 /nobreak >nul
            echo ✅ Backend server started on http://localhost:8080
        )
        
        REM Start Metro bundler
        echo 📱 Starting Metro bundler...
        start "Metro Bundler" cmd /k "echo Starting Metro Bundler... && npx react-native start --reset-cache --port 8081"
        echo ⏳ Waiting for Metro to initialize...
        timeout /t 10 /nobreak >nul
        
        REM Build and run the app
        echo 🔨 Building and running SAMS app on emulator...
        echo ⏳ This may take a few minutes for the first build...
        
        npx react-native run-android --port 8081
        
        if %errorlevel% equ 0 (
            echo.
            echo 🎉 SUCCESS! SAMS Mobile App launched successfully!
            echo.
            echo 📱 SAMS App Features:
            echo   • 🔐 PIN Authentication (default: 1234)
            echo   • 📊 Real-time Server Monitoring
            echo   • 🚨 Alert Management System
            echo   • 📈 Performance Dashboards
            echo   • 🔧 Server Configuration
            echo   • 📱 Push Notifications
            echo   • 🌙 Dark Mode Support
            echo.
            echo 🖥️ Running Services:
            echo   • Backend Server: http://localhost:8080
            echo   • Metro Bundler: http://localhost:8081
            echo   • Android Emulator: %AVD_NAME%
            echo.
            echo 💡 Developer Tips:
            echo   • Press Ctrl+M in emulator for dev menu
            echo   • Shake device (Ctrl+Shift+Z) for reload
            echo   • Use 'r' in Metro terminal to reload
            echo   • Check Metro logs for any errors
            echo.
            echo ✅ SAMS is ready for testing and demonstration!
        ) else (
            echo.
            echo ❌ Failed to build/run SAMS app
            echo.
            echo 🔧 Troubleshooting:
            echo   1. Check Metro bundler logs for errors
            echo   2. Verify emulator is responsive
            echo   3. Try: npx react-native doctor
            echo   4. Clear cache: npx react-native start --reset-cache
            echo.
        )
    ) else (
        echo ❌ SAMS mobile app not found
        echo Expected location: sams-mobile\TestApp\package.json
        echo Current directory: %CD%
    )
) else (
    echo.
    echo 📱 Emulator is ready for manual app launch
    echo.
    echo To launch SAMS manually:
    echo   1. cd sams-mobile\TestApp
    echo   2. npm install (if needed)
    echo   3. npx react-native start --reset-cache
    echo   4. npx react-native run-android
)

echo.
echo Press any key to continue...
pause >nul
