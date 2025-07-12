@echo off
echo ========================================
echo 🚀 Quick Metro Connection Fix
echo ========================================
echo.

echo Setting up ADB port forwarding...
adb reverse tcp:8081 tcp:8081

echo.
echo ✅ Port forwarding setup complete!
echo.
echo 📱 Now in your React Native app:
echo 1. Shake the device (or press Ctrl+M)
echo 2. Select "Settings"
echo 3. Select "Debug server host & port for device"
echo 4. Enter: localhost:8081
echo 5. Go back and reload the app
echo.
echo 🌐 Alternative: Use your computer's IP
echo If localhost doesn't work, try: 192.168.1.7:8081
echo.
echo ========================================
echo Metro is running on: http://localhost:8081
echo Your emulator is connected: emulator-5554
echo ========================================

pause
