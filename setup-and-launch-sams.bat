@echo off
echo ========================================
echo    SAMS Setup and Emulator Launcher
echo ========================================
echo.

echo 🔍 Step 1: Finding Android SDK...
echo.

REM Check multiple possible Android SDK locations
set "SDK_FOUND=false"

echo Checking common Android SDK locations...

if exist "%ANDROID_HOME%\emulator\emulator.exe" (
    set "ANDROID_SDK_PATH=%ANDROID_HOME%"
    set "SDK_FOUND=true"
    echo ✅ Found via ANDROID_HOME: %ANDROID_HOME%
    goto :sdk_found
)

if exist "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK_PATH=%LOCALAPPDATA%\Android\Sdk"
    set "SDK_FOUND=true"
    echo ✅ Found in AppData: %LOCALAPPDATA%\Android\Sdk
    goto :sdk_found
)

if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK_PATH=C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
    set "SDK_FOUND=true"
    echo ✅ Found in User AppData: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    goto :sdk_found
)

if exist "D:\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK_PATH=D:\Android\Sdk"
    set "SDK_FOUND=true"
    echo ✅ Found on D: drive: D:\Android\Sdk
    goto :sdk_found
)

if exist "C:\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK_PATH=C:\Android\Sdk"
    set "SDK_FOUND=true"
    echo ✅ Found on C: drive: C:\Android\Sdk
    goto :sdk_found
)

REM Check Program Files locations
if exist "C:\Program Files\Android\Android Studio\sdk\emulator\emulator.exe" (
    set "ANDROID_SDK_PATH=C:\Program Files\Android\Android Studio\sdk"
    set "SDK_FOUND=true"
    echo ✅ Found in Program Files: C:\Program Files\Android\Android Studio\sdk
    goto :sdk_found
)

if exist "C:\Program Files (x86)\Android\android-sdk\emulator\emulator.exe" (
    set "ANDROID_SDK_PATH=C:\Program Files (x86)\Android\android-sdk"
    set "SDK_FOUND=true"
    echo ✅ Found in Program Files x86: C:\Program Files (x86)\Android\android-sdk
    goto :sdk_found
)

:sdk_not_found
echo ❌ Android SDK not found in common locations!
echo.
echo 📋 Please install Android Studio:
echo   1. Download from: https://developer.android.com/studio
echo   2. Install with default settings
echo   3. Open Android Studio and complete setup wizard
echo   4. Go to Tools ^> SDK Manager to verify installation
echo.
echo 🔧 Or manually set ANDROID_HOME environment variable:
echo   1. Find your Android SDK installation
echo   2. Set ANDROID_HOME to SDK path
echo   3. Add %%ANDROID_HOME%%\platform-tools to PATH
echo   4. Add %%ANDROID_HOME%%\emulator to PATH
echo.
echo Common SDK locations to check:
echo   - %LOCALAPPDATA%\Android\Sdk
echo   - C:\Android\Sdk
echo   - D:\Android\Sdk
echo   - C:\Program Files\Android\Android Studio\sdk
echo.
pause
exit /b 1

:sdk_found
set "EMULATOR_PATH=%ANDROID_SDK_PATH%\emulator\emulator.exe"
set "ADB_PATH=%ANDROID_SDK_PATH%\platform-tools\adb.exe"

echo.
echo 🔍 Step 2: Checking AVD devices...
echo.

REM List available AVDs
echo Available AVD devices:
"%EMULATOR_PATH%" -list-avds

echo.
echo Checking for SAMS AVDs...

REM Check for SAMS AVDs
"%EMULATOR_PATH%" -list-avds | findstr "SAMS_Local" >nul
if %errorlevel% equ 0 (
    set "SELECTED_AVD=SAMS_Local"
    echo ✅ Found SAMS_Local AVD
) else (
    "%EMULATOR_PATH%" -list-avds | findstr "SAMS_Fast" >nul
    if %errorlevel% equ 0 (
        set "SELECTED_AVD=SAMS_Fast"
        echo ✅ Found SAMS_Fast AVD
    ) else (
        echo ❌ No SAMS AVDs found!
        echo.
        echo 📱 Please create an Android Virtual Device:
        echo   1. Open Android Studio
        echo   2. Go to Tools ^> AVD Manager
        echo   3. Click "Create Virtual Device"
        echo   4. Choose device (e.g., Pixel 4)
        echo   5. Select system image (API 30+)
        echo   6. Name it "SAMS_Local"
        echo   7. Click "Finish"
        echo.
        echo Available AVDs:
        "%EMULATOR_PATH%" -list-avds
        echo.
        pause
        exit /b 1
    )
)

