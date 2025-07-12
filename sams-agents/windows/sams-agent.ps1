# SAMS Windows Monitoring Agent
# PowerShell script to collect system metrics and send to SAMS backend

param(
    [string]$ConfigFile = "C:\Program Files\SAMS\agent.json",
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Service
)

# Global variables
$Global:Config = @{}
$Global:Running = $false
$Global:LogFile = "C:\Program Files\SAMS\logs\agent.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Write to console
    Write-Host $logEntry
    
    # Write to log file
    try {
        Add-Content -Path $Global:LogFile -Value $logEntry -ErrorAction SilentlyContinue
    } catch {
        # Ignore log file errors
    }
}

function Load-Config {
    param([string]$ConfigPath)
    
    $defaultConfig = @{
        server_id = $env:COMPUTERNAME
        backend_url = "http://192.168.1.10:8080"
        api_token = ""
        collection_interval = 30
        log_level = "INFO"
        monitor_services = @()
        monitor_ports = @()
        custom_commands = @{}
    }
    
    if (Test-Path $ConfigPath) {
        try {
            $fileConfig = Get-Content $ConfigPath | ConvertFrom-Json
            foreach ($key in $fileConfig.PSObject.Properties.Name) {
                $defaultConfig[$key] = $fileConfig.$key
            }
            Write-Log "Configuration loaded from $ConfigPath"
        } catch {
            Write-Log "Error loading config file: $_" "ERROR"
        }
    } else {
        Write-Log "Config file not found, using defaults"
    }
    
    return $defaultConfig
}

function Get-SystemMetrics {
    try {
        # CPU metrics
        $cpuCounter = Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 2
        $cpuUsage = [math]::Round(($cpuCounter.CounterSamples | Select-Object -Last 1).CookedValue, 2)
        $cpuCores = (Get-WmiObject Win32_ComputerSystem).NumberOfLogicalProcessors
        
        # Memory metrics
        $memory = Get-WmiObject Win32_OperatingSystem
        $totalMemory = [math]::Round($memory.TotalVisibleMemorySize * 1024)
        $freeMemory = [math]::Round($memory.FreePhysicalMemory * 1024)
        $usedMemory = $totalMemory - $freeMemory
        $memoryPercent = [math]::Round(($usedMemory / $totalMemory) * 100, 2)
        
        # Disk metrics
        $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
        $diskTotal = $disk.Size
        $diskFree = $disk.FreeSpace
        $diskUsed = $diskTotal - $diskFree
        $diskPercent = [math]::Round(($diskUsed / $diskTotal) * 100, 2)
        
        # Network metrics
        $networkAdapters = Get-WmiObject Win32_PerfRawData_Tcpip_NetworkInterface | Where-Object {$_.Name -notlike "*Loopback*" -and $_.Name -notlike "*Teredo*"}
        $totalBytesReceived = ($networkAdapters | Measure-Object BytesReceivedPerSec -Sum).Sum
        $totalBytesSent = ($networkAdapters | Measure-Object BytesSentPerSec -Sum).Sum
        
        # Process metrics
        $processes = Get-Process
        $processCount = $processes.Count
        $runningProcesses = ($processes | Where-Object {$_.Responding}).Count
        
        # System info
        $computerSystem = Get-WmiObject Win32_ComputerSystem
        $operatingSystem = Get-WmiObject Win32_OperatingSystem
        $uptime = (Get-Date) - $operatingSystem.ConvertToDateTime($operatingSystem.LastBootUpTime)
        
        $metrics = @{
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            server_id = $Global:Config.server_id
            hostname = $env:COMPUTERNAME
            cpu = @{
                usage_percent = $cpuUsage
                count = $cpuCores
                load_average = @($cpuUsage / 100, $cpuUsage / 100, $cpuUsage / 100)  # Windows doesn't have load average
            }
            memory = @{
                total = $totalMemory
                used = $usedMemory
                free = $freeMemory
                percent = $memoryPercent
                swap_total = 0  # Windows virtual memory is different
                swap_used = 0
                swap_percent = 0
            }
            disk = @{
                total = $diskTotal
                used = $diskUsed
                free = $diskFree
                percent = $diskPercent
                read_bytes = 0  # Would need performance counters
                write_bytes = 0
                read_count = 0
                write_count = 0
            }
            network = @{
                bytes_sent = $totalBytesSent
                bytes_recv = $totalBytesReceived
                packets_sent = 0  # Would need performance counters
                packets_recv = 0
                errin = 0
                errout = 0
                dropin = 0
                dropout = 0
            }
            processes = @{
                total = $processCount
                running = $runningProcesses
                sleeping = $processCount - $runningProcesses
            }
            system = @{
                uptime = $uptime.TotalSeconds
                boot_time = $operatingSystem.ConvertToDateTime($operatingSystem.LastBootUpTime).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                os = $operatingSystem.Caption
                kernel = $operatingSystem.Version
                architecture = $computerSystem.SystemType
            }
        }
        
        # Add custom metrics
        $customMetrics = Get-CustomMetrics
        if ($customMetrics.Count -gt 0) {
            $metrics.custom = $customMetrics
        }
        
        return $metrics
        
    } catch {
        Write-Log "Error collecting system metrics: $_" "ERROR"
        return $null
    }
}

