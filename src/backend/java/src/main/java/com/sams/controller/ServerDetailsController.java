package com.sams.controller;

import com.sams.entity.Server;
import com.sams.service.CloudApiIntegrationService;
import com.sams.repository.ServerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;

/**
 * Server Details Controller for Client's Cloud API Integration
 * Provides detailed server information for mobile app display
 */
@RestController
@RequestMapping("/api/v1/servers")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8083", "http://localhost:19000", "*"})
public class ServerDetailsController {
    
    private static final Logger logger = LoggerFactory.getLogger(ServerDetailsController.class);
    
    @Autowired
    private CloudApiIntegrationService cloudApiService;
    
    @Autowired
    private ServerRepository serverRepository;
    
    /**
     * Get comprehensive server details for mobile app display
     * This is what the client expects when clicking on a server
     */
    @GetMapping("/{id}/details")
    public ResponseEntity<Map<String, Object>> getServerDetails(@PathVariable Long id) {
        try {
            Optional<Server> serverOpt = serverRepository.findById(id);
            if (!serverOpt.isPresent()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Server not found");
                errorResponse.put("server_id", id);
                errorResponse.put("timestamp", LocalDateTime.now());
                return ResponseEntity.notFound().build();
            }
            
            Server server = serverOpt.get();
            
            // Get comprehensive details from client's cloud API
            Map<String, Object> serverDetails = cloudApiService.getServerDetailsFromCloudApi(server);
            
            // Add mobile app specific formatting
            Map<String, Object> response = new HashMap<>();
            response.put("server_details", serverDetails);
            response.put("server_id", id);
            response.put("requested_at", LocalDateTime.now());
            response.put("mobile_optimized", true);
            response.put("data_source", "cloud_api_integration");
            
            logger.info("Serving detailed server information for server {} to mobile app", server.getName());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting server details for ID {}: {}", id, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch server details");
            errorResponse.put("server_id", id);
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get server overview for mobile app server list
     */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getServersOverview() {
        try {
            List<Server> servers = serverRepository.findAll();
            
            Map<String, Object> response = new HashMap<>();
            response.put("servers", servers);
            response.put("total_servers", servers.size());
            response.put("timestamp", LocalDateTime.now());
            response.put("mobile_optimized", true);
            
            // Add quick stats for each server
            servers.forEach(server -> {
                try {
                    // Add basic cloud info without full API call for performance
                    server.setDescription(server.getDescription() + " [Cloud Provider: " + 
                                        determineCloudProvider(server) + "]");
                } catch (Exception e) {
                    logger.debug("Error adding cloud provider info for server {}: {}", 
                                server.getName(), e.getMessage());
                }
            });
            
            logger.info("Serving servers overview for mobile app: {} servers", servers.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting servers overview: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch servers overview");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("timestamp", LocalDateTime.now());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get real-time metrics for specific server
     */
    @GetMapping("/{id}/metrics")
    public ResponseEntity<Map<String, Object>> getServerMetrics(@PathVariable Long id) {
        try {
            Optional<Server> serverOpt = serverRepository.findById(id);
            if (!serverOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Server server = serverOpt.get();
            
            // Get cloud-specific metrics
            Map<String, Object> cloudMetrics = cloudApiService.getServerDetailsFromCloudApi(server);
            
            Map<String, Object> response = new HashMap<>();
            response.put("server_id", id);
            response.put("server_name", server.getName());
            response.put("cloud_metrics", cloudMetrics);
            response.put("local_metrics", Map.of(
                "cpu_usage", server.getCpuUsage(),
                "memory_usage", server.getMemoryUsage(),
                "disk_usage", server.getDiskUsage(),
                "uptime", server.getUptime()
            ));
            response.put("timestamp", LocalDateTime.now());
            response.put("mobile_optimized", true);
            
            logger.info("Serving real-time metrics for server {} to mobile app", server.getName());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting server metrics for ID {}: {}", id, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch server metrics");
            errorResponse.put("server_id", id);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get server health status from client's cloud API
     */
    @GetMapping("/{id}/health")
    public ResponseEntity<Map<String, Object>> getServerHealth(@PathVariable Long id) {
        try {
            Optional<Server> serverOpt = serverRepository.findById(id);
            if (!serverOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Server server = serverOpt.get();
            
            // Get detailed health from cloud API
            Map<String, Object> cloudDetails = cloudApiService.getServerDetailsFromCloudApi(server);
            
            Map<String, Object> healthInfo = new HashMap<>();
            healthInfo.put("server_id", id);
            healthInfo.put("server_name", server.getName());
            healthInfo.put("current_status", server.getStatus());
            healthInfo.put("cloud_health", cloudDetails.get("health_checks"));
            healthInfo.put("cloud_state", cloudDetails.get("state"));
            healthInfo.put("last_check", server.getLastCheck());
            healthInfo.put("uptime", server.getUptime());
            healthInfo.put("timestamp", LocalDateTime.now());
            
            Map<String, Object> response = new HashMap<>();
            response.put("health_info", healthInfo);
            response.put("mobile_optimized", true);
            
            logger.info("Serving health information for server {} to mobile app", server.getName());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting server health for ID {}: {}", id, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch server health");
            errorResponse.put("server_id", id);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get server configuration from client's cloud API
     */
    @GetMapping("/{id}/configuration")
    public ResponseEntity<Map<String, Object>> getServerConfiguration(@PathVariable Long id) {
        try {
            Optional<Server> serverOpt = serverRepository.findById(id);
            if (!serverOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Server server = serverOpt.get();
            
            // Get configuration from cloud API
            Map<String, Object> cloudDetails = cloudApiService.getServerDetailsFromCloudApi(server);
            
            Map<String, Object> configInfo = new HashMap<>();
            configInfo.put("server_id", id);
            configInfo.put("server_name", server.getName());
            configInfo.put("cloud_configuration", cloudDetails.get("configuration"));
            configInfo.put("instance_type", cloudDetails.get("instance_type"));
            configInfo.put("machine_type", cloudDetails.get("machine_type"));
            configInfo.put("vm_size", cloudDetails.get("vm_size"));
            configInfo.put("network_config", cloudDetails.get("network_profile"));
            configInfo.put("storage_config", cloudDetails.get("storage_profile"));
            configInfo.put("security_groups", cloudDetails.get("security_groups"));
            configInfo.put("tags", cloudDetails.get("tags"));
            configInfo.put("metadata", cloudDetails.get("metadata"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("configuration", configInfo);
            response.put("mobile_optimized", true);
            response.put("timestamp", LocalDateTime.now());
            
            logger.info("Serving configuration for server {} to mobile app", server.getName());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting server configuration for ID {}: {}", id, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch server configuration");
            errorResponse.put("server_id", id);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Get server logs from client's cloud API
     */
    @GetMapping("/{id}/logs")
    public ResponseEntity<Map<String, Object>> getServerLogs(
            @PathVariable Long id,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "24") int hours) {
        try {
            Optional<Server> serverOpt = serverRepository.findById(id);
            if (!serverOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Server server = serverOpt.get();
            
            // Get logs from cloud API
            Map<String, Object> cloudDetails = cloudApiService.getServerDetailsFromCloudApi(server);
            
            Map<String, Object> logsInfo = new HashMap<>();
            logsInfo.put("server_id", id);
            logsInfo.put("server_name", server.getName());
            logsInfo.put("logs", cloudDetails.get("logs"));
            logsInfo.put("limit", limit);
            logsInfo.put("hours_range", hours);
            logsInfo.put("log_source", cloudDetails.get("cloud_provider"));
            
            Map<String, Object> response = new HashMap<>();
            response.put("logs_info", logsInfo);
            response.put("mobile_optimized", true);
            response.put("timestamp", LocalDateTime.now());
            
            logger.info("Serving logs for server {} to mobile app", server.getName());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error getting server logs for ID {}: {}", id, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch server logs");
            errorResponse.put("server_id", id);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }
    
    /**
     * Helper method to determine cloud provider
     */
    private String determineCloudProvider(Server server) {
        if (server.getHost().contains("amazonaws.com") || 
            (server.getDescription() != null && server.getDescription().toLowerCase().contains("aws"))) {
            return "AWS";
        } else if (server.getHost().contains("azure.com") || 
                  (server.getDescription() != null && server.getDescription().toLowerCase().contains("azure"))) {
            return "Azure";
        } else if (server.getHost().contains("googleapis.com") || 
                  (server.getDescription() != null && server.getDescription().toLowerCase().contains("gcp"))) {
            return "GCP";
        } else if (server.getDescription() != null && server.getDescription().toLowerCase().contains("custom")) {
            return "Custom";
        }
        return "Generic";
    }
}
