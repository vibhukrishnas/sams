/**
 * 🖥️ Server Management Controller - Comprehensive Server Operations
 * Complete CRUD operations, health checks, grouping, and auto-discovery
 */

package com.monitoring.server.controller;

import com.monitoring.server.dto.*;
import com.monitoring.server.entity.Server;
import com.monitoring.server.service.ServerService;
import com.monitoring.server.service.ServerDiscoveryService;
import com.monitoring.server.service.ServerHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/servers")
@Tag(name = "Server Management", description = "Server management and monitoring endpoints")
@SecurityRequirement(name = "bearerAuth")
public class ServerController {

    private static final Logger logger = LoggerFactory.getLogger(ServerController.class);

    @Autowired
    private ServerService serverService;

    @Autowired
    private ServerDiscoveryService discoveryService;

    @Autowired
    private ServerHealthService healthService;

    /**
     * Get all servers with pagination and filtering
     */
    @GetMapping
    @Operation(summary = "Get all servers", description = "Retrieve all servers with pagination and filtering")
    @PreAuthorize("hasRole('USER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Servers retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<ApiResponse<Page<ServerDto>>> getAllServers(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String environment,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String groupId,
            @RequestParam(required = false) Map<String, String> tags) {

        logger.info("Retrieving servers with filters - search: {}, environment: {}, status: {}", 
                   search, environment, status);

        try {
            ServerFilterDto filter = new ServerFilterDto();
            filter.setSearch(search);
            filter.setEnvironment(environment);
            filter.setStatus(status);
            filter.setGroupId(groupId != null ? UUID.fromString(groupId) : null);
            filter.setTags(tags);

            Page<ServerDto> servers = serverService.getAllServers(pageable, filter);

            logger.info("Retrieved {} servers", servers.getTotalElements());

            return ResponseEntity.ok(ApiResponse.success("Servers retrieved successfully", servers));

        } catch (Exception e) {
            logger.error("Error retrieving servers: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve servers: " + e.getMessage()));
        }
    }

    /**
     * Get server by ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get server by ID", description = "Retrieve a specific server by its ID")
    @PreAuthorize("hasRole('USER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<ApiResponse<ServerDto>> getServerById(
            @PathVariable UUID id) {

        logger.info("Retrieving server with ID: {}", id);

        try {
            ServerDto server = serverService.getServerById(id);

            logger.info("Retrieved server: {}", server.getName());

            return ResponseEntity.ok(ApiResponse.success("Server retrieved successfully", server));

        } catch (Exception e) {
            logger.error("Error retrieving server {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create new server
     */
    @PostMapping
    @Operation(summary = "Create new server", description = "Register a new server for monitoring")
    @PreAuthorize("hasRole('MANAGER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Server created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid server data"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<ApiResponse<ServerDto>> createServer(
            @Valid @RequestBody CreateServerRequest request) {

        logger.info("Creating new server: {}", request.getName());

        try {
            ServerDto server = serverService.createServer(request);

            logger.info("Server created successfully: {} (ID: {})", server.getName(), server.getId());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Server created successfully", server));

        } catch (Exception e) {
            logger.error("Error creating server {}: {}", request.getName(), e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to create server: " + e.getMessage()));
        }
    }

    /**
     * Update server
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update server", description = "Update server information")
    @PreAuthorize("hasRole('MANAGER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server updated successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "400", description = "Invalid server data"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<ApiResponse<ServerDto>> updateServer(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateServerRequest request) {

        logger.info("Updating server: {}", id);

        try {
            ServerDto server = serverService.updateServer(id, request);

            logger.info("Server updated successfully: {}", server.getName());

            return ResponseEntity.ok(ApiResponse.success("Server updated successfully", server));

        } catch (Exception e) {
            logger.error("Error updating server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to update server: " + e.getMessage()));
        }
    }

    /**
     * Delete server
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete server", description = "Remove server from monitoring")
    @PreAuthorize("hasRole('ADMIN')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public ResponseEntity<ApiResponse<String>> deleteServer(
            @PathVariable UUID id) {

        logger.info("Deleting server: {}", id);

        try {
            serverService.deleteServer(id);

            logger.info("Server deleted successfully: {}", id);

            return ResponseEntity.ok(ApiResponse.success("Server deleted successfully", null));

        } catch (Exception e) {
            logger.error("Error deleting server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to delete server: " + e.getMessage()));
        }
    }

    /**
     * Get server health status
     */
    @GetMapping("/{id}/health")
    @Operation(summary = "Get server health", description = "Get current health status of a server")
    @PreAuthorize("hasRole('USER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Health status retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found")
    })
    public ResponseEntity<ApiResponse<ServerHealthDto>> getServerHealth(
            @PathVariable UUID id) {

        logger.info("Retrieving health status for server: {}", id);

        try {
            ServerHealthDto health = healthService.getServerHealth(id);

            return ResponseEntity.ok(ApiResponse.success("Health status retrieved successfully", health));

        } catch (Exception e) {
            logger.error("Error retrieving health for server {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve health status: " + e.getMessage()));
        }
    }

    /**
     * Perform health check on server
     */
    @PostMapping("/{id}/health-check")
    @Operation(summary = "Perform health check", description = "Manually trigger health check for a server")
    @PreAuthorize("hasRole('MANAGER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Health check completed"),
        @ApiResponse(responseCode = "404", description = "Server not found")
    })
    public ResponseEntity<ApiResponse<ServerHealthDto>> performHealthCheck(
            @PathVariable UUID id) {

        logger.info("Performing health check for server: {}", id);

        try {
            ServerHealthDto health = healthService.performHealthCheck(id);

            logger.info("Health check completed for server: {} - Status: {}", id, health.getStatus());

            return ResponseEntity.ok(ApiResponse.success("Health check completed", health));

        } catch (Exception e) {
            logger.error("Error performing health check for server {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to perform health check: " + e.getMessage()));
        }
    }

    /**
     * Get server metrics
     */
    @GetMapping("/{id}/metrics")
    @Operation(summary = "Get server metrics", description = "Retrieve current metrics for a server")
    @PreAuthorize("hasRole('USER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Metrics retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found")
    })
    public ResponseEntity<ApiResponse<List<ServerMetricDto>>> getServerMetrics(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "1") int hours) {

        logger.info("Retrieving metrics for server: {} (last {} hours)", id, hours);

        try {
            List<ServerMetricDto> metrics = serverService.getServerMetrics(id, hours);

            return ResponseEntity.ok(ApiResponse.success("Metrics retrieved successfully", metrics));

        } catch (Exception e) {
            logger.error("Error retrieving metrics for server {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve metrics: " + e.getMessage()));
        }
    }

    /**
     * Submit server metrics
     */
    @PostMapping("/{id}/metrics")
    @Operation(summary = "Submit server metrics", description = "Submit new metrics data for a server")
    @PreAuthorize("hasRole('AGENT')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Metrics submitted successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found")
    })
    public ResponseEntity<ApiResponse<String>> submitMetrics(
            @PathVariable UUID id,
            @Valid @RequestBody List<SubmitMetricRequest> metrics) {

        logger.info("Submitting {} metrics for server: {}", metrics.size(), id);

        try {
            serverService.submitMetrics(id, metrics);

            logger.info("Metrics submitted successfully for server: {}", id);

            return ResponseEntity.ok(ApiResponse.success("Metrics submitted successfully", null));

        } catch (Exception e) {
            logger.error("Error submitting metrics for server {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to submit metrics: " + e.getMessage()));
        }
    }

    /**
     * Get server services
     */
    @GetMapping("/{id}/services")
    @Operation(summary = "Get server services", description = "Retrieve all services running on a server")
    @PreAuthorize("hasRole('USER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Services retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found")
    })
    public ResponseEntity<ApiResponse<List<ServerServiceDto>>> getServerServices(
            @PathVariable UUID id) {

        logger.info("Retrieving services for server: {}", id);

        try {
            List<ServerServiceDto> services = serverService.getServerServices(id);

            return ResponseEntity.ok(ApiResponse.success("Services retrieved successfully", services));

        } catch (Exception e) {
            logger.error("Error retrieving services for server {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve services: " + e.getMessage()));
        }
    }

    /**
     * Update server tags
     */
    @PutMapping("/{id}/tags")
    @Operation(summary = "Update server tags", description = "Update tags for a server")
    @PreAuthorize("hasRole('MANAGER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Tags updated successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found")
    })
    public ResponseEntity<ApiResponse<ServerDto>> updateServerTags(
            @PathVariable UUID id,
            @RequestBody Map<String, String> tags) {

        logger.info("Updating tags for server: {}", id);

        try {
            ServerDto server = serverService.updateServerTags(id, tags);

            logger.info("Tags updated successfully for server: {}", id);

            return ResponseEntity.ok(ApiResponse.success("Tags updated successfully", server));

        } catch (Exception e) {
            logger.error("Error updating tags for server {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to update tags: " + e.getMessage()));
        }
    }

    /**
     * Auto-discover servers
     */
    @PostMapping("/discover")
    @Operation(summary = "Auto-discover servers", description = "Automatically discover servers in network range")
    @PreAuthorize("hasRole('ADMIN')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Discovery completed"),
        @ApiResponse(responseCode = "400", description = "Invalid discovery parameters")
    })
    public ResponseEntity<ApiResponse<ServerDiscoveryResultDto>> discoverServers(
            @Valid @RequestBody ServerDiscoveryRequest request) {

        logger.info("Starting server discovery for network: {}", request.getNetworkRange());

        try {
            ServerDiscoveryResultDto result = discoveryService.discoverServers(request);

            logger.info("Discovery completed - Found {} servers", result.getDiscoveredServers().size());

            return ResponseEntity.ok(ApiResponse.success("Discovery completed", result));

        } catch (Exception e) {
            logger.error("Error during server discovery: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Discovery failed: " + e.getMessage()));
        }
    }

    /**
     * Get server statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get server statistics", description = "Get overall server statistics")
    @PreAuthorize("hasRole('USER')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully")
    })
    public ResponseEntity<ApiResponse<ServerStatisticsDto>> getServerStatistics() {

        logger.info("Retrieving server statistics");

        try {
            ServerStatisticsDto statistics = serverService.getServerStatistics();

            return ResponseEntity.ok(ApiResponse.success("Statistics retrieved successfully", statistics));

        } catch (Exception e) {
            logger.error("Error retrieving server statistics: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve statistics: " + e.getMessage()));
        }
    }

    /**
     * Bulk update servers
     */
    @PutMapping("/bulk")
    @Operation(summary = "Bulk update servers", description = "Update multiple servers at once")
    @PreAuthorize("hasRole('ADMIN')")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Bulk update completed"),
        @ApiResponse(responseCode = "400", description = "Invalid bulk update data")
    })
    public ResponseEntity<ApiResponse<BulkUpdateResultDto>> bulkUpdateServers(
            @Valid @RequestBody BulkUpdateRequest request) {

        logger.info("Performing bulk update on {} servers", request.getServerIds().size());

        try {
            BulkUpdateResultDto result = serverService.bulkUpdateServers(request);

            logger.info("Bulk update completed - Success: {}, Failed: {}", 
                       result.getSuccessCount(), result.getFailureCount());

            return ResponseEntity.ok(ApiResponse.success("Bulk update completed", result));

        } catch (Exception e) {
            logger.error("Error during bulk update: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Bulk update failed: " + e.getMessage()));
        }
    }
}
