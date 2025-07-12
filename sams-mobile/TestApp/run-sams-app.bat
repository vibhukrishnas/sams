@echo off
echo ========================================
echo    SAMS Enterprise Mobile App Runner
echo ========================================
echo.

echo Checking for Android devices...
adb devices

echo.
echo Checking if emulator is running...
adb devices | findstr "emulator"
if %errorlevel% neq 0 (
    echo No emulator detected. Please start an Android emulator first.
    echo.
    echo To start an emulator:
    echo 1. Open Android Studio
    echo 2. Go to Tools ^> AVD Manager
    echo 3. Create a new Virtual Device if needed
    echo 4. Click the Play button to start the emulator
    echo.
    pause
    exit /b 1
)

echo.
echo Installing SAMS Enterprise App...
adb install -r android\app\build\outputs\apk\debug\app-debug.apk

if %errorlevel% equ 0 (
    echo.
    echo ✅ SAMS Enterprise App installed successfully!
    echo.
    echo Starting the app...
    adb shell am start -n com.testapp/.MainActivity
    
    echo.
    echo 🚀 SAMS Enterprise App is now running!
    echo.
    echo The app includes:
    echo - Enterprise-grade authentication
    echo - Real-time server monitoring
    echo - Professional dashboard
    echo - Alert management system
    echo - Redux Toolkit state management
    echo - React Navigation v6
    echo - Material Design UI
    echo.
    echo Backend server is running on: http://localhost:8080
    echo.
) else (
    echo.
    echo ❌ Failed to install the app. Please check the error above.
    echo.
)

pause
