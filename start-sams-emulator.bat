@echo off
echo 🚀 SAMS Emulator Launcher
echo ========================
echo.

REM Check local AVD directory first
echo 🔍 Checking local AVD devices...
if exist "avd\SAMS_Local.avd" (
    echo ✅ Found SAMS_Local AVD in local directory
    set "AVD_NAME=SAMS_Local"
) else if exist "avd\SAMS_Fast.avd" (
    echo ✅ Found SAMS_Fast AVD in local directory  
    set "AVD_NAME=SAMS_Fast"
) else (
    echo ❌ No local SAMS AVDs found
    goto :find_sdk
)

:find_sdk
REM Find Android SDK
echo.
echo 🔍 Finding Android SDK...

REM Try common SDK locations
if exist "%ANDROID_HOME%\emulator\emulator.exe" (
    set "EMULATOR_PATH=%ANDROID_HOME%\emulator\emulator.exe"
    set "ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe"
    echo ✅ Found SDK via ANDROID_HOME
    goto :check_avds
)

if exist "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" (
    set "EMULATOR_PATH=%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe"
    set "ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    echo ✅ Found SDK in AppData
    goto :check_avds
)

if exist "D:\Android\Sdk\emulator\emulator.exe" (
    set "EMULATOR_PATH=D:\Android\Sdk\emulator\emulator.exe"
    set "ADB_PATH=D:\Android\Sdk\platform-tools\adb.exe"
    echo ✅ Found SDK on D: drive
    goto :check_avds
)

echo ❌ Android SDK not found!
echo Please install Android Studio or set ANDROID_HOME
pause
exit /b 1

:check_avds
echo.
echo 📱 Available AVD devices:
"%EMULATOR_PATH%" -list-avds

echo.
echo 🔍 Checking for running emulators...
"%ADB_PATH%" devices

echo.
echo 🚀 Starting emulator...

REM Use SAMS_Local if available, otherwise SAMS_Fast
"%EMULATOR_PATH%" -list-avds | findstr "SAMS_Local" >nul
if %errorlevel% equ 0 (
    set "SELECTED_AVD=SAMS_Local"
    echo ✅ Using SAMS_Local emulator
) else (
    "%EMULATOR_PATH%" -list-avds | findstr "SAMS_Fast" >nul
    if %errorlevel% equ 0 (
        set "SELECTED_AVD=SAMS_Fast"
        echo ✅ Using SAMS_Fast emulator
    ) else (
        echo ❌ No SAMS emulators found!
        echo Available AVDs:
        "%EMULATOR_PATH%" -list-avds
        echo.
        set /p "SELECTED_AVD=Enter AVD name to use: "
    )
)

echo.
echo 🚀 Launching %SELECTED_AVD% emulator...
echo ⏳ Please wait, this may take a few minutes...

REM Launch emulator
start "SAMS Android Emulator" "%EMULATOR_PATH%" -avd "%SELECTED_AVD%" -no-snapshot-load

echo.
echo ⏳ Waiting for emulator to boot...

REM Wait for emulator to be ready
:wait_for_boot
timeout /t 5 /nobreak >nul
"%ADB_PATH%" devices | findstr "emulator.*device" >nul
if %errorlevel% neq 0 (
    echo ⏳ Still booting...
    goto :wait_for_boot
)

echo ✅ Emulator is ready!
echo.
echo 📱 Current devices:
"%ADB_PATH%" devices

echo.
echo 🎉 SAMS Emulator launched successfully!
echo.
echo Next steps:
echo 1. Wait for Android home screen to appear
echo 2. Run: cd sams-mobile\TestApp
echo 3. Run: npx react-native run-android
echo.
echo Or use the automated launcher:
echo launch-android-emulator.bat
echo.

pause
