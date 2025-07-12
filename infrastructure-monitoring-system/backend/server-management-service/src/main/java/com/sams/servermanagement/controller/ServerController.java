package com.sams.servermanagement.controller;

import com.sams.servermanagement.dto.*;
import com.sams.servermanagement.entity.ServerStatus;
import com.sams.servermanagement.service.ServerService;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Server Management Controller for SAMS
 * 
 * Provides REST endpoints for:
 * - Server CRUD operations
 * - Server search and filtering
 * - Health check management
 * - Metrics collection configuration
 * - Server grouping and tagging
 * - Auto-discovery
 * - Server statistics
 */
@RestController
@RequestMapping("/api/v1/servers")
@Tag(name = "Server Management", description = "Server management operations")
@SecurityRequirement(name = "bearerAuth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ServerController {

    private static final Logger logger = LoggerFactory.getLogger(ServerController.class);

    @Autowired
    private ServerService serverService;

    /**
     * Register new server
     */
    @PostMapping
    @PreAuthorize("hasAuthority('SERVER_CREATE')")
    @Operation(summary = "Register server", description = "Register a new server for monitoring")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Server registered successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "409", description = "Server already exists"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ServerResponse> registerServer(
            @Valid @RequestBody ServerCreateRequest request,
            Principal principal) {
        
        logger.info("Registering server: {} by {}", request.getName(), principal.getName());

        ServerResponse response = serverService.registerServer(request, principal.getName());

        logger.info("Server registered successfully: {} (ID: {})", response.getName(), response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get server by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get server by ID", description = "Retrieve server information by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server found"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ServerResponse> getServerById(
            @Parameter(description = "Server ID") @PathVariable Long id) {
        
        logger.debug("Getting server by ID: {}", id);

        ServerResponse response = serverService.getServerById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Get server by hostname
     */
    @GetMapping("/hostname/{hostname}")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get server by hostname", description = "Retrieve server information by hostname")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server found"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ServerResponse> getServerByHostname(
            @Parameter(description = "Hostname") @PathVariable String hostname) {
        
        logger.debug("Getting server by hostname: {}", hostname);

        ServerResponse response = serverService.getServerByHostname(hostname);
        return ResponseEntity.ok(response);
    }

    /**
     * Search servers with pagination
     */
    @PostMapping("/search")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Search servers", description = "Search servers with filtering and pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Search completed"),
        @ApiResponse(responseCode = "400", description = "Invalid search criteria"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Page<ServerResponse>> searchServers(
            @RequestBody(required = false) ServerSearchRequest searchRequest,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "name") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "asc") String sortDir) {
        
        logger.debug("Searching servers with criteria: {}", searchRequest);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        if (searchRequest == null) {
            searchRequest = new ServerSearchRequest();
        }

        Page<ServerResponse> response = serverService.searchServers(searchRequest, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all servers with pagination
     */
    @GetMapping
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get all servers", description = "Retrieve all servers with pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Servers retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Page<ServerResponse>> getAllServers(
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "name") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "asc") String sortDir) {
        
        logger.debug("Getting all servers - page: {}, size: {}", page, size);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ServerResponse> response = serverService.getAllServers(pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Update server
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SERVER_UPDATE')")
    @Operation(summary = "Update server", description = "Update server information")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "409", description = "Conflict with existing data"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ServerResponse> updateServer(
            @Parameter(description = "Server ID") @PathVariable Long id,
            @Valid @RequestBody ServerUpdateRequest request,
            Principal principal) {
        
        logger.info("Updating server: {} by {}", id, principal.getName());

        ServerResponse response = serverService.updateServer(id, request, principal.getName());

        logger.info("Server updated successfully: {} (ID: {})", response.getName(), response.getId());
        return ResponseEntity.ok(response);
    }

    /**
     * Delete server
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('SERVER_DELETE')")
    @Operation(summary = "Delete server", description = "Delete server from monitoring")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "204", description = "Server deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Void> deleteServer(
            @Parameter(description = "Server ID") @PathVariable Long id,
            Principal principal) {
        
        logger.info("Deleting server: {} by {}", id, principal.getName());

        serverService.deleteServer(id, principal.getName());

        logger.info("Server deleted successfully: {}", id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Perform health check
     */
    @PostMapping("/{id}/health-check")
    @PreAuthorize("hasAuthority('SERVER_MANAGE')")
    @Operation(summary = "Perform health check", description = "Perform immediate health check on server")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Health check completed"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<HealthCheckResult> performHealthCheck(
            @Parameter(description = "Server ID") @PathVariable Long id) {
        
        logger.info("Performing health check for server: {}", id);

        HealthCheckResult result = serverService.performHealthCheck(id);

        logger.info("Health check completed for server: {} - Status: {}", id, result.getStatus());
        return ResponseEntity.ok(result);
    }

    /**
     * Get servers by status
     */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get servers by status", description = "Get all servers with specific status")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Servers retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<ServerResponse>> getServersByStatus(
            @Parameter(description = "Server status") @PathVariable ServerStatus status) {
        
        logger.debug("Getting servers by status: {}", status);

        List<ServerResponse> response = serverService.getServersByStatus(status);
        return ResponseEntity.ok(response);
    }

    /**
     * Get servers by environment
     */
    @GetMapping("/environment/{environment}")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get servers by environment", description = "Get all servers in specific environment")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Servers retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<ServerResponse>> getServersByEnvironment(
            @Parameter(description = "Environment") @PathVariable String environment) {
        
        logger.debug("Getting servers by environment: {}", environment);

        List<ServerResponse> response = serverService.getServersByEnvironment(environment);
        return ResponseEntity.ok(response);
    }

    /**
     * Get servers by group
     */
    @GetMapping("/group/{group}")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get servers by group", description = "Get all servers in specific group")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Servers retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<ServerResponse>> getServersByGroup(
            @Parameter(description = "Server group") @PathVariable String group) {
        
        logger.debug("Getting servers by group: {}", group);

        List<ServerResponse> response = serverService.getServersByGroup(group);
        return ResponseEntity.ok(response);
    }

    /**
     * Get servers by tag
     */
    @GetMapping("/tag/{tagKey}/{tagValue}")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get servers by tag", description = "Get all servers with specific tag")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Servers retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<ServerResponse>> getServersByTag(
            @Parameter(description = "Tag key") @PathVariable String tagKey,
            @Parameter(description = "Tag value") @PathVariable String tagValue) {
        
        logger.debug("Getting servers by tag: {}={}", tagKey, tagValue);

        List<ServerResponse> response = serverService.getServersByTag(tagKey, tagValue);
        return ResponseEntity.ok(response);
    }

    /**
     * Update server tags
     */
    @PutMapping("/{id}/tags")
    @PreAuthorize("hasAuthority('SERVER_UPDATE')")
    @Operation(summary = "Update server tags", description = "Update tags for server")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Tags updated successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ApiResponse> updateServerTags(
            @Parameter(description = "Server ID") @PathVariable Long id,
            @RequestBody Map<String, String> tags,
            Principal principal) {
        
        logger.info("Updating tags for server: {} by {}", id, principal.getName());

        serverService.updateServerTags(id, tags, principal.getName());

        logger.info("Server tags updated successfully: {}", id);
        return ResponseEntity.ok(new ApiResponse("Server tags updated successfully", true));
    }

    /**
     * Update server configuration
     */
    @PutMapping("/{id}/configuration")
    @PreAuthorize("hasAuthority('SERVER_UPDATE')")
    @Operation(summary = "Update server configuration", description = "Update configuration for server")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Configuration updated successfully"),
        @ApiResponse(responseCode = "404", description = "Server not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ApiResponse> updateServerConfiguration(
            @Parameter(description = "Server ID") @PathVariable Long id,
            @RequestBody Map<String, String> configuration,
            Principal principal) {
        
        logger.info("Updating configuration for server: {} by {}", id, principal.getName());

        serverService.updateServerConfiguration(id, configuration, principal.getName());

        logger.info("Server configuration updated successfully: {}", id);
        return ResponseEntity.ok(new ApiResponse("Server configuration updated successfully", true));
    }

    /**
     * Auto-discover servers
     */
    @PostMapping("/discover")
    @PreAuthorize("hasAuthority('SERVER_CREATE')")
    @Operation(summary = "Discover servers", description = "Auto-discover servers in network")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Discovery completed"),
        @ApiResponse(responseCode = "400", description = "Invalid discovery request"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ServerDiscoveryResponse> discoverServers(
            @Valid @RequestBody ServerDiscoveryRequest request,
            Principal principal) {
        
        logger.info("Starting server discovery by {}: {}", principal.getName(), request);

        List<ServerResponse> discoveredServers = serverService.discoverServers(request, principal.getName());

        ServerDiscoveryResponse response = new ServerDiscoveryResponse();
        response.setDiscoveredCount(discoveredServers.size());
        response.setServers(discoveredServers);
        response.setMessage("Server discovery completed successfully");

        logger.info("Server discovery completed: {} servers discovered", discoveredServers.size());
        return ResponseEntity.ok(response);
    }

    /**
     * Get server statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAuthority('SERVER_READ')")
    @Operation(summary = "Get server statistics", description = "Get server statistics and metrics")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<ServerService.ServerStatistics> getServerStatistics() {
        logger.debug("Getting server statistics");

        ServerService.ServerStatistics statistics = serverService.getServerStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Generic API Response DTO
     */
    public static class ApiResponse {
        private String message;
        private boolean success;

        public ApiResponse(String message, boolean success) {
            this.message = message;
            this.success = success;
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
    }
}
