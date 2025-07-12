# SAMS Mobile App PowerShell Launcher
# Launches SAMS mobile app in Android emulator

Write-Host "🚀 SAMS Mobile App Launcher" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a process is running
function Test-ProcessRunning {
    param([string]$ProcessName)
    return (Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) -ne $null
}

# Function to find Android SDK
function Find-AndroidSDK {
    $possiblePaths = @(
        "$env:ANDROID_HOME",
        "$env:LOCALAPPDATA\Android\Sdk",
        "D:\Android\Sdk",
        "C:\Android\Sdk"
    )
    
    foreach ($path in $possiblePaths) {
        if ($path -and (Test-Path "$path\emulator\emulator.exe")) {
            return $path
        }
    }
    return $null
}

# Check for Android SDK
Write-Host "🔍 Checking for Android SDK..." -ForegroundColor Yellow
$androidSdk = Find-AndroidSDK

if (-not $androidSdk) {
    Write-Host "❌ Android SDK not found!" -ForegroundColor Red
    Write-Host "Please install Android Studio or set ANDROID_HOME environment variable" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Found Android SDK at: $androidSdk" -ForegroundColor Green

$emulatorPath = "$androidSdk\emulator\emulator.exe"
$adbPath = "$androidSdk\platform-tools\adb.exe"

# Check available emulators
Write-Host "🔍 Checking available emulators..." -ForegroundColor Yellow
$avds = & $emulatorPath -list-avds 2>$null

if ($avds -contains "SAMS_Local") {
    $emulatorName = "SAMS_Local"
    Write-Host "✅ Found SAMS_Local emulator" -ForegroundColor Green
} elseif ($avds -contains "SAMS_Fast") {
    $emulatorName = "SAMS_Fast"
    Write-Host "✅ Found SAMS_Fast emulator" -ForegroundColor Green
} else {
    Write-Host "❌ No SAMS emulators found!" -ForegroundColor Red
    Write-Host "Available emulators:" -ForegroundColor Yellow
    $avds | ForEach-Object { Write-Host "  - $_" }
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if emulator is already running
Write-Host "🔍 Checking emulator status..." -ForegroundColor Yellow
$devices = & $adbPath devices 2>$null
$emulatorRunning = $devices -match "emulator.*device"

if (-not $emulatorRunning) {
    Write-Host "📱 Starting emulator: $emulatorName" -ForegroundColor Yellow
    Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $emulatorName, "-no-snapshot-load" -WindowStyle Hidden
    
    Write-Host "⏳ Waiting for emulator to boot..." -ForegroundColor Yellow
    do {
        Start-Sleep -Seconds 5
        $devices = & $adbPath devices 2>$null
        $emulatorRunning = $devices -match "emulator.*device"
        Write-Host "⏳ Still waiting..." -ForegroundColor Yellow
    } while (-not $emulatorRunning)
    
    Write-Host "✅ Emulator is ready!" -ForegroundColor Green
} else {
    Write-Host "✅ Emulator is already running" -ForegroundColor Green
}

# Navigate to SAMS mobile app
$appPath = Join-Path $PSScriptRoot "sams-mobile\TestApp"
if (-not (Test-Path $appPath)) {
    Write-Host "❌ SAMS mobile app not found at: $appPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $appPath
Write-Host "✅ Found SAMS mobile app" -ForegroundColor Green

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Start backend server
Write-Host "🖥️ Starting SAMS backend server..." -ForegroundColor Yellow
$backendPath = Join-Path $appPath "sams-backend-server"
if (Test-Path $backendPath) {
    Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d `"$backendPath`" && node server.js" -WindowStyle Normal
    Start-Sleep -Seconds 3
    Write-Host "✅ Backend server started" -ForegroundColor Green
} else {
    Write-Host "⚠️ Backend server not found, continuing without it" -ForegroundColor Yellow
}

# Start Metro bundler
Write-Host "📱 Starting Metro bundler..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd /d `"$appPath`" && npx react-native start --reset-cache --port 8081" -WindowStyle Normal
Start-Sleep -Seconds 5

# Build and run the app
Write-Host "🔨 Building and installing SAMS app..." -ForegroundColor Yellow
$buildResult = & npx react-native run-android --port 8081 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 SUCCESS! SAMS Mobile App launched!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 App Features:" -ForegroundColor Cyan
    Write-Host "  • 🔐 PIN Authentication (1234)" -ForegroundColor White
    Write-Host "  • 📊 Real-time Server Monitoring" -ForegroundColor White
    Write-Host "  • 🚨 Alert Management" -ForegroundColor White
    Write-Host "  • 📈 Performance Dashboards" -ForegroundColor White
    Write-Host "  • 🔧 Server Configuration" -ForegroundColor White
    Write-Host ""
    Write-Host "🖥️ Backend: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "📱 Metro: http://localhost:8081" -ForegroundColor Cyan
    Write-Host "📱 Emulator: $emulatorName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Yellow
    Write-Host "  • Press Ctrl+M in emulator for dev menu" -ForegroundColor White
    Write-Host "  • Shake device for reload menu" -ForegroundColor White
    Write-Host "  • Check Metro terminal for errors" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ SAMS is ready for testing!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Failed to launch SAMS app" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Try these troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Check if emulator is responsive" -ForegroundColor White
    Write-Host "  2. Restart Metro bundler" -ForegroundColor White
    Write-Host "  3. Run: npx react-native doctor" -ForegroundColor White
    Write-Host "  4. Check Metro logs for errors" -ForegroundColor White
    Write-Host ""
}

Read-Host "Press Enter to continue"
