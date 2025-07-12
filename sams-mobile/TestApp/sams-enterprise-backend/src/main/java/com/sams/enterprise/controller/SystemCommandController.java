package com.sams.enterprise.controller;

import com.sams.enterprise.service.CommandExecutionService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Enterprise System Command REST Controller
 */
@RestController
@RequestMapping("/api/v1/system/commands")
@CrossOrigin(origins = "*")
public class SystemCommandController {

    @Autowired
    private CommandExecutionService commandExecutionService;

    /**
     * Execute system command
     */
    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> executeSystemCommand(@RequestBody SystemCommandRequest request) {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand(
                request.getCommandType(), 
                request.getParameters()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Execute restart servers command
     */
    @PostMapping("/restart-servers")
    public ResponseEntity<Map<String, Object>> restartServers() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("restart-servers", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Execute update packages command
     */
    @PostMapping("/update-packages")
    public ResponseEntity<Map<String, Object>> updatePackages() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("update-packages", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Execute clear cache command
     */
    @PostMapping("/clear-cache")
    public ResponseEntity<Map<String, Object>> clearCache() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("clear-cache", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Execute backup config command
     */
    @PostMapping("/backup-config")
    public ResponseEntity<Map<String, Object>> backupConfig() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("backup-config", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Execute emergency shutdown command
     */
    @PostMapping("/emergency-shutdown")
    public ResponseEntity<Map<String, Object>> emergencyShutdown() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("emergency-shutdown", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Check disk space
     */
    @GetMapping("/check-disk-space")
    public ResponseEntity<Map<String, Object>> checkDiskSpace() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("check-disk-space", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Check memory usage
     */
    @GetMapping("/check-memory")
    public ResponseEntity<Map<String, Object>> checkMemory() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("check-memory", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Check CPU usage
     */
    @GetMapping("/check-cpu")
    public ResponseEntity<Map<String, Object>> checkCpu() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("check-cpu", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * List running services
     */
    @GetMapping("/list-services")
    public ResponseEntity<Map<String, Object>> listServices() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("list-services", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Check network connectivity
     */
    @GetMapping("/check-network")
    public ResponseEntity<Map<String, Object>> checkNetwork() {
        try {
            Map<String, Object> result = commandExecutionService.executeSystemCommand("check-network", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get system information
     */
    @GetMapping("/system-info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        try {
            Map<String, Object> result = commandExecutionService.getSystemInfo();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Execute custom command on server
     */
    @PostMapping("/custom")
    public ResponseEntity<Map<String, Object>> executeCustomCommand(@RequestBody CustomCommandRequest request) {
        try {
            Map<String, Object> result = commandExecutionService.executeSafeCommand(
                request.getServerId(), 
                request.getCommand()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get command history for server
     */
    @GetMapping("/history/{serverId}")
    public ResponseEntity<Map<String, Object>> getCommandHistory(@PathVariable Long serverId,
                                                               @RequestParam(defaultValue = "50") int limit) {
        try {
            Map<String, Object> result = commandExecutionService.getCommandHistory(serverId, limit);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * System command request DTO
     */
    public static class SystemCommandRequest {
        private String commandType;
        private Map<String, String> parameters;

        // Getters and setters
        public String getCommandType() { return commandType; }
        public void setCommandType(String commandType) { this.commandType = commandType; }
        
        public Map<String, String> getParameters() { return parameters; }
        public void setParameters(Map<String, String> parameters) { this.parameters = parameters; }
    }

    /**
     * Custom command request DTO
     */
    public static class CustomCommandRequest {
        private Long serverId;
        private String command;

        // Getters and setters
        public Long getServerId() { return serverId; }
        public void setServerId(Long serverId) { this.serverId = serverId; }
        
        public String getCommand() { return command; }
        public void setCommand(String command) { this.command = command; }
    }
}
