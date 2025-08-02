package com.sams.controller;

import com.sams.model.SystemMetrics;
import com.sams.service.SystemMonitoringService;
import com.sams.service.DatabaseMonitoringService;
import com.sams.service.RemoteMonitoringService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:8082", "http://localhost:3000", "http://192.168.1.*"})
@Slf4j
public class MonitoringController {

    @Autowired
    private SystemMonitoringService systemMonitoringService;

    @Autowired
    private DatabaseMonitoringService databaseMonitoringService;

    @Autowired
    private RemoteMonitoringService remoteMonitoringService;

    private final List<SystemMetrics.AlertMetrics> alerts = new ArrayList<>();

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", "SAMS Java Backend");
        health.put("version", "1.0.0");
        health.put("timestamp", LocalDateTime.now());
        
        return ResponseEntity.ok(health);
    }

    /**
     * Get comprehensive monitoring overview
     */
    @GetMapping("/monitoring")
    public ResponseEntity<SystemMetrics.MonitoringOverview> getMonitoringOverview() {
        try {
            log.info("Getting monitoring overview");
            
            SystemMetrics.SystemInfo systemInfo = systemMonitoringService.getSystemInfo();
            List<SystemMetrics.DatabaseMetrics> databases = List.of(databaseMonitoringService.getDatabaseMetrics());
            List<SystemMetrics.RemoteServerMetrics> remoteServers = remoteMonitoringService.monitorRemoteServers();
            
            SystemMetrics.MonitoringOverview overview = SystemMetrics.MonitoringOverview.builder()
                    .system(systemInfo)
                    .databases(databases)
                    .remoteServers(remoteServers)
                    .alerts(new ArrayList<>(alerts))
                    .timestamp(LocalDateTime.now())
                    .status("OPERATIONAL")
                    .build();
            
            return ResponseEntity.ok(overview);
            
        } catch (Exception e) {
            log.error("Error getting monitoring overview: {}", e.getMessage());
            
            SystemMetrics.MonitoringOverview errorOverview = SystemMetrics.MonitoringOverview.builder()
                    .system(null)
                    .databases(List.of())
                    .remoteServers(List.of())
                    .alerts(new ArrayList<>(alerts))
                    .timestamp(LocalDateTime.now())
                    .status("ERROR: " + e.getMessage())
                    .build();
            
            return ResponseEntity.ok(errorOverview);
        }
    }

    /**
     * Get system information
     */
    @GetMapping("/system")
    public ResponseEntity<SystemMetrics.SystemInfo> getSystemInfo() {
        try {
            SystemMetrics.SystemInfo systemInfo = systemMonitoringService.getSystemInfo();
            return ResponseEntity.ok(systemInfo);
        } catch (Exception e) {
            log.error("Error getting system info: {}", e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get CPU metrics
     */
    @GetMapping("/system/cpu")
    public ResponseEntity<SystemMetrics.CpuMetrics> getCpuMetrics() {
        try {
            SystemMetrics.CpuMetrics cpuMetrics = systemMonitoringService.getCpuMetrics();
            return ResponseEntity.ok(cpuMetrics);
        } catch (Exception e) {
            log.error("Error getting CPU metrics: {}", e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get memory metrics
     */
    @GetMapping("/system/memory")
    public ResponseEntity<SystemMetrics.MemoryMetrics> getMemoryMetrics() {
        try {
            SystemMetrics.MemoryMetrics memoryMetrics = systemMonitoringService.getMemoryMetrics();
            return ResponseEntity.ok(memoryMetrics);
        } catch (Exception e) {
            log.error("Error getting memory metrics: {}", e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get disk metrics
     */
    @GetMapping("/system/disk")
    public ResponseEntity<SystemMetrics.DiskMetrics> getDiskMetrics() {
        try {
            SystemMetrics.DiskMetrics diskMetrics = systemMonitoringService.getDiskMetrics();
            return ResponseEntity.ok(diskMetrics);
        } catch (Exception e) {
            log.error("Error getting disk metrics: {}", e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get network metrics
     */
    @GetMapping("/system/network")
    public ResponseEntity<SystemMetrics.NetworkMetrics> getNetworkMetrics() {
        try {
            SystemMetrics.NetworkMetrics networkMetrics = systemMonitoringService.getNetworkMetrics();
            return ResponseEntity.ok(networkMetrics);
        } catch (Exception e) {
            log.error("Error getting network metrics: {}", e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Get process metrics
     */
    @GetMapping("/system/processes")
    public ResponseEntity<List<SystemMetrics.ProcessMetrics>> getProcessMetrics() {
        try {
            List<SystemMetrics.ProcessMetrics> processes = systemMonitoringService.getTopProcesses();
            return ResponseEntity.ok(processes);
        } catch (Exception e) {
            log.error("Error getting process metrics: {}", e.getMessage());
            return ResponseEntity.status(500).body(List.of());
        }
    }

    /**
     * Get database metrics
     */
    @GetMapping("/database")
    public ResponseEntity<SystemMetrics.DatabaseMetrics> getDatabaseMetrics() {
        try {
            SystemMetrics.DatabaseMetrics dbMetrics = databaseMonitoringService.getDatabaseMetrics();
            return ResponseEntity.ok(dbMetrics);
        } catch (Exception e) {
            log.error("Error getting database metrics: {}", e.getMessage());
            return ResponseEntity.status(500).body(null);
        }
    }

    /**
     * Test database connection
     */
    @GetMapping("/database/test")
    public ResponseEntity<Map<String, Object>> testDatabaseConnection() {
        Map<String, Object> result = new HashMap<>();
        try {
            boolean connected = databaseMonitoringService.testDatabaseConnection();
            result.put("connected", connected);
            result.put("status", connected ? "SUCCESS" : "FAILED");
            result.put("timestamp", LocalDateTime.now());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error testing database connection: {}", e.getMessage());
            result.put("connected", false);
            result.put("status", "ERROR");
            result.put("error", e.getMessage());
            result.put("timestamp", LocalDateTime.now());
            
            return ResponseEntity.status(500).body(result);
        }
    }

    /**
     * Get database health
     */
    @GetMapping("/database/health")
    public ResponseEntity<Map<String, Object>> getDatabaseHealth() {
        try {
            Map<String, Object> health = databaseMonitoringService.getDatabaseHealth();
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            log.error("Error getting database health: {}", e.getMessage());
            Map<String, Object> errorHealth = new HashMap<>();
            errorHealth.put("status", "DOWN");
            errorHealth.put("error", e.getMessage());
            return ResponseEntity.status(500).body(errorHealth);
        }
    }

    /**
     * Get remote server metrics
     */
    @GetMapping("/remote")
    public ResponseEntity<List<SystemMetrics.RemoteServerMetrics>> getRemoteServerMetrics() {
        try {
            List<SystemMetrics.RemoteServerMetrics> remoteMetrics = remoteMonitoringService.monitorRemoteServers();
            return ResponseEntity.ok(remoteMetrics);
        } catch (Exception e) {
            log.error("Error getting remote server metrics: {}", e.getMessage());
            return ResponseEntity.status(500).body(List.of());
        }
    }

    /**
     * Get alerts
     */
    @GetMapping("/alerts")
    public ResponseEntity<List<SystemMetrics.AlertMetrics>> getAlerts() {
        return ResponseEntity.ok(new ArrayList<>(alerts));
    }

    /**
     * Acknowledge alert
     */
    @PostMapping("/alerts/{alertId}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledgeAlert(@PathVariable String alertId) {
        Map<String, Object> result = new HashMap<>();
        
        alerts.stream()
                .filter(alert -> alert.getId().equals(alertId))
                .findFirst()
                .ifPresentOrElse(
                    alert -> {
                        alert.setAcknowledged(true);
                        alert.setAcknowledgedAt(LocalDateTime.now());
                        alert.setAcknowledgedBy("API User");
                        
                        result.put("success", true);
                        result.put("message", "Alert acknowledged");
                        result.put("alertId", alertId);
                    },
                    () -> {
                        result.put("success", false);
                        result.put("message", "Alert not found");
                        result.put("alertId", alertId);
                    }
                );
        
        return ResponseEntity.ok(result);
    }

    /**
     * Clear all alerts
     */
    @DeleteMapping("/alerts")
    public ResponseEntity<Map<String, Object>> clearAlerts() {
        int clearedCount = alerts.size();
        alerts.clear();
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "All alerts cleared");
        result.put("clearedCount", clearedCount);
        
        return ResponseEntity.ok(result);
    }

    /**
     * Get server info
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getServerInfo() {
        Map<String, Object> info = new HashMap<>();
        info.put("service", "SAMS Java Backend");
        info.put("version", "1.0.0");
        info.put("description", "Server & Alert Monitoring System - Java Spring Boot Backend");
        info.put("uptime", System.currentTimeMillis());
        info.put("timestamp", LocalDateTime.now());
        info.put("endpoints", List.of(
            "/api/health", "/api/monitoring", "/api/system", "/api/database", "/api/remote", "/api/alerts"
        ));
        
        return ResponseEntity.ok(info);
    }
}
