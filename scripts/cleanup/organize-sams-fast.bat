@echo off
echo 🚀 SAMS DIRECTORY ORGANIZATION
echo ===============================
cd /d "d:\Projects\SAMS"

echo 📁 Creating organized directory structure...
mkdir backend\python-flask 2>nul
mkdir backend\java-spring 2>nul
mkdir backend\nodejs-express 2>nul
mkdir mobile\expo-app 2>nul
mkdir mobile\demos 2>nul
mkdir web\frontend 2>nul
mkdir docs\reports 2>nul
mkdir docs\guides 2>nul
mkdir scripts\deployment 2>nul
mkdir scripts\monitoring 2>nul
mkdir scripts\testing 2>nul
mkdir scripts\cleanup 2>nul
mkdir config\deployment 2>nul
mkdir config\monitoring 2>nul
mkdir archive\old-files 2>nul
mkdir logs 2>nul
mkdir temp 2>nul

echo 📦 Moving files to organized locations...

REM Move backend files
if exist "backend_server_fixed.py" move "backend_server_fixed.py" "backend\python-flask\" >nul 2>&1
if exist "java-backend" robocopy "java-backend" "backend\java-spring" /E /MOVE >nul 2>&1
if exist "nodejs-backend" robocopy "nodejs-backend" "backend\nodejs-express" /E /MOVE >nul 2>&1

REM Move mobile files
if exist "SAMSMobileExpo" move "SAMSMobileExpo" "mobile\expo-app\" >nul 2>&1
if exist "enhanced-mobile-demo.html" move "enhanced-mobile-demo.html" "mobile\demos\" >nul 2>&1
if exist "sams-mobile-preview.html" move "sams-mobile-preview.html" "mobile\demos\" >nul 2>&1

REM Move web files
if exist "sams-web-test.html" move "sams-web-test.html" "web\frontend\" >nul 2>&1

REM Move scripts
for %%f in (*.bat) do (
    if "%%f" NEQ "organize-sams-fast.bat" (
        if "%%f" NEQ "organize-simple.bat" (
            echo %%f | findstr /i "cleanup" >nul && move "%%f" "scripts\cleanup\" >nul 2>&1
            echo %%f | findstr /i "start launch" >nul && move "%%f" "scripts\deployment\" >nul 2>&1
        )
    )
)

for %%f in (test*.ps1) do move "%%f" "scripts\testing\" >nul 2>&1
for %%f in (*deploy*.ps1) do move "%%f" "scripts\deployment\" >nul 2>&1
for %%f in (*monitor*.ps1) do move "%%f" "scripts\monitoring\" >nul 2>&1

REM Move config files
if exist "agent_deployment_config.yml" move "agent_deployment_config.yml" "config\deployment\" >nul 2>&1
if exist "deployment_targets.yml" move "deployment_targets.yml" "config\deployment\" >nul 2>&1
if exist "servers_config.json" move "servers_config.json" "config\monitoring\" >nul 2>&1

REM Move reports
for %%f in (*REPORT*.md *STATUS*.md *COMPLETE*.md *SUCCESS*.md) do move "%%f" "docs\reports\" >nul 2>&1
for %%f in (*README*.md *DOCUMENTATION*.md *GUIDE*.md) do move "%%f" "docs\guides\" >nul 2>&1

REM Archive old directories
if exist "sams-mobile" move "sams-mobile" "archive\old-files\" >nul 2>&1
if exist "mobile-app" move "mobile-app" "archive\old-files\" >nul 2>&1
if exist "mobile-backend" move "mobile-backend" "archive\old-files\" >nul 2>&1
if exist "infrastructure-monitoring-system" move "infrastructure-monitoring-system" "archive\old-files\" >nul 2>&1

echo ✅ ORGANIZATION COMPLETE!
echo Your SAMS project is now organized!
pause
