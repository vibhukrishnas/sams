# SAMS Directory Organization Script
Write-Host "🚀 SAMS DIRECTORY ORGANIZATION" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

$rootPath = "d:\Projects\SAMS"
Set-Location $rootPath

# Create organized directory structure
Write-Host "📁 Creating organized directory structure..." -ForegroundColor Yellow

$directories = @(
    "backend\python-flask",
    "backend\java-spring", 
    "backend\nodejs-express",
    "mobile\expo-app",
    "mobile\demos",
    "web\frontend",
    "docs\reports",
    "docs\guides",
    "scripts\deployment",
    "scripts\monitoring", 
    "scripts\testing",
    "scripts\cleanup",
    "config\deployment",
    "config\monitoring",
    "archive\old-files",
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

# Move backend files
Write-Host "📦 Moving backend files..." -ForegroundColor Yellow
if (Test-Path "backend_server_fixed.py") { 
    Move-Item "backend_server_fixed.py" "backend\python-flask\" -Force -ErrorAction SilentlyContinue
}

# Move mobile files
Write-Host "📱 Moving mobile app files..." -ForegroundColor Yellow
if (Test-Path "SAMSMobileExpo") { 
    Move-Item "SAMSMobileExpo" "mobile\expo-app\" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "enhanced-mobile-demo.html") { 
    Move-Item "enhanced-mobile-demo.html" "mobile\demos\" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "sams-mobile-preview.html") { 
    Move-Item "sams-mobile-preview.html" "mobile\demos\" -Force -ErrorAction SilentlyContinue
}

# Move web files
Write-Host "🌐 Moving web files..." -ForegroundColor Yellow
if (Test-Path "sams-web-test.html") { 
    Move-Item "sams-web-test.html" "web\frontend\" -Force -ErrorAction SilentlyContinue
}

# Move documentation
Write-Host "📚 Moving documentation..." -ForegroundColor Yellow
Get-ChildItem -Filter "*.md" | Where-Object { $_.Name -match "REPORT|STATUS|COMPLETE" } | ForEach-Object {
    Move-Item $_.FullName "docs\reports\" -Force -ErrorAction SilentlyContinue
}

# Move scripts
Write-Host "⚙️ Moving scripts..." -ForegroundColor Yellow
Get-ChildItem -Filter "*.ps1" | Where-Object { $_.Name -match "test" } | ForEach-Object {
    Move-Item $_.FullName "scripts\testing\" -Force -ErrorAction SilentlyContinue
}

Get-ChildItem -Filter "*.bat" | Where-Object { $_.Name -match "cleanup" } | ForEach-Object {
    Move-Item $_.FullName "scripts\cleanup\" -Force -ErrorAction SilentlyContinue
}

Get-ChildItem -Filter "*.bat" | Where-Object { $_.Name -match "start|launch" } | ForEach-Object {
    Move-Item $_.FullName "scripts\deployment\" -Force -ErrorAction SilentlyContinue
}

# Move config files
Write-Host "🔧 Moving configuration files..." -ForegroundColor Yellow
if (Test-Path "agent_deployment_config.yml") { 
    Move-Item "agent_deployment_config.yml" "config\deployment\" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "deployment_targets.yml") { 
    Move-Item "deployment_targets.yml" "config\deployment\" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "servers_config.json") { 
    Move-Item "servers_config.json" "config\monitoring\" -Force -ErrorAction SilentlyContinue
}

# Archive old directories
Write-Host "🗃️ Archiving old files..." -ForegroundColor Yellow
$oldDirs = @("sams-mobile", "mobile-app", "mobile-backend", "infrastructure-monitoring-system")
foreach ($oldDir in $oldDirs) {
    if (Test-Path $oldDir) {
        Move-Item $oldDir "archive\old-files\" -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "✅ ORGANIZATION COMPLETE!" -ForegroundColor Green
Write-Host "Your SAMS project is now organized!" -ForegroundColor Cyan
