/**
 * 🧠 Alert Processing Engine - Sophisticated Alert Management
 * Advanced alert processing with correlation, deduplication, and lifecycle management
 */

package com.monitoring.alert.service;

import com.monitoring.alert.entity.*;
import com.monitoring.alert.repository.*;
import com.monitoring.alert.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
public class AlertProcessingEngine {

    private static final Logger logger = LoggerFactory.getLogger(AlertProcessingEngine.class);

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private AlertRuleRepository alertRuleRepository;

    @Autowired
    private AlertCorrelationRepository correlationRepository;

    @Autowired
    private AlertRuleEvaluationService ruleEvaluationService;

    @Autowired
    private AlertCorrelationService correlationService;

    @Autowired
    private AlertNotificationService notificationService;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    // In-memory cache for active alerts and correlation groups
    private final Map<String, Alert> activeAlerts = new ConcurrentHashMap<>();
    private final Map<String, AlertCorrelationGroup> correlationGroups = new ConcurrentHashMap<>();
    
    // Performance metrics
    private final AtomicLong totalAlertsProcessed = new AtomicLong(0);
    private final AtomicLong correlatedAlerts = new AtomicLong(0);
    private final AtomicLong duplicateAlerts = new AtomicLong(0);
    private final AtomicLong autoResolvedAlerts = new AtomicLong(0);

    /**
     * Process incoming metric data and evaluate alert rules
     */
    @KafkaListener(topics = "monitoring.metrics", groupId = "alert-processing")
    @Async
    public void processMetrics(MetricDataDto metricData) {
        logger.debug("Processing metrics for alert evaluation: {}", metricData.getServerId());

        try {
            // Get applicable alert rules for this metric
            List<AlertRule> applicableRules = getApplicableRules(metricData);

            for (AlertRule rule : applicableRules) {
                if (rule.shouldEvaluate()) {
                    evaluateRule(rule, metricData);
                }
            }

        } catch (Exception e) {
            logger.error("Error processing metrics for alert evaluation: {}", e.getMessage(), e);
        }
    }

    /**
     * Evaluate alert rule against metric data
     */
    @Transactional
    public void evaluateRule(AlertRule rule, MetricDataDto metricData) {
        logger.debug("Evaluating rule: {} for server: {}", rule.getName(), metricData.getServerId());

        try {
            rule.updateLastEvaluation();
            alertRuleRepository.save(rule);

            // Evaluate rule conditions
            RuleEvaluationResult result = ruleEvaluationService.evaluateRule(rule, metricData);

            if (result.isTriggered()) {
                handleRuleTriggered(rule, metricData, result);
            } else {
                handleRuleNotTriggered(rule, metricData);
            }

        } catch (Exception e) {
            logger.error("Error evaluating rule {}: {}", rule.getId(), e.getMessage(), e);
        }
    }

    /**
     * Handle when a rule is triggered
     */
    private void handleRuleTriggered(AlertRule rule, MetricDataDto metricData, RuleEvaluationResult result) {
        logger.info("Rule triggered: {} for server: {}", rule.getName(), metricData.getServerId());

        // Check if rule is in suppression window
        if (rule.isInSuppressionWindow()) {
            logger.info("Rule {} is in suppression window, skipping alert creation", rule.getName());
            return;
        }

        // Generate alert fingerprint for deduplication
        String fingerprint = generateAlertFingerprint(rule, metricData, result);

        // Check for existing alert with same fingerprint
        Alert existingAlert = findActiveAlertByFingerprint(fingerprint);
        
        if (existingAlert != null) {
            // Update existing alert
            updateExistingAlert(existingAlert, result);
            duplicateAlerts.incrementAndGet();
        } else {
            // Create new alert
            Alert newAlert = createNewAlert(rule, metricData, result, fingerprint);
            processNewAlert(newAlert);
        }

        rule.updateLastTriggered();
        alertRuleRepository.save(rule);
    }

    /**
     * Handle when a rule is not triggered
     */
    private void handleRuleNotTriggered(AlertRule rule, MetricDataDto metricData) {
        // Check for auto-resolution of existing alerts
        String fingerprint = generateAlertFingerprint(rule, metricData, null);
        Alert existingAlert = findActiveAlertByFingerprint(fingerprint);

        if (existingAlert != null && rule.getAutoResolveEnabled()) {
            LocalDateTime threshold = LocalDateTime.now().minusSeconds(rule.getAutoResolveDuration());
            if (existingAlert.getLastUpdated().isBefore(threshold)) {
                resolveAlert(existingAlert, "Auto-resolved: condition no longer met");
                autoResolvedAlerts.incrementAndGet();
            }
        }
    }

