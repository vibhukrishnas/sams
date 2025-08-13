@echo off
echo 🚀 SAMS Quick Launch
echo ===================
echo.

REM Quick launch for SAMS mobile app
echo Starting SAMS Mobile App...

REM Start emulator if not running
echo Checking emulator status...
adb devices | findstr "device" >nul
if %errorlevel% neq 0 (
    echo Starting Android emulator...
    start emulator -avd SAMS_Local -no-snapshot-load
    echo Waiting for emulator to boot...
    timeout /t 15 /nobreak >nul
)

REM Navigate to app directory
cd /d "%~dp0sams-mobile\TestApp"

REM Start backend server
echo Starting backend server...
cd sams-backend-server
start "SAMS Backend" cmd /k "node server.js"
cd ..

REM Start Metro and run app
echo Starting Metro bundler and launching app...
start "Metro Bundler" cmd /k "npx react-native start --reset-cache"
timeout /t 5 /nobreak >nul

echo Building and installing app...
npx react-native run-android

echo.
echo ✅ SAMS Mobile App should now be running!
echo 📱 Check your Android emulator
echo 🖥️ Backend running on http://localhost:8080
echo.
pause
