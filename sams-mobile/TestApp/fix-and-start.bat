@echo off
echo ========================================
echo    SAMS App - Fix and Start
echo ========================================
echo.

echo 🔧 Fixing Metro configuration and starting SAMS app...
echo.

REM Clear Metro cache
echo 🧹 Clearing Metro cache...
if exist ".metro-cache" (
    rmdir /s /q ".metro-cache"
    echo ✅ Metro cache cleared
)

if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo ✅ Node modules cache cleared
)

REM Clear React Native cache
echo 🧹 Clearing React Native cache...
npx react-native clean-project-auto --remove-iOS-build --remove-android-build

echo.
echo 🚀 Starting Metro bundler...
start "Metro Bundler - SAMS" cmd /k "echo Metro Bundler for SAMS && echo ======================== && echo Starting on http://localhost:8081 && echo. && npx react-native start --reset-cache"

echo ⏳ Waiting for Metro to start...
timeout /t 10 /nobreak >nul

echo.
echo 🔨 Building and running Android app...
npx react-native run-android

if %errorlevel% equ 0 (
    echo.
    echo 🎉 SUCCESS! SAMS app should be running!
    echo.
    echo 📱 Your SAMS app features:
    echo   • 🔐 PIN Authentication (1234)
    echo   • 📊 Real-time monitoring
    echo   • 🚨 Alert management
    echo   • 📈 Performance dashboards
    echo.
) else (
    echo.
    echo ❌ Build failed. Check the error messages above.
    echo.
    echo 🔧 Try these steps:
    echo   1. Make sure Android emulator is running
    echo   2. Check: adb devices
    echo   3. Run: npx react-native doctor
    echo.
)

pause
