@echo off
echo ========================================
echo    QUICK FIX - Metro Connection
echo ========================================
echo.

echo [1] Killing existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 >nul

echo [2] Setting up ADB port forwarding...
adb reverse tcp:8081 tcp:8081

echo [3] Starting Metro on correct port...
start "Metro" cmd /k "npx react-native start --port 8081 --host 0.0.0.0"

echo [4] Waiting 5 seconds for Metro to start...
timeout /t 5 >nul

echo [5] Running Android app...
npx react-native run-android

echo.
echo ========================================
echo Metro should now be accessible!
echo If still having issues, shake device and go to:
echo Settings > Debug server host & port > localhost:8081
echo ========================================
pause
