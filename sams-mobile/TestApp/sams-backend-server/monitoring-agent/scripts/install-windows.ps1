# SAMS Monitoring Agent - Windows Installation Script
# Phase 2 Week 6: Cross-platform Agent Installation

param(
    [string]$ServerUrl = "http://localhost:8080",
    [string]$InstallPath = "C:\Program Files\SAMS\Agent",
    [string]$ServiceName = "SAMSMonitoringAgent",
    [switch]$Uninstall,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-JavaIfNeeded {
    Write-ColorOutput "🔍 Checking Java installation..." $Cyan
    
    try {
        $javaVersion = java -version 2>&1 | Select-String "version"
        if ($javaVersion -match '"(\d+)\.') {
            $majorVersion = [int]$matches[1]
            if ($majorVersion -ge 11) {
                Write-ColorOutput "✅ Java $majorVersion found" $Green
                return
            }
        }
    } catch {
        Write-ColorOutput "❌ Java not found" $Yellow
    }
    
    Write-ColorOutput "📦 Installing OpenJDK 11..." $Cyan
    
    # Download and install OpenJDK 11
    $jdkUrl = "https://download.java.net/java/GA/jdk11/9/GPL/openjdk-11.0.2_windows-x64_bin.zip"
    $jdkZip = "$env:TEMP\openjdk-11.zip"
    $jdkPath = "C:\Program Files\Java\jdk-11"
    
    try {
        Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip -UseBasicParsing
        Expand-Archive -Path $jdkZip -DestinationPath "C:\Program Files\Java" -Force
        
        # Set JAVA_HOME
        [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkPath, "Machine")
        $env:JAVA_HOME = $jdkPath
        
        # Update PATH
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($currentPath -notlike "*$jdkPath\bin*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$jdkPath\bin", "Machine")
            $env:PATH = "$env:PATH;$jdkPath\bin"
        }
        
        Write-ColorOutput "✅ Java 11 installed successfully" $Green
        
    } catch {
        Write-ColorOutput "❌ Failed to install Java: $($_.Exception.Message)" $Red
        throw
    }
}

function Download-Agent {
    Write-ColorOutput "📥 Downloading SAMS Monitoring Agent..." $Cyan
    
    $agentUrl = "$ServerUrl/api/v1/agents/download/windows"
    $agentJar = "$InstallPath\sams-monitoring-agent.jar"
    
    try {
        # Create install directory
        if (!(Test-Path $InstallPath)) {
            New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        }
        
        # Download agent JAR
        Invoke-WebRequest -Uri $agentUrl -OutFile $agentJar -UseBasicParsing
        
        if (Test-Path $agentJar) {
            Write-ColorOutput "✅ Agent downloaded successfully" $Green
        } else {
            throw "Agent JAR not found after download"
        }
        
    } catch {
        Write-ColorOutput "❌ Failed to download agent: $($_.Exception.Message)" $Red
        throw
    }
}

function Create-Configuration {
    Write-ColorOutput "⚙️ Creating agent configuration..." $Cyan
    
    $configPath = "$InstallPath\sams-agent.properties"
    $agentId = "agent-" + [System.Guid]::NewGuid().ToString().Substring(0, 8)
    
    $configContent = @"
# SAMS Monitoring Agent Configuration
server.url=$ServerUrl
agent.id=$agentId
collection.interval=30
metrics.system.enabled=true
metrics.application.enabled=true
metrics.network.enabled=true
auto.update.enabled=true
auto.update.check.interval=3600
log.level=INFO
"@
    
    try {
        $configContent | Out-File -FilePath $configPath -Encoding UTF8
        Write-ColorOutput "✅ Configuration created: $configPath" $Green
        
    } catch {
        Write-ColorOutput "❌ Failed to create configuration: $($_.Exception.Message)" $Red
        throw
    }
}

