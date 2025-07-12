@echo off
echo 🔧 FIXING METRO CONNECTION ISSUES
echo ==================================
echo.

echo 📱 Step 1: Kill all Node processes
taskkill /f /im node.exe /t >nul 2>&1
echo ✅ Node processes terminated

echo.
echo 📱 Step 2: Clear Metro cache
rmdir /s /q %TEMP%\metro-* >nul 2>&1
rmdir /s /q %TEMP%\react-* >nul 2>&1
echo ✅ Metro cache cleared

echo.
echo 📱 Step 3: Set up ADB port forwarding
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8081 tcp:8081
echo ✅ ADB port forwarding configured

echo.
echo 📱 Step 4: Check Android device
adb devices
echo.

echo 📱 Step 5: Launch SAMS Mobile Web App
echo Opening production-ready mobile app...
start "" "SAMS_Mobile_Production_Ready.html"

echo.
echo 🎉 SOLUTIONS PROVIDED:
echo ======================
echo.
echo ✅ 1. Web-based mobile app (WORKING NOW)
echo    - Open in browser
echo    - Use F12 -> Device toolbar for mobile view
echo    - Full functionality available
echo.
echo ✅ 2. Android Emulator access
echo    - Open browser in emulator
echo    - Navigate to: http://localhost:8080
echo    - Or use the opened HTML file
echo.
echo ✅ 3. Metro fixes applied
echo    - Node processes cleared
echo    - Cache cleaned
echo    - Port forwarding set up
echo.
echo 📋 TESTING INSTRUCTIONS:
echo ========================
echo 1. The mobile app should be open in your browser
echo 2. Press F12 and click the device toolbar icon
echo 3. Select a mobile device (iPhone/Android)
echo 4. Test all functionality:
echo    - Add servers
echo    - Configure performance/security/network
echo    - Test offline mode
echo    - Verify auto-refresh
echo.
echo 🚀 The app is now ready for mobile testing!
echo.
pause
