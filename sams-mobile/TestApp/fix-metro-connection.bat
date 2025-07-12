@echo off
echo ========================================
echo    SAMS Mobile - Metro Connection Fix
echo ========================================
echo.

echo [STEP 1] Stopping all React Native processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im java.exe 2>nul
taskkill /f /im adb.exe 2>nul
timeout /t 3 >nul

echo [STEP 2] Clearing all caches...
rmdir /s /q node_modules 2>nul
rmdir /s /q android\build 2>nul
rmdir /s /q android\app\build 2>nul
del package-lock.json 2>nul

echo [STEP 3] Reinstalling dependencies...
npm install

echo [STEP 4] Cleaning Android build...
cd android
gradlew clean
cd ..

echo [STEP 5] Setting up ADB reverse for Metro...
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8097 tcp:8097

echo [STEP 6] Starting Metro bundler with correct configuration...
start "Metro Bundler" cmd /k "npx react-native start --reset-cache --port 8081"

echo [STEP 7] Waiting for Metro to initialize...
timeout /t 10 >nul

echo [STEP 8] Building and running Android app...
npx react-native run-android --port 8081

echo.
echo ========================================
echo If you still see connection issues:
echo 1. Make sure your emulator is running
echo 2. Check that Metro is running on http://localhost:8081
echo 3. Try shaking the device and selecting "Settings" > "Debug server host & port for device" > "localhost:8081"
echo ========================================
pause
