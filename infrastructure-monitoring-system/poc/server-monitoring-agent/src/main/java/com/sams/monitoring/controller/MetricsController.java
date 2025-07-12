package com.sams.monitoring.controller;

import com.sams.monitoring.model.SystemMetrics;
import com.sams.monitoring.service.SystemMetricsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST API Controller for System Metrics
 * 
 * Provides RESTful endpoints for accessing system monitoring data.
 * All endpoints return JSON responses with comprehensive system metrics.
 */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*") // Allow CORS for development
public class MetricsController {

    private static final Logger logger = LoggerFactory.getLogger(MetricsController.class);

    @Autowired
    private SystemMetricsService systemMetricsService;

    /**
     * Get current system metrics
     * GET /api/v1/metrics
     * 
     * @return Current system metrics including CPU, memory, disk, and network stats
     */
    @GetMapping("/metrics")
    public ResponseEntity<SystemMetrics> getCurrentMetrics() {
        logger.info("Received request for current system metrics");
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            logger.info("Successfully collected metrics: {}", metrics);
            return ResponseEntity.ok(metrics);
            
        } catch (Exception e) {
            logger.error("Error collecting system metrics", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get system health summary
     * GET /api/v1/health
     * 
     * @return Simplified health status with key metrics
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getSystemHealth() {
        logger.info("Received request for system health summary");
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            Map<String, Object> healthSummary = new HashMap<>();
            healthSummary.put("timestamp", metrics.getTimestamp());
            healthSummary.put("hostname", metrics.getHostname());
            healthSummary.put("status", metrics.getSystemStatus());
            healthSummary.put("healthScore", metrics.getHealthScore());
            healthSummary.put("cpuUsage", metrics.getCpuUsage());
            healthSummary.put("memoryUsage", metrics.getMemoryUsage());
            healthSummary.put("diskUsage", metrics.getDiskUsage());
            healthSummary.put("uptime", metrics.getSystemUptime());
            
            logger.info("System health: {} (Score: {})", metrics.getSystemStatus(), metrics.getHealthScore());
            return ResponseEntity.ok(healthSummary);
            
        } catch (Exception e) {
            logger.error("Error getting system health", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get CPU metrics only
     * GET /api/v1/metrics/cpu
     * 
     * @return CPU-specific metrics
     */
    @GetMapping("/metrics/cpu")
    public ResponseEntity<Map<String, Object>> getCpuMetrics() {
        logger.info("Received request for CPU metrics");
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            Map<String, Object> cpuMetrics = new HashMap<>();
            cpuMetrics.put("timestamp", metrics.getTimestamp());
            cpuMetrics.put("hostname", metrics.getHostname());
            cpuMetrics.put("cpuUsage", metrics.getCpuUsage());
            cpuMetrics.put("cpuCores", metrics.getCpuCores());
            cpuMetrics.put("cpuModel", metrics.getCpuModel());
            cpuMetrics.put("loadAverage1m", metrics.getLoadAverage1m());
            cpuMetrics.put("loadAverage5m", metrics.getLoadAverage5m());
            cpuMetrics.put("loadAverage15m", metrics.getLoadAverage15m());
            
            return ResponseEntity.ok(cpuMetrics);
            
        } catch (Exception e) {
            logger.error("Error getting CPU metrics", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get memory metrics only
     * GET /api/v1/metrics/memory
     * 
     * @return Memory-specific metrics
     */
    @GetMapping("/metrics/memory")
    public ResponseEntity<Map<String, Object>> getMemoryMetrics() {
        logger.info("Received request for memory metrics");
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            Map<String, Object> memoryMetrics = new HashMap<>();
            memoryMetrics.put("timestamp", metrics.getTimestamp());
            memoryMetrics.put("hostname", metrics.getHostname());
            memoryMetrics.put("totalMemory", metrics.getTotalMemory());
            memoryMetrics.put("usedMemory", metrics.getUsedMemory());
            memoryMetrics.put("availableMemory", metrics.getAvailableMemory());
            memoryMetrics.put("memoryUsage", metrics.getMemoryUsage());
            memoryMetrics.put("totalSwap", metrics.getTotalSwap());
            memoryMetrics.put("usedSwap", metrics.getUsedSwap());
            memoryMetrics.put("swapUsage", metrics.getSwapUsage());
            
            return ResponseEntity.ok(memoryMetrics);
            
        } catch (Exception e) {
            logger.error("Error getting memory metrics", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get disk metrics only
     * GET /api/v1/metrics/disk
     * 
     * @return Disk-specific metrics
     */
    @GetMapping("/metrics/disk")
    public ResponseEntity<Map<String, Object>> getDiskMetrics() {
        logger.info("Received request for disk metrics");
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            Map<String, Object> diskMetrics = new HashMap<>();
            diskMetrics.put("timestamp", metrics.getTimestamp());
            diskMetrics.put("hostname", metrics.getHostname());
            diskMetrics.put("totalDisk", metrics.getTotalDisk());
            diskMetrics.put("usedDisk", metrics.getUsedDisk());
            diskMetrics.put("availableDisk", metrics.getAvailableDisk());
            diskMetrics.put("diskUsage", metrics.getDiskUsage());
            
            return ResponseEntity.ok(diskMetrics);
            
        } catch (Exception e) {
            logger.error("Error getting disk metrics", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get network metrics only
     * GET /api/v1/metrics/network
     * 
     * @return Network-specific metrics
     */
    @GetMapping("/metrics/network")
    public ResponseEntity<Map<String, Object>> getNetworkMetrics() {
        logger.info("Received request for network metrics");
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            Map<String, Object> networkMetrics = new HashMap<>();
            networkMetrics.put("timestamp", metrics.getTimestamp());
            networkMetrics.put("hostname", metrics.getHostname());
            networkMetrics.put("bytesReceived", metrics.getNetworkBytesReceived());
            networkMetrics.put("bytesSent", metrics.getNetworkBytesSent());
            networkMetrics.put("packetsReceived", metrics.getNetworkPacketsReceived());
            networkMetrics.put("packetsSent", metrics.getNetworkPacketsSent());
            
            return ResponseEntity.ok(networkMetrics);
            
        } catch (Exception e) {
            logger.error("Error getting network metrics", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get system information
     * GET /api/v1/system/info
     * 
     * @return Basic system information
     */
    @GetMapping("/system/info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        logger.info("Received request for system information");
        
        try {
            SystemMetrics metrics = systemMetricsService.collectMetrics();
            
            Map<String, Object> systemInfo = new HashMap<>();
            systemInfo.put("timestamp", metrics.getTimestamp());
            systemInfo.put("hostname", metrics.getHostname());
            systemInfo.put("operatingSystem", metrics.getOperatingSystem());
            systemInfo.put("uptime", metrics.getSystemUptime());
            systemInfo.put("processCount", metrics.getProcessCount());
            systemInfo.put("threadCount", metrics.getThreadCount());
            systemInfo.put("cpuModel", metrics.getCpuModel());
            systemInfo.put("cpuCores", metrics.getCpuCores());
            
            return ResponseEntity.ok(systemInfo);
            
        } catch (Exception e) {
            logger.error("Error getting system information", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * API status endpoint
     * GET /api/v1/status
     * 
     * @return API status and version information
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getApiStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("service", "SAMS Server Monitoring Agent");
        status.put("version", "1.0.0");
        status.put("status", "RUNNING");
        status.put("timestamp", java.time.LocalDateTime.now());
        status.put("endpoints", new String[]{
            "/api/v1/metrics",
            "/api/v1/health",
            "/api/v1/metrics/cpu",
            "/api/v1/metrics/memory",
            "/api/v1/metrics/disk",
            "/api/v1/metrics/network",
            "/api/v1/system/info",
            "/api/v1/status"
        });
        
        return ResponseEntity.ok(status);
    }
}
