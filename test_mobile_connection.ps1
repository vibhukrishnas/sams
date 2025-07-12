#!/usr/bin/env powershell
# 🔧 Mobile Connection Test Script
# Tests if the mobile app can connect to the SAMS server

Write-Host "🚀 Testing Mobile App Connection to SAMS Server" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$endpoints = @(
    "http://10.0.2.2:8080",
    "http://192.168.1.7:8080",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
)

$workingEndpoints = @()

foreach ($endpoint in $endpoints) {
    Write-Host "🔍 Testing: $endpoint" -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri "$endpoint/api/v1/health" -Method GET -TimeoutSec 5
        
        Write-Host "✅ SUCCESS: $endpoint" -ForegroundColor Green
        Write-Host "   Status: $($response.status)" -ForegroundColor Gray
        Write-Host "   Hostname: $($response.hostname)" -ForegroundColor Gray
        
        $workingEndpoints += $endpoint
        
    } catch {
        Write-Host "❌ FAILED: $endpoint - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "📊 SUMMARY:" -ForegroundColor Cyan
Write-Host "===========" -ForegroundColor Cyan

if ($workingEndpoints.Count -gt 0) {
    Write-Host "✅ Working endpoints: $($workingEndpoints.Count)" -ForegroundColor Green
    foreach ($endpoint in $workingEndpoints) {
        Write-Host "   - $endpoint" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "🎯 RECOMMENDATION:" -ForegroundColor Cyan
    Write-Host "Use this endpoint in your mobile app: $($workingEndpoints[0])" -ForegroundColor Green
    
    # Test server addition API
    Write-Host ""
    Write-Host "🔧 Testing Server Addition API" -ForegroundColor Yellow
    Write-Host "==============================" -ForegroundColor Yellow
    
    try {
        $serverData = @{
            name = "Test Server"
            ip = "192.168.1.7"
            type = "Windows"
            port = 8080
        } | ConvertTo-Json
        
        $addResponse = Invoke-RestMethod -Uri "$($workingEndpoints[0])/api/v1/servers/add" -Method POST -Body $serverData -ContentType "application/json" -TimeoutSec 15
        
        Write-Host "✅ Server addition API working" -ForegroundColor Green
        Write-Host "   Success: $($addResponse.success)" -ForegroundColor Gray
        Write-Host "   Message: $($addResponse.message)" -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ Server addition failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} else {
    Write-Host "❌ No working endpoints found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 TROUBLESHOOTING:" -ForegroundColor Yellow
    Write-Host "1. Ensure SAMS server is running" -ForegroundColor Gray
    Write-Host "2. Check Windows Firewall settings" -ForegroundColor Gray
    Write-Host "3. Verify network connectivity" -ForegroundColor Gray
    Write-Host "4. Try running server with: python windows_sams_server.py" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📱 For Android Emulator:" -ForegroundColor Cyan
Write-Host "- Use 10.0.2.2:8080 (special emulator IP)" -ForegroundColor Gray
Write-Host "- Or use adb port forwarding: adb reverse tcp:8080 tcp:8080" -ForegroundColor Gray

Write-Host ""
Write-Host "📱 For Physical Device:" -ForegroundColor Cyan
Write-Host "- Use your computer's IP address (192.168.1.7:8080)" -ForegroundColor Gray
Write-Host "- Ensure both devices are on same network" -ForegroundColor Gray

Write-Host ""
if ($workingEndpoints.Count -gt 0) {
    Write-Host "🎉 CONNECTION TEST PASSED!" -ForegroundColor Green
    Write-Host "Your mobile app should be able to connect to the server." -ForegroundColor Green
} else {
    Write-Host "❌ CONNECTION TEST FAILED!" -ForegroundColor Red
    Write-Host "Fix the server connection before testing the mobile app." -ForegroundColor Red
}
