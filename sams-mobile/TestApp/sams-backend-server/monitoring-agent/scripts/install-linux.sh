#!/bin/bash

# SAMS Monitoring Agent - Linux Installation Script
# Phase 2 Week 6: Cross-platform Agent Installation

set -e

# Default configuration
SERVER_URL="${SAMS_SERVER_URL:-http://localhost:8080}"
INSTALL_PATH="${SAMS_INSTALL_PATH:-/opt/sams/agent}"
SERVICE_NAME="sams-monitoring-agent"
USER_NAME="sams"
FORCE_INSTALL=false
UNINSTALL=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
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
        log_error "This script must be run as root"
        log_info "Please run: sudo $0"
        exit 1
    fi
}

# Detect Linux distribution
detect_distro() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [[ -f /etc/redhat-release ]]; then
        DISTRO="rhel"
    elif [[ -f /etc/debian_version ]]; then
        DISTRO="debian"
    else
        DISTRO="unknown"
    fi
    
    log_info "Detected distribution: $DISTRO $VERSION"
}

# Install Java if needed
install_java() {
    log_info "🔍 Checking Java installation..."
    
    if command -v java >/dev/null 2>&1; then
        JAVA_VERSION=$(java -version 2>&1 | head -n1 | cut -d'"' -f2 | cut -d'.' -f1)
        if [[ $JAVA_VERSION -ge 11 ]]; then
            log_success "✅ Java $JAVA_VERSION found"
            return 0
        fi
    fi
    
    log_info "📦 Installing OpenJDK 11..."
    
    case $DISTRO in
        ubuntu|debian)
            apt-get update
            apt-get install -y openjdk-11-jre-headless
            ;;
        rhel|centos|fedora)
            if command -v dnf >/dev/null 2>&1; then
                dnf install -y java-11-openjdk-headless
            else
                yum install -y java-11-openjdk-headless
            fi
            ;;
        arch)
            pacman -S --noconfirm jre11-openjdk-headless
            ;;
        *)
            log_error "Unsupported distribution for automatic Java installation"
            log_info "Please install Java 11+ manually and run this script again"
            exit 1
            ;;
    esac
    
    log_success "✅ Java 11 installed successfully"
}

# Create system user
create_user() {
    log_info "👤 Creating system user: $USER_NAME"
    
    if id "$USER_NAME" &>/dev/null; then
        log_info "User $USER_NAME already exists"
    else
        useradd --system --home-dir "$INSTALL_PATH" --shell /bin/false "$USER_NAME"
        log_success "✅ User $USER_NAME created"
    fi
}

# Download agent
download_agent() {
    log_info "📥 Downloading SAMS Monitoring Agent..."
    
    # Create install directory
    mkdir -p "$INSTALL_PATH"
    
    # Download agent JAR
    AGENT_URL="$SERVER_URL/api/v1/agents/download/linux"
    AGENT_JAR="$INSTALL_PATH/sams-monitoring-agent.jar"
    
    if command -v curl >/dev/null 2>&1; then
        curl -L -o "$AGENT_JAR" "$AGENT_URL"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "$AGENT_JAR" "$AGENT_URL"
    else
        log_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    if [[ -f "$AGENT_JAR" ]]; then
        log_success "✅ Agent downloaded successfully"
    else
        log_error "❌ Failed to download agent"
        exit 1
    fi
    
    # Set permissions
    chown -R "$USER_NAME:$USER_NAME" "$INSTALL_PATH"
    chmod 755 "$INSTALL_PATH"
    chmod 644 "$AGENT_JAR"
}

# Create configuration
create_configuration() {
    log_info "⚙️ Creating agent configuration..."
    
    CONFIG_PATH="$INSTALL_PATH/sams-agent.properties"
    AGENT_ID="agent-$(openssl rand -hex 4)"
    
    cat > "$CONFIG_PATH" << EOF
# SAMS Monitoring Agent Configuration
server.url=$SERVER_URL
agent.id=$AGENT_ID
collection.interval=30
metrics.system.enabled=true
metrics.application.enabled=true
metrics.network.enabled=true
auto.update.enabled=true
auto.update.check.interval=3600
log.level=INFO
EOF
    
    chown "$USER_NAME:$USER_NAME" "$CONFIG_PATH"
    chmod 644 "$CONFIG_PATH"
    
    log_success "✅ Configuration created: $CONFIG_PATH"
}

