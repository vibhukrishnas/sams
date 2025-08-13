@echo off
echo ========================================
echo    SAMS App Launcher - Android Detection
echo ========================================
echo.

echo 🔍 STEP 1: Comprehensive Android SDK Detection
echo ===============================================
echo.

REM Check environment variables first
echo Checking environment variables...
if defined ANDROID_HOME (
    echo ✅ ANDROID_HOME is set: %ANDROID_HOME%
    if exist "%ANDROID_HOME%\emulator\emulator.exe" (
        set "ANDROID_SDK=%ANDROID_HOME%"
        goto :sdk_found
    ) else (
        echo ⚠️ ANDROID_HOME set but emulator not found
    )
) else (
    echo ❌ ANDROID_HOME not set
)

if defined ANDROID_SDK_ROOT (
    echo ✅ ANDROID_SDK_ROOT is set: %ANDROID_SDK_ROOT%
    if exist "%ANDROID_SDK_ROOT%\emulator\emulator.exe" (
        set "ANDROID_SDK=%ANDROID_SDK_ROOT%"
        goto :sdk_found
    )
)

echo.
echo Checking common installation paths...

REM Check AppData locations
echo Checking: %LOCALAPPDATA%\Android\Sdk
if exist "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK=%LOCALAPPDATA%\Android\Sdk"
    echo ✅ Found Android SDK in AppData Local
    goto :sdk_found
)

echo Checking: %USERPROFILE%\AppData\Local\Android\Sdk
if exist "%USERPROFILE%\AppData\Local\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK=%USERPROFILE%\AppData\Local\Android\Sdk"
    echo ✅ Found Android SDK in User AppData
    goto :sdk_found
)

REM Check Program Files locations
echo Checking: C:\Program Files\Android\Android Studio\sdk
if exist "C:\Program Files\Android\Android Studio\sdk\emulator\emulator.exe" (
    set "ANDROID_SDK=C:\Program Files\Android\Android Studio\sdk"
    echo ✅ Found Android SDK in Program Files
    goto :sdk_found
)

echo Checking: C:\Program Files (x86)\Android\android-sdk
if exist "C:\Program Files (x86)\Android\android-sdk\emulator\emulator.exe" (
    set "ANDROID_SDK=C:\Program Files (x86)\Android\android-sdk"
    echo ✅ Found Android SDK in Program Files x86
    goto :sdk_found
)

REM Check root drive locations
echo Checking: C:\Android\Sdk
if exist "C:\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK=C:\Android\Sdk"
    echo ✅ Found Android SDK on C: drive
    goto :sdk_found
)

echo Checking: D:\Android\Sdk
if exist "D:\Android\Sdk\emulator\emulator.exe" (
    set "ANDROID_SDK=D:\Android\Sdk"
    echo ✅ Found Android SDK on D: drive
    goto :sdk_found
)

REM Check if Android Studio is installed but SDK is elsewhere
echo.
echo Checking for Android Studio installation...
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Found Android Studio at: C:\Program Files\Android\Android Studio
    echo ⚠️ But SDK not found in default location
) else if exist "%LOCALAPPDATA%\JetBrains\Toolbox\apps\AndroidStudio" (
    echo ✅ Found Android Studio via JetBrains Toolbox
) else (
    echo ❌ Android Studio not found
)

goto :no_sdk_found

:sdk_found
echo.
echo 🎉 Android SDK Found: %ANDROID_SDK%
set "EMULATOR_PATH=%ANDROID_SDK%\emulator\emulator.exe"
set "ADB_PATH=%ANDROID_SDK%\platform-tools\adb.exe"

echo.
echo 🔍 STEP 2: Checking AVD Devices
echo ===============================
echo.

echo Available AVD devices:
"%EMULATOR_PATH%" -list-avds

echo.
echo Checking for SAMS AVDs...
"%EMULATOR_PATH%" -list-avds | findstr "SAMS" >nul
if %errorlevel% equ 0 (
    echo ✅ Found SAMS AVD devices
    
    REM Prefer SAMS_Local, fallback to SAMS_Fast
    "%EMULATOR_PATH%" -list-avds | findstr "SAMS_Local" >nul
    if %errorlevel% equ 0 (
        set "SELECTED_AVD=SAMS_Local"
        echo ✅ Will use: SAMS_Local
    ) else (
        set "SELECTED_AVD=SAMS_Fast"
        echo ✅ Will use: SAMS_Fast
    )
) else (
    echo ❌ No SAMS AVDs found!
    echo.
    echo Available AVDs:
    "%EMULATOR_PATH%" -list-avds
    echo.
    echo Please create a SAMS AVD in Android Studio:
    echo 1. Open Android Studio
    echo 2. Tools → AVD Manager
    echo 3. Create Virtual Device
    echo 4. Name it SAMS_Local
    pause
    exit /b 1
)