function Install-WindowsService {
    Write-ColorOutput "🔧 Installing Windows service..." $Cyan
    
    $servicePath = "$InstallPath\sams-agent-service.exe"
    $javaPath = (Get-Command java).Source
    $agentJar = "$InstallPath\sams-monitoring-agent.jar"
    
    # Create service wrapper script
    $wrapperScript = @"
@echo off
cd /d "$InstallPath"
"$javaPath" -jar "$agentJar"
"@
    
    $wrapperPath = "$InstallPath\start-agent.bat"
    $wrapperScript | Out-File -FilePath $wrapperPath -Encoding ASCII
    
    try {
        # Use NSSM (Non-Sucking Service Manager) or sc.exe
        $nssm = Get-Command nssm -ErrorAction SilentlyContinue
        
        if ($nssm) {
            # Use NSSM if available
            & nssm install $ServiceName $wrapperPath
            & nssm set $ServiceName Description "SAMS Infrastructure Monitoring Agent"
            & nssm set $ServiceName Start SERVICE_AUTO_START
            
        } else {
            # Use sc.exe as fallback
            $serviceCommand = "cmd /c `"$wrapperPath`""
            & sc.exe create $ServiceName binPath= $serviceCommand start= auto
            & sc.exe description $ServiceName "SAMS Infrastructure Monitoring Agent"
        }
        
        Write-ColorOutput "✅ Windows service installed: $ServiceName" $Green
        
    } catch {
        Write-ColorOutput "❌ Failed to install service: $($_.Exception.Message)" $Red
        throw
    }
}

function Start-AgentService {
    Write-ColorOutput "🚀 Starting SAMS Monitoring Agent service..." $Cyan
    
    try {
        Start-Service -Name $ServiceName
        
        # Wait for service to start
        $timeout = 30
        $elapsed = 0
        
        do {
            Start-Sleep -Seconds 1
            $elapsed++
            $service = Get-Service -Name $ServiceName
        } while ($service.Status -ne "Running" -and $elapsed -lt $timeout)
        
        if ($service.Status -eq "Running") {
            Write-ColorOutput "✅ Service started successfully" $Green
        } else {
            Write-ColorOutput "⚠️ Service may not have started properly" $Yellow
        }
        
    } catch {
        Write-ColorOutput "❌ Failed to start service: $($_.Exception.Message)" $Red
        throw
    }
}

function Uninstall-Agent {
    Write-ColorOutput "🗑️ Uninstalling SAMS Monitoring Agent..." $Cyan
    
    try {
        # Stop service
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service) {
            if ($service.Status -eq "Running") {
                Stop-Service -Name $ServiceName -Force
                Write-ColorOutput "✅ Service stopped" $Green
            }
            
            # Remove service
            & sc.exe delete $ServiceName
            Write-ColorOutput "✅ Service removed" $Green
        }
        
        # Remove installation directory
        if (Test-Path $InstallPath) {
            Remove-Item -Path $InstallPath -Recurse -Force
            Write-ColorOutput "✅ Installation directory removed" $Green
        }
        
        Write-ColorOutput "✅ SAMS Monitoring Agent uninstalled successfully" $Green
        
    } catch {
        Write-ColorOutput "❌ Failed to uninstall: $($_.Exception.Message)" $Red
        throw
    }
}

function Test-Installation {
    Write-ColorOutput "🧪 Testing installation..." $Cyan
    
    try {
        # Check service status
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service -and $service.Status -eq "Running") {
            Write-ColorOutput "✅ Service is running" $Green
        } else {
            Write-ColorOutput "❌ Service is not running" $Red
            return $false
        }
        
        # Check agent files
        $agentJar = "$InstallPath\sams-monitoring-agent.jar"
        $configFile = "$InstallPath\sams-agent.properties"
        
        if ((Test-Path $agentJar) -and (Test-Path $configFile)) {
            Write-ColorOutput "✅ Agent files present" $Green
        } else {
            Write-ColorOutput "❌ Agent files missing" $Red
            return $false
        }
        
        # Test server connectivity
        try {
            $response = Invoke-WebRequest -Uri "$ServerUrl/api/v1/health" -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -eq 200) {
                Write-ColorOutput "✅ Server connectivity OK" $Green
            } else {
                Write-ColorOutput "⚠️ Server responded with status: $($response.StatusCode)" $Yellow
            }
        } catch {
            Write-ColorOutput "⚠️ Cannot reach server: $ServerUrl" $Yellow
        }
        
        return $true
        
    } catch {
        Write-ColorOutput "❌ Installation test failed: $($_.Exception.Message)" $Red
        return $false
    }
}

# Main installation logic
function Main {
    Write-ColorOutput "🚀 SAMS Monitoring Agent Installer" $Cyan
    Write-ColorOutput "=================================" $Cyan
    
    # Check administrator privileges
    if (!(Test-Administrator)) {
        Write-ColorOutput "❌ This script requires administrator privileges" $Red
        Write-ColorOutput "💡 Please run as administrator" $Yellow
        exit 1
    }
    
    try {
        if ($Uninstall) {
            Uninstall-Agent
            return
        }
        
        Write-ColorOutput "📋 Installation Parameters:" $Cyan
        Write-ColorOutput "   Server URL: $ServerUrl" $Cyan
        Write-ColorOutput "   Install Path: $InstallPath" $Cyan
        Write-ColorOutput "   Service Name: $ServiceName" $Cyan
        Write-ColorOutput ""
        
        # Check if already installed
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service -and !$Force) {
            Write-ColorOutput "⚠️ SAMS Monitoring Agent is already installed" $Yellow
            Write-ColorOutput "💡 Use -Force to reinstall or -Uninstall to remove" $Yellow
            exit 1
        }
        
        if ($Force -and $service) {
            Write-ColorOutput "🔄 Force reinstall - removing existing installation..." $Yellow
            Uninstall-Agent
            Start-Sleep -Seconds 2
        }
        
        # Installation steps
        Install-JavaIfNeeded
        Download-Agent
        Create-Configuration
        Install-WindowsService
        Start-AgentService
        
        # Test installation
        if (Test-Installation) {
            Write-ColorOutput ""
            Write-ColorOutput "🎉 SAMS Monitoring Agent installed successfully!" $Green
            Write-ColorOutput ""
            Write-ColorOutput "📊 Service Status:" $Cyan
            Get-Service -Name $ServiceName | Format-Table -AutoSize
            Write-ColorOutput ""
            Write-ColorOutput "📁 Installation Directory: $InstallPath" $Cyan
            Write-ColorOutput "🔧 Configuration File: $InstallPath\sams-agent.properties" $Cyan
            Write-ColorOutput "📝 Logs: Check Windows Event Viewer" $Cyan
            Write-ColorOutput ""
            Write-ColorOutput "🔧 Management Commands:" $Cyan
            Write-ColorOutput "   Start:   Start-Service $ServiceName" $Cyan
            Write-ColorOutput "   Stop:    Stop-Service $ServiceName" $Cyan
            Write-ColorOutput "   Status:  Get-Service $ServiceName" $Cyan
            Write-ColorOutput "   Uninstall: .\install-windows.ps1 -Uninstall" $Cyan
            
        } else {
            Write-ColorOutput "❌ Installation completed but tests failed" $Red
            Write-ColorOutput "💡 Check the service status and logs" $Yellow
            exit 1
        }
        
    } catch {
        Write-ColorOutput "❌ Installation failed: $($_.Exception.Message)" $Red
        Write-ColorOutput "💡 Check the error details above" $Yellow
        exit 1
    }
}

# Run main function
Main
