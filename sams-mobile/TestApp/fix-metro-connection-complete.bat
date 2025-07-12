@echo off
echo ========================================
echo 🔧 SAMS Metro Connection Fix Script
echo ========================================
echo.

echo 📱 Step 1: Checking Android Device/Emulator Connection...
adb devices
echo.

echo 🔌 Step 2: Setting up ADB Port Forwarding...
adb reverse tcp:8081 tcp:8081
if %errorlevel% equ 0 (
    echo ✅ Port forwarding setup successful
) else (
    echo ❌ Port forwarding failed - trying alternative method
    adb forward tcp:8081 tcp:8081
)
echo.

echo 🌐 Step 3: Checking Network Configuration...
ipconfig | findstr "IPv4"
echo.

echo 🔄 Step 4: Clearing React Native Cache...
npx react-native start --reset-cache --verbose
echo.

echo 📋 Step 5: Connection Troubleshooting Guide
echo.
echo If you're still having connection issues, try these steps:
echo.
echo 1. DEVICE/EMULATOR CHECKS:
echo    • Ensure USB debugging is enabled
echo    • Check if device appears in 'adb devices'
echo    • Try disconnecting and reconnecting USB cable
echo.
echo 2. NETWORK CHECKS:
echo    • Ensure device and computer are on same Wi-Fi network
echo    • Check if firewall is blocking port 8081
echo    • Try disabling antivirus temporarily
echo.
echo 3. METRO SERVER CHECKS:
echo    • Verify Metro is running on http://localhost:8081
echo    • Try opening http://localhost:8081/status in browser
echo    • Check if any other process is using port 8081
echo.
echo 4. REACT NATIVE SPECIFIC:
echo    • Shake device and select "Settings" → "Debug server host & port"
echo    • Set to your computer's IP:8081 (e.g., 192.168.1.100:8081)
echo    • Try reloading the app (Shake → Reload)
echo.
echo 5. ALTERNATIVE SOLUTIONS:
echo    • Try running: npx react-native run-android --variant=debug
echo    • Use physical device instead of emulator (or vice versa)
echo    • Check React Native version compatibility
echo.
echo ========================================
echo 🎯 Quick Commands for Manual Testing:
echo ========================================
echo.
echo Test Metro connection:
echo   curl http://localhost:8081/status
echo.
echo Check ADB connection:
echo   adb devices
echo.
echo Reset Metro cache:
echo   npx react-native start --reset-cache
echo.
echo Run Android app:
echo   npx react-native run-android
echo.
echo ========================================
echo 📱 Device Configuration Instructions:
echo ========================================
echo.
echo FOR PHYSICAL DEVICE:
echo 1. Enable Developer Options:
echo    • Go to Settings → About Phone
echo    • Tap "Build Number" 7 times
echo    • Go back to Settings → Developer Options
echo    • Enable "USB Debugging"
echo.
echo 2. Set Debug Server:
echo    • Open SAMS app
echo    • Shake device or press Ctrl+M
echo    • Select "Settings"
echo    • Set "Debug server host & port for device"
echo    • Enter your computer's IP:8081
echo.
echo FOR EMULATOR:
echo 1. Port forwarding should work automatically
echo 2. If not, try: adb reverse tcp:8081 tcp:8081
echo 3. Restart emulator if needed
echo.
echo ========================================
echo 🔍 Network Diagnostics:
echo ========================================
echo.

echo Checking if Metro server is accessible...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8081/status' -TimeoutSec 5; Write-Host '✅ Metro server is running and accessible'; Write-Host $response.Content } catch { Write-Host '❌ Metro server is not accessible on localhost:8081' }"
echo.

echo Checking network interfaces...
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*'} | Select-Object IPAddress, InterfaceAlias | Format-Table -AutoSize"
echo.

echo ========================================
echo 🚀 Automated Fix Attempts:
echo ========================================
echo.

echo Attempting to kill any processes on port 8081...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*node*' -or $_.ProcessName -like '*metro*'} | ForEach-Object { Write-Host 'Killing process:' $_.ProcessName '(PID:' $_.Id ')'; Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }"
echo.

echo Restarting ADB server...
adb kill-server
timeout /t 2 /nobreak >nul
adb start-server
echo.

echo Setting up port forwarding again...
adb reverse tcp:8081 tcp:8081
echo.

echo ========================================
echo 📋 Final Checklist:
echo ========================================
echo.
echo ✓ Metro server should be running on port 8081
echo ✓ ADB should show your device/emulator
echo ✓ Port forwarding should be active
echo ✓ Device should have USB debugging enabled
echo.
echo If issues persist:
echo 1. Check Windows Firewall settings
echo 2. Try different USB cable/port
echo 3. Restart both device and computer
echo 4. Update React Native CLI: npm install -g @react-native-community/cli
echo.
echo ========================================
echo 🎯 Ready to test! Try running the app now.
echo ========================================

pause