echo.
echo 🔍 Step 3: Checking emulator status...
echo.

REM Check if emulator is already running
"%ADB_PATH%" devices | findstr "emulator.*device" >nul
if %errorlevel% equ 0 (
    echo ✅ Emulator is already running:
    "%ADB_PATH%" devices
    set "EMULATOR_RUNNING=true"
) else (
    echo 📱 No emulator currently running
    set "EMULATOR_RUNNING=false"
)

echo.
echo 🚀 Step 4: Launching emulator...
echo.

if "%EMULATOR_RUNNING%"=="false" (
    echo Starting %SELECTED_AVD% emulator...
    echo ⏳ This may take a few minutes...
    
    REM Launch emulator
    start "SAMS Android Emulator" "%EMULATOR_PATH%" -avd "%SELECTED_AVD%" -no-snapshot-load
    
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
    if %WAIT_COUNT% lss 36 (
        echo ⏳ Still waiting... (%WAIT_COUNT%/36)
        goto :wait_loop
    ) else (
        echo ❌ Emulator took too long to start
        echo.
        echo 🔧 Troubleshooting:
        echo   - Check if emulator window opened
        echo   - Verify hardware acceleration is enabled
        echo   - Try creating a new AVD with lower specs
        echo   - Check Windows Hyper-V settings
        echo.
        pause
        exit /b 1
    )
) else (
    echo ✅ Using existing running emulator
)

:emulator_ready
echo.
echo 🎉 Android Emulator is ready!
echo.
echo 📱 Current devices:
"%ADB_PATH%" devices
echo.

echo 🚀 Step 5: Launching SAMS Mobile App...
echo.

REM Navigate to SAMS mobile app
if exist "sams-mobile\TestApp\package.json" (
    cd /d "sams-mobile\TestApp"
    echo ✅ Found SAMS mobile app
    
    REM Check Node.js
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Node.js not found!
        echo Please install Node.js from: https://nodejs.org/
        pause
        exit /b 1
    )
    echo ✅ Node.js is available
    
    REM Install dependencies
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
        start "SAMS Backend" cmd /k "cd sams-backend-server && echo SAMS Backend Server Starting... && node server.js"
        timeout /t 3 /nobreak >nul
        echo ✅ Backend server started
    )
    
    REM Start Metro bundler
    echo 📱 Starting Metro bundler...
    start "Metro Bundler" cmd /k "echo Metro Bundler Starting... && npx react-native start --reset-cache --port 8081"
    echo ⏳ Waiting for Metro to initialize...
    timeout /t 10 /nobreak >nul
    
    REM Build and run app
    echo 🔨 Building and running SAMS app...
    echo ⏳ First build may take several minutes...
    
    npx react-native run-android --port 8081
    
    if %errorlevel% equ 0 (
        echo.
        echo 🎉 SUCCESS! SAMS Mobile App launched!
        echo.
        echo 📱 SAMS Features:
        echo   • 🔐 PIN Authentication (1234)
        echo   • 📊 Real-time Monitoring
        echo   • 🚨 Alert Management
        echo   • 📈 Performance Dashboards
        echo   • 🔧 Server Configuration
        echo.
        echo 🖥️ Services:
        echo   • Backend: http://localhost:8080
        echo   • Metro: http://localhost:8081
        echo   • Emulator: %SELECTED_AVD%
        echo.
        echo ✅ SAMS is ready for testing!
    ) else (
        echo ❌ Failed to launch SAMS app
        echo Check Metro bundler logs for errors
    )
) else (
    echo ❌ SAMS mobile app not found
    echo Expected: sams-mobile\TestApp\package.json
)

echo.
echo Press any key to continue...
pause >nul
