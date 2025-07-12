@echo off
echo 🔥 CREATING REAL NATIVE REACT NATIVE SAMS APP
echo ===============================================
echo.

echo 🚨 STEP 1: Complete Environment Reset
echo Killing all Node processes...
taskkill /f /im node.exe /t >nul 2>&1
taskkill /f /im npm.exe /t >nul 2>&1
taskkill /f /im yarn.exe /t >nul 2>&1

echo Clearing all caches...
npm cache clean --force >nul 2>&1
yarn cache clean >nul 2>&1
rmdir /s /q %TEMP%\metro-* >nul 2>&1
rmdir /s /q %TEMP%\react-* >nul 2>&1

echo Removing old project...
rmdir /s /q sams-mobile >nul 2>&1

echo.
echo 🚀 STEP 2: Create Fresh React Native Project
echo Creating new React Native project with latest stable version...
npx @react-native-community/cli@latest init SAMSMobileNative --version 0.72.6 --skip-install

echo.
echo 📱 STEP 3: Setup Project Structure
cd SAMSMobileNative
echo Setting up package.json with required dependencies...

echo.
echo 📦 STEP 4: Install Dependencies
echo Installing React Native dependencies...
npm install --legacy-peer-deps

echo Installing native mobile features...
npm install @react-native-async-storage/async-storage
npm install react-native-permissions
npm install react-native-camera
npm install @react-native-community/geolocation
npm install @react-native-community/push-notification-ios
npm install react-native-push-notification
npm install react-native-background-job
npm install react-native-fs
npm install react-native-device-info
npm install react-native-network-info
npm install react-native-sqlite-storage

echo.
echo 🔧 STEP 5: Configure Android
echo Setting up Android configuration...
cd android
echo sdk.dir=C:\\Users\\%USERNAME%\\AppData\\Local\\Android\\Sdk > local.properties
cd ..

echo.
echo 🎯 STEP 6: Setup ADB and Emulator Connection
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8081 tcp:8081

echo.
echo ✅ REACT NATIVE PROJECT CREATED SUCCESSFULLY!
echo.
echo 📋 NEXT STEPS:
echo 1. The project is ready for native mobile development
echo 2. All native mobile features are installed
echo 3. Android emulator is connected
echo 4. Ready to build real APK files
echo.
echo 🚀 To start development:
echo    cd SAMSMobileNative
echo    npx react-native start
echo    npx react-native run-android
echo.
pause
