package com.sams.enterprise.controller;

import com.sams.enterprise.entity.Alert;
import com.sams.enterprise.service.AlertProcessingService;
import com.sams.enterprise.dto.AlertCreateRequest;
import com.sams.enterprise.dto.AlertAcknowledgeRequest;
import com.sams.enterprise.dto.AlertResolveRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * Enterprise Alert Management REST Controller
 */
@RestController
@RequestMapping("/api/v1/alerts")
@CrossOrigin(origins = "*")
public class AlertController {

    @Autowired
    private AlertProcessingService alertProcessingService;

    /**
     * Get all alerts
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long serverId) {
        
        try {
            // Create response with alerts and pagination info
            List<Alert> alerts;
            
            if (severity != null) {
                Alert.AlertSeverity alertSeverity = Alert.AlertSeverity.valueOf(severity.toUpperCase());
                alerts = alertProcessingService.getAlertsBySeverity(alertSeverity);
            } else if (status != null) {
                alerts = alertProcessingService.getOpenAlerts(); // Simplified for now
            } else if (serverId != null) {
                alerts = alertProcessingService.getAlertsByServer(serverId);
            } else {
                alerts = alertProcessingService.getOpenAlerts();
            }
            
            Map<String, Object> response = Map.of(
                "data", alerts,
                "total", alerts.size(),
                "page", page,
                "size", size
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get alert by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<Alert> getAlertById(@PathVariable Long id) {
        try {
            // Implementation would fetch alert by ID
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create new alert
     */
    @PostMapping
    public ResponseEntity<Alert> createAlert(@Valid @RequestBody AlertCreateRequest request) {
        try {
            Alert alert = alertProcessingService.createAlert(request);
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Acknowledge alert
     */
    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<Alert> acknowledgeAlert(@PathVariable Long id,
                                                @Valid @RequestBody AlertAcknowledgeRequest request) {
        try {
            Alert alert = alertProcessingService.acknowledgeAlert(id, request.getUserId(), request.getNotes());
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Resolve alert
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<Alert> resolveAlert(@PathVariable Long id,
                                            @Valid @RequestBody AlertResolveRequest request) {
        try {
            Alert alert = alertProcessingService.resolveAlert(id, request.getUserId(), request.getResolutionNotes());
            return ResponseEntity.ok(alert);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get critical alerts
     */
    @GetMapping("/critical")
    public ResponseEntity<List<Alert>> getCriticalAlerts() {
        try {
            List<Alert> alerts = alertProcessingService.getCriticalAlerts();
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get open alerts
     */
    @GetMapping("/open")
    public ResponseEntity<List<Alert>> getOpenAlerts() {
        try {
            List<Alert> alerts = alertProcessingService.getOpenAlerts();
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get alerts by server
     */
    @GetMapping("/server/{serverId}")
    public ResponseEntity<List<Alert>> getAlertsByServer(@PathVariable Long serverId) {
        try {
            List<Alert> alerts = alertProcessingService.getAlertsByServer(serverId);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get alert statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getAlertStatistics() {
        try {
            Map<String, Object> stats = alertProcessingService.getAlertStatistics();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Bulk acknowledge alerts
     */
    @PostMapping("/bulk/acknowledge")
    public ResponseEntity<Map<String, Object>> bulkAcknowledgeAlerts(@RequestBody BulkAlertRequest request) {
        try {
            alertProcessingService.bulkAcknowledgeAlerts(request.getAlertIds(), request.getUserId(), request.getNotes());
            
            Map<String, Object> response = Map.of(
                "success", true,
                "message", "Alerts acknowledged successfully",
                "count", request.getAlertIds().size()
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Suppress alerts by rule
     */
    @PostMapping("/suppress/{ruleId}")
    public ResponseEntity<Map<String, Object>> suppressAlertsByRule(@PathVariable String ruleId,
                                                                  @RequestParam(defaultValue = "60") int durationMinutes) {
        try {
            alertProcessingService.suppressAlertsByRule(ruleId, durationMinutes);
            
            Map<String, Object> response = Map.of(
                "success", true,
                "message", "Alerts suppressed successfully",
                "ruleId", ruleId,
                "duration", durationMinutes
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Get alerts by severity
     */
    @GetMapping("/severity/{severity}")
    public ResponseEntity<List<Alert>> getAlertsBySeverity(@PathVariable String severity) {
        try {
            Alert.AlertSeverity alertSeverity = Alert.AlertSeverity.valueOf(severity.toUpperCase());
            List<Alert> alerts = alertProcessingService.getAlertsBySeverity(alertSeverity);
            return ResponseEntity.ok(alerts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Bulk alert request DTO
     */
    public static class BulkAlertRequest {
        private List<Long> alertIds;
        private Long userId;
        private String notes;

        // Getters and setters
        public List<Long> getAlertIds() { return alertIds; }
        public void setAlertIds(List<Long> alertIds) { this.alertIds = alertIds; }
        
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
    }
}
