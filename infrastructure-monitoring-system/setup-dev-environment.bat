@echo off
echo ================================================================
echo  SAMS Infrastructure Monitoring - Development Environment Setup
echo ================================================================
echo.
echo This script will set up the complete development environment
echo including Docker containers, databases, and all required services.
echo.

REM Check prerequisites
echo [1/8] Checking prerequisites...
echo.

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop and try again
    pause
    exit /b 1
)

REM Check Docker Compose
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Docker Compose is not installed or not in PATH
    echo Please install Docker Compose and try again
    pause
    exit /b 1
)

REM Check Java
where java >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Java is not installed or not in PATH
    echo Please install Java 17+ and try again
    pause
    exit /b 1
)

REM Check Maven
where mvn >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Maven is not installed or not in PATH
    echo Please install Maven and try again
    pause
    exit /b 1
)

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ and try again
    pause
    exit /b 1
)

echo ✅ All prerequisites found
echo.

echo [2/8] Checking Docker daemon...
docker info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Docker daemon is not running
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)
echo ✅ Docker daemon is running
echo.

echo [3/8] Creating required directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "config\prometheus" mkdir config\prometheus
if not exist "config\grafana\provisioning" mkdir config\grafana\provisioning
echo ✅ Directories created
echo.

echo [4/8] Creating configuration files...

REM Create Prometheus configuration
echo # Prometheus configuration for development > config\prometheus\prometheus.yml
echo global: >> config\prometheus\prometheus.yml
echo   scrape_interval: 15s >> config\prometheus\prometheus.yml
echo   evaluation_interval: 15s >> config\prometheus\prometheus.yml
echo. >> config\prometheus\prometheus.yml
echo scrape_configs: >> config\prometheus\prometheus.yml
echo   - job_name: 'monitoring-api' >> config\prometheus\prometheus.yml
echo     static_configs: >> config\prometheus\prometheus.yml
echo       - targets: ['api-gateway:8080'] >> config\prometheus\prometheus.yml
echo   - job_name: 'prometheus' >> config\prometheus\prometheus.yml
echo     static_configs: >> config\prometheus\prometheus.yml
echo       - targets: ['localhost:9090'] >> config\prometheus\prometheus.yml

REM Create development data script
echo -- Development test data > scripts\dev-data.sql
echo INSERT INTO users (id, username, email, role, created_at) VALUES >> scripts\dev-data.sql
echo ('1', 'admin', 'admin@company.com', 'ADMIN', NOW()), >> scripts\dev-data.sql
echo ('2', 'manager', 'manager@company.com', 'MANAGER', NOW()), >> scripts\dev-data.sql
echo ('3', 'user', 'user@company.com', 'USER', NOW()); >> scripts\dev-data.sql
echo. >> scripts\dev-data.sql
echo INSERT INTO servers (id, name, hostname, ip_address, status, created_at) VALUES >> scripts\dev-data.sql
echo ('1', 'Web Server 01', 'web-01', '192.168.1.10', 'ONLINE', NOW()), >> scripts\dev-data.sql
echo ('2', 'Database Server', 'db-01', '192.168.1.20', 'ONLINE', NOW()), >> scripts\dev-data.sql
echo ('3', 'API Gateway', 'api-01', '192.168.1.30', 'WARNING', NOW()); >> scripts\dev-data.sql

echo ✅ Configuration files created
echo.

echo [5/8] Starting Docker containers...
echo This may take several minutes for the first run...
echo.

docker-compose -f docker-compose.dev.yml down --remove-orphans
docker-compose -f docker-compose.dev.yml pull
docker-compose -f docker-compose.dev.yml up -d

if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Failed to start Docker containers
    echo Check Docker logs for more information
    pause
    exit /b 1
)

echo ✅ Docker containers started
echo.

echo [6/8] Waiting for services to be ready...
echo.

REM Wait for PostgreSQL
echo Waiting for PostgreSQL...
:wait_postgres
docker exec monitoring-postgres-dev pg_isready -U monitoring_user -d infrastructure_monitoring >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)
echo ✅ PostgreSQL is ready

REM Wait for Redis
echo Waiting for Redis...
:wait_redis
docker exec monitoring-redis-dev redis-cli ping >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    timeout /t 2 /nobreak >nul
    goto wait_redis
)
echo ✅ Redis is ready

REM Wait for InfluxDB
echo Waiting for InfluxDB...
:wait_influx
curl -f http://localhost:8086/ping >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    timeout /t 2 /nobreak >nul
    goto wait_influx
)
echo ✅ InfluxDB is ready

echo.

echo [7/8] Installing application dependencies...
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call mvn clean install -DskipTests
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
cd ..
echo ✅ Backend dependencies installed

REM Install frontend dependencies (if exists)
if exist "frontend\package.json" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ ERROR: Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Frontend dependencies installed
)

REM Install mobile app dependencies (if exists)
if exist "mobile-app\package.json" (
    echo Installing mobile app dependencies...
    cd mobile-app
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ ERROR: Failed to install mobile app dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Mobile app dependencies installed
)

echo.

echo [8/8] Running initial tests...
echo.

REM Test database connection
echo Testing database connection...
docker exec monitoring-postgres-dev psql -U monitoring_user -d infrastructure_monitoring -c "SELECT version();" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ WARNING: Database connection test failed
) else (
    echo ✅ Database connection successful
)

REM Test Redis connection
echo Testing Redis connection...
docker exec monitoring-redis-dev redis-cli ping >nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ WARNING: Redis connection test failed
) else (
    echo ✅ Redis connection successful
)

echo.
echo ================================================================
echo  🎉 Development Environment Setup Complete!
echo ================================================================
echo.
echo Your development environment is now ready with the following services:
echo.
echo 📊 DATABASES:
echo   - PostgreSQL:     http://localhost:5432
echo   - InfluxDB:       http://localhost:8086
echo   - Redis:          http://localhost:6379
echo   - Elasticsearch:  http://localhost:9200
echo.
echo 📨 MESSAGE QUEUE:
echo   - Kafka:          http://localhost:9092
echo   - Zookeeper:      http://localhost:2181
echo.
echo 📈 MONITORING:
echo   - Prometheus:     http://localhost:9090
echo   - Grafana:        http://localhost:3000 (admin/dev_password_123)
echo.
echo 🛠️ DEVELOPMENT TOOLS:
echo   - Adminer:        http://localhost:8080 (Database UI)
echo   - Kafka UI:       http://localhost:8081
echo.
echo 🚀 NEXT STEPS:
echo.
echo 1. Start the backend API:
echo    cd backend
echo    mvn spring-boot:run
echo.
echo 2. Start the frontend (if available):
echo    cd frontend
echo    npm start
echo.
echo 3. Run the POCs:
echo    cd poc
echo    run-all-pocs.bat
echo.
echo 4. Access Grafana dashboard:
echo    http://localhost:3000
echo    Username: admin
echo    Password: dev_password_123
echo.
echo 📋 USEFUL COMMANDS:
echo   - Stop all services:     docker-compose -f docker-compose.dev.yml down
echo   - View logs:             docker-compose -f docker-compose.dev.yml logs -f
echo   - Restart services:      docker-compose -f docker-compose.dev.yml restart
echo   - Clean everything:      docker-compose -f docker-compose.dev.yml down -v
echo.
echo ================================================================
echo.
pause
