package com.sams.alertprocessing.service;

import com.sams.alertprocessing.dto.*;
import com.sams.alertprocessing.entity.Alert;
import com.sams.alertprocessing.entity.AlertSeverity;
import com.sams.alertprocessing.entity.AlertStatus;
import com.sams.alertprocessing.exception.AlertNotFoundException;
import com.sams.alertprocessing.repository.AlertRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Alert Processing Service for SAMS Alert Management
 * 
 * Provides comprehensive alert processing functionality including:
 * - Alert ingestion and processing
 * - Rule-based correlation and deduplication
 * - Alert lifecycle management
 * - Severity classification and escalation
 * - Suppression and maintenance windows
 * - Notification management
 */
@Service
@Transactional
public class AlertProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(AlertProcessingService.class);

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private AlertRuleEngine alertRuleEngine;

    @Autowired
    private AlertCorrelationService alertCorrelationService;

    @Autowired
    private AlertNotificationService alertNotificationService;

    @Autowired
    private AlertEscalationService alertEscalationService;

    @Autowired
    private AlertSuppressionService alertSuppressionService;

    @Autowired
    private AuditService auditService;

    /**
     * Process incoming alert
     */
    public AlertResponse processAlert(AlertCreateRequest request, String createdBy) {
        logger.info("Processing alert: {} from {}", request.getAlertType(), request.getSource());

        // Create alert entity
        Alert alert = new Alert();
        alert.setSource(request.getSource());
        alert.setServerId(request.getServerId());
        alert.setServerName(request.getServerName());
        alert.setAlertType(request.getAlertType());
        alert.setSeverity(request.getSeverity() != null ? request.getSeverity() : AlertSeverity.INFO);
        alert.setMessage(request.getMessage());
        alert.setDescription(request.getDescription());
        alert.setCreatedBy(createdBy);

        // Add alert data
        if (request.getAlertData() != null) {
            alert.setAlertData(request.getAlertData());
        }

        // Add tags
        if (request.getTags() != null) {
            alert.setTags(request.getTags());
        }

        // Generate correlation key for deduplication
        String correlationKey = alertCorrelationService.generateCorrelationKey(alert);
        alert.setCorrelationKey(correlationKey);

        // Check for duplicate alerts
        Alert existingAlert = alertRepository.findActiveAlertByCorrelationKey(correlationKey);
        if (existingAlert != null) {
            return handleDuplicateAlert(existingAlert, alert);
        }

        // Apply alert rules
        alertRuleEngine.applyRules(alert);

        // Check for correlation with other alerts
        String correlationId = alertCorrelationService.correlateAlert(alert);
        if (correlationId != null) {
            alert.setCorrelationId(correlationId);
        } else {
            alert.setCorrelationId(UUID.randomUUID().toString());
        }

        // Check for suppression
        if (alertSuppressionService.isAlertSuppressed(alert)) {
            alert.setSuppressed(true);
            alert.setSuppressionReason("Matched suppression rule");
            logger.info("Alert suppressed: {}", alert.getId());
        }

        // Save alert
        alert = alertRepository.save(alert);

        // Send notifications if not suppressed
        if (!alert.isSuppressed()) {
            alertNotificationService.sendNotification(alert);
        }

        // Schedule escalation if required
        if (alert.getSeverity().requiresEscalation() && !alert.isSuppressed()) {
            alertEscalationService.scheduleEscalation(alert);
        }

        // Audit log
        auditService.logAlertCreated(alert.getId(), createdBy);

        logger.info("Alert processed successfully: {} (ID: {})", alert.getAlertType(), alert.getId());
        return convertToAlertResponse(alert);
    }

    /**
     * Handle duplicate alert
     */
    private AlertResponse handleDuplicateAlert(Alert existingAlert, Alert newAlert) {
        logger.info("Handling duplicate alert for correlation key: {}", existingAlert.getCorrelationKey());

        // Increment duplicate count
        existingAlert.incrementDuplicateCount();

        // Update severity if new alert is more severe
        if (newAlert.getSeverity().isHigherThan(existingAlert.getSeverity())) {
            existingAlert.setSeverity(newAlert.getSeverity());
            logger.info("Alert severity escalated from {} to {}", 
                       existingAlert.getSeverity(), newAlert.getSeverity());
        }

        // Update message and description if provided
        if (newAlert.getMessage() != null && !newAlert.getMessage().equals(existingAlert.getMessage())) {
            existingAlert.setMessage(newAlert.getMessage());
        }
        if (newAlert.getDescription() != null) {
            existingAlert.setDescription(newAlert.getDescription());
        }

        // Merge alert data and tags
        if (newAlert.getAlertData() != null) {
            existingAlert.getAlertData().putAll(newAlert.getAlertData());
        }
        if (newAlert.getTags() != null) {
            existingAlert.getTags().putAll(newAlert.getTags());
        }

        existingAlert = alertRepository.save(existingAlert);

        // Send notification for duplicate if severity increased
        if (newAlert.getSeverity().isHigherThan(existingAlert.getSeverity()) && !existingAlert.isSuppressed()) {
            alertNotificationService.sendNotification(existingAlert);
        }

        logger.info("Duplicate alert handled: {} (Count: {})", 
                   existingAlert.getId(), existingAlert.getDuplicateCount());
        return convertToAlertResponse(existingAlert);
    }

    /**
     * Acknowledge alert
     */
    public AlertResponse acknowledgeAlert(Long alertId, AlertAcknowledgeRequest request, String acknowledgedBy) {
        logger.info("Acknowledging alert: {} by {}", alertId, acknowledgedBy);

        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new AlertNotFoundException("Alert not found: " + alertId));

        if (!alert.getStatus().canAcknowledge()) {
            throw new IllegalStateException("Alert cannot be acknowledged in current status: " + alert.getStatus());
        }

        alert.acknowledge(acknowledgedBy, request.getNote());
        alert = alertRepository.save(alert);

        // Cancel scheduled escalations
        alertEscalationService.cancelEscalation(alertId);

        // Send acknowledgment notification
        alertNotificationService.sendAcknowledgmentNotification(alert);

        // Audit log
        auditService.logAlertAcknowledged(alert.getId(), acknowledgedBy);

        logger.info("Alert acknowledged successfully: {}", alertId);
        return convertToAlertResponse(alert);
    }

    /**
     * Resolve alert
     */
    public AlertResponse resolveAlert(Long alertId, AlertResolveRequest request, String resolvedBy) {
        logger.info("Resolving alert: {} by {}", alertId, resolvedBy);

        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new AlertNotFoundException("Alert not found: " + alertId));

        if (!alert.getStatus().canResolve()) {
            throw new IllegalStateException("Alert cannot be resolved in current status: " + alert.getStatus());
        }

        alert.resolve(resolvedBy, request.getNote(), false);
        alert = alertRepository.save(alert);

        // Cancel scheduled escalations
        alertEscalationService.cancelEscalation(alertId);

        // Resolve correlated alerts if requested
        if (request.getResolveCorrelated() != null && request.getResolveCorrelated()) {
            resolveCorrelatedAlerts(alert.getCorrelationId(), resolvedBy, request.getNote());
        }

        // Send resolution notification
        alertNotificationService.sendResolutionNotification(alert);

        // Audit log
        auditService.logAlertResolved(alert.getId(), resolvedBy);

        logger.info("Alert resolved successfully: {}", alertId);
        return convertToAlertResponse(alert);
    }

    /**
     * Close alert
     */
    public AlertResponse closeAlert(Long alertId, String closedBy) {
        logger.info("Closing alert: {} by {}", alertId, closedBy);

        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new AlertNotFoundException("Alert not found: " + alertId));

        if (!alert.getStatus().canClose()) {
            throw new IllegalStateException("Alert cannot be closed in current status: " + alert.getStatus());
        }

        alert.close(closedBy);
        alert = alertRepository.save(alert);

        // Audit log
        auditService.logAlertClosed(alert.getId(), closedBy);

        logger.info("Alert closed successfully: {}", alertId);
        return convertToAlertResponse(alert);
    }

    /**
     * Escalate alert
     */
    public AlertResponse escalateAlert(Long alertId, AlertEscalateRequest request, String escalatedBy) {
        logger.info("Escalating alert: {} by {}", alertId, escalatedBy);

        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new AlertNotFoundException("Alert not found: " + alertId));

        if (!alert.getStatus().canEscalate()) {
            throw new IllegalStateException("Alert cannot be escalated in current status: " + alert.getStatus());
        }

        // Escalate severity if requested
        if (request.getEscalateSeverity() != null && request.getEscalateSeverity()) {
            alert.setSeverity(alert.getSeverity().escalate());
        }

        alert.escalate();
        alert.setStatus(AlertStatus.ESCALATED);
        alert.setUpdatedBy(escalatedBy);

        alert = alertRepository.save(alert);

        // Send escalation notification
        alertNotificationService.sendEscalationNotification(alert);

        // Schedule next escalation
        alertEscalationService.scheduleEscalation(alert);

        // Audit log
        auditService.logAlertEscalated(alert.getId(), escalatedBy);

        logger.info("Alert escalated successfully: {} (Level: {})", alertId, alert.getEscalationLevel());
        return convertToAlertResponse(alert);
    }

    /**
     * Suppress alert
     */
    public AlertResponse suppressAlert(Long alertId, AlertSuppressRequest request, String suppressedBy) {
        logger.info("Suppressing alert: {} by {}", alertId, suppressedBy);

        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new AlertNotFoundException("Alert not found: " + alertId));

        if (!alert.getStatus().canSuppress()) {
            throw new IllegalStateException("Alert cannot be suppressed in current status: " + alert.getStatus());
        }

        LocalDateTime suppressedUntil = null;
        if (request.getDurationMinutes() != null && request.getDurationMinutes() > 0) {
            suppressedUntil = LocalDateTime.now().plusMinutes(request.getDurationMinutes());
        }

        alert.suppress(request.getReason(), suppressedUntil);
        alert.setStatus(AlertStatus.SUPPRESSED);
        alert.setUpdatedBy(suppressedBy);

        alert = alertRepository.save(alert);

        // Cancel scheduled escalations
        alertEscalationService.cancelEscalation(alertId);

        // Audit log
        auditService.logAlertSuppressed(alert.getId(), suppressedBy);

        logger.info("Alert suppressed successfully: {} until {}", alertId, suppressedUntil);
        return convertToAlertResponse(alert);
    }

    /**
     * Get alert by ID
     */
    @Transactional(readOnly = true)
    public AlertResponse getAlertById(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new AlertNotFoundException("Alert not found: " + alertId));
        return convertToAlertResponse(alert);
    }

    /**
     * Search alerts with pagination
     */
    @Transactional(readOnly = true)
    public Page<AlertResponse> searchAlerts(AlertSearchRequest request, Pageable pageable) {
        Page<Alert> alerts = alertRepository.searchAlerts(
                request.getSource(),
                request.getServerId(),
                request.getAlertType(),
                request.getSeverity(),
                request.getStatus(),
                request.getCorrelationId(),
                request.getCreatedAfter(),
                request.getCreatedBefore(),
                pageable
        );

        return alerts.map(this::convertToAlertResponse);
    }

    /**
     * Get all alerts with pagination
     */
    @Transactional(readOnly = true)
    public Page<AlertResponse> getAllAlerts(Pageable pageable) {
        Page<Alert> alerts = alertRepository.findAll(pageable);
        return alerts.map(this::convertToAlertResponse);
    }

    /**
     * Get active alerts
     */
    @Transactional(readOnly = true)
    public List<AlertResponse> getActiveAlerts() {
        List<Alert> alerts = alertRepository.findActiveAlerts();
        return alerts.stream()
                .map(this::convertToAlertResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get alerts by correlation ID
     */
    @Transactional(readOnly = true)
    public List<AlertResponse> getAlertsByCorrelationId(String correlationId) {
        List<Alert> alerts = alertRepository.findByCorrelationId(correlationId);
        return alerts.stream()
                .map(this::convertToAlertResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get alerts by server ID
     */
    @Transactional(readOnly = true)
    public List<AlertResponse> getAlertsByServerId(Long serverId) {
        List<Alert> alerts = alertRepository.findByServerId(serverId);
        return alerts.stream()
                .map(this::convertToAlertResponse)
                .collect(Collectors.toList());
    }

    /**
     * Resolve correlated alerts
     */
    private void resolveCorrelatedAlerts(String correlationId, String resolvedBy, String note) {
        if (correlationId == null) return;

        List<Alert> correlatedAlerts = alertRepository.findActiveAlertsByCorrelationId(correlationId);
        for (Alert correlatedAlert : correlatedAlerts) {
            if (correlatedAlert.getStatus().canResolve()) {
                correlatedAlert.resolve(resolvedBy, "Auto-resolved with correlated alert: " + note, true);
                alertRepository.save(correlatedAlert);
                
                // Send notification
                alertNotificationService.sendResolutionNotification(correlatedAlert);
                
                // Audit log
                auditService.logAlertResolved(correlatedAlert.getId(), resolvedBy);
            }
        }
    }

    /**
     * Get alert statistics
     */
    @Transactional(readOnly = true)
    public AlertStatistics getAlertStatistics() {
        Object[] stats = alertRepository.getAlertStatistics();
        
        return AlertStatistics.builder()
                .totalAlerts(((Number) stats[0]).longValue())
                .openAlerts(((Number) stats[1]).longValue())
                .acknowledgedAlerts(((Number) stats[2]).longValue())
                .resolvedAlerts(((Number) stats[3]).longValue())
                .criticalAlerts(((Number) stats[4]).longValue())
                .suppressedAlerts(((Number) stats[5]).longValue())
                .escalatedAlerts(((Number) stats[6]).longValue())
                .build();
    }

    /**
     * Convert Alert entity to AlertResponse DTO
     */
    private AlertResponse convertToAlertResponse(Alert alert) {
        AlertResponse response = new AlertResponse();
        response.setId(alert.getId());
        response.setSource(alert.getSource());
        response.setServerId(alert.getServerId());
        response.setServerName(alert.getServerName());
        response.setAlertType(alert.getAlertType());
        response.setSeverity(alert.getSeverity());
        response.setStatus(alert.getStatus());
        response.setMessage(alert.getMessage());
        response.setDescription(alert.getDescription());
        response.setCorrelationId(alert.getCorrelationId());
        response.setCorrelationKey(alert.getCorrelationKey());
        response.setRuleId(alert.getRuleId());
        response.setRuleName(alert.getRuleName());
        response.setEscalationLevel(alert.getEscalationLevel());
        response.setEscalationCount(alert.getEscalationCount());
        response.setSuppressed(alert.getSuppressed());
        response.setSuppressionReason(alert.getSuppressionReason());
        response.setSuppressedUntil(alert.getSuppressedUntil());
        response.setAcknowledgedBy(alert.getAcknowledgedBy());
        response.setAcknowledgedAt(alert.getAcknowledgedAt());
        response.setAcknowledgmentNote(alert.getAcknowledgmentNote());
        response.setResolvedBy(alert.getResolvedBy());
        response.setResolvedAt(alert.getResolvedAt());
        response.setResolutionNote(alert.getResolutionNote());
        response.setAutoResolved(alert.getAutoResolved());
        response.setNotificationSent(alert.getNotificationSent());
        response.setNotificationCount(alert.getNotificationCount());
        response.setLastNotificationAt(alert.getLastNotificationAt());
        response.setDuplicateCount(alert.getDuplicateCount());
        response.setLastOccurrence(alert.getLastOccurrence());
        response.setFirstOccurrence(alert.getFirstOccurrence());
        response.setAlertData(alert.getAlertData());
        response.setTags(alert.getTags());
        response.setCreatedAt(alert.getCreatedAt());
        response.setUpdatedAt(alert.getUpdatedAt());
        response.setCreatedBy(alert.getCreatedBy());
        response.setUpdatedBy(alert.getUpdatedBy());

        return response;
    }

    /**
     * Alert Statistics DTO
     */
    public static class AlertStatistics {
        private Long totalAlerts;
        private Long openAlerts;
        private Long acknowledgedAlerts;
        private Long resolvedAlerts;
        private Long criticalAlerts;
        private Long suppressedAlerts;
        private Long escalatedAlerts;

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private AlertStatistics stats = new AlertStatistics();
            public Builder totalAlerts(Long totalAlerts) { stats.totalAlerts = totalAlerts; return this; }
            public Builder openAlerts(Long openAlerts) { stats.openAlerts = openAlerts; return this; }
            public Builder acknowledgedAlerts(Long acknowledgedAlerts) { stats.acknowledgedAlerts = acknowledgedAlerts; return this; }
            public Builder resolvedAlerts(Long resolvedAlerts) { stats.resolvedAlerts = resolvedAlerts; return this; }
            public Builder criticalAlerts(Long criticalAlerts) { stats.criticalAlerts = criticalAlerts; return this; }
            public Builder suppressedAlerts(Long suppressedAlerts) { stats.suppressedAlerts = suppressedAlerts; return this; }
            public Builder escalatedAlerts(Long escalatedAlerts) { stats.escalatedAlerts = escalatedAlerts; return this; }
            public AlertStatistics build() { return stats; }
        }

        // Getters
        public Long getTotalAlerts() { return totalAlerts; }
        public Long getOpenAlerts() { return openAlerts; }
        public Long getAcknowledgedAlerts() { return acknowledgedAlerts; }
        public Long getResolvedAlerts() { return resolvedAlerts; }
        public Long getCriticalAlerts() { return criticalAlerts; }
        public Long getSuppressedAlerts() { return suppressedAlerts; }
        public Long getEscalatedAlerts() { return escalatedAlerts; }
    }
}
