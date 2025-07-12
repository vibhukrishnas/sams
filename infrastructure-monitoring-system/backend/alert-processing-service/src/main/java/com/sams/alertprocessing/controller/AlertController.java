package com.sams.alertprocessing.controller;

import com.sams.alertprocessing.dto.*;
import com.sams.alertprocessing.entity.AlertSeverity;
import com.sams.alertprocessing.entity.AlertStatus;
import com.sams.alertprocessing.service.AlertProcessingService;
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

/**
 * Alert Management Controller for SAMS
 * 
 * Provides REST endpoints for:
 * - Alert processing and ingestion
 * - Alert lifecycle management (acknowledge, resolve, close)
 * - Alert search and filtering
 * - Alert escalation and suppression
 * - Alert correlation and deduplication
 * - Alert statistics and reporting
 */
@RestController
@RequestMapping("/api/v1/alerts")
@Tag(name = "Alert Management", description = "Alert processing and management operations")
@SecurityRequirement(name = "bearerAuth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AlertController {

    private static final Logger logger = LoggerFactory.getLogger(AlertController.class);

    @Autowired
    private AlertProcessingService alertProcessingService;

    /**
     * Process new alert
     */
    @PostMapping
    @PreAuthorize("hasAuthority('ALERT_CREATE')")
    @Operation(summary = "Process alert", description = "Process and create a new alert")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Alert processed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertResponse> processAlert(
            @Valid @RequestBody AlertCreateRequest request,
            Principal principal) {
        
        logger.info("Processing alert: {} from {} by {}", request.getAlertType(), request.getSource(), principal.getName());

        AlertResponse response = alertProcessingService.processAlert(request, principal.getName());

        logger.info("Alert processed successfully: {} (ID: {})", response.getAlertType(), response.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get alert by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ALERT_READ')")
    @Operation(summary = "Get alert by ID", description = "Retrieve alert information by ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Alert found"),
        @ApiResponse(responseCode = "404", description = "Alert not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertResponse> getAlertById(
            @Parameter(description = "Alert ID") @PathVariable Long id) {
        
        logger.debug("Getting alert by ID: {}", id);

        AlertResponse response = alertProcessingService.getAlertById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Search alerts with pagination
     */
    @PostMapping("/search")
    @PreAuthorize("hasAuthority('ALERT_READ')")
    @Operation(summary = "Search alerts", description = "Search alerts with filtering and pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Search completed"),
        @ApiResponse(responseCode = "400", description = "Invalid search criteria"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Page<AlertResponse>> searchAlerts(
            @RequestBody(required = false) AlertSearchRequest searchRequest,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir) {
        
        logger.debug("Searching alerts with criteria: {}", searchRequest);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        if (searchRequest == null) {
            searchRequest = new AlertSearchRequest();
        }

        Page<AlertResponse> response = alertProcessingService.searchAlerts(searchRequest, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all alerts with pagination
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ALERT_READ')")
    @Operation(summary = "Get all alerts", description = "Retrieve all alerts with pagination")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Alerts retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<Page<AlertResponse>> getAllAlerts(
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir) {
        
        logger.debug("Getting all alerts - page: {}, size: {}", page, size);

        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<AlertResponse> response = alertProcessingService.getAllAlerts(pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get active alerts
     */
    @GetMapping("/active")
    @PreAuthorize("hasAuthority('ALERT_READ')")
    @Operation(summary = "Get active alerts", description = "Retrieve all active (open/acknowledged) alerts")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Active alerts retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<AlertResponse>> getActiveAlerts() {
        logger.debug("Getting active alerts");

        List<AlertResponse> response = alertProcessingService.getActiveAlerts();
        return ResponseEntity.ok(response);
    }

    /**
     * Acknowledge alert
     */
    @PostMapping("/{id}/acknowledge")
    @PreAuthorize("hasAuthority('ALERT_ACKNOWLEDGE')")
    @Operation(summary = "Acknowledge alert", description = "Acknowledge an alert")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Alert acknowledged successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or alert state"),
        @ApiResponse(responseCode = "404", description = "Alert not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertResponse> acknowledgeAlert(
            @Parameter(description = "Alert ID") @PathVariable Long id,
            @Valid @RequestBody AlertAcknowledgeRequest request,
            Principal principal) {
        
        logger.info("Acknowledging alert: {} by {}", id, principal.getName());

        AlertResponse response = alertProcessingService.acknowledgeAlert(id, request, principal.getName());

        logger.info("Alert acknowledged successfully: {}", id);
        return ResponseEntity.ok(response);
    }

    /**
     * Resolve alert
     */
    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAuthority('ALERT_RESOLVE')")
    @Operation(summary = "Resolve alert", description = "Resolve an alert")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Alert resolved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or alert state"),
        @ApiResponse(responseCode = "404", description = "Alert not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertResponse> resolveAlert(
            @Parameter(description = "Alert ID") @PathVariable Long id,
            @Valid @RequestBody AlertResolveRequest request,
            Principal principal) {
        
        logger.info("Resolving alert: {} by {}", id, principal.getName());

        AlertResponse response = alertProcessingService.resolveAlert(id, request, principal.getName());

        logger.info("Alert resolved successfully: {}", id);
        return ResponseEntity.ok(response);
    }

    /**
     * Close alert
     */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('ALERT_DELETE')")
    @Operation(summary = "Close alert", description = "Close an alert")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Alert closed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid alert state"),
        @ApiResponse(responseCode = "404", description = "Alert not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertResponse> closeAlert(
            @Parameter(description = "Alert ID") @PathVariable Long id,
            Principal principal) {
        
        logger.info("Closing alert: {} by {}", id, principal.getName());

        AlertResponse response = alertProcessingService.closeAlert(id, principal.getName());

        logger.info("Alert closed successfully: {}", id);
        return ResponseEntity.ok(response);
    }

    /**
     * Escalate alert
     */
    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasAuthority('ALERT_UPDATE')")
    @Operation(summary = "Escalate alert", description = "Escalate an alert to higher level")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Alert escalated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or alert state"),
        @ApiResponse(responseCode = "404", description = "Alert not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertResponse> escalateAlert(
            @Parameter(description = "Alert ID") @PathVariable Long id,
            @Valid @RequestBody AlertEscalateRequest request,
            Principal principal) {
        
        logger.info("Escalating alert: {} by {}", id, principal.getName());

        AlertResponse response = alertProcessingService.escalateAlert(id, request, principal.getName());

        logger.info("Alert escalated successfully: {} (Level: {})", id, response.getEscalationLevel());
        return ResponseEntity.ok(response);
    }

    /**
     * Suppress alert
     */
    @PostMapping("/{id}/suppress")
    @PreAuthorize("hasAuthority('ALERT_UPDATE')")
    @Operation(summary = "Suppress alert", description = "Suppress an alert temporarily")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Alert suppressed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or alert state"),
        @ApiResponse(responseCode = "404", description = "Alert not found"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertResponse> suppressAlert(
            @Parameter(description = "Alert ID") @PathVariable Long id,
            @Valid @RequestBody AlertSuppressRequest request,
            Principal principal) {
        
        logger.info("Suppressing alert: {} by {}", id, principal.getName());

        AlertResponse response = alertProcessingService.suppressAlert(id, request, principal.getName());

        logger.info("Alert suppressed successfully: {} until {}", id, response.getSuppressedUntil());
        return ResponseEntity.ok(response);
    }

    /**
     * Get alerts by correlation ID
     */
    @GetMapping("/correlation/{correlationId}")
    @PreAuthorize("hasAuthority('ALERT_READ')")
    @Operation(summary = "Get correlated alerts", description = "Get all alerts with specific correlation ID")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Correlated alerts retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<AlertResponse>> getAlertsByCorrelationId(
            @Parameter(description = "Correlation ID") @PathVariable String correlationId) {
        
        logger.debug("Getting alerts by correlation ID: {}", correlationId);

        List<AlertResponse> response = alertProcessingService.getAlertsByCorrelationId(correlationId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get alerts by server ID
     */
    @GetMapping("/server/{serverId}")
    @PreAuthorize("hasAuthority('ALERT_READ')")
    @Operation(summary = "Get alerts by server", description = "Get all alerts for specific server")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Server alerts retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<List<AlertResponse>> getAlertsByServerId(
            @Parameter(description = "Server ID") @PathVariable Long serverId) {
        
        logger.debug("Getting alerts by server ID: {}", serverId);

        List<AlertResponse> response = alertProcessingService.getAlertsByServerId(serverId);
        return ResponseEntity.ok(response);
    }

    /**
     * Get alert statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAuthority('ALERT_READ')")
    @Operation(summary = "Get alert statistics", description = "Get alert statistics and metrics")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statistics retrieved"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    })
    public ResponseEntity<AlertProcessingService.AlertStatistics> getAlertStatistics() {
        logger.debug("Getting alert statistics");

        AlertProcessingService.AlertStatistics statistics = alertProcessingService.getAlertStatistics();
        return ResponseEntity.ok(statistics);
    }

    /**
     * Get alert severities
     */
    @GetMapping("/severities")
    @Operation(summary = "Get alert severities", description = "Get all available alert severity levels")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Severities retrieved")
    })
    public ResponseEntity<AlertSeverity[]> getAlertSeverities() {
        return ResponseEntity.ok(AlertSeverity.values());
    }

    /**
     * Get alert statuses
     */
    @GetMapping("/statuses")
    @Operation(summary = "Get alert statuses", description = "Get all available alert status values")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Statuses retrieved")
    })
    public ResponseEntity<AlertStatus[]> getAlertStatuses() {
        return ResponseEntity.ok(AlertStatus.values());
    }
}
