@echo off
echo ========================================
echo    FINAL FIX - React Native Metro Issue
echo ========================================
echo.

echo [1] Cleaning corrupted node_modules...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
del yarn.lock 2>nul

echo [2] Installing fresh dependencies...
npm cache clean --force
npm install --no-optional --legacy-peer-deps

echo [3] Setting up ADB reverse...
adb reverse tcp:8081 tcp:8081

echo [4] Starting Metro bundler...
start "Metro Bundler" cmd /k "npm start"

echo [5] Waiting for Metro to start...
timeout /t 10 >nul

echo [6] Building and installing APK directly...
cd android
.\gradlew assembleDebug
.\gradlew installDebug
cd ..

echo [7] Starting the app...
adb shell am start -n com.testapp/.MainActivity

echo.
echo ========================================
echo App should now be running!
echo If you see connection issues, shake device and:
echo Settings > Debug server host & port > localhost:8081
echo ========================================
pause
