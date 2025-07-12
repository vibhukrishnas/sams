#!/bin/bash

# 🚀 SAMS Monitoring Agent - Linux Installation Script
# Comprehensive installation script for Linux systems with auto-detection and configuration

set -euo pipefail

# Script configuration
SCRIPT_VERSION="2.1.0"
AGENT_NAME="sams-agent"
AGENT_VERSION="2.1.0"
INSTALL_DIR="/opt/sams-agent"
CONFIG_DIR="/etc/sams-agent"
LOG_DIR="/var/log/sams-agent"
SERVICE_NAME="sams-agent"
DOWNLOAD_URL="https://releases.sams-monitoring.com/agents"
TEMP_DIR="/tmp/sams-agent-install"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect Linux distribution
detect_distribution() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [[ -f /etc/redhat-release ]]; then
        DISTRO="rhel"
        VERSION=$(cat /etc/redhat-release | grep -oE '[0-9]+\.[0-9]+')
    elif [[ -f /etc/debian_version ]]; then
        DISTRO="debian"
        VERSION=$(cat /etc/debian_version)
    else
        log_error "Unable to detect Linux distribution"
        exit 1
    fi
    
    log_info "Detected distribution: $DISTRO $VERSION"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    case $DISTRO in
        ubuntu|debian)
            apt-get update
            apt-get install -y curl wget unzip openjdk-11-jre-headless systemd
            ;;
        centos|rhel|fedora)
            if command -v dnf &> /dev/null; then
                dnf install -y curl wget unzip java-11-openjdk-headless systemd
            else
                yum install -y curl wget unzip java-11-openjdk-headless systemd
            fi
            ;;
        suse|opensuse*)
            zypper install -y curl wget unzip java-11-openjdk-headless systemd
            ;;
        arch)
            pacman -S --noconfirm curl wget unzip jre11-openjdk systemd
            ;;
        *)
            log_warning "Unknown distribution, attempting generic installation"
            ;;
    esac
    
    log_success "Dependencies installed successfully"
}

# Create system user
create_user() {
    log_info "Creating system user for SAMS agent..."
    
    if ! id "$AGENT_NAME" &>/dev/null; then
        useradd --system --no-create-home --shell /bin/false "$AGENT_NAME"
        log_success "Created system user: $AGENT_NAME"
    else
        log_info "System user $AGENT_NAME already exists"
    fi
}

# Create directories
create_directories() {
    log_info "Creating installation directories..."
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$TEMP_DIR"
    
    # Set ownership and permissions
    chown -R "$AGENT_NAME:$AGENT_NAME" "$INSTALL_DIR"
    chown -R "$AGENT_NAME:$AGENT_NAME" "$CONFIG_DIR"
    chown -R "$AGENT_NAME:$AGENT_NAME" "$LOG_DIR"
    
    chmod 755 "$INSTALL_DIR"
    chmod 750 "$CONFIG_DIR"
    chmod 755 "$LOG_DIR"
    
    log_success "Directories created successfully"
}

