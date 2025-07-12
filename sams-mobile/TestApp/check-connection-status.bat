@echo off
echo ========================================
echo 🔍 SAMS Connection Status Checker
echo ========================================
echo.

echo 📱 Checking Android Devices...
adb devices
echo.

echo 🌐 Checking Metro Server Status...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8081/status' -TimeoutSec 5; Write-Host '✅ Metro server is RUNNING'; Write-Host 'Response:' $response.StatusCode } catch { Write-Host '❌ Metro server is NOT accessible' }"
echo.

echo 🔌 Checking Port 8081...
netstat -an | findstr :8081
echo.

echo 💻 Your Computer's IP Addresses:
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*'} | Select-Object IPAddress, InterfaceAlias"
echo.

echo 🔄 Checking ADB Port Forwarding...
adb reverse --list
echo.

echo ========================================
echo 📋 Connection Summary:
echo ========================================
echo.
echo If Metro is running and device is connected,
echo your app should work with these URLs:
echo.
echo • Emulator: http://localhost:8081
echo • Physical Device: http://[YOUR_IP]:8081
echo.
echo To set debug server in app:
echo 1. Shake device or press Ctrl+M
echo 2. Go to Settings
echo 3. Set Debug server host & port
echo 4. Use your computer's IP address with port 8081
echo.

pause
