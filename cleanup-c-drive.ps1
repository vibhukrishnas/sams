# C: Drive Cleanup Script - Critical Space Recovery
# This script safely cleans up common space-consuming files and folders

Write-Host "🧹 Starting C: Drive Cleanup - Critical Space Recovery" -ForegroundColor Green
Write-Host "Current C: Drive Status:" -ForegroundColor Yellow

# Check current space
$disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq "C:"}
$freeSpaceGB = [math]::Round($disk.FreeSpace/1GB, 2)
$totalSpaceGB = [math]::Round($disk.Size/1GB, 2)
$usedSpaceGB = [math]::Round(($disk.Size - $disk.FreeSpace)/1GB, 2)

Write-Host "Free Space: $freeSpaceGB GB" -ForegroundColor Red
Write-Host "Used Space: $usedSpaceGB GB" -ForegroundColor Yellow
Write-Host "Total Space: $totalSpaceGB GB" -ForegroundColor Cyan

Write-Host "`n🗑️ Starting cleanup operations..." -ForegroundColor Green

# 1. Clean Windows Temp Files
Write-Host "1. Cleaning Windows Temp files..." -ForegroundColor Yellow
try {
    $tempFiles = Get-ChildItem -Path $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue
    $tempSize = ($tempFiles | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum / 1MB
    Write-Host "   Found $([math]::Round($tempSize, 2)) MB in temp files" -ForegroundColor Cyan
    
    Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Windows Temp files cleaned" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Some temp files couldn't be deleted (in use)" -ForegroundColor Yellow
}

# 2. Clean System Temp Files
Write-Host "2. Cleaning System Temp files..." -ForegroundColor Yellow
try {
    Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ System Temp files cleaned" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Some system temp files couldn't be deleted" -ForegroundColor Yellow
}

# 3. Clean Recycle Bin
Write-Host "3. Emptying Recycle Bin..." -ForegroundColor Yellow
try {
    Clear-RecycleBin -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Recycle Bin emptied" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Recycle Bin cleanup failed" -ForegroundColor Yellow
}

# 4. Clean Windows Update Cache
Write-Host "4. Cleaning Windows Update cache..." -ForegroundColor Yellow
try {
    Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "C:\Windows\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Service -Name wuauserv -ErrorAction SilentlyContinue
    Write-Host "   ✅ Windows Update cache cleaned" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Windows Update cache cleanup failed" -ForegroundColor Yellow
}

# 5. Clean Browser Caches
Write-Host "5. Cleaning browser caches..." -ForegroundColor Yellow
try {
    # Chrome cache
    $chromePath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
    if (Test-Path $chromePath) {
        Remove-Item -Path "$chromePath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Chrome cache cleaned" -ForegroundColor Green
    }
    
    # Edge cache
    $edgePath = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
    if (Test-Path $edgePath) {
        Remove-Item -Path "$edgePath\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   ✅ Edge cache cleaned" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️ Some browser caches couldn't be cleaned" -ForegroundColor Yellow
}

# 6. Clean Windows Logs
Write-Host "6. Cleaning Windows logs..." -ForegroundColor Yellow
try {
    Get-WinEvent -ListLog * -ErrorAction SilentlyContinue | Where-Object {$_.RecordCount -gt 0} | ForEach-Object {
        wevtutil cl $_.LogName 2>$null
    }
    Write-Host "   ✅ Windows logs cleaned" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Some logs couldn't be cleaned" -ForegroundColor Yellow
}

# 7. Clean Prefetch files
Write-Host "7. Cleaning Prefetch files..." -ForegroundColor Yellow
try {
    Remove-Item -Path "C:\Windows\Prefetch\*" -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Prefetch files cleaned" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Prefetch cleanup failed" -ForegroundColor Yellow
}

# 8. Clean Windows Error Reporting
Write-Host "8. Cleaning Windows Error Reporting..." -ForegroundColor Yellow
try {
    Remove-Item -Path "C:\ProgramData\Microsoft\Windows\WER\*" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Windows Error Reporting cleaned" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ WER cleanup failed" -ForegroundColor Yellow
}

# 9. Run Disk Cleanup
Write-Host "9. Running Windows Disk Cleanup..." -ForegroundColor Yellow
try {
    Start-Process -FilePath "cleanmgr.exe" -ArgumentList "/sagerun:1" -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue
    Write-Host "   ✅ Disk Cleanup completed" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Disk Cleanup failed" -ForegroundColor Yellow
}

# Check final space
Write-Host "`n📊 Final C: Drive Status:" -ForegroundColor Green
$diskAfter = Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq "C:"}
$freeSpaceAfter = [math]::Round($diskAfter.FreeSpace/1GB, 2)
$spaceRecovered = [math]::Round($freeSpaceAfter - $freeSpaceGB, 2)

Write-Host "Free Space: $freeSpaceAfter GB" -ForegroundColor Green
Write-Host "Space Recovered: $spaceRecovered GB" -ForegroundColor Cyan

if ($spaceRecovered -gt 0) {
    Write-Host "🎉 Successfully recovered $spaceRecovered GB of space!" -ForegroundColor Green
} else {
    Write-Host "⚠️ No significant space recovered. Consider manual cleanup of large files." -ForegroundColor Yellow
}

Write-Host "`n✅ C: Drive cleanup completed!" -ForegroundColor Green