# Download and install agent
download_agent() {
    log_info "Downloading SAMS agent v$AGENT_VERSION..."
    
    cd "$TEMP_DIR"
    
    # Determine architecture
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            ARCH_SUFFIX="linux-x64"
            ;;
        aarch64|arm64)
            ARCH_SUFFIX="linux-arm64"
            ;;
        armv7l)
            ARCH_SUFFIX="linux-arm"
            ;;
        *)
            log_error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac
    
    DOWNLOAD_FILE="sams-agent-${AGENT_VERSION}-${ARCH_SUFFIX}.tar.gz"
    DOWNLOAD_FULL_URL="${DOWNLOAD_URL}/${AGENT_VERSION}/${DOWNLOAD_FILE}"
    
    if ! curl -fsSL "$DOWNLOAD_FULL_URL" -o "$DOWNLOAD_FILE"; then
        log_error "Failed to download agent from $DOWNLOAD_FULL_URL"
        exit 1
    fi
    
    log_success "Agent downloaded successfully"
    
    # Extract agent
    log_info "Extracting agent..."
    tar -xzf "$DOWNLOAD_FILE"
    
    # Copy files to installation directory
    cp -r sams-agent-${AGENT_VERSION}/* "$INSTALL_DIR/"
    
    # Make agent executable
    chmod +x "$INSTALL_DIR/bin/sams-agent"
    
    # Set ownership
    chown -R "$AGENT_NAME:$AGENT_NAME" "$INSTALL_DIR"
    
    log_success "Agent installed successfully"
}

# Generate configuration
generate_config() {
    log_info "Generating agent configuration..."
    
    # Get server details from user or environment
    if [[ -z "${SAMS_SERVER_URL:-}" ]]; then
        read -p "Enter SAMS server URL (e.g., https://monitoring.company.com): " SAMS_SERVER_URL
    fi
    
    if [[ -z "${SAMS_API_KEY:-}" ]]; then
        read -p "Enter SAMS API key: " SAMS_API_KEY
    fi
    
    if [[ -z "${SAMS_ORGANIZATION_ID:-}" ]]; then
        read -p "Enter organization ID: " SAMS_ORGANIZATION_ID
    fi
    
    # Generate unique agent ID
    AGENT_ID=$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || openssl rand -hex 16)
    
    # Get system information
    HOSTNAME=$(hostname)
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
    
    # Create configuration file
    cat > "$CONFIG_DIR/agent.yml" << EOF
# SAMS Monitoring Agent Configuration
# Generated on $(date)

# Agent identification
agent:
  id: "$AGENT_ID"
  name: "$HOSTNAME"
  version: "$AGENT_VERSION"
  environment: "production"

# Server connection
server:
  url: "$SAMS_SERVER_URL"
  api_key: "$SAMS_API_KEY"
  organization_id: "$SAMS_ORGANIZATION_ID"
  timeout: 30
  retry_attempts: 3
  retry_delay: 5

# System information
system:
  hostname: "$HOSTNAME"
  ip_address: "$IP_ADDRESS"
  operating_system: "$(uname -s)"
  architecture: "$(uname -m)"

# Metric collection settings
metrics:
  system_metrics_enabled: true
  application_metrics_enabled: true
  log_metrics_enabled: true
  security_metrics_enabled: true
  
  # Collection intervals (seconds)
  cpu_collection_interval: 30
  memory_collection_interval: 30
  disk_collection_interval: 60
  network_collection_interval: 30
  process_collection_interval: 60

# Agent management
management:
  config_update_interval: 300
  update_check_interval: 3600
  health_check_interval: 60
  max_concurrent_collectors: 10

# Logging
logging:
  level: "INFO"
  file: "$LOG_DIR/agent.log"
  max_file_size: "100MB"
  max_files: 5

# Security
security:
  skip_ssl_verification: false
  certificate_path: ""
  
# Advanced settings
advanced:
  skip_loopback_interfaces: true
  collect_process_details: true
  max_log_lines_per_collection: 1000
EOF

    # Set configuration file permissions
    chmod 640 "$CONFIG_DIR/agent.yml"
    chown "$AGENT_NAME:$AGENT_NAME" "$CONFIG_DIR/agent.yml"
    
    log_success "Configuration generated successfully"
}

# Create systemd service
create_service() {
    log_info "Creating systemd service..."
    
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=SAMS Monitoring Agent
Documentation=https://docs.sams-monitoring.com
After=network.target
Wants=network.target

[Service]
Type=simple
User=$AGENT_NAME
Group=$AGENT_NAME
ExecStart=$INSTALL_DIR/bin/sams-agent $CONFIG_DIR/agent.yml
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LOG_DIR $CONFIG_DIR
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log_success "Systemd service created and enabled"
}

# Start agent service
start_service() {
    log_info "Starting SAMS agent service..."
    
    if systemctl start "$SERVICE_NAME"; then
        log_success "SAMS agent started successfully"
        
        # Wait a moment and check status
        sleep 3
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log_success "SAMS agent is running and healthy"
        else
            log_error "SAMS agent failed to start properly"
            log_info "Check logs with: journalctl -u $SERVICE_NAME -f"
            exit 1
        fi
    else
        log_error "Failed to start SAMS agent"
        exit 1
    fi
}

# Cleanup temporary files
cleanup() {
    log_info "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    log_success "Cleanup completed"
}

# Create uninstall script
create_uninstall_script() {
    log_info "Creating uninstall script..."
    
    cat > "$INSTALL_DIR/uninstall.sh" << 'EOF'
#!/bin/bash
# SAMS Agent Uninstall Script

set -euo pipefail

SERVICE_NAME="sams-agent"
INSTALL_DIR="/opt/sams-agent"
CONFIG_DIR="/etc/sams-agent"
LOG_DIR="/var/log/sams-agent"
AGENT_USER="sams-agent"

echo "🗑️  Uninstalling SAMS Monitoring Agent..."

# Stop and disable service
if systemctl is-active --quiet "$SERVICE_NAME"; then
    systemctl stop "$SERVICE_NAME"
fi
systemctl disable "$SERVICE_NAME" 2>/dev/null || true
rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload

# Remove directories
rm -rf "$INSTALL_DIR"
rm -rf "$CONFIG_DIR"
rm -rf "$LOG_DIR"

# Remove user
if id "$AGENT_USER" &>/dev/null; then
    userdel "$AGENT_USER"
fi

echo "✅ SAMS Monitoring Agent uninstalled successfully"
EOF

    chmod +x "$INSTALL_DIR/uninstall.sh"
    chown "$AGENT_NAME:$AGENT_NAME" "$INSTALL_DIR/uninstall.sh"
    
    log_success "Uninstall script created"
}

# Display installation summary
display_summary() {
    log_success "🎉 SAMS Monitoring Agent installation completed successfully!"
    echo
    echo "📋 Installation Summary:"
    echo "  • Agent Version: $AGENT_VERSION"
    echo "  • Installation Directory: $INSTALL_DIR"
    echo "  • Configuration Directory: $CONFIG_DIR"
    echo "  • Log Directory: $LOG_DIR"
    echo "  • Service Name: $SERVICE_NAME"
    echo "  • Agent User: $AGENT_NAME"
    echo
    echo "🔧 Management Commands:"
    echo "  • Start:   sudo systemctl start $SERVICE_NAME"
    echo "  • Stop:    sudo systemctl stop $SERVICE_NAME"
    echo "  • Restart: sudo systemctl restart $SERVICE_NAME"
    echo "  • Status:  sudo systemctl status $SERVICE_NAME"
    echo "  • Logs:    sudo journalctl -u $SERVICE_NAME -f"
    echo
    echo "📝 Configuration File: $CONFIG_DIR/agent.yml"
    echo "🗑️  Uninstall: sudo $INSTALL_DIR/uninstall.sh"
    echo
    echo "📊 The agent is now collecting metrics and sending them to your SAMS server."
    echo "🌐 Check your SAMS dashboard to verify the agent is reporting correctly."
}

# Main installation function
main() {
    log_info "🚀 Starting SAMS Monitoring Agent installation v$SCRIPT_VERSION"
    
    check_root
    detect_distribution
    install_dependencies
    create_user
    create_directories
    download_agent
    generate_config
    create_service
    start_service
    create_uninstall_script
    cleanup
    display_summary
}

# Handle script interruption
trap 'log_error "Installation interrupted"; cleanup; exit 1' INT TERM

# Run main installation
main "$@"
