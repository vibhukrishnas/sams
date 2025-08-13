@echo off
REM SAMS Mobile App Installation Script for Windows
REM This script sets up the React Native mobile app for SAMS

echo 🚀 SAMS Mobile App Setup
echo ==========================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 16+ first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm found

REM Navigate to mobile app directory
cd /d "%~dp0"

echo 📦 Installing dependencies...
call npm install

REM Install Expo CLI globally if not already installed
expo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📱 Installing Expo CLI globally...
    call npm install -g @expo/cli
)

echo ✅ Expo CLI ready

REM Create assets directory if it doesn't exist
if not exist "assets" (
    echo 📁 Creating assets directory...
    mkdir assets
    
    echo 🎨 Creating placeholder assets...
    REM Create placeholder files
    echo. > assets\icon.png
    echo. > assets\splash.png
    echo. > assets\adaptive-icon.png
    echo. > assets\favicon.png
)

echo.
echo 🎉 SAMS Mobile App setup complete!
echo.
echo 📱 To start the app:
echo    npm start          - Start Expo development server
echo    npm run android    - Run on Android emulator
echo    npm run ios        - Run on iOS simulator
echo    npm run web        - Run in web browser
echo.
echo 📋 Quick Setup Commands:
echo    cd sams-mobile-app
echo    npm start
echo.
echo 📱 Scan the QR code with Expo Go app on your phone
echo    or press 'w' to open in web browser
echo.
echo 🔧 Backend Configuration:
echo    Make sure your SAMS backend is running on:
echo    - Java Backend: http://localhost:8080
echo    - Python Backend: http://localhost:8081
echo.
echo ✅ Setup complete! Ready to run SAMS mobile app.
pause
