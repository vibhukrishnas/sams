package com.sams.controller;

import com.sams.service.SystemMetricsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.scheduling.annotation.Scheduled;

import java.util.Map;
import java.time.LocalDateTime;

/**
 * 📊 Real-time Metrics API Controller
 * 
 * Provides real-time system metrics compatible with mobile app and web dashboard
 * Includes WebSocket broadcasting for live updates
 */
@RestController
@RequestMapping("/api/v1/metrics")
@CrossOrigin(origins = "*")
public class MetricsController {

    @Autowired
    private SystemMetricsService metricsService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 📊 Get current system metrics
     * Mobile app compatible endpoint
     */
    @GetMapping("/current")
    public ResponseEntity<Map<String, Object>> getCurrentMetrics() {
        try {
            Map<String, Object> metrics = metricsService.getPerformanceSnapshot();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", metrics,
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to fetch current metrics: " + e.getMessage(),
                "timestamp", LocalDateTime.now()
            ));
        }
    }

    /**
     * 📈 Get detailed server metrics
     */
    @GetMapping("/server/{serverId}")
    public ResponseEntity<Map<String, Object>> getServerMetrics(@PathVariable String serverId) {
        try {
            Map<String, Object> metrics = metricsService.getServerMetrics(serverId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", metrics,
                "timestamp", LocalDateTime.now()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to fetch server metrics: " + e.getMessage(),
                "timestamp", LocalDateTime.now()
            ));
        }
    }

    /**
     * 🚀 Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "success", true,
            "service", "SAMS Metrics Service",
            "status", "healthy",
            "timestamp", LocalDateTime.now(),
            "uptime", java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime()
        ));
    }

    /**
     * 📊 Real-time metrics broadcasting
     * Automatically sends metrics to WebSocket clients every 5 seconds
     */
    @Scheduled(fixedRate = 5000) // Every 5 seconds
    public void broadcastMetrics() {
        try {
            Map<String, Object> metrics = metricsService.getPerformanceSnapshot();
            
            // Broadcast to all connected clients
            messagingTemplate.convertAndSend("/topic/metrics", Map.of(
                "type", "metrics_update",
                "data", metrics,
                "timestamp", LocalDateTime.now()
            ));
            
        } catch (Exception e) {
            // Log error but don't interrupt scheduled execution
            System.err.println("Failed to broadcast metrics: " + e.getMessage());
        }
    }

    /**
     * 🔔 Alert broadcasting for critical metrics
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void checkAndBroadcastAlerts() {
        try {
            Map<String, Object> snapshot = metricsService.getPerformanceSnapshot();
            
            double cpu = (Double) snapshot.get("cpu");
            double memory = (Double) snapshot.get("memory");
            
            // Check for critical thresholds
            if (cpu > 90 || memory > 95) {
                Map<String, Object> alert = Map.of(
                    "type", "critical_alert",
                    "severity", "CRITICAL",
                    "title", "System Resource Critical",
                    "message", String.format("CPU: %.1f%%, Memory: %.1f%%", cpu, memory),
                    "cpu", cpu,
                    "memory", memory,
                    "timestamp", LocalDateTime.now()
                );
                
                // Broadcast alert to mobile apps and dashboard
                messagingTemplate.convertAndSend("/topic/alerts", alert);
            }
            
        } catch (Exception e) {
            System.err.println("Failed to check/broadcast alerts: " + e.getMessage());
        }
    }
}
