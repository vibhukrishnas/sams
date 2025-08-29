package com.sams.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;
import java.time.LocalDateTime;
import java.lang.management.ManagementFactory;

/**
 * 🏥 Health Check and Status API Controller
 * 
 * Provides health monitoring endpoints compatible with mobile app and web dashboard
 * Includes real-time status broadcasting via WebSocket
 */
@RestController
@RequestMapping("/api/health")
@CrossOrigin(origins = "*")
public class HealthController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 🏥 Main health check endpoint
     * Compatible with mobile app health monitoring
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            long uptime = ManagementFactory.getRuntimeMXBean().getUptime();
            Runtime runtime = Runtime.getRuntime();
            
            Map<String, Object> healthData = Map.of(
                "success", true,
                "status", "healthy",
                "service", "SAMS Java Backend",
                "version", "2.0.0",
                "timestamp", LocalDateTime.now(),
                "uptime", uptime,
                "uptimeFormatted", formatUptime(uptime),
                "memory", Map.of(
                    "total", runtime.totalMemory(),
                    "free", runtime.freeMemory(),
                    "used", runtime.totalMemory() - runtime.freeMemory(),
                    "max", runtime.maxMemory()
                ),
                "features", Map.of(
                    "websocket", true,
                    "realTimeMetrics", true,
                    "alerting", true,
                    "multiEnvironment", true,
                    "mobileCompatible", true,
                    "webDashboard", true
                )
            );
            
            return ResponseEntity.ok(healthData);
            
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of(
                "success", false,
                "status", "unhealthy",
                "error", e.getMessage(),
                "timestamp", LocalDateTime.now()
            ));
        }
    }

    /**
     * 📊 System status endpoint
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        try {
            Runtime runtime = Runtime.getRuntime();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            double memoryUsage = ((double) usedMemory / totalMemory) * 100;
            
            Map<String, Object> systemStatus = Map.of(
                "success", true,
                "status", memoryUsage > 85 ? "warning" : "healthy",
                "data", Map.of(
                    "cpu", Map.of(
                        "cores", Runtime.getRuntime().availableProcessors(),
                        "usage", "Available" // Would need JMX for actual CPU usage
                    ),
                    "memory", Map.of(
                        "total", totalMemory,
                        "used", usedMemory,
                        "free", freeMemory,
                        "usage", Math.round(memoryUsage * 100.0) / 100.0
                    ),
                    "threads", Map.of(
                        "active", Thread.activeCount(),
                        "peak", "N/A"
                    ),
                    "jvm", Map.of(
                        "version", System.getProperty("java.version"),
                        "vendor", System.getProperty("java.vendor"),
                        "uptime", ManagementFactory.getRuntimeMXBean().getUptime()
                    )
                ),
                "timestamp", LocalDateTime.now()
            );
            
            return ResponseEntity.ok(systemStatus);
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to get system status: " + e.getMessage(),
                "timestamp", LocalDateTime.now()
            ));
        }
    }

    /**
     * 🔍 Connectivity test endpoint
     */
    @GetMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping() {
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "pong",
            "timestamp", LocalDateTime.now(),
            "server", "SAMS Java Backend"
        ));
    }

    /**
     * ℹ️ API information endpoint
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getApiInfo() {
        return ResponseEntity.ok(Map.of(
            "success", true,
            "api", Map.of(
                "name", "SAMS Java Backend API",
                "version", "v1",
                "description", "Server Alert Management System - Enterprise Java Backend",
                "features", Map.of(
                    "realTimeMonitoring", true,
                    "webSocketSupport", true,
                    "mobileAppCompatible", true,
                    "webDashboardSupport", true,
                    "enterpriseReady", true
                ),
                "endpoints", Map.of(
                    "servers", "/api/v1/servers",
                    "metrics", "/api/v1/metrics",
                    "health", "/api/v1/health",
                    "websocket", "ws://localhost:8080/ws"
                )
            ),
            "timestamp", LocalDateTime.now()
        ));
    }

    /**
     * 🧪 Test WebSocket broadcasting
     */
    @PostMapping("/test/websocket")
    public ResponseEntity<Map<String, Object>> testWebSocket(@RequestBody Map<String, Object> message) {
        try {
            Map<String, Object> testMessage = Map.of(
                "type", "test_broadcast",
                "message", message.getOrDefault("message", "Test message from Java backend"),
                "timestamp", LocalDateTime.now(),
                "source", "SAMS Java Backend"
            );
            
            // Broadcast test message to all connected clients
            messagingTemplate.convertAndSend("/topic/test", testMessage);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Test message broadcasted successfully",
                "data", testMessage,
                "timestamp", LocalDateTime.now()
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to broadcast test message: " + e.getMessage(),
                "timestamp", LocalDateTime.now()
            ));
        }
    }

    /**
     * 🕒 Format uptime to human readable format
     */
    private String formatUptime(long uptimeMs) {
        long seconds = uptimeMs / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        long days = hours / 24;
        
        if (days > 0) {
            return String.format("%dd %dh %dm", days, hours % 24, minutes % 60);
        } else if (hours > 0) {
            return String.format("%dh %dm %ds", hours, minutes % 60, seconds % 60);
        } else if (minutes > 0) {
            return String.format("%dm %ds", minutes, seconds % 60);
        } else {
            return String.format("%ds", seconds);
        }
    }
}
