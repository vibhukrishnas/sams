@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    SAMS - Android Emulator Launcher
echo ========================================
echo.

REM Colors for output
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "CYAN=[96m"
set "RESET=[0m"

echo %BLUE%🔍 Detecting Android SDK and AVD devices...%RESET%
echo.

REM Function to find Android SDK
set "ANDROID_SDK_FOUND=false"
set "EMULATOR_PATH="
set "ADB_PATH="

REM Check multiple possible Android SDK locations
set "SDK_PATHS[0]=%ANDROID_HOME%"
set "SDK_PATHS[1]=%LOCALAPPDATA%\Android\Sdk"
set "SDK_PATHS[2]=D:\Android\Sdk"
set "SDK_PATHS[3]=C:\Android\Sdk"
set "SDK_PATHS[4]=%USERPROFILE%\AppData\Local\Android\Sdk"
set "SDK_PATHS[5]=C:\Users\%USERNAME%\AppData\Local\Android\Sdk"

for /L %%i in (0,1,5) do (
    if defined SDK_PATHS[%%i] (
        set "CURRENT_PATH=!SDK_PATHS[%%i]!"
        if exist "!CURRENT_PATH!\emulator\emulator.exe" (
            set "ANDROID_SDK_FOUND=true"
            set "EMULATOR_PATH=!CURRENT_PATH!\emulator\emulator.exe"
            set "ADB_PATH=!CURRENT_PATH!\platform-tools\adb.exe"
            echo %GREEN%✅ Found Android SDK at: !CURRENT_PATH!%RESET%
            goto :sdk_found
        )
    )
)