function Get-CustomMetrics {
    $customMetrics = @{}
    
    try {
        # Monitor services
        foreach ($serviceName in $Global:Config.monitor_services) {
            try {
                $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
                if ($service) {
                    $customMetrics["service_${serviceName}_status"] = $service.Status.ToString()
                } else {
                    $customMetrics["service_${serviceName}_status"] = "NotFound"
                }
            } catch {
                Write-Log "Failed to check service $serviceName : $_" "WARNING"
            }
        }
        
        # Monitor ports
        foreach ($port in $Global:Config.monitor_ports) {
            try {
                $connection = Test-NetConnection -ComputerName "localhost" -Port $port -WarningAction SilentlyContinue
                $customMetrics["port_${port}_open"] = $connection.TcpTestSucceeded
            } catch {
                Write-Log "Failed to check port $port : $_" "WARNING"
            }
        }
        
        # Custom commands
        foreach ($commandName in $Global:Config.custom_commands.PSObject.Properties.Name) {
            try {
                $command = $Global:Config.custom_commands.$commandName
                $result = Invoke-Expression $command
                $customMetrics["custom_$commandName"] = @{
                    exit_code = $LASTEXITCODE
                    output = $result
                }
            } catch {
                Write-Log "Failed to execute custom command $commandName : $_" "WARNING"
            }
        }
        
    } catch {
        Write-Log "Error collecting custom metrics: $_" "ERROR"
    }
    
    return $customMetrics
}

function Send-Metrics {
    param([hashtable]$Metrics)
    
    try {
        $url = "$($Global:Config.backend_url)/api/metrics/collect"
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Global:Config.api_token) {
            $headers["Authorization"] = "Bearer $($Global:Config.api_token)"
        }
        
        $body = $Metrics | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -TimeoutSec 30
        
        Write-Log "Metrics sent successfully" "DEBUG"
        return $true
        
    } catch {
        Write-Log "Failed to send metrics: $_" "ERROR"
        return $false
    }
}

function Register-Agent {
    try {
        $url = "$($Global:Config.backend_url)/api/agents/register"
        
        $computerSystem = Get-WmiObject Win32_ComputerSystem
        $operatingSystem = Get-WmiObject Win32_OperatingSystem
        $memory = Get-WmiObject Win32_OperatingSystem
        $disk = Get-WmiObject Win32_LogicalDisk -Filter "DeviceID='C:'"
        
        $registrationData = @{
            server_id = $Global:Config.server_id
            hostname = $env:COMPUTERNAME
            ip_address = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object -First 1).IPAddress
            os = $operatingSystem.Caption
            os_version = $operatingSystem.Version
            architecture = $computerSystem.SystemType
            cpu_cores = $computerSystem.NumberOfLogicalProcessors
            memory_total = [math]::Round($memory.TotalVisibleMemorySize * 1024)
            disk_total = $disk.Size
            agent_version = "1.0.0"
            capabilities = @("metrics", "logs", "commands")
        }
        
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Global:Config.api_token) {
            $headers["Authorization"] = "Bearer $($Global:Config.api_token)"
        }
        
        $body = $registrationData | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -TimeoutSec 30
        
        Write-Log "Agent registered successfully"
        return $true
        
    } catch {
        Write-Log "Failed to register agent: $_" "ERROR"
        return $false
    }
}

