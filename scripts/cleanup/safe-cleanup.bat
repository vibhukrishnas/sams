@echo off
echo ============================================
echo SAMS SAFE CLEANUP - REMOVE ONLY PROBLEM DIRS
echo ============================================
echo.
echo This will ONLY remove the problematic directories:
echo - mobile-app (duplicate that causes conflicts)
echo - sams-mobile (duplicate that causes conflicts)
echo.
echo Your SAMSMobileExpo will be COMPLETELY SAFE!
echo.
echo Press Ctrl+C to cancel, or any key to continue...
pause > nul
echo.

cd /d "d:\Projects\SAMS"

echo [SAFE CLEANUP IN PROGRESS...]
echo.

echo Checking if main app is safe...
if exist "SAMSMobileExpo\App.js" (
    echo ✓ SAMSMobileExpo is safe and intact!
) else (
    echo ❌ ERROR: SAMSMobileExpo not found! ABORTING!
    pause
    exit /b 1
)

echo.
echo Attempting to remove problematic mobile-app directory...
if exist "mobile-app" (
    rmdir /s /q mobile-app 2>nul
    if exist "mobile-app" (
        echo ⚠️ mobile-app still exists (may have permission issues)
    ) else (
        echo ✓ mobile-app removed successfully
    )
) else (
    echo ✓ mobile-app already gone
)

echo.
echo Attempting to remove problematic sams-mobile directory...
if exist "sams-mobile" (
    rmdir /s /q sams-mobile 2>nul
    if exist "sams-mobile" (
        echo ⚠️ sams-mobile still exists (may have permission issues)
    ) else (
        echo ✓ sams-mobile removed successfully
    )
) else (
    echo ✓ sams-mobile already gone
)

echo.
echo Final verification - checking main app...
if exist "SAMSMobileExpo\App.js" (
    echo ✅ SUCCESS: SAMSMobileExpo is still safe and intact!
) else (
    echo ❌ PANIC: Something went wrong with main app!
)

echo.
echo ============================================
echo SAFE CLEANUP COMPLETED!
echo ============================================
echo.
echo Current structure:
dir /b
echo.
pause
