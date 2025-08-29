@echo off
REM SAMS Java Backend Startup Script
REM Production-ready Spring Boot application

echo 🚀 Starting SAMS Java Backend Server...
echo.

cd /d "%~dp0"

REM Development mode with H2 database
echo 🔧 Starting in DEVELOPMENT mode with H2 database
java -jar target\sams-java-backend-2.0.0.jar ^
    --spring.profiles.active=dev ^
    --server.port=8080 ^
    --spring.datasource.url=jdbc:h2:mem:samsdb ^
    --spring.h2.console.enabled=true ^
    --logging.level.com.sams=DEBUG

pause
