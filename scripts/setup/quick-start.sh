#!/bin/bash

# SAMS Quick Start Script
# This script helps you get started with SAMS immediately

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
cat << "EOF"
   ____    _    __  __ ____  
  / ___|  / \  |  \/  / ___| 
  \___ \ / _ \ | |\/| \___ \ 
   ___) / ___ \| |  | |___) |
  |____/_/   \_\_|  |_|____/ 
                             
  Server and Application Monitoring System
  🚀 Quick Start Guide
EOF
echo -e "${NC}"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to show menu
show_menu() {
    echo -e "${PURPLE}🎯 What would you like to do?${NC}"
    echo ""
    echo "1. 🐳 Quick Demo (Docker)"
    echo "2. 🔧 Development Setup"
    echo "3. 🌐 GitHub Repository Setup"
    echo "4. 📱 Mobile App Only"
    echo "5. 🖥️  Backend Only"
    echo "6. 🤖 Deploy Monitoring Agents"
    echo "7. 📊 View Project Status"
    echo "8. 📚 Documentation"
    echo "9. ❌ Exit"
    echo ""
    read -p "Enter your choice (1-9): " choice
}

# Quick demo with Docker
quick_demo() {
    print_info "🐳 Starting SAMS Quick Demo..."
    
    if ! command -v docker >/dev/null 2>&1; then
        print_error "Docker is not installed. Please install Docker first."
        return 1
    fi
    
    print_info "Starting SAMS with Docker Compose..."
    docker-compose up -d
    
    print_status "🎉 SAMS is starting up!"
    echo ""
    print_info "Access URLs (will be ready in ~2 minutes):"
    echo "📱 Mobile App: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8080"
    echo "📊 Grafana: http://localhost:3001 (admin/admin)"
    echo "🔍 Prometheus: http://localhost:9090"
    echo ""
    print_info "Waiting for services to be ready..."
    sleep 30
    
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        print_status "✅ Backend is ready!"
    else
        print_warning "⏳ Backend is still starting up..."
    fi
    
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_status "✅ Frontend is ready!"
    else
        print_warning "⏳ Frontend is still starting up..."
    fi
    
    echo ""
    print_info "🎯 Demo Instructions:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Use PIN: 1234 to login"
    echo "3. Explore the dashboard and alerts"
    echo "4. Check real-time monitoring"
    echo ""
    print_info "To stop the demo: docker-compose down"
}

# Development setup
development_setup() {
    print_info "🔧 Setting up SAMS for development..."
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        return 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm is not installed. Please install npm"
        return 1
    fi
    
    print_status "Prerequisites OK"
    
    # Setup backend
    print_info "Setting up backend..."
    cd sams-backend
    npm install
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_warning "Created .env file - please update with your configuration"
    fi
    
    print_info "Building backend..."
    npm run build
    
    cd ..
    
    # Setup mobile app
    print_info "Setting up mobile app..."
    cd sams-mobile/TestApp
    npm install
    
    cd ../..
    
    print_status "🎉 Development setup complete!"
    echo ""
    print_info "To start development:"
    echo "1. Backend: cd sams-backend && npm run dev"
    echo "2. Mobile: cd sams-mobile/TestApp && npm start"
    echo "3. Database: docker-compose up -d postgres redis"
}

# GitHub repository setup
github_setup() {
    print_info "🌐 Setting up GitHub repository..."
    
    echo ""
    print_warning "Before proceeding, please:"
    echo "1. Create a GitHub account if you don't have one"
    echo "2. Install GitHub CLI (optional but recommended)"
    echo "3. Have your GitHub username ready"
    echo ""
    
    read -p "Enter your GitHub username: " github_username
    
    if [ -z "$github_username" ]; then
        print_error "GitHub username is required"
        return 1
    fi
    
    # Update the setup script
    sed -i.bak "s/your-username/$github_username/g" setup-github-repo.sh
    
    print_info "Updated setup script with your username: $github_username"
    print_info "Running GitHub setup..."
    
    bash setup-github-repo.sh
    
    print_status "🎉 GitHub repository setup initiated!"
    echo ""
    print_info "Next steps:"
    echo "1. Go to https://github.com/$github_username/sams-monitoring-system"
    echo "2. Verify the repository was created"
    echo "3. Set up branch protection rules"
    echo "4. Add collaborators if needed"
}

# Mobile app only
mobile_only() {
    print_info "📱 Setting up mobile app only..."
    
    cd sams-mobile/TestApp
    
    print_info "Installing dependencies..."
    npm install
    
    print_info "Starting mobile app..."
    npm start &
    
    print_status "🎉 Mobile app is starting!"
    echo ""
    print_info "The mobile app will open in your browser shortly"
    print_info "Default PIN: 1234"
    print_warning "Note: Backend APIs will not work without the backend running"
    
    cd ../..
}

# Backend only
backend_only() {
    print_info "🖥️  Setting up backend only..."
    
    cd sams-backend
    
    print_info "Installing dependencies..."
    npm install
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_warning "Created .env file - please update with your configuration"
    fi
    
    print_info "Building backend..."
    npm run build
    
    print_info "Starting backend..."
    npm run dev &
    
    print_status "🎉 Backend is starting!"
    echo ""
    print_info "Backend will be available at: http://localhost:8080"
    print_info "API documentation: http://localhost:8080/api/docs"
    print_info "Health check: http://localhost:8080/health"
    
    cd ..
}

