package com.sams.controller;

import com.sams.entity.Server;
import com.sams.entity.Alert;
import com.sams.entity.SystemMetric;
import com.sams.service.RealApiIntegrationService;
import com.sams.repository.ServerRepository;
import com.sams.repository.AlertRepository;
import com.sams.repository.SystemMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Real-Time Monitoring API Controller
 * Provides live server monitoring endpoints for web console and mobile app
 */
@RestController
@RequestMapping("/api/v1/monitoring")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8083", "http://localhost:19000", "*"})
@EnableAsync
public class RealTimeMonitoringController {
    
    private static final Logger logger = LoggerFactory.getLogger(RealTimeMonitoringController.class);
    
    @Autowired
    private RealApiIntegrationService realApiService;
    
    @Autowired
    private ServerRepository serverRepository;
    
    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private SystemMetricRepository systemMetricRepository;
    
    /**
     * Get real-time dashboard statistics
     */
    @GetMapping("/dashboard/stats")
    public ResponseEntity<Map<String, Object>> getRealTimeDashboardStats() {
        try {
            Map<String, Object> stats = realApiService.getRealDashboardStats();
            stats.put("timestamp", LocalDateTime.now());
            stats.put("api_version", "v1");
            stats.put("data_source", "real_time_monitoring");
            
            logger.info("Serving real-time dashboard stats: {} servers total", stats.get("total_servers"));
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            logger.error("Error getting real-time dashboard stats: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch real-time dashboard stats");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get all servers with real-time status
     */
    @GetMapping("/servers/realtime")
    public ResponseEntity<Map<String, Object>> getRealTimeServers() {
        try {
            List<Server> servers = serverRepository.findAll();
            
            Map<String, Object> response = new HashMap<>();
            response.put("servers", servers);
            response.put("count", servers.size());
            response.put("last_updated", LocalDateTime.now());
            response.put("real_time", true);
            
            logger.info("Serving {} servers with real-time status", servers.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting real-time servers: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch real-time servers");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Perform live health check on specific server
     */
    @PostMapping("/servers/{id}/healthcheck")
    public ResponseEntity<Map<String, Object>> performLiveHealthCheck(@PathVariable Long id) {
        try {
            Optional<Server> serverOpt = serverRepository.findById(id);
            if (!serverOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Server not found");
                errorResponse.put("server_id", id);
                return ResponseEntity.notFound().build();
            }
            
            Server server = serverOpt.get();
            boolean isHealthy = realApiService.performRealHealthCheck(server);
            
            Map<String, Object> response = new HashMap<>();
            response.put("server_id", id);
            response.put("server_name", server.getName());
            response.put("is_healthy", isHealthy);
            response.put("status", server.getStatus());
            response.put("last_ping", server.getLastPing());
            response.put("check_timestamp", LocalDateTime.now());
            response.put("real_time", true);
            
            logger.info("Live health check for server {}: {}", server.getName(), isHealthy ? "HEALTHY" : "UNHEALTHY");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error performing live health check for server {}: {}", id, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to perform live health check");
            errorResponse.put("server_id", id);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get real-time metrics for specific server
     */
    @GetMapping("/servers/{id}/metrics/realtime")
    public ResponseEntity<Map<String, Object>> getRealTimeServerMetrics(@PathVariable Long id) {
        try {
            Optional<Server> serverOpt = serverRepository.findById(id);
            if (!serverOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Server server = serverOpt.get();
            
            // Collect fresh real-time metrics
            realApiService.collectRealSystemMetrics(server);
            
            // Get API response
            Map<String, Object> apiResponse = realApiService.getRealApiResponse(server);
            
            Map<String, Object> response = new HashMap<>();
            response.put("server", server);
            response.put("api_response", apiResponse);
            response.put("metrics_timestamp", LocalDateTime.now());
            response.put("real_time", true);
            
            logger.info("Serving real-time metrics for server {}", server.getName());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting real-time metrics for server {}: {}", id, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get real-time server metrics");
            errorResponse.put("server_id", id);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Trigger real-time monitoring for all servers (async)
     */
    @PostMapping("/servers/monitor/realtime")
    @Async
    public CompletableFuture<ResponseEntity<Map<String, Object>>> triggerRealTimeMonitoring() {
        try {
            logger.info("Triggering real-time monitoring for all servers");
            
            realApiService.monitorAllServersRealTime();
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Real-time monitoring completed");
            response.put("timestamp", LocalDateTime.now());
            response.put("monitoring_type", "real_time_all_servers");
            
            return CompletableFuture.completedFuture(ResponseEntity.ok(response));
            
        } catch (Exception e) {
            logger.error("Error triggering real-time monitoring: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to trigger real-time monitoring");
            errorResponse.put("message", e.getMessage());
            return CompletableFuture.completedFuture(ResponseEntity.internalServerError().body(errorResponse));
        }
    }
    
    /**
     * Get real-time alerts
     */
    @GetMapping("/alerts/realtime")
    public ResponseEntity<Map<String, Object>> getRealTimeAlerts() {
        try {
            List<Alert> recentAlerts = alertRepository.findTop50ByOrderByCreatedAtDesc();
            
            Map<String, Object> response = new HashMap<>();
            response.put("alerts", recentAlerts);
            response.put("count", recentAlerts.size());
            response.put("last_updated", LocalDateTime.now());
            response.put("real_time", true);
            
            logger.info("Serving {} real-time alerts", recentAlerts.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting real-time alerts: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch real-time alerts");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get real-time system metrics for dashboard charts
     */
    @GetMapping("/metrics/realtime")
    public ResponseEntity<Map<String, Object>> getRealTimeSystemMetrics(
            @RequestParam(defaultValue = "24") int hours) {
        try {
            LocalDateTime since = LocalDateTime.now().minusHours(hours);
            List<SystemMetric> metrics = systemMetricRepository.findByTimestampAfterOrderByTimestampDesc(since);
            
            Map<String, Object> response = new HashMap<>();
            response.put("metrics", metrics);
            response.put("count", metrics.size());
            response.put("hours_range", hours);
            response.put("since", since);
            response.put("last_updated", LocalDateTime.now());
            response.put("real_time", true);
            
            logger.info("Serving {} real-time system metrics for last {} hours", metrics.size(), hours);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting real-time system metrics: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch real-time system metrics");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * API health endpoint for integration testing
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getApiHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", LocalDateTime.now());
        health.put("service", "SAMS Real-Time Monitoring API");
        health.put("version", "1.0.0");
        health.put("real_time_integration", true);
        health.put("database_connected", true);
        
        try {
            long serverCount = serverRepository.count();
            health.put("monitored_servers", serverCount);
        } catch (Exception e) {
            health.put("database_connected", false);
            health.put("error", e.getMessage());
        }
        
        return ResponseEntity.ok(health);
    }
    
    /**
     * Mobile app specific endpoint for real-time data
     */
    @GetMapping("/mobile/dashboard")
    public ResponseEntity<Map<String, Object>> getMobileDashboard() {
        try {
            Map<String, Object> mobileData = new HashMap<>();
            
            // Get dashboard stats
            Map<String, Object> stats = realApiService.getRealDashboardStats();
            mobileData.put("stats", stats);
            
            // Get recent alerts
            List<Alert> recentAlerts = alertRepository.findTop10ByOrderByCreatedAtDesc();
            mobileData.put("recent_alerts", recentAlerts);
            
            // Get server status summary
            List<Server> servers = serverRepository.findAll();
            mobileData.put("servers", servers);
            
            mobileData.put("mobile_optimized", true);
            mobileData.put("real_time", true);
            mobileData.put("timestamp", LocalDateTime.now());
            
            logger.info("Serving mobile dashboard with real-time data");
            return ResponseEntity.ok(mobileData);
            
        } catch (Exception e) {
            logger.error("Error getting mobile dashboard: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch mobile dashboard");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
}