function Send-Heartbeat {
    while ($Global:Running) {
        try {
            $url = "$($Global:Config.backend_url)/api/agents/heartbeat"
            $data = @{
                server_id = $Global:Config.server_id
                timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                status = "online"
            }
            
            $headers = @{
                "Content-Type" = "application/json"
            }
            
            if ($Global:Config.api_token) {
                $headers["Authorization"] = "Bearer $($Global:Config.api_token)"
            }
            
            $body = $data | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -TimeoutSec 10
            
        } catch {
            Write-Log "Heartbeat failed: $_" "WARNING"
        }
        
        Start-Sleep -Seconds 60
    }
}

function Start-Agent {
    Write-Log "Starting SAMS Windows Agent..."
    $Global:Running = $true
    
    # Load configuration
    $Global:Config = Load-Config -ConfigPath $ConfigFile
    
    # Create log directory
    $logDir = Split-Path $Global:LogFile -Parent
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    # Register agent
    if (!(Register-Agent)) {
        Write-Log "Failed to register agent, continuing anyway..." "WARNING"
    }
    
    # Start heartbeat in background job
    $heartbeatJob = Start-Job -ScriptBlock {
        param($config, $logFile)
        
        while ($true) {
            try {
                $url = "$($config.backend_url)/api/agents/heartbeat"
                $data = @{
                    server_id = $config.server_id
                    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    status = "online"
                } | ConvertTo-Json
                
                $headers = @{"Content-Type" = "application/json"}
                if ($config.api_token) {
                    $headers["Authorization"] = "Bearer $($config.api_token)"
                }
                
                Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $data -TimeoutSec 10 | Out-Null
            } catch {
                # Ignore heartbeat errors
            }
            
            Start-Sleep -Seconds 60
        }
    } -ArgumentList $Global:Config, $Global:LogFile
    
    # Main metrics collection loop
    while ($Global:Running) {
        try {
            # Collect metrics
            $metrics = Get-SystemMetrics
            
            if ($metrics) {
                # Send metrics
                $success = Send-Metrics -Metrics $metrics
                
                if ($success) {
                    Write-Log "Metrics collected and sent at $($metrics.timestamp)" "DEBUG"
                } else {
                    Write-Log "Failed to send metrics to backend" "WARNING"
                }
            } else {
                Write-Log "No metrics collected" "WARNING"
            }
            
            # Wait for next collection interval
            Start-Sleep -Seconds $Global:Config.collection_interval
            
        } catch {
            Write-Log "Error in main loop: $_" "ERROR"
            Start-Sleep -Seconds $Global:Config.collection_interval
        }
    }
    
    # Cleanup
    if ($heartbeatJob) {
        Stop-Job $heartbeatJob
        Remove-Job $heartbeatJob
    }
    
    Write-Log "SAMS Windows Agent stopped"
}

function Stop-Agent {
    $Global:Running = $false
}

function Install-Service {
    Write-Log "Installing SAMS Agent as Windows Service..."
    
    # TODO: Implement Windows Service installation
    # This would typically involve creating a service wrapper
    # or using a tool like NSSM (Non-Sucking Service Manager)
    
    Write-Log "Service installation not yet implemented" "WARNING"
    Write-Log "Please run the agent manually or use Task Scheduler" "INFO"
}

function Uninstall-Service {
    Write-Log "Uninstalling SAMS Agent service..."
    
    # TODO: Implement service uninstallation
    
    Write-Log "Service uninstallation not yet implemented" "WARNING"
}

# Main execution
if ($Install) {
    Install-Service
} elseif ($Uninstall) {
    Uninstall-Service
} elseif ($Service) {
    # Run as service (would be called by service manager)
    Start-Agent
} else {
    # Run in foreground
    try {
        Start-Agent
    } catch {
        Write-Log "Fatal error: $_" "ERROR"
        exit 1
    }
}