# Deploy monitoring agents
deploy_agents() {
    print_info "🤖 Deploying monitoring agents..."
    
    echo ""
    print_info "Available agents:"
    echo "1. Linux Agent (Python)"
    echo "2. Windows Agent (PowerShell)"
    echo ""
    
    read -p "Which agent would you like to deploy? (1-2): " agent_choice
    
    case $agent_choice in
        1)
            print_info "Linux Agent deployment instructions:"
            echo ""
            echo "1. Copy agent to your Linux server:"
            echo "   scp sams-agents/linux/sams-agent.py user@server:/opt/sams/"
            echo ""
            echo "2. Install dependencies:"
            echo "   pip3 install psutil requests"
            echo ""
            echo "3. Configure agent:"
            echo "   cp sams-agents/linux/agent.conf.example /etc/sams/agent.conf"
            echo "   # Edit /etc/sams/agent.conf with your settings"
            echo ""
            echo "4. Run agent:"
            echo "   python3 /opt/sams/sams-agent.py"
            ;;
        2)
            print_info "Windows Agent deployment instructions:"
            echo ""
            echo "1. Copy agent to your Windows server:"
            echo "   Copy-Item sams-agents/windows/sams-agent.ps1 'C:\\Program Files\\SAMS\\'"
            echo ""
            echo "2. Configure agent:"
            echo "   Copy-Item sams-agents/windows/agent.json.example 'C:\\Program Files\\SAMS\\agent.json'"
            echo "   # Edit agent.json with your settings"
            echo ""
            echo "3. Run agent:"
            echo "   PowerShell -ExecutionPolicy Bypass -File 'C:\\Program Files\\SAMS\\sams-agent.ps1'"
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

# View project status
project_status() {
    print_info "📊 SAMS Project Status"
    echo ""
    
    # Check if components exist
    if [ -d "sams-backend" ]; then
        print_status "✅ Backend: Ready"
    else
        print_error "❌ Backend: Missing"
    fi
    
    if [ -d "sams-mobile/TestApp" ]; then
        print_status "✅ Mobile App: Ready"
    else
        print_error "❌ Mobile App: Missing"
    fi
    
    if [ -d "sams-agents" ]; then
        print_status "✅ Monitoring Agents: Ready"
    else
        print_error "❌ Monitoring Agents: Missing"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        print_status "✅ Docker Deployment: Ready"
    else
        print_error "❌ Docker Deployment: Missing"
    fi
    
    if [ -f ".github/workflows/ci-cd.yml" ]; then
        print_status "✅ CI/CD Pipeline: Ready"
    else
        print_error "❌ CI/CD Pipeline: Missing"
    fi
    
    echo ""
    print_info "📁 Project Structure:"
    echo "├── 🔧 sams-backend/ (Node.js/TypeScript API)"
    echo "├── 📱 sams-mobile/TestApp/ (React Native App)"
    echo "├── 🤖 sams-agents/ (Monitoring Agents)"
    echo "├── 🐳 docker-compose.yml (Full Stack Deployment)"
    echo "├── 🔄 .github/workflows/ (CI/CD Pipelines)"
    echo "└── 📚 Documentation & Guides"
    
    echo ""
    print_info "🎯 Features Implemented:"
    echo "✅ Real-time server monitoring"
    echo "✅ Mobile app with push notifications"
    echo "✅ Alert management and escalation"
    echo "✅ PDF report generation"
    echo "✅ Multi-channel notifications"
    echo "✅ WebSocket real-time communication"
    echo "✅ JWT authentication with PIN"
    echo "✅ Docker deployment stack"
    echo "✅ Comprehensive testing framework"
    echo "✅ Production-ready configuration"
}

# Show documentation
show_documentation() {
    print_info "📚 SAMS Documentation"
    echo ""
    
    echo "📖 Available Documentation:"
    echo "├── README.md - Main project documentation"
    echo "├── GITHUB_SETUP_COMPLETE.md - GitHub repository setup"
    echo "├── BRANCHING_STRATEGY.md - Git workflow and branching"
    echo "├── CONTRIBUTING.md - Contribution guidelines"
    echo "├── sams-backend/README.md - Backend documentation"
    echo "└── sams-mobile/TestApp/README.md - Mobile app documentation"
    
    echo ""
    print_info "🔗 Quick Links:"
    echo "• Architecture Overview: See README.md"
    echo "• API Documentation: http://localhost:8080/api/docs (when running)"
    echo "• Mobile App Guide: sams-mobile/TestApp/README.md"
    echo "• Deployment Guide: See docker-compose.yml and deploy.sh"
    echo "• Testing Guide: See CONTRIBUTING.md"
    
    echo ""
    print_info "🆘 Getting Help:"
    echo "• GitHub Issues: For bug reports and feature requests"
    echo "• GitHub Discussions: For questions and general discussion"
    echo "• Documentation: Check the docs/ folder"
}

# Main menu loop
main() {
    while true; do
        echo ""
        show_menu
        
        case $choice in
            1)
                quick_demo
                ;;
            2)
                development_setup
                ;;
            3)
                github_setup
                ;;
            4)
                mobile_only
                ;;
            5)
                backend_only
                ;;
            6)
                deploy_agents
                ;;
            7)
                project_status
                ;;
            8)
                show_documentation
                ;;
            9)
                print_info "👋 Thanks for using SAMS!"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please select 1-9."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main
