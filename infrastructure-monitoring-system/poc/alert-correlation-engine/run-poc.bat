@echo off
echo ================================================
echo  SAMS Alert Correlation Engine POC Launcher
echo ================================================
echo.

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Check if pip is installed
where pip >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pip is not installed or not in PATH
    echo Please install pip and try again
    pause
    exit /b 1
)

echo Checking Python version...
python --version

echo.
echo Installing dependencies...
call pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting SAMS Alert Correlation Engine POC...
echo.
echo The application will start with:
echo - API Server: http://localhost:5000
echo - Web Interface: http://localhost:5000
echo.
echo Features:
echo - Intelligent alert correlation
echo - Rule-based processing
echo - Alert severity escalation
echo - Duplicate suppression
echo - Pattern recognition
echo - REST API interface
echo.
echo Available API endpoints:
echo - GET  /api/status           - API status
echo - GET  /api/alerts           - Get active alerts
echo - POST /api/alerts           - Submit new alert
echo - GET  /api/correlations     - Get correlation groups
echo - GET  /api/statistics       - Get engine statistics
echo.
echo Press Ctrl+C to stop the application
echo.

python api_server.py

echo.
echo Application stopped.
pause
