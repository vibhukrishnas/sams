package com.sams.controller;

import com.sams.entity.Server;
import com.sams.service.ServerService;
import com.sams.dto.ServerCreateRequest;
import com.sams.dto.ServerResponse;
import com.sams.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * Server Management REST Controller
 * Provides API endpoints for web console and mobile app integration
 */
@RestController
@RequestMapping("/servers")
@CrossOrigin(origins = "*")
@Tag(name = "Server Management", description = "APIs for server management and monitoring")
public class ServerController {
    
    @Autowired
    private ServerService serverService;
    
    /**
     * Get all servers - Compatible with mobile and web
     */
    @GetMapping
    @Operation(summary = "Get all servers", description = "Retrieve all registered servers")
    public ResponseEntity<ApiResponse<List<Server>>> getAllServers() {
        try {
            List<Server> servers = serverService.getAllServers();
            return ResponseEntity.ok(ApiResponse.success(servers, "Servers retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve servers: " + e.getMessage()));
        }
    }
    
    /**
     * Get server by ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get server by ID", description = "Retrieve a specific server by its ID")
    public ResponseEntity<ApiResponse<ServerResponse>> getServerById(@PathVariable Long id) {
        try {
            ServerResponse server = serverService.getServerById(id)
                    .orElseThrow(() -> new RuntimeException("Server not found"));
            return ResponseEntity.ok(ApiResponse.success(server, "Server retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Server not found: " + e.getMessage()));
        }
    }
    
    /**
     * Create new server
     */
    @PostMapping
    @Operation(summary = "Create new server", description = "Register a new server for monitoring")
    public ResponseEntity<ApiResponse<ServerResponse>> createServer(@Valid @RequestBody ServerCreateRequest request) {
        try {
            ServerResponse server = serverService.createServer(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(server, "Server created successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Failed to create server: " + e.getMessage()));
        }
    }
    
    /**
     * Update server
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update server", description = "Update an existing server")
    public ResponseEntity<ApiResponse<ServerResponse>> updateServer(
            @PathVariable Long id, 
            @Valid @RequestBody ServerCreateRequest request) {
        try {
            ServerResponse server = serverService.updateServer(id, request)
                    .orElseThrow(() -> new RuntimeException("Server not found"));
            return ResponseEntity.ok(ApiResponse.success(server, "Server updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Failed to update server: " + e.getMessage()));
        }
    }
    
    /**
     * Delete server
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete server", description = "Remove a server from monitoring")
    public ResponseEntity<ApiResponse<Void>> deleteServer(@PathVariable Long id) {
        try {
            serverService.deleteServer(id);
            return ResponseEntity.ok(ApiResponse.success(null, "Server deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Failed to delete server: " + e.getMessage()));
        }
    }
    
    /**
     * Get server status - Mobile app compatible
     */
    @GetMapping("/{id}/status")
    @Operation(summary = "Get server status", description = "Get current status of a server")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getServerStatus(@PathVariable Long id) {
        try {
            Map<String, Object> status = serverService.getServerStatus(id);
            return ResponseEntity.ok(ApiResponse.success(status, "Server status retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Failed to get server status: " + e.getMessage()));
        }
    }
    
    /**
     * Get server metrics - Mobile app compatible
     */
    @GetMapping("/{id}/metrics")
    @Operation(summary = "Get server metrics", description = "Get performance metrics for a server")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getServerMetrics(@PathVariable Long id) {
        try {
            Map<String, Object> metrics = serverService.getServerMetrics(id);
            return ResponseEntity.ok(ApiResponse.success(metrics, "Server metrics retrieved successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Failed to get server metrics: " + e.getMessage()));
        }
    }
    
    /**
     * Health check endpoint for server
     */
    @PostMapping("/{id}/health-check")
    @Operation(summary = "Perform health check", description = "Manually trigger a health check for a server")
    public ResponseEntity<ApiResponse<Map<String, Object>>> performHealthCheck(@PathVariable Long id) {
        try {
            Map<String, Object> healthCheck = serverService.performHealthCheck(id);
            return ResponseEntity.ok(ApiResponse.success(healthCheck, "Health check completed"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Health check failed: " + e.getMessage()));
        }
    }
    
    /**
     * Get servers by status - Useful for dashboards
     */
    @GetMapping("/status/{status}")
    @Operation(summary = "Get servers by status", description = "Retrieve servers filtered by status")
    public ResponseEntity<ApiResponse<List<ServerResponse>>> getServersByStatus(@PathVariable String status) {
        try {
            List<ServerResponse> servers = serverService.getServersByStatus(status);
            return ResponseEntity.ok(ApiResponse.success(servers, "Servers filtered by status"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Failed to filter servers: " + e.getMessage()));
        }
    }
    
    /**
     * Get dashboard statistics - Mobile and web dashboard
     */
    @GetMapping("/dashboard/stats")
    @Operation(summary = "Get dashboard statistics", description = "Get server statistics for dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        try {
            Map<String, Object> stats = serverService.getDashboardStatistics();
            return ResponseEntity.ok(ApiResponse.success(stats, "Dashboard statistics retrieved"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get dashboard statistics: " + e.getMessage()));
        }
    }
}
