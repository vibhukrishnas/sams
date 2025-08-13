#!/usr/bin/env powershell
# SAMS Mobile App Demo Launcher - For Monday Client Meeting
# This script starts the mobile app connected to the Java backend

Write-Host "🔥 SAMS MOBILE APP DEMO LAUNCHER 🔥" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Cyan

# Step 1: Check if Java backend is running
Write-Host "⚡ Step 1: Checking Java Backend Status..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5002/api/health" -TimeoutSec 5
    Write-Host "✅ Java Backend OPERATIONAL on port 5002" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Java Backend NOT RUNNING!" -ForegroundColor Red
    Write-Host "   Starting Java Backend first..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\Projects\SAMS\backend\java-spring'; .\mvnw.cmd spring-boot:run"
    Write-Host "   Waiting 10 seconds for backend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Step 2: Get system monitoring data
Write-Host "⚡ Step 2: Fetching System Monitoring Data..." -ForegroundColor Yellow
try {
    $system = Invoke-RestMethod -Uri "http://localhost:5002/api/system"
    Write-Host "✅ System Monitoring Active" -ForegroundColor Green
    Write-Host "   Hostname: $($system.hostname)" -ForegroundColor Cyan
    Write-Host "   OS: $($system.os)" -ForegroundColor Cyan
    Write-Host "   Memory Usage: $([math]::Round($system.memory.usage_percent, 1))%" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Backend API not fully ready yet..." -ForegroundColor Yellow
}

# Step 3: Launch Mobile App
Write-Host "⚡ Step 3: Launching Mobile App..." -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Cyan

# Change to mobile app directory
Set-Location "d:\Projects\SAMS\SAMSMobileExpo"

Write-Host "📱 Starting Expo Development Server..." -ForegroundColor Green
Write-Host "   Mobile app will connect to: http://localhost:5002/api" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "🎯 CLIENT DEMO INSTRUCTIONS:" -ForegroundColor Magenta
Write-Host "   1. Scan QR code with Expo Go app" -ForegroundColor Yellow
Write-Host "   2. Mobile app shows real-time system monitoring" -ForegroundColor Yellow
Write-Host "   3. Data comes from Java backend (port 5002)" -ForegroundColor Yellow
Write-Host "   4. Cross-platform: Works on iOS & Android" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "💼 DEMO STATUS: READY FOR CLIENT MEETING 💼" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan

# Start the mobile app
npx expo start --clear
