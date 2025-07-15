#!/bin/bash

# SAMS Docker Agent Deployment Script
# This script automates the deployment of the SAMS Docker monitoring agent

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/agent_config.json"
DOCKER_COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"

# Default values
DEFAULT_SERVER_URL="http://localhost:8080"
DEFAULT_AGENT_ID="docker-agent-$(hostname)"
DEFAULT_METRICS_INTERVAL="30"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create configuration
create_config() {
    log_info "Creating configuration..."
    
    # Prompt for configuration values
    read -p "Enter SAMS Server URL [${DEFAULT_SERVER_URL}]: " SERVER_URL
    SERVER_URL=${SERVER_URL:-$DEFAULT_SERVER_URL}
    
    read -p "Enter Agent ID [${DEFAULT_AGENT_ID}]: " AGENT_ID
    AGENT_ID=${AGENT_ID:-$DEFAULT_AGENT_ID}
    
    read -p "Enter API Key (optional): " API_KEY
    
    read -p "Enter metrics collection interval in seconds [${DEFAULT_METRICS_INTERVAL}]: " METRICS_INTERVAL
    METRICS_INTERVAL=${METRICS_INTERVAL:-$DEFAULT_METRICS_INTERVAL}
    
    # Create .env file for Docker Compose
    cat > "${ENV_FILE}" << EOF
SAMS_SERVER_URL=${SERVER_URL}
AGENT_ID=${AGENT_ID}
SAMS_API_KEY=${API_KEY}
METRICS_INTERVAL=${METRICS_INTERVAL}
LOG_LEVEL=info
ENABLE_CONTAINER_MANAGEMENT=true
ENABLE_HEALTH_CHECKS=true
ENABLE_AUTO_DEPLOYMENT=false
EOF
    
    # Create agent configuration file
    cat > "${CONFIG_FILE}" << EOF
{
    "agent_id": "${AGENT_ID}",
    "server_url": "${SERVER_URL}",
    "api_key": "${API_KEY}",
    "metrics_interval": ${METRICS_INTERVAL},
    "docker_socket": "/var/run/docker.sock",
    "log_level": "info",
    "features": {
        "container_management": true,
        "health_checks": true,
        "auto_deployment": false,
        "metrics_export": true
    },
    "thresholds": {
        "cpu_warning": 70,
        "cpu_critical": 85,
        "memory_warning": 80,
        "memory_critical": 90,
        "disk_warning": 85,
        "disk_critical": 95
    }
}
EOF
    
    log_success "Configuration created successfully"
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    cd "${SCRIPT_DIR}"
    
    if docker build -t sams-docker-agent:latest .; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Deploy agent
deploy_agent() {
    log_info "Deploying SAMS Docker Agent..."
    
    cd "${SCRIPT_DIR}"
    
    # Create logs directory
    mkdir -p logs
    
    # Stop existing containers
    if docker-compose -f "${DOCKER_COMPOSE_FILE}" ps -q | grep -q .; then
        log_info "Stopping existing containers..."
        docker-compose -f "${DOCKER_COMPOSE_FILE}" down
    fi
    
    # Start the agent
    if docker-compose -f "${DOCKER_COMPOSE_FILE}" up -d; then
        log_success "SAMS Docker Agent deployed successfully"
    else
        log_error "Failed to deploy SAMS Docker Agent"
        exit 1
    fi
}

# Check agent status
check_status() {
    log_info "Checking agent status..."
    
    cd "${SCRIPT_DIR}"
    
    # Check if containers are running
    if docker-compose -f "${DOCKER_COMPOSE_FILE}" ps | grep -q "Up"; then
        log_success "SAMS Docker Agent is running"
        
        # Show container status
        docker-compose -f "${DOCKER_COMPOSE_FILE}" ps
        
        # Show recent logs
        log_info "Recent logs:"
        docker-compose -f "${DOCKER_COMPOSE_FILE}" logs --tail=20 sams-docker-agent
    else
        log_warning "SAMS Docker Agent is not running"
        docker-compose -f "${DOCKER_COMPOSE_FILE}" ps
    fi
}

# Show logs
show_logs() {
    log_info "Showing agent logs..."
    
    cd "${SCRIPT_DIR}"
    docker-compose -f "${DOCKER_COMPOSE_FILE}" logs -f sams-docker-agent
}

# Stop agent
stop_agent() {
    log_info "Stopping SAMS Docker Agent..."
    
    cd "${SCRIPT_DIR}"
    
    if docker-compose -f "${DOCKER_COMPOSE_FILE}" down; then
        log_success "SAMS Docker Agent stopped successfully"
    else
        log_error "Failed to stop SAMS Docker Agent"
        exit 1
    fi
}

# Restart agent
restart_agent() {
    log_info "Restarting SAMS Docker Agent..."
    
    stop_agent
    deploy_agent
}

# Update agent
update_agent() {
    log_info "Updating SAMS Docker Agent..."
    
    build_image
    restart_agent
}

# Uninstall agent
uninstall_agent() {
    log_warning "This will completely remove the SAMS Docker Agent and its data."
    read -p "Are you sure you want to continue? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        log_info "Uninstalling SAMS Docker Agent..."
        
        cd "${SCRIPT_DIR}"
        
        # Stop and remove containers
        docker-compose -f "${DOCKER_COMPOSE_FILE}" down -v
        
        # Remove Docker image
        docker rmi sams-docker-agent:latest 2>/dev/null || true
        
        # Remove configuration files
        rm -f "${ENV_FILE}" "${CONFIG_FILE}"
        
        # Remove logs
        rm -rf logs
        
        log_success "SAMS Docker Agent uninstalled successfully"
    else
        log_info "Uninstall cancelled"
    fi
}

# Show help
show_help() {
    echo "SAMS Docker Agent Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install     Install and deploy the SAMS Docker Agent"
    echo "  status      Check the status of the agent"
    echo "  logs        Show agent logs (follow mode)"
    echo "  stop        Stop the agent"
    echo "  start       Start the agent"
    echo "  restart     Restart the agent"
    echo "  update      Update the agent (rebuild and restart)"
    echo "  uninstall   Completely remove the agent"
    echo "  help        Show this help message"
    echo ""
}

# Main script logic
main() {
    case "${1:-install}" in
        install)
            check_prerequisites
            create_config
            build_image
            deploy_agent
            check_status
            ;;
        status)
            check_status
            ;;
        logs)
            show_logs
            ;;
        stop)
            stop_agent
            ;;
        start)
            deploy_agent
            ;;
        restart)
            restart_agent
            ;;
        update)
            update_agent
            ;;
        uninstall)
            uninstall_agent
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