    /**
     * Create new alert
     */
    private Alert createNewAlert(AlertRule rule, MetricDataDto metricData, RuleEvaluationResult result, String fingerprint) {
        Alert alert = new Alert();
        alert.setRule(rule);
        alert.setFingerprint(fingerprint);
        alert.setSeverity(rule.getSeverity());
        alert.setStatus(AlertStatus.PENDING);
        alert.setSummary(generateAlertSummary(rule, metricData, result));
        alert.setDescription(generateAlertDescription(rule, metricData, result));
        alert.setStartsAt(LocalDateTime.now());
        alert.setOrganization(rule.getOrganization());

        // Copy labels and annotations from rule
        alert.setLabels(new HashMap<>(rule.getLabels()));
        alert.setAnnotations(new HashMap<>(rule.getAnnotations()));

        // Add metric-specific labels
        alert.addLabel("server_id", metricData.getServerId().toString());
        alert.addLabel("metric_name", metricData.getMetricName());
        alert.addLabel("rule_id", rule.getId().toString());

        // Add evaluation result data
        alert.addAnnotation("threshold_value", String.valueOf(result.getThresholdValue()));
        alert.addAnnotation("actual_value", String.valueOf(result.getActualValue()));
        alert.addAnnotation("evaluation_time", LocalDateTime.now().toString());

        return alertRepository.save(alert);
    }

    /**
     * Process new alert through correlation and notification pipeline
     */
    private void processNewAlert(Alert alert) {
        totalAlertsProcessed.incrementAndGet();
        activeAlerts.put(alert.getFingerprint(), alert);

        logger.info("Processing new alert: {} (ID: {})", alert.getSummary(), alert.getId());

        // Attempt correlation if enabled
        if (alert.getRule().getCorrelationEnabled()) {
            attemptCorrelation(alert);
        }

        // Transition to firing state after for_duration
        scheduleAlertStateTransition(alert);

        // Send to notification service
        sendAlertNotification(alert, AlertEventType.CREATED);

        // Publish alert event to Kafka
        publishAlertEvent(alert, AlertEventType.CREATED);
    }

    /**
     * Attempt to correlate alert with existing alerts
     */
    private void attemptCorrelation(Alert alert) {
        logger.debug("Attempting correlation for alert: {}", alert.getId());

        try {
            List<Alert> correlationCandidates = findCorrelationCandidates(alert);

            if (!correlationCandidates.isEmpty()) {
                AlertCorrelationGroup group = findOrCreateCorrelationGroup(alert, correlationCandidates);
                addAlertToCorrelationGroup(alert, group);
                correlatedAlerts.incrementAndGet();

                logger.info("Alert {} correlated with {} other alerts in group {}", 
                           alert.getId(), correlationCandidates.size(), group.getId());
            }

        } catch (Exception e) {
            logger.error("Error during alert correlation for alert {}: {}", alert.getId(), e.getMessage(), e);
        }
    }

    /**
     * Find correlation candidates for an alert
     */
    private List<Alert> findCorrelationCandidates(Alert alert) {
        LocalDateTime correlationWindow = LocalDateTime.now()
                .minusSeconds(alert.getRule().getCorrelationWindow());

        return alertRepository.findActiveAlertsInTimeWindow(
                alert.getOrganization().getId(),
                correlationWindow,
                Arrays.asList(AlertStatus.PENDING, AlertStatus.FIRING)
        ).stream()
        .filter(candidate -> !candidate.getId().equals(alert.getId()))
        .filter(candidate -> correlationService.calculateSimilarity(alert, candidate) >= 0.7)
        .collect(Collectors.toList());
    }

