@echo off
echo ========================================
echo    Quick Android SDK Setup for SAMS
echo ========================================
echo.

echo 🚀 This will help you get Android SDK running quickly
echo.

echo Option 1: Download Android Studio (Recommended - Full IDE)
echo   - Complete development environment
echo   - Built-in emulator management
echo   - Easy AVD creation
echo.
echo Option 2: Command Line Tools Only (Lightweight)
echo   - Just the SDK tools
echo   - Smaller download
echo   - Command line only
echo.

set /p choice="Choose option (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo 📥 Opening Android Studio download page...
    start https://developer.android.com/studio
    echo.
    echo 📋 Installation steps:
    echo   1. Download Android Studio
    echo   2. Run installer with default settings
    echo   3. Open Android Studio
    echo   4. Complete setup wizard
    echo   5. Go to Tools → AVD Manager
    echo   6. Create Virtual Device named "SAMS_Local"
    echo   7. Run this script again: find-android-and-launch-sams.bat
    echo.
) else if "%choice%"=="2" (
    echo.
    echo 📥 Setting up command line tools...
    
    REM Create Android SDK directory
    if not exist "C:\Android\Sdk" (
        mkdir "C:\Android\Sdk"
        echo ✅ Created SDK directory: C:\Android\Sdk
    )
    
    echo.
    echo 📥 Opening command line tools download...
    start https://developer.android.com/studio#command-tools
    echo.
    echo 📋 Manual setup steps:
    echo   1. Download "Command line tools only"
    echo   2. Extract to C:\Android\Sdk\cmdline-tools\latest\
    echo   3. Open Command Prompt as Administrator
    echo   4. Run: setx ANDROID_HOME "C:\Android\Sdk" /M
    echo   5. Add to PATH: C:\Android\Sdk\platform-tools
    echo   6. Add to PATH: C:\Android\Sdk\emulator
    echo   7. Restart computer
    echo   8. Run: sdkmanager "platform-tools" "emulator"
    echo.
) else (
    echo Invalid choice. Please run again and choose 1 or 2.
    pause
    exit /b 1
)

echo.
echo 🔄 Alternative: Use existing emulator
echo.
echo If you have any Android emulator running (like BlueStacks, 
echo Nox Player, or LDPlayer), you might be able to use it:
echo.
echo 1. Start your emulator
echo 2. Enable Developer Options
echo 3. Enable USB Debugging
echo 4. Connect via ADB
echo.

echo.
echo 📱 Quick Test: Try SAMS Web Version
echo.
echo While setting up Android SDK, you can test SAMS backend:
echo   1. Backend server: http://localhost:8080
echo   2. API endpoints: http://localhost:8080/api/v1/
echo   3. WebSocket: ws://localhost:8080
echo.

set /p web_test="Start SAMS backend server now? (y/n): "

if /i "%web_test%"=="y" (
    echo.
    echo 🖥️ Starting SAMS backend server...
    cd /d "sams-mobile\TestApp\sams-backend-server"
    
    if exist "server.js" (
        echo ✅ Starting server on http://localhost:8080
        start "SAMS Backend" cmd /k "echo SAMS Backend Server && echo ===================== && echo Server: http://localhost:8080 && echo API: http://localhost:8080/api/v1/ && echo WebSocket: ws://localhost:8080 && echo. && node server.js"
        
        timeout /t 3 /nobreak >nul
        
        echo.
        echo 🌐 Opening SAMS backend in browser...
        start http://localhost:8080
        
        echo.
        echo ✅ SAMS backend is running!
        echo You can test the API endpoints while setting up Android SDK.
    ) else (
        echo ❌ Backend server not found
    )
)

echo.
echo 📋 Next Steps:
echo   1. Complete Android SDK installation
echo   2. Create AVD named "SAMS_Local" 
echo   3. Run: find-android-and-launch-sams.bat
echo   4. Your SAMS mobile app will launch in emulator!
echo.

pause
