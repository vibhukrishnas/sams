@echo off
echo ================================================================
echo  SAMS Infrastructure Monitoring System - All POCs Launcher
echo ================================================================
echo.
echo This script will help you run all 4 POCs for Phase 1:
echo.
echo 1. Java Spring Boot Monitoring Agent (Port 8080)
echo 2. WebSocket Real-time Communication (Ports 3001/3002)
echo 3. React Native Background Processing (Mobile App)
echo 4. Alert Correlation Engine (Port 5000)
echo.
echo ================================================================

:menu
echo.
echo Select which POC to run:
echo.
echo [1] POC 1: Java Spring Boot Monitoring Agent
echo [2] POC 2: WebSocket Real-time Communication
echo [3] POC 3: React Native Background Processing
echo [4] POC 4: Alert Correlation Engine
echo [5] Run All POCs (Advanced)
echo [6] Exit
echo.
set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto poc1
if "%choice%"=="2" goto poc2
if "%choice%"=="3" goto poc3
if "%choice%"=="4" goto poc4
if "%choice%"=="5" goto runall
if "%choice%"=="6" goto exit
echo Invalid choice. Please try again.
goto menu

:poc1
echo.
echo ================================================
echo  Starting POC 1: Java Spring Boot Monitoring Agent
echo ================================================
cd server-monitoring-agent
call run-poc.bat
cd ..
goto menu

:poc2
echo.
echo ================================================
echo  Starting POC 2: WebSocket Real-time Communication
echo ================================================
cd websocket-communication
call run-poc.bat
cd ..
goto menu

:poc3
echo.
echo ================================================
echo  Starting POC 3: React Native Background Processing
echo ================================================
cd react-native-background
call run-poc.bat
cd ..
goto menu

:poc4
echo.
echo ================================================
echo  Starting POC 4: Alert Correlation Engine
echo ================================================
cd alert-correlation-engine
call run-poc.bat
cd ..
goto menu

:runall
echo.
echo ================================================
echo  Advanced: Running All POCs
echo ================================================
echo.
echo WARNING: This will start all 4 POCs simultaneously.
echo Make sure you have sufficient system resources.
echo.
echo The following ports will be used:
echo - POC 1: http://localhost:8080 (Java Spring Boot)
echo - POC 2: http://localhost:3001 (WebSocket HTTP)
echo - POC 2: ws://localhost:3002 (WebSocket Server)
echo - POC 4: http://localhost:5000 (Alert Engine)
echo.
set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" goto menu

echo.
echo Starting all POCs...
echo.

REM Start POC 1 in background
echo Starting POC 1: Java Spring Boot Monitoring Agent...
start "POC1-SpringBoot" cmd /c "cd server-monitoring-agent && run-poc.bat"
timeout /t 5 /nobreak >nul

REM Start POC 2 in background
echo Starting POC 2: WebSocket Communication...
start "POC2-WebSocket" cmd /c "cd websocket-communication && run-poc.bat"
timeout /t 5 /nobreak >nul

REM Start POC 4 in background
echo Starting POC 4: Alert Correlation Engine...
start "POC4-AlertEngine" cmd /c "cd alert-correlation-engine && run-poc.bat"
timeout /t 5 /nobreak >nul

echo.
echo ================================================================
echo  All POCs Started Successfully!
echo ================================================================
echo.
echo Access URLs:
echo - POC 1 Monitoring Agent: http://localhost:8080/api/v1/status
echo - POC 1 Metrics API:      http://localhost:8080/api/v1/metrics
echo - POC 1 WebSocket:        ws://localhost:8080/ws/metrics
echo - POC 1 Test Client:      Open test-client.html in browser
echo.
echo - POC 2 Web Dashboard:    http://localhost:3001
echo - POC 2 API Status:       http://localhost:3001/api/status
echo - POC 2 WebSocket:        ws://localhost:3002
echo.
echo - POC 4 Alert Engine:     http://localhost:5000
echo - POC 4 API Status:       http://localhost:5000/api/status
echo - POC 4 Submit Alert:     POST http://localhost:5000/api/alerts
echo.
echo POC 3 (React Native) needs to be run separately with:
echo   cd react-native-background
echo   npm run android  (or npm run ios)
echo.
echo ================================================================
echo.
echo All POCs are now running in separate windows.
echo Close those windows to stop the POCs.
echo.
pause
goto menu

:exit
echo.
echo Thank you for using SAMS POC Launcher!
echo.
echo Phase 1 POCs Summary:
echo =====================
echo.
echo ✅ POC 1: Java Spring Boot Monitoring Agent
echo    - Real-time system metrics collection
echo    - REST API endpoints
echo    - WebSocket streaming
echo    - Health monitoring
echo.
echo ✅ POC 2: WebSocket Real-time Communication
echo    - Bidirectional real-time communication
echo    - Multi-client support
echo    - Channel subscriptions
echo    - Automatic data updates
echo.
echo ✅ POC 3: React Native Background Processing
echo    - Mobile background tasks
echo    - Push notifications
echo    - Offline data storage
echo    - Network monitoring
echo.
echo ✅ POC 4: Alert Correlation Engine
echo    - Intelligent alert correlation
echo    - Rule-based processing
echo    - Severity escalation
echo    - Duplicate suppression
echo.
echo All POCs demonstrate core functionality for the SAMS
echo infrastructure monitoring system and are ready for
echo integration into the full system architecture.
echo.
pause
exit /b 0