# Create systemd service
create_systemd_service() {
    log_info "🔧 Creating systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=SAMS Infrastructure Monitoring Agent
After=network.target
Wants=network.target

[Service]
Type=simple
User=$USER_NAME
Group=$USER_NAME
WorkingDirectory=$INSTALL_PATH
ExecStart=/usr/bin/java -jar $INSTALL_PATH/sams-monitoring-agent.jar
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=sams-agent

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_PATH

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log_success "✅ Systemd service created and enabled"
}

# Create init.d service (for older systems)
create_initd_service() {
    log_info "🔧 Creating init.d service..."
    
    SERVICE_FILE="/etc/init.d/$SERVICE_NAME"
    
    cat > "$SERVICE_FILE" << 'EOF'
#!/bin/bash
# SAMS Monitoring Agent Service
# chkconfig: 35 80 20
# description: SAMS Infrastructure Monitoring Agent

. /etc/rc.d/init.d/functions

USER="sams"
DAEMON="sams-monitoring-agent"
ROOT_DIR="/opt/sams/agent"
LOCK_FILE="/var/lock/subsys/sams-monitoring-agent"

start() {
    echo -n $"Starting $DAEMON: "
    daemon --user "$USER" --pidfile="$ROOT_DIR/$DAEMON.pid" \
           java -jar "$ROOT_DIR/sams-monitoring-agent.jar" > /dev/null 2>&1 &
    RETVAL=$?
    echo
    [ $RETVAL -eq 0 ] && touch $LOCK_FILE
    return $RETVAL
}

stop() {
    echo -n $"Shutting down $DAEMON: "
    pid=`ps -aefw | grep "$DAEMON" | grep -v " grep " | awk '{print $2}'`
    kill -9 $pid > /dev/null 2>&1
    [ $? -eq 0 ] && echo_success || echo_failure
    echo
    [ $RETVAL -eq 0 ] && rm -f $LOCK_FILE
    return $RETVAL
}

restart() {
    stop
    start
}

status() {
    if [ -f $LOCK_FILE ]; then
        echo "$DAEMON is running."
    else
        echo "$DAEMON is stopped."
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        restart
        ;;
    *)
        echo "Usage: {start|stop|status|restart}"
        exit 1
        ;;
esac

exit $?
EOF
    
    chmod 755 "$SERVICE_FILE"
    
    # Enable service for different init systems
    if command -v chkconfig >/dev/null 2>&1; then
        chkconfig --add "$SERVICE_NAME"
        chkconfig "$SERVICE_NAME" on
    elif command -v update-rc.d >/dev/null 2>&1; then
        update-rc.d "$SERVICE_NAME" defaults
    fi
    
    log_success "✅ Init.d service created and enabled"
}

# Install service
install_service() {
    if command -v systemctl >/dev/null 2>&1; then
        create_systemd_service
    else
        create_initd_service
    fi
}

# Start service
start_service() {
    log_info "🚀 Starting SAMS Monitoring Agent service..."
    
    if command -v systemctl >/dev/null 2>&1; then
        systemctl start "$SERVICE_NAME"
        sleep 3
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log_success "✅ Service started successfully"
        else
            log_warning "⚠️ Service may not have started properly"
            systemctl status "$SERVICE_NAME" --no-pager
        fi
    else
        service "$SERVICE_NAME" start
        sleep 3
        service "$SERVICE_NAME" status
    fi
}

# Uninstall agent
uninstall_agent() {
    log_info "🗑️ Uninstalling SAMS Monitoring Agent..."
    
    # Stop service
    if command -v systemctl >/dev/null 2>&1; then
        systemctl stop "$SERVICE_NAME" 2>/dev/null || true
        systemctl disable "$SERVICE_NAME" 2>/dev/null || true
        rm -f "/etc/systemd/system/$SERVICE_NAME.service"
        systemctl daemon-reload
    else
        service "$SERVICE_NAME" stop 2>/dev/null || true
        if command -v chkconfig >/dev/null 2>&1; then
            chkconfig --del "$SERVICE_NAME" 2>/dev/null || true
        elif command -v update-rc.d >/dev/null 2>&1; then
            update-rc.d -f "$SERVICE_NAME" remove 2>/dev/null || true
        fi
        rm -f "/etc/init.d/$SERVICE_NAME"
    fi
    
    # Remove user
    userdel "$USER_NAME" 2>/dev/null || true
    
    # Remove installation directory
    rm -rf "$INSTALL_PATH"
    
    log_success "✅ SAMS Monitoring Agent uninstalled successfully"
}

