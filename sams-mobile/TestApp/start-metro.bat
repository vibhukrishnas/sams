@echo off
echo ========================================
echo    SAMS Mobile App - Metro Bundler Fix
echo ========================================
echo.

echo [1/5] Killing any existing Metro processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im java.exe 2>nul
timeout /t 2 >nul

echo [2/5] Clearing React Native cache...
npx react-native start --reset-cache --port 8081 &

echo [3/5] Waiting for Metro to start...
timeout /t 5 >nul

echo [4/5] Starting Android emulator (if not running)...
adb devices

echo [5/5] Running the app...
echo.
echo ========================================
echo Metro bundler should now be running on:
echo http://localhost:8081
echo ========================================
echo.
echo Press any key to run the Android app...
pause >nul

npx react-native run-android --port 8081
