@echo off
echo ================================================
echo  SAMS WebSocket Communication POC Launcher
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install npm and try again
    pause
    exit /b 1
)

echo Checking Node.js version...
node --version
echo Checking npm version...
npm --version

echo.
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting SAMS WebSocket Communication POC...
echo.
echo The application will start with:
echo - HTTP Server: http://localhost:3001
echo - WebSocket Server: ws://localhost:3002
echo.
echo Available endpoints:
echo - Web Dashboard: http://localhost:3001
echo - API Status: http://localhost:3001/api/status
echo - Client List: http://localhost:3001/api/clients
echo - WebSocket: ws://localhost:3002
echo.
echo Features:
echo - Real-time system data updates every 5 seconds
echo - Automatic alert generation every 15 seconds
echo - Heartbeat monitoring every 10 seconds
echo - Multi-client support with channel subscriptions
echo.
echo Press Ctrl+C to stop the application
echo.

call npm start

echo.
echo Application stopped.
pause
