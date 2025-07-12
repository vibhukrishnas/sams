package com.sams.enterprise.service;

import com.sams.enterprise.entity.Alert;
import com.sams.enterprise.entity.Server;
import com.sams.enterprise.entity.User;
import com.sams.enterprise.repository.AlertRepository;
import com.sams.enterprise.repository.ServerRepository;
import com.sams.enterprise.dto.AlertCreateRequest;
import com.sams.enterprise.dto.AlertCorrelationResult;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

/**
 * Enterprise Alert Processing Service with Correlation and Deduplication
 */
@Service
@Transactional
public class AlertProcessingService {

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${sams.enterprise.alert.max-correlation-window}")
    private long maxCorrelationWindow;

    @Value("${sams.enterprise.alert.max-batch-size}")
    private int maxBatchSize;

    private static final String ALERT_TOPIC = "sams.alerts";
    private static final String CORRELATION_TOPIC = "sams.alert.correlation";

    /**
     * Create new alert with correlation and deduplication
     */
    public Alert createAlert(AlertCreateRequest request) {
        // Find or create server
        Server server = null;
        if (request.getServerId() != null) {
            server = serverRepository.findById(request.getServerId()).orElse(null);
        } else if (request.getServerHostname() != null) {
            server = serverRepository.findByHostname(request.getServerHostname()).orElse(null);
        }

        // Create alert
        Alert alert = new Alert(
            request.getTitle(),
            request.getDescription(),
            request.getSeverity(),
            request.getType(),
            request.getSource(),
            server
        );

        alert.setRuleId(request.getRuleId());
        alert.setMetricValue(request.getMetricValue());
        alert.setThresholdValue(request.getThresholdValue());
        alert.setTags(request.getTags());
        alert.setMetadata(request.getMetadata());

        // Generate fingerprint for deduplication
        String fingerprint = generateFingerprint(alert);
        alert.setFingerprint(fingerprint);

        // Check for existing alert with same fingerprint (deduplication)
        Optional<Alert> existingAlert = alertRepository.findByFingerprintAndStatusIn(
            fingerprint, 
            Arrays.asList(Alert.AlertStatus.OPEN, Alert.AlertStatus.ACKNOWLEDGED)
        );

        if (existingAlert.isPresent()) {
            // Update existing alert instead of creating new one
            Alert existing = existingAlert.get();
            existing.incrementCount();
            existing.setDescription(alert.getDescription()); // Update with latest description
            existing.setMetricValue(alert.getMetricValue());
            
            Alert savedAlert = alertRepository.save(existing);
            
            // Send update notification
            publishAlertEvent("ALERT_UPDATED", savedAlert);
            
            return savedAlert;
        }

        // Save new alert
        Alert savedAlert = alertRepository.save(alert);

        // Perform correlation analysis
        performCorrelationAnalysis(savedAlert);

        // Send notification
        publishAlertEvent("ALERT_CREATED", savedAlert);

        // Trigger immediate notification for critical alerts
        if (savedAlert.isCritical()) {
            notificationService.sendCriticalAlertNotification(savedAlert);
        }

        return savedAlert;
    }

    /**
     * Acknowledge alert
     */
    public Alert acknowledgeAlert(Long alertId, Long userId, String notes) {
        Alert alert = alertRepository.findById(alertId)
            .orElseThrow(() -> new IllegalArgumentException("Alert not found"));

        User user = new User(); // This should be fetched from UserRepository
        user.setId(userId);

        alert.acknowledge(user, notes);
        Alert savedAlert = alertRepository.save(alert);

        publishAlertEvent("ALERT_ACKNOWLEDGED", savedAlert);
        
        return savedAlert;
    }

    /**
     * Resolve alert
     */
    public Alert resolveAlert(Long alertId, Long userId, String resolutionNotes) {
        Alert alert = alertRepository.findById(alertId)
            .orElseThrow(() -> new IllegalArgumentException("Alert not found"));

        User user = new User(); // This should be fetched from UserRepository
        user.setId(userId);

        alert.resolve(user, resolutionNotes);
        Alert savedAlert = alertRepository.save(alert);

        publishAlertEvent("ALERT_RESOLVED", savedAlert);
        
        return savedAlert;
    }

    /**
     * Perform correlation analysis
     */
    @Async
    public void performCorrelationAnalysis(Alert newAlert) {
        LocalDateTime correlationWindow = LocalDateTime.now().minusMinutes(maxCorrelationWindow / 60000);
        
        // Find related alerts within correlation window
        List<Alert> relatedAlerts = alertRepository.findRelatedAlerts(
            newAlert.getServer() != null ? newAlert.getServer().getId() : null,
            newAlert.getType(),
            newAlert.getSeverity(),
            correlationWindow
        );

        if (relatedAlerts.size() > 1) {
            // Generate correlation ID
            String correlationId = UUID.randomUUID().toString();
            
            // Update all related alerts with correlation ID
            relatedAlerts.forEach(alert -> {
                alert.setCorrelationId(correlationId);
                alertRepository.save(alert);
            });

            // Create correlation result
            AlertCorrelationResult correlation = new AlertCorrelationResult(
                correlationId,
                relatedAlerts.size(),
                newAlert.getType(),
                newAlert.getSeverity(),
                relatedAlerts.stream().map(Alert::getId).collect(Collectors.toList())
            );

            // Publish correlation event
            kafkaTemplate.send(CORRELATION_TOPIC, correlation);
        }
    }

