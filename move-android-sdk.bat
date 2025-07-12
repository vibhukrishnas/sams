@echo off
echo ========================================
echo MOVING ANDROID SDK TO D DRIVE
echo ========================================

REM Create Android directory on D drive
if not exist "D:\Android" mkdir "D:\Android"
if not exist "D:\Android\Sdk" mkdir "D:\Android\Sdk"

echo.
echo Android SDK will be moved to: D:\Android\Sdk
echo.
echo INSTRUCTIONS:
echo 1. Open Android Studio
echo 2. Go to File ^> Settings
echo 3. Navigate to Appearance ^& Behavior ^> System Settings ^> Android SDK
echo 4. Change Android SDK Location to: D:\Android\Sdk
echo 5. Click Apply and let it move everything
echo.
echo This will free up 3-8GB on C drive!
echo.
pause

REM Set environment variable
setx ANDROID_HOME "D:\Android\Sdk"
setx ANDROID_SDK_ROOT "D:\Android\Sdk"

echo.
echo Environment variables set!
echo Please restart Android Studio after the move.
echo.
pause
