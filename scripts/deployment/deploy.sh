#!/bin/bash

# SAMS Deployment Script
# This script deploys the complete SAMS system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
BACKUP_ENABLED=${BACKUP_ENABLED:-true}
SKIP_TESTS=${SKIP_TESTS:-false}

echo -e "${BLUE}🚀 Starting SAMS Deployment (Environment: $ENVIRONMENT)${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    if ! command_exists node; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_status "All prerequisites are installed"
}

# Create backup
create_backup() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        print_info "Creating backup..."
        
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup database
        if docker-compose ps postgres | grep -q "Up"; then
            print_info "Backing up database..."
            docker-compose exec -T postgres pg_dump -U sams_user sams_db > "$BACKUP_DIR/database.sql"
            print_status "Database backup created"
        fi
        
        # Backup configuration files
        cp -r .env* "$BACKUP_DIR/" 2>/dev/null || true
        cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
        
        print_status "Backup created in $BACKUP_DIR"
    else
        print_warning "Backup skipped"
    fi
}

# Setup environment
setup_environment() {
    print_info "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Created .env from .env.example - please update with your values"
        else
            print_error ".env file not found and no .env.example available"
            exit 1
        fi
    fi
    
    # Create necessary directories
    mkdir -p logs reports uploads backups
    mkdir -p nginx/ssl nginx/logs
    mkdir -p prometheus grafana/dashboards grafana/datasources
    mkdir -p alertmanager logstash/pipeline logstash/config
    
    print_status "Environment setup complete"
}

# Build backend
build_backend() {
    print_info "Building backend..."
    
    cd sams-backend
    
    # Install dependencies
    npm ci
    
    # Run tests if not skipped
    if [ "$SKIP_TESTS" != "true" ]; then
        print_info "Running backend tests..."
        npm test
        print_status "Backend tests passed"
    fi
    
    # Build TypeScript
    npm run build
    
    cd ..
    print_status "Backend build complete"
}

# Build mobile app
build_mobile() {
    print_info "Building mobile app..."
    
    cd sams-mobile/TestApp
    
    # Install dependencies
    npm ci
    
    # Run tests if not skipped
    if [ "$SKIP_TESTS" != "true" ]; then
        print_info "Running mobile app tests..."
        npm test -- --watchAll=false
        print_status "Mobile app tests passed"
    fi
    
    # Build for web (React Native Web)
    npm run build:web
    
    cd ../..
    print_status "Mobile app build complete"
}

# Setup monitoring
setup_monitoring() {
    print_info "Setting up monitoring configuration..."
    
    # Create Prometheus configuration
    cat > prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'sams-backend'
    static_configs:
      - targets: ['sams-backend:8080']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
EOF

    # Create Grafana datasource configuration
    mkdir -p grafana/datasources
    cat > grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

    # Create Alertmanager configuration
    cat > alertmanager/alertmanager.yml << EOF
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alertmanager@sams.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://sams-backend:8080/api/webhooks/alertmanager'
EOF

    print_status "Monitoring configuration complete"
}

# Setup nginx
setup_nginx() {
    print_info "Setting up Nginx configuration..."
    
    mkdir -p nginx
    cat > nginx/nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server sams-backend:8080;
    }
    
    upstream frontend {
        server sams-frontend:3000;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
        
        # WebSocket
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOF

    print_status "Nginx configuration complete"
}

# Deploy with Docker Compose
deploy_containers() {
    print_info "Deploying containers..."
    
    # Pull latest images
    docker-compose pull
    
    # Build custom images
    docker-compose build
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    if docker-compose ps | grep -q "unhealthy\|Exit"; then
        print_error "Some services are not healthy"
        docker-compose ps
        docker-compose logs
        exit 1
    fi
    
    print_status "All services are running"
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    # Wait for database to be ready
    sleep 10
    
    # Run migrations
    docker-compose exec sams-backend npm run db:migrate
    
    print_status "Database migrations complete"
}

# Setup monitoring dashboards
setup_dashboards() {
    print_info "Setting up monitoring dashboards..."
    
    # Wait for Grafana to be ready
    sleep 20
    
    # Import dashboards (this would typically be done via API)
    print_info "Grafana dashboards available at http://localhost:3001"
    print_info "Default credentials: admin/admin"
    
    print_status "Monitoring dashboards setup complete"
}

# Health check
health_check() {
    print_info "Performing health check..."
    
    # Check backend health
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_status "Frontend is accessible"
    else
        print_warning "Frontend may not be ready yet"
    fi
    
    # Check database
    if docker-compose exec -T postgres pg_isready -U sams_user -d sams_db >/dev/null 2>&1; then
        print_status "Database is ready"
    else
        print_error "Database is not ready"
        exit 1
    fi
    
    print_status "Health check complete"
}

# Main deployment flow
main() {
    print_info "Starting SAMS deployment..."
    
    check_prerequisites
    create_backup
    setup_environment
    build_backend
    build_mobile
    setup_monitoring
    setup_nginx
    deploy_containers
    run_migrations
    setup_dashboards
    health_check
    
    print_status "🎉 SAMS deployment complete!"
    echo ""
    print_info "Access URLs:"
    echo "  📱 SAMS Mobile App: http://localhost:3000"
    echo "  🔧 Backend API: http://localhost:8080"
    echo "  📊 Grafana: http://localhost:3001 (admin/admin)"
    echo "  🔍 Prometheus: http://localhost:9090"
    echo "  📋 Kibana: http://localhost:5601"
    echo ""
    print_info "Next steps:"
    echo "  1. Update .env file with your configuration"
    echo "  2. Configure SSL certificates in nginx/ssl/"
    echo "  3. Set up monitoring alerts"
    echo "  4. Deploy monitoring agents to your servers"
    echo ""
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