echo.
echo 🔍 STEP 3: Checking Emulator Status
echo ===================================
echo.

"%ADB_PATH%" devices | findstr "emulator.*device" >nul
if %errorlevel% equ 0 (
    echo ✅ Emulator already running:
    "%ADB_PATH%" devices
    set "EMULATOR_RUNNING=true"
) else (
    echo 📱 No emulator running, will start %SELECTED_AVD%
    set "EMULATOR_RUNNING=false"
)

echo.
echo 🚀 STEP 4: Starting Emulator
echo ============================
echo.

if "%EMULATOR_RUNNING%"=="false" (
    echo Starting %SELECTED_AVD% emulator...
    start "SAMS Emulator" "%EMULATOR_PATH%" -avd "%SELECTED_AVD%" -no-snapshot-load
    
    echo ⏳ Waiting for emulator to boot...
    set "WAIT_COUNT=0"
    :wait_emulator
    timeout /t 5 /nobreak >nul
    "%ADB_PATH%" devices | findstr "emulator.*device" >nul
    if %errorlevel% equ 0 (
        echo ✅ Emulator ready!
        goto :emulator_ready
    )
    
    set /a WAIT_COUNT+=1
    if %WAIT_COUNT% lss 30 (
        echo ⏳ Still waiting... (%WAIT_COUNT%/30)
        goto :wait_emulator
    ) else (
        echo ❌ Emulator timeout
        pause
        exit /b 1
    )
)

:emulator_ready
echo.
echo 📱 Current devices:
"%ADB_PATH%" devices

echo.
echo 🚀 STEP 5: Launching SAMS Mobile App
echo ====================================
echo.

cd /d "sams-mobile\TestApp"

if not exist "package.json" (
    echo ❌ SAMS app not found!
    echo Expected: sams-mobile\TestApp\package.json
    pause
    exit /b 1
)

echo ✅ Found SAMS mobile app

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install from nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js available

REM Install dependencies
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start backend
if exist "sams-backend-server\server.js" (
    echo 🖥️ Starting backend server...
    start "SAMS Backend" cmd /k "cd sams-backend-server && echo SAMS Backend Starting... && node server.js"
    timeout /t 3 /nobreak >nul
)

REM Start Metro
echo 📱 Starting Metro bundler...
start "Metro Bundler" cmd /k "echo Metro Starting... && npx react-native start --reset-cache"
timeout /t 8 /nobreak >nul

REM Run app
echo 🔨 Building and running SAMS app...
npx react-native run-android

if %errorlevel% equ 0 (
    echo.
    echo 🎉 SUCCESS! SAMS App is running in emulator!
    echo.
    echo 📱 Your SAMS app features:
    echo   • 🔐 PIN Login (use: 1234)
    echo   • 📊 Real-time monitoring
    echo   • 🚨 Alert management
    echo   • 📈 Performance dashboards
    echo.
    echo 🖥️ Services running:
    echo   • Backend: http://localhost:8080
    echo   • Metro: http://localhost:8081
    echo   • Emulator: %SELECTED_AVD%
    echo.
    echo ✅ Your SAMS app is ready to use!
) else (
    echo ❌ Failed to launch app
    echo Check Metro logs for errors
)

goto :end

:no_sdk_found
echo.
echo ❌ Android SDK not found in any common location!
echo.
echo 📋 To install Android SDK:
echo.
echo Option 1 - Install Android Studio (Recommended):
echo   1. Download: https://developer.android.com/studio
echo   2. Install with default settings
echo   3. Open Android Studio
echo   4. Complete setup wizard
echo   5. Go to Tools → SDK Manager
echo   6. Install Android SDK
echo.
echo Option 2 - Command Line Tools:
echo   1. Download SDK command line tools
echo   2. Extract to C:\Android\Sdk
echo   3. Set ANDROID_HOME environment variable
echo   4. Add to PATH: %%ANDROID_HOME%%\platform-tools
echo.
echo After installation, run this script again.

:end
echo.
pause
