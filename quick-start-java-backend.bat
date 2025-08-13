@echo off
echo 🚀 SAMS Java Backend Quick Launcher
echo ====================================

cd /d "D:\Projects\SAMS\sams-java-backend"

echo Current directory: %CD%
echo Checking JAR file...

if exist "target\sams-java-backend-2.0.0.jar" (
    echo ✅ JAR file found
    echo 🚀 Starting SAMS Java Backend...
    java -jar "target\sams-java-backend-2.0.0.jar"
) else (
    echo ❌ JAR file not found. Building...
    call mvn clean install -DskipTests -q
    if exist "target\sams-java-backend-2.0.0.jar" (
        echo ✅ Build successful. Starting server...
        java -jar "target\sams-java-backend-2.0.0.jar"
    ) else (
        echo ❌ Build failed
        pause
    )
)

pause
