/**
 * 🖥️ Server Management API Controller - Comprehensive CRUD Operations
 * RESTful API with versioning, validation, and comprehensive documentation
 */

package com.monitoring.api.controller;

import com.monitoring.api.config.ApiVersion;
import com.monitoring.api.dto.*;
import com.monitoring.api.service.ServerManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Server Management", description = "Server management operations")
@SecurityRequirement(name = "bearerAuth")
@Validated
public class ServerManagementController {

    private static final Logger logger = LoggerFactory.getLogger(ServerManagementController.class);

    @Autowired
    private ServerManagementService serverService;

    /**
     * API v1 - Get all servers with pagination
     */
    @GetMapping("/v1/servers")
    @ApiVersion("v1")
    @Operation(summary = "Get all servers", description = "Retrieve a paginated list of all servers")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved servers",
                    content = @Content(schema = @Schema(implementation = PagedServerResponse.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden"),
        @ApiResponse(responseCode = "429", description = "Rate limit exceeded")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Page<ServerDto>>> getAllServersV1(
            @PageableDefault(size = 20) Pageable pageable,
            @Parameter(description = "Filter by environment") @RequestParam(required = false) String environment,
            @Parameter(description = "Filter by status") @RequestParam(required = false) String status,
            @Parameter(description = "Search by name or hostname") @RequestParam(required = false) String search) {

        logger.info("📊 API v1: Getting all servers - page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());

        try {
            ServerFilterRequest filter = ServerFilterRequest.builder()
                    .environment(environment)
                    .status(status)
                    .search(search)
                    .build();

            Page<ServerDto> servers = serverService.getAllServers(pageable, filter);

            return ResponseEntity.ok(ApiResponse.success(servers, "Servers retrieved successfully"));

        } catch (Exception e) {
            logger.error("❌ Error retrieving servers: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve servers", e.getMessage()));
        }
    }

    /**
     * API v2 - Enhanced server listing with advanced filtering
     */
    @GetMapping("/v2/servers")
    @ApiVersion("v2")
    @Operation(summary = "Get all servers (v2)", description = "Enhanced server listing with advanced filtering and sorting")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved servers",
                    content = @Content(schema = @Schema(implementation = EnhancedPagedServerResponse.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<Page<EnhancedServerDto>>> getAllServersV2(
            @PageableDefault(size = 20) Pageable pageable,
            @Parameter(description = "Advanced filter criteria") @RequestBody(required = false) AdvancedServerFilterRequest filter) {

        logger.info("📊 API v2: Getting all servers with advanced filtering");

        try {
            Page<EnhancedServerDto> servers = serverService.getAllServersEnhanced(pageable, filter);

            return ResponseEntity.ok(ApiResponse.success(servers, "Servers retrieved successfully"));

        } catch (Exception e) {
            logger.error("❌ Error retrieving servers (v2): {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve servers", e.getMessage()));
        }
    }

    /**
     * Get server by ID
     */
    @GetMapping("/v1/servers/{id}")
    @ApiVersion("v1")
    @Operation(summary = "Get server by ID", description = "Retrieve a specific server by its ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server found",
                    content = @Content(schema = @Schema(implementation = ServerDto.class))),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<ServerDto>> getServerById(
            @Parameter(description = "Server ID", required = true) @PathVariable @NotNull UUID id) {

        logger.info("📊 Getting server by ID: {}", id);

        try {
            ServerDto server = serverService.getServerById(id);

            if (server != null) {
                return ResponseEntity.ok(ApiResponse.success(server, "Server retrieved successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Server not found", "No server found with ID: " + id));
            }

        } catch (Exception e) {
            logger.error("❌ Error retrieving server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve server", e.getMessage()));
        }
    }

    /**
     * Create new server
     */
    @PostMapping("/v1/servers")
    @ApiVersion("v1")
    @Operation(summary = "Create new server", description = "Create a new server in the monitoring system")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Server created successfully",
                    content = @Content(schema = @Schema(implementation = ServerDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "409", description = "Server already exists")
    })
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<ServerDto>> createServer(
            @Parameter(description = "Server creation request", required = true) 
            @Valid @RequestBody CreateServerRequest request) {

        logger.info("📊 Creating new server: {}", request.getName());

        try {
            ServerDto createdServer = serverService.createServer(request);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(createdServer, "Server created successfully"));

        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Invalid server creation request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid input", e.getMessage()));

        } catch (Exception e) {
            logger.error("❌ Error creating server: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create server", e.getMessage()));
        }
    }

    /**
     * Update existing server
     */
    @PutMapping("/v1/servers/{id}")
    @ApiVersion("v1")
    @Operation(summary = "Update server", description = "Update an existing server")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server updated successfully",
                    content = @Content(schema = @Schema(implementation = ServerDto.class))),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<ServerDto>> updateServer(
            @Parameter(description = "Server ID", required = true) @PathVariable @NotNull UUID id,
            @Parameter(description = "Server update request", required = true) 
            @Valid @RequestBody UpdateServerRequest request) {

        logger.info("📊 Updating server: {}", id);

        try {
            ServerDto updatedServer = serverService.updateServer(id, request);

            if (updatedServer != null) {
                return ResponseEntity.ok(ApiResponse.success(updatedServer, "Server updated successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Server not found", "No server found with ID: " + id));
            }

        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Invalid server update request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid input", e.getMessage()));

        } catch (Exception e) {
            logger.error("❌ Error updating server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update server", e.getMessage()));
        }
    }

    /**
     * Partial update server (PATCH)
     */
    @PatchMapping("/v1/servers/{id}")
    @ApiVersion("v1")
    @Operation(summary = "Partially update server", description = "Partially update server fields")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server updated successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "400", description = "Invalid input")
    })
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<ServerDto>> patchServer(
            @Parameter(description = "Server ID", required = true) @PathVariable @NotNull UUID id,
            @Parameter(description = "Partial server update request", required = true) 
            @Valid @RequestBody PatchServerRequest request) {

        logger.info("📊 Partially updating server: {}", id);

        try {
            ServerDto updatedServer = serverService.patchServer(id, request);

            if (updatedServer != null) {
                return ResponseEntity.ok(ApiResponse.success(updatedServer, "Server updated successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Server not found", "No server found with ID: " + id));
            }

        } catch (Exception e) {
            logger.error("❌ Error patching server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update server", e.getMessage()));
        }
    }

    /**
     * Delete server
     */
    @DeleteMapping("/v1/servers/{id}")
    @ApiVersion("v1")
    @Operation(summary = "Delete server", description = "Delete a server from the monitoring system")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Server deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "409", description = "Server cannot be deleted due to dependencies")
    })
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteServer(
            @Parameter(description = "Server ID", required = true) @PathVariable @NotNull UUID id,
            @Parameter(description = "Force delete even with dependencies") @RequestParam(defaultValue = "false") boolean force) {

        logger.info("📊 Deleting server: {} (force: {})", id, force);

        try {
            boolean deleted = serverService.deleteServer(id, force);

            if (deleted) {
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Server not found", "No server found with ID: " + id));
            }

        } catch (IllegalStateException e) {
            logger.warn("⚠️ Cannot delete server due to dependencies: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("Cannot delete server", e.getMessage()));

        } catch (Exception e) {
            logger.error("❌ Error deleting server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to delete server", e.getMessage()));
        }
    }

    /**
     * Bulk operations
     */
    @PostMapping("/v1/servers/bulk")
    @ApiVersion("v1")
    @Operation(summary = "Bulk server operations", description = "Perform bulk operations on multiple servers")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Bulk operation completed"),
        @ApiResponse(responseCode = "400", description = "Invalid input"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<BulkOperationResult>> bulkServerOperation(
            @Parameter(description = "Bulk operation request", required = true) 
            @Valid @RequestBody BulkServerOperationRequest request) {

        logger.info("📊 Performing bulk operation: {} on {} servers", request.getOperation(), request.getServerIds().size());

        try {
            BulkOperationResult result = serverService.performBulkOperation(request);

            return ResponseEntity.ok(ApiResponse.success(result, "Bulk operation completed"));

        } catch (IllegalArgumentException e) {
            logger.warn("⚠️ Invalid bulk operation request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid input", e.getMessage()));

        } catch (Exception e) {
            logger.error("❌ Error performing bulk operation: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to perform bulk operation", e.getMessage()));
        }
    }

    /**
     * Server health check
     */
    @PostMapping("/v1/servers/{id}/health-check")
    @ApiVersion("v1")
    @Operation(summary = "Perform server health check", description = "Trigger a health check for a specific server")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Health check completed",
                    content = @Content(schema = @Schema(implementation = ServerHealthDto.class))),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<ServerHealthDto>> performHealthCheck(
            @Parameter(description = "Server ID", required = true) @PathVariable @NotNull UUID id) {

        logger.info("📊 Performing health check for server: {}", id);

        try {
            ServerHealthDto health = serverService.performHealthCheck(id);

            if (health != null) {
                return ResponseEntity.ok(ApiResponse.success(health, "Health check completed"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Server not found", "No server found with ID: " + id));
            }

        } catch (Exception e) {
            logger.error("❌ Error performing health check for server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to perform health check", e.getMessage()));
        }
    }

    /**
     * Get server metrics
     */
    @GetMapping("/v1/servers/{id}/metrics")
    @ApiVersion("v1")
    @Operation(summary = "Get server metrics", description = "Retrieve metrics for a specific server")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Metrics retrieved successfully",
                    content = @Content(schema = @Schema(implementation = ServerMetricsDto.class))),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse<ServerMetricsDto>> getServerMetrics(
            @Parameter(description = "Server ID", required = true) @PathVariable @NotNull UUID id,
            @Parameter(description = "Metric names to retrieve") @RequestParam(required = false) List<String> metrics,
            @Parameter(description = "Time range for metrics") @RequestParam(defaultValue = "1h") String timeRange) {

        logger.info("📊 Getting metrics for server: {} (timeRange: {})", id, timeRange);

        try {
            ServerMetricsRequest metricsRequest = ServerMetricsRequest.builder()
                    .serverId(id)
                    .metricNames(metrics)
                    .timeRange(timeRange)
                    .build();

            ServerMetricsDto serverMetrics = serverService.getServerMetrics(metricsRequest);

            if (serverMetrics != null) {
                return ResponseEntity.ok(ApiResponse.success(serverMetrics, "Metrics retrieved successfully"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Server not found", "No server found with ID: " + id));
            }

        } catch (Exception e) {
            logger.error("❌ Error retrieving metrics for server {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve metrics", e.getMessage()));
        }
    }
}
