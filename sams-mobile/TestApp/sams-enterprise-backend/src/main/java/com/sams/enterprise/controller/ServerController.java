package com.sams.enterprise.controller;

import com.sams.enterprise.entity.Server;
import com.sams.enterprise.entity.ServerMetric;
import com.sams.enterprise.service.ServerManagementService;
import com.sams.enterprise.dto.ServerCreateRequest;
import com.sams.enterprise.dto.ServerUpdateRequest;
import com.sams.enterprise.dto.ServerConfigurationRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * Enterprise Server Management REST Controller
 */
@RestController
@RequestMapping("/api/v1/servers")
@CrossOrigin(origins = "*")
public class ServerController {

    @Autowired
    private ServerManagementService serverManagementService;

    /**
     * Get all servers
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllServers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String environment,
            @RequestParam(required = false) String status) {
        
        try {
            Map<String, Object> response = serverManagementService.getAllServers(page, size, environment, status);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get server by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Server> getServerById(@PathVariable Long id) {
        try {
            Server server = serverManagementService.getServerById(id);
            return ResponseEntity.ok(server);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create new server
     */
    @PostMapping
    public ResponseEntity<Server> createServer(@Valid @RequestBody ServerCreateRequest request) {
        try {
            Server server = serverManagementService.createServer(request);
            return ResponseEntity.ok(server);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update server
     */
    @PutMapping("/{id}")
    public ResponseEntity<Server> updateServer(@PathVariable Long id, 
                                             @Valid @RequestBody ServerUpdateRequest request) {
        try {
            Server server = serverManagementService.updateServer(id, request);
            return ResponseEntity.ok(server);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Delete server
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteServer(@PathVariable Long id) {
        try {
            serverManagementService.deleteServer(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Configure server
     */
    @PostMapping("/{id}/configure")
    public ResponseEntity<Map<String, Object>> configureServer(@PathVariable Long id,
                                                             @Valid @RequestBody ServerConfigurationRequest request) {
        try {
            Map<String, Object> result = serverManagementService.configureServer(id, request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get server metrics
     */
    @GetMapping("/{id}/metrics")
    public ResponseEntity<List<ServerMetric>> getServerMetrics(@PathVariable Long id,
                                                             @RequestParam(required = false) String metricName,
                                                             @RequestParam(defaultValue = "24") int hours) {
        try {
            List<ServerMetric> metrics = serverManagementService.getServerMetrics(id, metricName, hours);
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Update server heartbeat
     */
    @PostMapping("/{id}/heartbeat")
    public ResponseEntity<Void> updateHeartbeat(@PathVariable Long id) {
        try {
            serverManagementService.updateServerHeartbeat(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get server health score
     */
    @GetMapping("/{id}/health")
    public ResponseEntity<Map<String, Object>> getServerHealth(@PathVariable Long id) {
        try {
            Map<String, Object> health = serverManagementService.getServerHealth(id);
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get server statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getServerStatistics() {
        try {
            Map<String, Object> stats = serverManagementService.getServerStatistics();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Restart server
     */
    @PostMapping("/{id}/restart")
    public ResponseEntity<Map<String, Object>> restartServer(@PathVariable Long id) {
        try {
            Map<String, Object> result = serverManagementService.restartServer(id);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get servers by environment
     */
    @GetMapping("/environment/{environment}")
    public ResponseEntity<List<Server>> getServersByEnvironment(@PathVariable String environment) {
        try {
            List<Server> servers = serverManagementService.getServersByEnvironment(environment);
            return ResponseEntity.ok(servers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get offline servers
     */
    @GetMapping("/offline")
    public ResponseEntity<List<Server>> getOfflineServers() {
        try {
            List<Server> servers = serverManagementService.getOfflineServers();
            return ResponseEntity.ok(servers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get unhealthy servers
     */
    @GetMapping("/unhealthy")
    public ResponseEntity<List<Server>> getUnhealthyServers(@RequestParam(defaultValue = "70.0") Double threshold) {
        try {
            List<Server> servers = serverManagementService.getUnhealthyServers(threshold);
            return ResponseEntity.ok(servers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Bulk server operations
     */
    @PostMapping("/bulk/{action}")
    public ResponseEntity<Map<String, Object>> bulkServerAction(@PathVariable String action,
                                                              @RequestBody List<Long> serverIds) {
        try {
            Map<String, Object> result = serverManagementService.bulkServerAction(action, serverIds);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
