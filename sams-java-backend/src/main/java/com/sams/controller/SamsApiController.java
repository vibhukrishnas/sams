package com.sams.controller;

import com.sams.service.SystemMonitoringService;
import com.sams.service.SystemMonitoringService.SystemAlert;
import com.sams.service.SystemMonitoringService.SystemMetrics;
import com.sams.service.SystemMonitoringService.ServerInfo;
import com.sams.service.ApplicationLogService;
import com.sams.service.ApplicationLogService.ApplicationLog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * SAMS API Controller
 * 
 * RESTful API endpoints for system monitoring and alerts
 * Compatible with mobile app and web interfaces
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*") // Allow all origins for development
public class SamsApiController {
    
    private final SystemMonitoringService monitoringService;
    private final ApplicationLogService applicationLogService;
    
    /**
     * Get comprehensive system metrics
     * GET /api/v1/system/metrics
     */
    @GetMapping("/system/metrics")
    public ResponseEntity<SystemMetrics> getSystemMetrics() {
        log.info("📊 System metrics requested");
        
        try {
            SystemMetrics metrics = monitoringService.getSystemMetrics();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            log.error("❌ Error getting system metrics", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get system alerts
     * GET /api/v1/alerts
     */
    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> getAlerts() {
        log.info("🚨 System alerts requested");
        
        try {
            List<SystemAlert> alerts = monitoringService.getSystemAlerts();
            
            return ResponseEntity.ok(Map.of(
                "alerts", alerts,
                "count", alerts.size(),
                "timestamp", LocalDateTime.now(),
                "status", alerts.isEmpty() ? "ALL_CLEAR" : "ALERTS_PRESENT"
            ));
        } catch (Exception e) {
            log.error("❌ Error getting system alerts", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get server information (quick overview)
     * GET /api/v1/system/servers
     */
    @GetMapping("/system/servers")
    public ResponseEntity<Map<String, Object>> getServers() {
        log.info("🖥️ Server overview information requested");
        
        try {
            List<ServerInfo> servers = monitoringService.getServerInfo();
            
            return ResponseEntity.ok(Map.of(
                "servers", servers,
                "count", servers.size(),
                "timestamp", LocalDateTime.now(),
                "cluster_status", "HEALTHY"
            ));
        } catch (Exception e) {
            log.error("❌ Error getting server information", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get CPU usage specifically (for mobile app)
     * GET /api/v1/cpu
     */
    @GetMapping("/cpu")
    public ResponseEntity<Map<String, Object>> getCpuUsage() {
        log.info("⚡ CPU usage requested");
        
        try {
            SystemMetrics metrics = monitoringService.getSystemMetrics();
            
            return ResponseEntity.ok(Map.of(
                "cpu_usage", metrics.getCpuUsage(),
                "load_average_1m", metrics.getLoadAverage1m(),
                "load_average_5m", metrics.getLoadAverage5m(),
                "load_average_15m", metrics.getLoadAverage15m(),
                "cpu_cores", metrics.getCpuCores(),
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error getting CPU usage", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get memory usage specifically (for mobile app)
     * GET /api/v1/memory
     */
    @GetMapping("/memory")
    public ResponseEntity<Map<String, Object>> getMemoryUsage() {
        log.info("💾 Memory usage requested");
        
        try {
            SystemMetrics metrics = monitoringService.getSystemMetrics();
            
            return ResponseEntity.ok(Map.of(
                "memory_usage_percent", metrics.getMemoryUsagePercent(),
                "memory_total", metrics.getMemoryTotal(),
                "memory_used", metrics.getMemoryUsed(),
                "memory_available", metrics.getMemoryAvailable(),
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error getting memory usage", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get disk usage specifically (for mobile app)
     * GET /api/v1/disk
     */
    @GetMapping("/disk")
    public ResponseEntity<Map<String, Object>> getDiskUsage() {
        log.info("💽 Disk usage requested");
        
        try {
            SystemMetrics metrics = monitoringService.getSystemMetrics();
            
            return ResponseEntity.ok(Map.of(
                "disk_usage", metrics.getDiskUsage(),
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error getting disk usage", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * System status overview (for dashboard)
     * GET /api/v1/status
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        log.info("📈 System status overview requested");
        
        try {
            SystemMetrics metrics = monitoringService.getSystemMetrics();
            List<SystemAlert> alerts = monitoringService.getSystemAlerts();
            List<ServerInfo> servers = monitoringService.getServerInfo();
            
            String overallStatus = alerts.isEmpty() ? "HEALTHY" : "WARNING";
            if (alerts.stream().anyMatch(alert -> "CRITICAL".equals(alert.getSeverity()))) {
                overallStatus = "CRITICAL";
            }
            
            return ResponseEntity.ok(Map.of(
                "overall_status", overallStatus,
                "cpu_usage", metrics.getCpuUsage(),
                "memory_usage", metrics.getMemoryUsagePercent(),
                "alerts_count", alerts.size(),
                "servers_count", servers.size(),
                "uptime", metrics.getUptime(),
                "hostname", metrics.getHostname(),
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error getting system status", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // ========================= APPLICATION LOG ENDPOINTS =========================
    
    /**
     * Get list of monitored applications
     * GET /api/v1/applications
     */
    @GetMapping("/applications")
    public ResponseEntity<Map<String, Object>> getApplications() {
        log.info("📱 Monitored applications requested");
        
        try {
            List<String> applications = applicationLogService.getMonitoredApplications();
            
            return ResponseEntity.ok(Map.of(
                "applications", applications.stream().map(appId -> Map.of(
                    "id", appId,
                    "name", applicationLogService.getApplicationDisplayName(appId),
                    "statistics", applicationLogService.getLogStatistics(appId)
                )).toList(),
                "count", applications.size(),
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error getting applications", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get logs for a specific application
     * GET /api/v1/applications/{applicationId}/logs
     */
    @GetMapping("/applications/{applicationId}/logs")
    public ResponseEntity<Map<String, Object>> getApplicationLogs(
            @PathVariable String applicationId,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "50") int limit) {
        
        log.info("📋 Application logs requested for: {} (severity: {}, limit: {})", 
                applicationId, severity, limit);
        
        try {
            List<ApplicationLog> logs = applicationLogService.getApplicationLogs(applicationId, severity);
            
            // Limit results
            if (logs.size() > limit) {
                logs = logs.subList(0, limit);
            }
            
            return ResponseEntity.ok(Map.of(
                "application_id", applicationId,
                "application_name", applicationLogService.getApplicationDisplayName(applicationId),
                "logs", logs,
                "count", logs.size(),
                "severity_filter", severity != null ? severity : "all",
                "statistics", applicationLogService.getLogStatistics(applicationId),
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error getting application logs for {}", applicationId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Add a new log entry for an application
     * POST /api/v1/applications/{applicationId}/logs
     */
    @PostMapping("/applications/{applicationId}/logs")
    public ResponseEntity<Map<String, Object>> addApplicationLog(
            @PathVariable String applicationId,
            @RequestBody Map<String, String> logData) {
        
        log.info("📝 Adding new log entry for application: {}", applicationId);
        
        try {
            String severity = logData.getOrDefault("severity", "INFO");
            String message = logData.getOrDefault("message", "");
            
            if (message.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Message is required",
                    "timestamp", LocalDateTime.now()
                ));
            }
            
            applicationLogService.addRealTimeLogEntry(applicationId, severity, message);
            
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Log entry added successfully",
                "application_id", applicationId,
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error adding log entry for {}", applicationId, e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get log statistics for all applications
     * GET /api/v1/applications/statistics
     */
    @GetMapping("/applications/statistics")
    public ResponseEntity<Map<String, Object>> getApplicationStatistics() {
        log.info("📊 Application statistics requested");
        
        try {
            List<String> applications = applicationLogService.getMonitoredApplications();
            Map<String, Object> allStats = applications.stream()
                .collect(java.util.stream.Collectors.toMap(
                    appId -> appId,
                    appId -> applicationLogService.getLogStatistics(appId)
                ));
            
            return ResponseEntity.ok(Map.of(
                "statistics", allStats,
                "applications_count", applications.size(),
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error getting application statistics", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Refresh application logs (trigger log file parsing)
     * POST /api/v1/applications/refresh
     */
    @PostMapping("/applications/refresh")
    public ResponseEntity<Map<String, Object>> refreshApplicationLogs() {
        log.info("🔄 Refreshing application logs");
        
        try {
            applicationLogService.parseApplicationLogs();
            
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Application logs refreshed successfully",
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            log.error("❌ Error refreshing application logs", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
