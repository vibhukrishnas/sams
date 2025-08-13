@echo off
echo ========================================
echo EMERGENCY C DRIVE CLEANUP
echo ========================================

echo Cleaning temporary files...
del /q /f /s "%TEMP%\*" 2>nul
del /q /f /s "%TMP%\*" 2>nul
del /q /f /s "C:\Windows\Temp\*" 2>nul

echo Cleaning browser caches...
del /q /f /s "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache\*" 2>nul
del /q /f /s "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache\*" 2>nul

echo Cleaning Windows prefetch...
del /q /f /s "C:\Windows\Prefetch\*" 2>nul

echo Cleaning system logs...
del /q /f /s "C:\Windows\Logs\*" 2>nul

echo Cleaning Windows Update cache...
del /q /f /s "C:\Windows\SoftwareDistribution\Download\*" 2>nul

echo Cleaning npm cache...
npm cache clean --force 2>nul

echo Running Disk Cleanup...
cleanmgr /sagerun:1

echo.
echo ========================================
echo CLEANUP COMPLETED!
echo ========================================
echo.
echo Please check C drive space now.
echo If still low, move Android SDK to D drive:
echo 1. Open Android Studio
echo 2. File ^> Settings ^> Android SDK
echo 3. Change location to D:\Android\Sdk
echo.
pause