:sdk_found
if "%ANDROID_SDK_FOUND%"=="false" (
    echo %RED%❌ Android SDK not found!%RESET%
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

REM List available AVD devices
echo %YELLOW%📱 Checking available AVD devices...%RESET%
"%EMULATOR_PATH%" -list-avds > temp_avds.txt 2>nul

if exist temp_avds.txt (
    echo %CYAN%Available AVD devices:%RESET%
    for /f "delims=" %%a in (temp_avds.txt) do (
        echo   • %%a
    )
    echo.
    
    REM Check for SAMS emulators specifically
    findstr /C:"SAMS_Local" temp_avds.txt >nul
    if !errorlevel! equ 0 (
        set "PREFERRED_AVD=SAMS_Local"
        echo %GREEN%✅ Found SAMS_Local emulator%RESET%
    ) else (
        findstr /C:"SAMS_Fast" temp_avds.txt >nul
        if !errorlevel! equ 0 (
            set "PREFERRED_AVD=SAMS_Fast"
            echo %GREEN%✅ Found SAMS_Fast emulator%RESET%
        ) else (
            echo %YELLOW%⚠️ No SAMS-specific emulators found%RESET%
            REM Get first available AVD
            for /f "delims=" %%a in (temp_avds.txt) do (
                set "PREFERRED_AVD=%%a"
                goto :avd_selected
            )
        )
    )
    
    :avd_selected
    del temp_avds.txt
) else (
    echo %RED%❌ No AVD devices found!%RESET%
    echo.
    echo Please create an Android Virtual Device:
    echo 1. Open Android Studio
    echo 2. Go to Tools ^> AVD Manager
    echo 3. Create Virtual Device
    echo 4. Choose device and system image
    echo 5. Name it SAMS_Local or SAMS_Fast
    echo.
    pause
    exit /b 1
)

REM Check if emulator is already running
echo %YELLOW%🔍 Checking if emulator is already running...%RESET%
"%ADB_PATH%" devices > temp_devices.txt 2>nul
findstr /C:"emulator" temp_devices.txt >nul
if !errorlevel! equ 0 (
    echo %GREEN%✅ Emulator is already running%RESET%
    findstr /C:"device" temp_devices.txt | findstr /C:"emulator"
    set "EMULATOR_RUNNING=true"
) else (
    echo %YELLOW%📱 No emulator currently running%RESET%
    set "EMULATOR_RUNNING=false"
)

if exist temp_devices.txt del temp_devices.txt

REM Ask user which emulator to use
echo.
echo %CYAN%Select emulator to launch:%RESET%
echo 1. %PREFERRED_AVD% (Recommended)
echo 2. Choose different AVD
echo 3. Check running emulators only
echo.
set /p "choice=Enter choice (1-3): "

if "%choice%"=="1" (
    set "SELECTED_AVD=%PREFERRED_AVD%"
) else if "%choice%"=="2" (
    echo.
    echo %CYAN%Available AVDs:%RESET%
    "%EMULATOR_PATH%" -list-avds
    echo.
    set /p "SELECTED_AVD=Enter AVD name: "
) else if "%choice%"=="3" (
    echo.
    echo %CYAN%Currently running devices:%RESET%
    "%ADB_PATH%" devices
    echo.
    echo %YELLOW%If you want to launch SAMS app on running emulator, continue to app launch.%RESET%
    goto :launch_app
) else (
    echo %RED%Invalid choice. Using default: %PREFERRED_AVD%%RESET%
    set "SELECTED_AVD=%PREFERRED_AVD%"
)

REM Launch the selected emulator
if "%EMULATOR_RUNNING%"=="false" (
    echo.
    echo %YELLOW%🚀 Launching Android emulator: %SELECTED_AVD%%RESET%
    echo %YELLOW%⏳ This may take a few minutes...%RESET%
    
    REM Start emulator in background
    start "Android Emulator - %SELECTED_AVD%" "%EMULATOR_PATH%" -avd "%SELECTED_AVD%" -no-snapshot-load -no-boot-anim
    
    echo %YELLOW%⏳ Waiting for emulator to boot...%RESET%
    
    REM Wait for emulator to be ready
    set "WAIT_COUNT=0"
    :wait_loop
    timeout /t 5 /nobreak >nul
    "%ADB_PATH%" devices | findstr /C:"device" | findstr /C:"emulator" >nul
    if !errorlevel! equ 0 (
        echo %GREEN%✅ Emulator is ready!%RESET%
        goto :emulator_ready
    )
    
    set /a WAIT_COUNT+=1
    if !WAIT_COUNT! lss 24 (
        echo %YELLOW%⏳ Still waiting... (!WAIT_COUNT!/24)%RESET%
        goto :wait_loop
    ) else (
        echo %RED%❌ Emulator took too long to start%RESET%
        echo %YELLOW%Please check if emulator window opened and try again%RESET%
        pause
        exit /b 1
    )
)

:emulator_ready
echo.
echo %GREEN%🎉 Android Emulator is ready!%RESET%
echo.

REM Show current device status
echo %CYAN%📱 Current Android devices:%RESET%
"%ADB_PATH%" devices

:launch_app
echo.
echo %BLUE%🚀 Ready to launch SAMS Mobile App%RESET%
echo.
set /p "launch_choice=Do you want to launch SAMS app now? (y/n): "

if /i "%launch_choice%"=="y" (
    echo.
    echo %YELLOW%📱 Launching SAMS Mobile App...%RESET%
    
    REM Navigate to SAMS mobile app
    cd /d "%~dp0sams-mobile\TestApp"
    
    if exist "package.json" (
        echo %GREEN%✅ Found SAMS mobile app%RESET%
        
        REM Check dependencies
        if not exist "node_modules" (
            echo %YELLOW%📦 Installing dependencies...%RESET%
            npm install
        )
        
        REM Start backend server
        if exist "sams-backend-server\server.js" (
            echo %YELLOW%🖥️ Starting backend server...%RESET%
            start "SAMS Backend" cmd /k "cd sams-backend-server && node server.js"
            timeout /t 3 /nobreak >nul
        )
        
        REM Start Metro bundler
        echo %YELLOW%📱 Starting Metro bundler...%RESET%
        start "Metro Bundler" cmd /k "npx react-native start --reset-cache --port 8081"
        timeout /t 8 /nobreak >nul
        
        REM Build and run app
        echo %YELLOW%🔨 Building and running SAMS app...%RESET%
        npx react-native run-android --port 8081
        
        if !errorlevel! equ 0 (
            echo.
            echo %GREEN%🎉 SUCCESS! SAMS Mobile App launched in emulator!%RESET%
            echo.
            echo %CYAN%📱 App Features:%RESET%
            echo   • 🔐 PIN Authentication (1234)
            echo   • 📊 Real-time Server Monitoring  
            echo   • 🚨 Alert Management
            echo   • 📈 Performance Dashboards
            echo   • 🔧 Server Configuration
            echo.
            echo %CYAN%🖥️ Services:%RESET%
            echo   • Backend: http://localhost:8080
            echo   • Metro: http://localhost:8081
            echo   • Emulator: %SELECTED_AVD%
            echo.
            echo %GREEN%✅ SAMS is ready for testing!%RESET%
        ) else (
            echo %RED%❌ Failed to launch SAMS app%RESET%
            echo %YELLOW%Check Metro bundler logs for errors%RESET%
        )
    ) else (
        echo %RED%❌ SAMS mobile app not found%RESET%
        echo %YELLOW%Please ensure you're in the correct directory%RESET%
    )
) else (
    echo.
    echo %CYAN%📱 Emulator is ready for manual app launch%RESET%
    echo.
    echo %YELLOW%To launch SAMS manually:%RESET%
    echo   1. cd sams-mobile\TestApp
    echo   2. npm install (if needed)
    echo   3. npx react-native start --reset-cache
    echo   4. npx react-native run-android
    echo.
)

echo.
echo %BLUE%Press any key to continue...%RESET%
pause >nul