    /**
     * Generate fingerprint for alert deduplication
     */
    private String generateFingerprint(Alert alert) {
        StringBuilder sb = new StringBuilder();
        sb.append(alert.getTitle());
        sb.append(alert.getType());
        sb.append(alert.getSource());
        
        if (alert.getServer() != null) {
            sb.append(alert.getServer().getHostname());
        }
        
        if (alert.getRuleId() != null) {
            sb.append(alert.getRuleId());
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }

    /**
     * Publish alert event to Kafka
     */
    private void publishAlertEvent(String eventType, Alert alert) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType", eventType);
        event.put("alertId", alert.getId());
        event.put("severity", alert.getSeverity());
        event.put("status", alert.getStatus());
        event.put("serverId", alert.getServer() != null ? alert.getServer().getId() : null);
        event.put("timestamp", LocalDateTime.now());

        kafkaTemplate.send(ALERT_TOPIC, event);
    }

    /**
     * Scheduled task for alert escalation
     */
    @Scheduled(fixedDelay = 60000) // Run every minute
    public void processAlertEscalations() {
        List<Alert> alertsNeedingEscalation = alertRepository.findAlertsNeedingEscalation(LocalDateTime.now());
        
        for (Alert alert : alertsNeedingEscalation) {
            alert.escalate();
            alertRepository.save(alert);
            
            // Send escalation notification
            notificationService.sendEscalationNotification(alert);
            
            publishAlertEvent("ALERT_ESCALATED", alert);
        }
    }

    /**
     * Scheduled task for auto-resolution of stale alerts
     */
    @Scheduled(fixedDelay = 300000) // Run every 5 minutes
    public void processAutoResolution() {
        LocalDateTime staleThreshold = LocalDateTime.now().minusHours(24);
        
        List<Alert> staleAlerts = alertRepository.findStaleAlerts(staleThreshold);
        
        for (Alert alert : staleAlerts) {
            alert.setStatus(Alert.AlertStatus.RESOLVED);
            alert.setAutoResolved(true);
            alert.setResolvedAt(LocalDateTime.now());
            alert.setResolutionNotes("Auto-resolved due to inactivity");
            
            alertRepository.save(alert);
            publishAlertEvent("ALERT_AUTO_RESOLVED", alert);
        }
    }

    /**
     * Get alerts by server
     */
    public List<Alert> getAlertsByServer(Long serverId) {
        return alertRepository.findByServerIdOrderByCreatedAtDesc(serverId);
    }

    /**
     * Get alerts by severity
     */
    public List<Alert> getAlertsBySeverity(Alert.AlertSeverity severity) {
        return alertRepository.findBySeverityOrderByCreatedAtDesc(severity);
    }

    /**
     * Get open alerts
     */
    public List<Alert> getOpenAlerts() {
        return alertRepository.findByStatusOrderByCreatedAtDesc(Alert.AlertStatus.OPEN);
    }

    /**
     * Get critical alerts
     */
    public List<Alert> getCriticalAlerts() {
        return alertRepository.findBySeverityAndStatusOrderByCreatedAtDesc(
            Alert.AlertSeverity.CRITICAL, 
            Alert.AlertStatus.OPEN
        );
    }

    /**
     * Get alert statistics
     */
    public Map<String, Object> getAlertStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalAlerts", alertRepository.count());
        stats.put("openAlerts", alertRepository.countByStatus(Alert.AlertStatus.OPEN));
        stats.put("criticalAlerts", alertRepository.countBySeverityAndStatus(
            Alert.AlertSeverity.CRITICAL, Alert.AlertStatus.OPEN));
        stats.put("acknowledgedAlerts", alertRepository.countByStatus(Alert.AlertStatus.ACKNOWLEDGED));
        stats.put("resolvedToday", alertRepository.countResolvedToday(LocalDateTime.now().toLocalDate()));
        
        return stats;
    }

    /**
     * Bulk acknowledge alerts
     */
    @Transactional
    public void bulkAcknowledgeAlerts(List<Long> alertIds, Long userId, String notes) {
        User user = new User();
        user.setId(userId);
        
        List<Alert> alerts = alertRepository.findAllById(alertIds);
        
        alerts.forEach(alert -> {
            if (alert.isOpen()) {
                alert.acknowledge(user, notes);
                alertRepository.save(alert);
                publishAlertEvent("ALERT_ACKNOWLEDGED", alert);
            }
        });
    }

    /**
     * Suppress alerts by rule
     */
    public void suppressAlertsByRule(String ruleId, int durationMinutes) {
        List<Alert> alerts = alertRepository.findByRuleIdAndStatus(ruleId, Alert.AlertStatus.OPEN);

        alerts.forEach(alert -> {
            alert.setStatus(Alert.AlertStatus.SUPPRESSED);
            alert.getMetadata().put("suppressedUntil",
                LocalDateTime.now().plusMinutes(durationMinutes).toString());
            alertRepository.save(alert);
            publishAlertEvent("ALERT_SUPPRESSED", alert);
        });
    }
}