# Test installation
test_installation() {
    log_info "🧪 Testing installation..."
    
    # Check service status
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            log_success "✅ Service is running"
        else
            log_error "❌ Service is not running"
            return 1
        fi
    else
        if service "$SERVICE_NAME" status >/dev/null 2>&1; then
            log_success "✅ Service is running"
        else
            log_error "❌ Service is not running"
            return 1
        fi
    fi
    
    # Check agent files
    if [[ -f "$INSTALL_PATH/sams-monitoring-agent.jar" ]] && [[ -f "$INSTALL_PATH/sams-agent.properties" ]]; then
        log_success "✅ Agent files present"
    else
        log_error "❌ Agent files missing"
        return 1
    fi
    
    # Test server connectivity
    if command -v curl >/dev/null 2>&1; then
        if curl -s --connect-timeout 10 "$SERVER_URL/api/v1/health" >/dev/null; then
            log_success "✅ Server connectivity OK"
        else
            log_warning "⚠️ Cannot reach server: $SERVER_URL"
        fi
    fi
    
    return 0
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -s, --server-url URL    SAMS server URL (default: http://localhost:8080)"
    echo "  -p, --install-path PATH Installation path (default: /opt/sams/agent)"
    echo "  -u, --user USER         System user name (default: sams)"
    echo "  -f, --force             Force reinstall"
    echo "  --uninstall             Uninstall agent"
    echo "  -h, --help              Show this help"
    echo ""
    echo "Environment variables:"
    echo "  SAMS_SERVER_URL         Server URL"
    echo "  SAMS_INSTALL_PATH       Installation path"
    echo ""
    echo "Examples:"
    echo "  $0                                          # Install with defaults"
    echo "  $0 -s https://sams.company.com              # Install with custom server"
    echo "  $0 --force                                  # Force reinstall"
    echo "  $0 --uninstall                              # Uninstall"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--server-url)
                SERVER_URL="$2"
                shift 2
                ;;
            -p|--install-path)
                INSTALL_PATH="$2"
                shift 2
                ;;
            -u|--user)
                USER_NAME="$2"
                shift 2
                ;;
            -f|--force)
                FORCE_INSTALL=true
                shift
                ;;
            --uninstall)
                UNINSTALL=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Main installation function
main() {
    echo -e "${CYAN}🚀 SAMS Monitoring Agent Installer${NC}"
    echo -e "${CYAN}===================================${NC}"
    
    parse_args "$@"
    check_root
    detect_distro
    
    if [[ "$UNINSTALL" == true ]]; then
        uninstall_agent
        return 0
    fi
    
    log_info "📋 Installation Parameters:"
    log_info "   Server URL: $SERVER_URL"
    log_info "   Install Path: $INSTALL_PATH"
    log_info "   User: $USER_NAME"
    log_info "   Service: $SERVICE_NAME"
    echo ""
    
    # Check if already installed
    if [[ -d "$INSTALL_PATH" ]] && [[ "$FORCE_INSTALL" != true ]]; then
        log_warning "⚠️ SAMS Monitoring Agent appears to be already installed"
        log_info "💡 Use --force to reinstall or --uninstall to remove"
        exit 1
    fi
    
    if [[ "$FORCE_INSTALL" == true ]] && [[ -d "$INSTALL_PATH" ]]; then
        log_info "🔄 Force reinstall - removing existing installation..."
        uninstall_agent
        sleep 2
    fi
    
    # Installation steps
    install_java
    create_user
    download_agent
    create_configuration
    install_service
    start_service
    
    # Test installation
    if test_installation; then
        echo ""
        log_success "🎉 SAMS Monitoring Agent installed successfully!"
        echo ""
        log_info "📊 Service Status:"
        if command -v systemctl >/dev/null 2>&1; then
            systemctl status "$SERVICE_NAME" --no-pager -l
        else
            service "$SERVICE_NAME" status
        fi
        echo ""
        log_info "📁 Installation Directory: $INSTALL_PATH"
        log_info "🔧 Configuration File: $INSTALL_PATH/sams-agent.properties"
        log_info "📝 Logs: journalctl -u $SERVICE_NAME -f"
        echo ""
        log_info "🔧 Management Commands:"
        if command -v systemctl >/dev/null 2>&1; then
            log_info "   Start:   systemctl start $SERVICE_NAME"
            log_info "   Stop:    systemctl stop $SERVICE_NAME"
            log_info "   Status:  systemctl status $SERVICE_NAME"
            log_info "   Logs:    journalctl -u $SERVICE_NAME -f"
        else
            log_info "   Start:   service $SERVICE_NAME start"
            log_info "   Stop:    service $SERVICE_NAME stop"
            log_info "   Status:  service $SERVICE_NAME status"
        fi
        log_info "   Uninstall: $0 --uninstall"
    else
        log_error "❌ Installation completed but tests failed"
        log_info "💡 Check the service status and logs"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
