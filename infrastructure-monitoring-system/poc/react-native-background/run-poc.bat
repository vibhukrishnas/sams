@echo off
echo ================================================
echo  SAMS React Native Background Processing POC
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

REM Check if React Native CLI is installed
where react-native >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing React Native CLI globally...
    call npm install -g react-native-cli
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install React Native CLI
        pause
        exit /b 1
    )
)

echo Checking Node.js version...
node --version

echo.
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ================================================
echo  SAMS React Native Background Processing POC
echo ================================================
echo.
echo This POC demonstrates:
echo - Background task processing
echo - Push notifications for alerts
echo - Network connectivity monitoring
echo - Offline data storage and sync
echo - Device information collection
echo - Real-time metrics collection
echo.
echo IMPORTANT: Make sure you have:
echo 1. Android Studio installed with SDK
echo 2. Android emulator running OR physical device connected
echo 3. USB debugging enabled (for physical device)
echo.
echo Available commands:
echo - npm run android  : Run on Android
echo - npm run ios      : Run on iOS (macOS only)
echo - npm start        : Start Metro bundler
echo.

set /p choice="Do you want to run on Android now? (y/n): "
if /i "%choice%"=="y" (
    echo.
    echo Starting Android build...
    echo This may take a few minutes for the first build...
    echo.
    call npm run android
) else (
    echo.
    echo To run the app later, use:
    echo   npm run android
    echo.
    echo Starting Metro bundler...
    call npm start
)

echo.
echo POC setup completed.
pause
