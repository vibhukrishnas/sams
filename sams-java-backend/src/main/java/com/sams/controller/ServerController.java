package com.sams.controller;

import com.sams.model.Server;
import com.sams.service.ServerService;
import com.sams.service.SystemMetricsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 🖥️ Server Management API Controller
 * 
 * RESTful API for server management compatible with mobile app and web dashboard
 * Provides real-time metrics and server status updates
 */
@RestController
@RequestMapping("/api/v1/servers")
@CrossOrigin(origins = "*")
@Validated
public class ServerController {

    @Autowired
    private ServerService serverService;

    @Autowired
    private SystemMetricsService metricsService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 📋 Get all servers with pagination
     * Mobile app compatible endpoint
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllServers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String environment,
            @RequestParam(required = false) String status) {
        
        try {
            Page<Server> servers = serverService.getAllServers(page, size, environment, status);
            
            Map<String, Object> response = Map.of(
                "success", true,
                "data", Map.of(
                    "servers", servers.getContent(),
                    "pagination", Map.of(
                        "page", page,
                        "size", size,
                        "totalElements", servers.getTotalElements(),
                        "totalPages", servers.getTotalPages(),
                        "isFirst", servers.isFirst(),
                        "isLast", servers.isLast()
                    )
                ),
                "timestamp", java.time.LocalDateTime.now()
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to fetch servers: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * 🔍 Get server by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getServerById(@PathVariable String id) {
        try {
            Optional<Server> server = serverService.getServerById(id);
            
            if (server.isPresent()) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", server.get(),
                    "timestamp", java.time.LocalDateTime.now()
                ));
            } else {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Server not found",
                    "timestamp", java.time.LocalDateTime.now()
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to fetch server: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * ➕ Create new server
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createServer(@Valid @RequestBody Server server) {
        try {
            Server createdServer = serverService.createServer(server);
            
            // Broadcast new server to WebSocket clients
            messagingTemplate.convertAndSend("/topic/servers/new", createdServer);
            
            return ResponseEntity.status(201).body(Map.of(
                "success", true,
                "data", createdServer,
                "message", "Server created successfully",
                "timestamp", java.time.LocalDateTime.now()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to create server: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * ✏️ Update server
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateServer(
            @PathVariable String id, 
            @Valid @RequestBody Server server) {
        try {
            Optional<Server> updatedServer = serverService.updateServer(id, server);
            
            if (updatedServer.isPresent()) {
                // Broadcast update to WebSocket clients
                messagingTemplate.convertAndSend("/topic/servers/updated", updatedServer.get());
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", updatedServer.get(),
                    "message", "Server updated successfully",
                    "timestamp", java.time.LocalDateTime.now()
                ));
            } else {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Server not found",
                    "timestamp", java.time.LocalDateTime.now()
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to update server: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * 🗑️ Delete server
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteServer(@PathVariable String id) {
        try {
            boolean deleted = serverService.deleteServer(id);
            
            if (deleted) {
                // Broadcast deletion to WebSocket clients
                messagingTemplate.convertAndSend("/topic/servers/deleted", Map.of("serverId", id));
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Server deleted successfully",
                    "timestamp", java.time.LocalDateTime.now()
                ));
            } else {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Server not found",
                    "timestamp", java.time.LocalDateTime.now()
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to delete server: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * 📊 Get real-time server metrics
     * Compatible with mobile app real-time monitoring
     */
    @GetMapping("/{id}/metrics")
    public ResponseEntity<Map<String, Object>> getServerMetrics(@PathVariable String id) {
        try {
            Map<String, Object> metrics = metricsService.getServerMetrics(id);
            
            if (!metrics.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", metrics,
                    "timestamp", java.time.LocalDateTime.now()
                ));
            } else {
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Server metrics not found",
                    "timestamp", java.time.LocalDateTime.now()
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to fetch metrics: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * 🔍 Check server health status
     */
    @PostMapping("/{id}/health-check")
    public ResponseEntity<Map<String, Object>> performHealthCheck(@PathVariable String id) {
        try {
            Map<String, Object> healthStatus = serverService.performHealthCheck(id);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", healthStatus,
                "timestamp", java.time.LocalDateTime.now()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Health check failed: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * 📈 Get server status summary
     * Dashboard overview endpoint
     */
    @GetMapping("/status/summary")
    public ResponseEntity<Map<String, Object>> getStatusSummary() {
        try {
            Map<String, Object> summary = serverService.getStatusSummary();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", summary,
                "timestamp", java.time.LocalDateTime.now()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to fetch status summary: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }

    /**
     * 📊 Bulk metrics update endpoint
     * For receiving metrics from external monitoring agents
     */
    @PostMapping("/metrics/bulk")
    public ResponseEntity<Map<String, Object>> updateBulkMetrics(
            @RequestBody Map<String, Map<String, Object>> metricsData) {
        try {
            int updatedCount = serverService.updateBulkMetrics(metricsData);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Bulk metrics updated successfully",
                "updatedServers", updatedCount,
                "timestamp", java.time.LocalDateTime.now()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "error", "Failed to update bulk metrics: " + e.getMessage(),
                "timestamp", java.time.LocalDateTime.now()
            ));
        }
    }
}