    /**
     * Find or create correlation group
     */
    private AlertCorrelationGroup findOrCreateCorrelationGroup(Alert alert, List<Alert> candidates) {
        // Check if any candidate is already in a correlation group
        Optional<AlertCorrelationGroup> existingGroup = candidates.stream()
                .map(candidate -> correlationGroups.values().stream()
                        .filter(group -> group.containsAlert(candidate.getId()))
                        .findFirst())
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst();

        if (existingGroup.isPresent()) {
            return existingGroup.get();
        } else {
            // Create new correlation group
            AlertCorrelationGroup newGroup = new AlertCorrelationGroup();
            newGroup.setId(UUID.randomUUID().toString());
            newGroup.setCreatedAt(LocalDateTime.now());
            newGroup.setRootCause(correlationService.analyzeRootCause(candidates));

            correlationGroups.put(newGroup.getId(), newGroup);
            return newGroup;
        }
    }

    /**
     * Add alert to correlation group
     */
    private void addAlertToCorrelationGroup(Alert alert, AlertCorrelationGroup group) {
        group.addAlert(alert.getId());
        alert.setCorrelationGroupId(group.getId());
        alertRepository.save(alert);

        // Update group metadata
        group.updateSeverity(alert.getSeverity());
        group.setLastUpdated(LocalDateTime.now());
    }

