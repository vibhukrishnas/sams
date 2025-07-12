# SAMS Mobile App PowerShell Launcher
Write-Host "🚀 Starting SAMS Mobile App" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Check current directory
$currentDir = Get-Location
Write-Host "📂 Current directory: $currentDir" -ForegroundColor Yellow

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the TestApp directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Found package.json" -ForegroundColor Green

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js available: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm available: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Dependencies ready" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Starting SAMS Mobile App..." -ForegroundColor Cyan
Write-Host ""

# Start Metro bundler in new window
Write-Host "📱 Starting Metro bundler..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/k", "npm start" -WindowStyle Normal

# Wait for Metro to start
Write-Host "⏳ Waiting for Metro to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Check for Android devices
Write-Host "🔍 Checking for Android devices..." -ForegroundColor Yellow
try {
    $devices = adb devices 2>$null
    if ($devices -match "device") {
        Write-Host "✅ Android device/emulator found" -ForegroundColor Green
        Write-Host $devices
    } else {
        Write-Host "⚠️ No Android devices found" -ForegroundColor Yellow
        Write-Host "Please start an Android emulator or connect a device" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To start an emulator:" -ForegroundColor Cyan
        Write-Host "1. Open Android Studio" -ForegroundColor White
        Write-Host "2. Go to Tools → AVD Manager" -ForegroundColor White
        Write-Host "3. Start an existing AVD or create a new one" -ForegroundColor White
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            exit 1
        }
    }
} catch {
    Write-Host "⚠️ ADB not found - Android SDK may not be installed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔨 Building and running Android app..." -ForegroundColor Yellow
Write-Host "⏳ This may take a few minutes for the first build..." -ForegroundColor Yellow

# Run React Native Android
npx react-native run-android

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 SUCCESS! SAMS Mobile App should be running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 SAMS App Features:" -ForegroundColor Cyan
    Write-Host "  • 🔐 PIN Authentication (use: 1234)" -ForegroundColor White
    Write-Host "  • 📊 Real-time Server Monitoring" -ForegroundColor White
    Write-Host "  • 🚨 Alert Management System" -ForegroundColor White
    Write-Host "  • 📈 Performance Dashboards" -ForegroundColor White
    Write-Host "  • 🔧 Server Configuration" -ForegroundColor White
    Write-Host ""
    Write-Host "🖥️ Services Running:" -ForegroundColor Cyan
    Write-Host "  • Metro Bundler: http://localhost:8081" -ForegroundColor White
    Write-Host "  • Backend Server: http://localhost:8080" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ SAMS is ready for testing!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to run Android app" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Common Issues:" -ForegroundColor Yellow
    Write-Host "  1. No Android emulator running" -ForegroundColor White
    Write-Host "  2. Android SDK not installed" -ForegroundColor White
    Write-Host "  3. USB debugging not enabled" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Solutions:" -ForegroundColor Yellow
    Write-Host "  1. Start Android emulator first" -ForegroundColor White
    Write-Host "  2. Install Android Studio" -ForegroundColor White
    Write-Host "  3. Run: npx react-native doctor" -ForegroundColor White
    Write-Host ""
    Write-Host "📱 To check devices: adb devices" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to continue"
