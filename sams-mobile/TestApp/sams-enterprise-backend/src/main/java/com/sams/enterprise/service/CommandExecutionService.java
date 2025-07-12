package com.sams.enterprise.service;

import com.sams.enterprise.entity.Server;
import com.sams.enterprise.repository.ServerRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Enterprise Command Execution Service for Real System Commands
 */
@Service
public class CommandExecutionService {

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Execute command on server
     */
    public Map<String, Object> executeCommand(Long serverId, String command) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new IllegalArgumentException("Server not found"));

            result.put("serverId", serverId);
            result.put("hostname", server.getHostname());
            result.put("command", command);
            result.put("timestamp", java.time.LocalDateTime.now());

            // Execute the actual command
            ProcessBuilder processBuilder = new ProcessBuilder();
            
            // Set up command based on OS
            if (System.getProperty("os.name").toLowerCase().contains("windows")) {
                processBuilder.command("cmd.exe", "/c", command);
            } else {
                processBuilder.command("bash", "-c", command);
            }

            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            // Read output
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            // Wait for process to complete with timeout
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            
            if (finished) {
                int exitCode = process.exitValue();
                result.put("success", exitCode == 0);
                result.put("exitCode", exitCode);
                result.put("output", output.toString());
                
                if (exitCode == 0) {
                    result.put("message", "Command executed successfully");
                } else {
                    result.put("message", "Command failed with exit code: " + exitCode);
                }
            } else {
                process.destroyForcibly();
                result.put("success", false);
                result.put("message", "Command timed out after 30 seconds");
                result.put("output", output.toString());
            }

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Command execution failed: " + e.getMessage());
            result.put("error", e.getClass().getSimpleName());
        }

        return result;
    }

    /**
     * Execute predefined system commands
     */
    public Map<String, Object> executeSystemCommand(String commandType, Map<String, String> parameters) {
        String command = buildSystemCommand(commandType, parameters);
        
        if (command == null) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "Unknown command type: " + commandType);
            return result;
        }

        return executeLocalCommand(command);
    }

    /**
     * Build system command based on type
     */
    private String buildSystemCommand(String commandType, Map<String, String> parameters) {
        return switch (commandType.toLowerCase()) {
            case "restart-servers" -> "Get-Service | Where-Object {$_.Status -eq \"Running\" -and $_.Name -like \"*Server*\"} | Restart-Service -Force";
            case "update-packages" -> "Get-WindowsUpdate -Install -AcceptAll -AutoReboot";
            case "clear-cache" -> "Remove-Item -Path \"$env:TEMP\\*\" -Recurse -Force; Clear-DnsClientCache";
            case "backup-config" -> "wbadmin start backup -backupTarget:C:\\Backup -include:C:\\Windows\\System32\\config";
            case "emergency-shutdown" -> "shutdown /s /f /t 0";
            case "check-disk-space" -> "Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name=\"Size(GB)\";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name=\"FreeSpace(GB)\";Expression={[math]::Round($_.FreeSpace/1GB,2)}}";
            case "check-memory" -> "Get-WmiObject -Class Win32_OperatingSystem | Select-Object @{Name=\"TotalMemory(GB)\";Expression={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}, @{Name=\"FreeMemory(GB)\";Expression={[math]::Round($_.FreePhysicalMemory/1MB,2)}}";
            case "check-cpu" -> "Get-WmiObject -Class Win32_Processor | Select-Object Name, LoadPercentage";
            case "list-services" -> "Get-Service | Where-Object {$_.Status -eq \"Running\"} | Select-Object Name, Status";
            case "check-network" -> "Test-NetConnection -ComputerName google.com -Port 80";
            default -> null;
        };
    }

    /**
     * Execute local command
     */
    private Map<String, Object> executeLocalCommand(String command) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            result.put("command", command);
            result.put("timestamp", java.time.LocalDateTime.now());

            ProcessBuilder processBuilder = new ProcessBuilder();
            
            if (System.getProperty("os.name").toLowerCase().contains("windows")) {
                processBuilder.command("powershell.exe", "-Command", command);
            } else {
                processBuilder.command("bash", "-c", command);
            }

            processBuilder.redirectErrorStream(true);
            Process process = processBuilder.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(60, TimeUnit.SECONDS);
            
            if (finished) {
                int exitCode = process.exitValue();
                result.put("success", exitCode == 0);
                result.put("exitCode", exitCode);
                result.put("output", output.toString());
                
                if (exitCode == 0) {
                    result.put("message", "Command executed successfully");
                } else {
                    result.put("message", "Command failed with exit code: " + exitCode);
                }
            } else {
                process.destroyForcibly();
                result.put("success", false);
                result.put("message", "Command timed out after 60 seconds");
                result.put("output", output.toString());
            }

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Command execution failed: " + e.getMessage());
            result.put("error", e.getClass().getSimpleName());
        }

        return result;
    }

    /**
     * Get system information
     */
    public Map<String, Object> getSystemInfo() {
        Map<String, Object> systemInfo = new HashMap<>();
        
        // Get OS information
        systemInfo.put("osName", System.getProperty("os.name"));
        systemInfo.put("osVersion", System.getProperty("os.version"));
        systemInfo.put("osArch", System.getProperty("os.arch"));
        
        // Get Java information
        systemInfo.put("javaVersion", System.getProperty("java.version"));
        systemInfo.put("javaVendor", System.getProperty("java.vendor"));
        
        // Get memory information
        Runtime runtime = Runtime.getRuntime();
        systemInfo.put("totalMemory", runtime.totalMemory());
        systemInfo.put("freeMemory", runtime.freeMemory());
        systemInfo.put("maxMemory", runtime.maxMemory());
        systemInfo.put("usedMemory", runtime.totalMemory() - runtime.freeMemory());
        
        // Get processor information
        systemInfo.put("availableProcessors", runtime.availableProcessors());
        
        return systemInfo;
    }

    /**
     * Check if command is safe to execute
     */
    private boolean isCommandSafe(String command) {
        // List of dangerous commands to block
        String[] dangerousCommands = {
            "format", "del /f /s /q", "rm -rf /", "dd if=", ":(){ :|:& };:",
            "shutdown -h now", "init 0", "halt", "poweroff"
        };
        
        String lowerCommand = command.toLowerCase();
        for (String dangerous : dangerousCommands) {
            if (lowerCommand.contains(dangerous.toLowerCase())) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Execute safe command with validation
     */
    public Map<String, Object> executeSafeCommand(Long serverId, String command) {
        if (!isCommandSafe(command)) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "Command blocked for security reasons");
            result.put("command", command);
            return result;
        }
        
        return executeCommand(serverId, command);
    }

    /**
     * Get command history (simplified implementation)
     */
    public Map<String, Object> getCommandHistory(Long serverId, int limit) {
        Map<String, Object> result = new HashMap<>();
        result.put("serverId", serverId);
        result.put("history", new java.util.ArrayList<>()); // Would be populated from database
        result.put("limit", limit);
        return result;
    }
}