    /**
     * Schedule alert state transition from PENDING to FIRING
     */
    @Async
    private void scheduleAlertStateTransition(Alert alert) {
        try {
            // Wait for the "for" duration
            Thread.sleep(alert.getRule().getForDuration() * 1000L);

            // Check if alert still exists and is in PENDING state
            Alert currentAlert = alertRepository.findById(alert.getId()).orElse(null);
            if (currentAlert != null && currentAlert.getStatus() == AlertStatus.PENDING) {
                currentAlert.setStatus(AlertStatus.FIRING);
                currentAlert.setLastUpdated(LocalDateTime.now());
                alertRepository.save(currentAlert);

                logger.info("Alert {} transitioned to FIRING state", alert.getId());

                // Send firing notification
                sendAlertNotification(currentAlert, AlertEventType.FIRING);
                publishAlertEvent(currentAlert, AlertEventType.FIRING);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.warn("Alert state transition interrupted for alert: {}", alert.getId());
        } catch (Exception e) {
            logger.error("Error during alert state transition for alert {}: {}", alert.getId(), e.getMessage(), e);
        }
    }

    /**
     * Resolve alert
     */
    @Transactional
    public void resolveAlert(Alert alert, String reason) {
        logger.info("Resolving alert: {} - Reason: {}", alert.getId(), reason);

        alert.setStatus(AlertStatus.RESOLVED);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolutionReason(reason);
        alert.setLastUpdated(LocalDateTime.now());

        alertRepository.save(alert);
        activeAlerts.remove(alert.getFingerprint());

        // Remove from correlation group if applicable
        if (alert.getCorrelationGroupId() != null) {
            AlertCorrelationGroup group = correlationGroups.get(alert.getCorrelationGroupId());
            if (group != null) {
                group.removeAlert(alert.getId());
                if (group.isEmpty()) {
                    correlationGroups.remove(group.getId());
                }
            }
        }

        // Send resolution notification
        sendAlertNotification(alert, AlertEventType.RESOLVED);
        publishAlertEvent(alert, AlertEventType.RESOLVED);
    }

    /**
     * Acknowledge alert
     */
    @Transactional
    public void acknowledgeAlert(UUID alertId, UUID userId, String comment) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + alertId));

        logger.info("Acknowledging alert: {} by user: {}", alertId, userId);

        alert.setStatus(AlertStatus.ACKNOWLEDGED);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alert.setAcknowledgedBy(userId);
        alert.setAcknowledgmentComment(comment);
        alert.setLastUpdated(LocalDateTime.now());

        alertRepository.save(alert);

        // Send acknowledgment notification
        sendAlertNotification(alert, AlertEventType.ACKNOWLEDGED);
        publishAlertEvent(alert, AlertEventType.ACKNOWLEDGED);
    }

    /**
     * Send alert notification
     */
    private void sendAlertNotification(Alert alert, AlertEventType eventType) {
        try {
            AlertNotificationDto notification = new AlertNotificationDto();
            notification.setAlert(AlertDto.fromEntity(alert));
            notification.setEventType(eventType);
            notification.setChannels(alert.getRule().getNotificationChannelList());

            notificationService.sendNotification(notification);

        } catch (Exception e) {
            logger.error("Error sending notification for alert {}: {}", alert.getId(), e.getMessage(), e);
        }
    }

    /**
     * Publish alert event to Kafka
     */
    private void publishAlertEvent(Alert alert, AlertEventType eventType) {
        try {
            AlertEventDto event = new AlertEventDto();
            event.setAlert(AlertDto.fromEntity(alert));
            event.setEventType(eventType);
            event.setTimestamp(LocalDateTime.now());

            kafkaTemplate.send("monitoring.alerts", alert.getId().toString(), event);

        } catch (Exception e) {
            logger.error("Error publishing alert event for alert {}: {}", alert.getId(), e.getMessage(), e);
        }
    }

    /**
     * Cleanup expired alerts and correlation groups
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void cleanupExpiredAlerts() {
        logger.debug("Starting cleanup of expired alerts and correlation groups");

        try {
            LocalDateTime cutoff = LocalDateTime.now().minusHours(24);

            // Remove resolved alerts older than 24 hours from active cache
            activeAlerts.entrySet().removeIf(entry -> {
                Alert alert = entry.getValue();
                return alert.getStatus() == AlertStatus.RESOLVED && 
                       alert.getResolvedAt() != null && 
                       alert.getResolvedAt().isBefore(cutoff);
            });

            // Remove empty correlation groups
            correlationGroups.entrySet().removeIf(entry -> entry.getValue().isEmpty());

            // Auto-expire old pending alerts
            List<Alert> expiredAlerts = alertRepository.findExpiredPendingAlerts(
                    LocalDateTime.now().minusHours(1));

            for (Alert alert : expiredAlerts) {
                alert.setStatus(AlertStatus.EXPIRED);
                alert.setLastUpdated(LocalDateTime.now());
                alertRepository.save(alert);
                activeAlerts.remove(alert.getFingerprint());
            }

            if (!expiredAlerts.isEmpty()) {
                logger.info("Expired {} old pending alerts", expiredAlerts.size());
            }

        } catch (Exception e) {
            logger.error("Error during alert cleanup: {}", e.getMessage(), e);
        }
    }

    /**
     * Get processing statistics
     */
    public AlertProcessingStatisticsDto getProcessingStatistics() {
        AlertProcessingStatisticsDto stats = new AlertProcessingStatisticsDto();
        stats.setTotalAlertsProcessed(totalAlertsProcessed.get());
        stats.setActiveAlerts(activeAlerts.size());
        stats.setCorrelatedAlerts(correlatedAlerts.get());
        stats.setDuplicateAlerts(duplicateAlerts.get());
        stats.setAutoResolvedAlerts(autoResolvedAlerts.get());
        stats.setActiveCorrelationGroups(correlationGroups.size());
        stats.setCorrelationRate(calculateCorrelationRate());
        stats.setTimestamp(LocalDateTime.now());
        return stats;
    }

    // Helper methods
    private List<AlertRule> getApplicableRules(MetricDataDto metricData) {
        return alertRuleRepository.findEnabledRulesByOrganization(metricData.getOrganizationId());
    }

    private String generateAlertFingerprint(AlertRule rule, MetricDataDto metricData, RuleEvaluationResult result) {
        return String.format("%s:%s:%s", 
                rule.getId(), 
                metricData.getServerId(), 
                metricData.getMetricName());
    }

    private Alert findActiveAlertByFingerprint(String fingerprint) {
        return activeAlerts.get(fingerprint);
    }

    private void updateExistingAlert(Alert alert, RuleEvaluationResult result) {
        alert.setLastUpdated(LocalDateTime.now());
        alert.addAnnotation("last_evaluation", LocalDateTime.now().toString());
        alert.addAnnotation("current_value", String.valueOf(result.getActualValue()));
        alertRepository.save(alert);
    }

    private String generateAlertSummary(AlertRule rule, MetricDataDto metricData, RuleEvaluationResult result) {
        return String.format("%s on %s", rule.getName(), metricData.getServerName());
    }

    private String generateAlertDescription(AlertRule rule, MetricDataDto metricData, RuleEvaluationResult result) {
        return String.format("Alert rule '%s' triggered for server '%s'. " +
                            "Metric '%s' value %.2f exceeds threshold %.2f",
                rule.getName(), metricData.getServerName(), metricData.getMetricName(),
                result.getActualValue(), result.getThresholdValue());
    }

    private double calculateCorrelationRate() {
        long total = totalAlertsProcessed.get();
        if (total == 0) return 0.0;
        return (double) correlatedAlerts.get() / total * 100;
    }
}
