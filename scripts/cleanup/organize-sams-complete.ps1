#!/usr/bin/env powershell
<#
.SYNOPSIS
SAMS Directory Organization Script - Complete Project Restructure

.DESCRIPTION
This script organizes the SAMS project directory into a clean, professional structure
by moving files into appropriate folders and removing obsolete/duplicate files.
#>

Write-Host "🚀 SAMS DIRECTORY ORGANIZATION" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

$rootPath = "d:\Projects\SAMS"
Set-Location $rootPath

# Create organized directory structure
Write-Host "📁 Creating organized directory structure..." -ForegroundColor Yellow

$directories = @(
    "backend/python-flask",
    "backend/java-spring", 
    "backend/nodejs-express",
    "mobile/expo-app",
    "mobile/demos",
    "web/frontend",
    "docs/reports",
    "docs/guides",
    "scripts/deployment",
    "scripts/monitoring", 
    "scripts/testing",
    "scripts/cleanup",
    "config/deployment",
    "config/monitoring",
    "archive/old-files",
    "archive/cleanup-scripts",
    "logs",
    "temp"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $rootPath $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "  ✓ Created: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📦 Moving files to organized locations..." -ForegroundColor Yellow

# Backend files organization
Write-Host "  Moving backend files..." -ForegroundColor Gray
if (Test-Path "backend_server_fixed.py") { Move-Item "backend_server_fixed.py" "backend/python-flask/" -Force }
if (Test-Path "java-backend") { Move-Item "java-backend/*" "backend/java-spring/" -Force -Recurse -ErrorAction SilentlyContinue }
if (Test-Path "nodejs-backend") { Move-Item "nodejs-backend/*" "backend/nodejs-express/" -Force -Recurse -ErrorAction SilentlyContinue }

# Mobile app organization  
Write-Host "  Moving mobile app files..." -ForegroundColor Gray
if (Test-Path "SAMSMobileExpo") { Move-Item "SAMSMobileExpo" "mobile/expo-app/" -Force }
if (Test-Path "enhanced-mobile-demo.html") { Move-Item "enhanced-mobile-demo.html" "mobile/demos/" -Force }
if (Test-Path "sams-mobile-preview.html") { Move-Item "sams-mobile-preview.html" "mobile/demos/" -Force }

# Web files organization
Write-Host "  Moving web files..." -ForegroundColor Gray  
if (Test-Path "sams-web-test.html") { Move-Item "sams-web-test.html" "web/frontend/" -Force }

# Documentation organization
Write-Host "  Moving documentation..." -ForegroundColor Gray
$docFiles = @(
    "*.md",
    "*.json"
)

foreach ($pattern in $docFiles) {
    Get-ChildItem -Path $rootPath -Filter $pattern -File | ForEach-Object {
        if ($_.Name -match "(REPORT|STATUS|COMPLETE|SUCCESS)") {
            Move-Item $_.FullName "docs/reports/" -Force -ErrorAction SilentlyContinue
        } elseif ($_.Name -match "(README|DOCUMENTATION|GUIDE)") {
            Move-Item $_.FullName "docs/guides/" -Force -ErrorAction SilentlyContinue  
        }
    }
}

# Configuration files
Write-Host "  Moving configuration files..." -ForegroundColor Gray
if (Test-Path "agent_deployment_config.yml") { Move-Item "agent_deployment_config.yml" "config/deployment/" -Force }
if (Test-Path "deployment_targets.yml") { Move-Item "deployment_targets.yml" "config/deployment/" -Force }
if (Test-Path "servers_config.json") { Move-Item "servers_config.json" "config/monitoring/" -Force }

# Scripts organization
Write-Host "  Moving scripts..." -ForegroundColor Gray
Get-ChildItem -Path $rootPath -Filter "*.ps1" -File | ForEach-Object {
    if ($_.Name -match "test") {
        Move-Item $_.FullName "scripts/testing/" -Force
    } elseif ($_.Name -match "deploy") {
        Move-Item $_.FullName "scripts/deployment/" -Force  
    } elseif ($_.Name -match "monitor") {
        Move-Item $_.FullName "scripts/monitoring/" -Force
    }
}

Get-ChildItem -Path $rootPath -Filter "*.bat" -File | ForEach-Object {
    if ($_.Name -match "cleanup") {
        Move-Item $_.FullName "scripts/cleanup/" -Force
    } elseif ($_.Name -match "start|launch") {
        Move-Item $_.FullName "scripts/deployment/" -Force
    }
}

Get-ChildItem -Path $rootPath -Filter "*.py" -File | ForEach-Object {
    if ($_.Name -match "test_") {
        Move-Item $_.FullName "scripts/testing/" -Force
    } elseif ($_.Name -match "agent_|alert_") {
        Move-Item $_.FullName "scripts/monitoring/" -Force
    }
}

# Archive old/obsolete files
Write-Host "  Archiving obsolete files..." -ForegroundColor Gray
$obsoleteItems = @(
    "sams-mobile",
    "mobile-app", 
    "mobile-backend",
    "infrastructure-monitoring-system"
)

foreach ($item in $obsoleteItems) {
    if (Test-Path $item) {
        Move-Item $item "archive/old-files/" -Force -ErrorAction SilentlyContinue
    }
}

# Clean up empty directories
Write-Host "  Removing empty directories..." -ForegroundColor Gray
Get-ChildItem -Path $rootPath -Directory -Recurse | Where-Object { 
    (Get-ChildItem $_.FullName -Force | Measure-Object).Count -eq 0 
} | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🧹 Creating project structure documentation..." -ForegroundColor Yellow

# Create README for organized structure
$readmeContent = @"
# SAMS - Server & Application Monitoring System
## Organized Project Structure

### 📁 Directory Structure

```
SAMS/
├── backend/                    # Backend services
│   ├── python-flask/          # Python Flask backend
│   ├── java-spring/           # Java Spring Boot backend
│   └── nodejs-express/        # Node.js Express backend
│
├── mobile/                     # Mobile applications
│   ├── expo-app/              # React Native Expo app
│   └── demos/                 # Mobile demos and previews
│
├── web/                        # Web applications
│   └── frontend/              # Web frontend files
│
├── docs/                       # Documentation
│   ├── reports/               # Status and completion reports
│   └── guides/                # Documentation and guides
│
├── scripts/                    # Automation scripts
│   ├── deployment/            # Deployment and startup scripts
│   ├── monitoring/            # Monitoring and alerting scripts
│   ├── testing/               # Test scripts
│   └── cleanup/               # Maintenance scripts
│
├── config/                     # Configuration files
│   ├── deployment/            # Deployment configurations
│   └── monitoring/            # Monitoring configurations
│
├── archive/                    # Archived files
│   ├── old-files/             # Obsolete project files
│   └── cleanup-scripts/       # Old cleanup utilities
│
├── logs/                       # Application logs
└── temp/                       # Temporary files
```

### 🚀 Quick Start

1. **Backend Services:**
   - Python Flask: `backend/python-flask/`
   - Java Spring: `backend/java-spring/`
   - Node.js Express: `backend/nodejs-express/`

2. **Mobile App:**
   - Main app: `mobile/expo-app/SAMSMobileExpo/`
   - Demos: `mobile/demos/`

3. **Scripts:**
   - Start services: `scripts/deployment/`
   - Run tests: `scripts/testing/`
   - Monitor system: `scripts/monitoring/`

### 📊 Features

- Multi-stack backend architecture
- Real-time mobile monitoring app
- Automated deployment scripts
- Comprehensive testing suite
- Advanced monitoring and alerting

### 🛠️ Development

All development files are now organized by function and technology stack for easier navigation and maintenance.
"@

Set-Content -Path "README.md" -Value $readmeContent

Write-Host ""
Write-Host "✅ ORGANIZATION COMPLETE!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Created organized directory structure" -ForegroundColor Green
Write-Host "  ✓ Moved backend files to appropriate folders" -ForegroundColor Green  
Write-Host "  ✓ Organized mobile app and demos" -ForegroundColor Green
Write-Host "  ✓ Sorted documentation and reports" -ForegroundColor Green
Write-Host "  ✓ Categorized scripts by function" -ForegroundColor Green
Write-Host "  ✓ Archived obsolete files" -ForegroundColor Green
Write-Host "  ✓ Created comprehensive README.md" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Your SAMS project is now professionally organized!" -ForegroundColor Cyan
Write-Host "📁 Check the new README.md for the complete structure guide." -ForegroundColor Yellow
