@echo off
echo 🧹 Starting C: Drive Cleanup - Critical Space Recovery
echo.

echo 📊 Current C: Drive Status:
for /f "tokens=3" %%a in ('dir C:\ /-c ^| find "bytes free"') do echo Free Space: %%a bytes

echo.
echo 🗑️ Starting cleanup operations...

echo 1. Cleaning Windows Temp files...
del /q /f /s "%TEMP%\*" 2>nul
for /d %%x in ("%TEMP%\*") do rd /s /q "%%x" 2>nul
echo    ✅ User Temp files cleaned

echo 2. Cleaning System Temp files...
del /q /f /s "C:\Windows\Temp\*" 2>nul
for /d %%x in ("C:\Windows\Temp\*") do rd /s /q "%%x" 2>nul
echo    ✅ System Temp files cleaned

echo 3. Cleaning Prefetch files...
del /q /f "C:\Windows\Prefetch\*" 2>nul
echo    ✅ Prefetch files cleaned

echo 4. Cleaning Recent files...
del /q /f "%USERPROFILE%\Recent\*" 2>nul
echo    ✅ Recent files cleaned

echo 5. Cleaning Browser caches...
rd /s /q "%LOCALAPPDATA%\Google\Chrome\User Data\Default\Cache" 2>nul
rd /s /q "%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Cache" 2>nul
rd /s /q "%LOCALAPPDATA%\Mozilla\Firefox\Profiles\*\cache2" 2>nul
echo    ✅ Browser caches cleaned

echo 6. Cleaning Windows Error Reporting...
del /q /f /s "C:\ProgramData\Microsoft\Windows\WER\*" 2>nul
for /d %%x in ("C:\ProgramData\Microsoft\Windows\WER\*") do rd /s /q "%%x" 2>nul
echo    ✅ Windows Error Reporting cleaned

echo 7. Cleaning Windows Update cache...
net stop wuauserv >nul 2>&1
del /q /f /s "C:\Windows\SoftwareDistribution\Download\*" 2>nul
for /d %%x in ("C:\Windows\SoftwareDistribution\Download\*") do rd /s /q "%%x" 2>nul
net start wuauserv >nul 2>&1
echo    ✅ Windows Update cache cleaned

echo 8. Cleaning IIS logs (if present)...
del /q /f /s "C:\inetpub\logs\LogFiles\*" 2>nul
echo    ✅ IIS logs cleaned

echo 9. Cleaning old Windows installation files...
if exist "C:\Windows.old" (
    echo    Found Windows.old folder - this can be safely deleted to recover significant space
    echo    Run: rd /s /q "C:\Windows.old" as Administrator to remove it
)

echo.
echo 📊 Final C: Drive Status:
for /f "tokens=3" %%a in ('dir C:\ /-c ^| find "bytes free"') do echo Free Space: %%a bytes

echo.
echo ✅ C: Drive cleanup completed!
echo.
echo 💡 Additional recommendations:
echo    - Empty Recycle Bin manually
echo    - Run Disk Cleanup (cleanmgr.exe) for more options
echo    - Consider moving large files to D: drive
echo    - Uninstall unused programs
echo    - Move Android SDK to D: drive (already planned)
echo.
pause
