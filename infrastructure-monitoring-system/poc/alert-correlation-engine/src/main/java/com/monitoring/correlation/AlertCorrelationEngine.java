/**
 * 🧠 Alert Correlation Engine - POC Implementation
 * Demonstrates intelligent alert correlation and deduplication
 */

package com.monitoring.correlation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@SpringBootApplication
@EnableScheduling
public class AlertCorrelationEngine {
    
    private static final Logger logger = LoggerFactory.getLogger(AlertCorrelationEngine.class);
    
    public static void main(String[] args) {
        logger.info("🚀 Starting Alert Correlation Engine POC...");
        SpringApplication.run(AlertCorrelationEngine.class, args);
    }
}

/**
 * Alert data model
 */
class Alert {
    private final String id;
    private final String serverId;
    private final String alertType;
    private final String severity;
    private final String message;
    private final Instant timestamp;
    private final Map<String, Object> metadata;
    private String correlationId;
    private boolean isCorrelated;
    
    public Alert(String serverId, String alertType, String severity, String message) {
        this.id = UUID.randomUUID().toString();
        this.serverId = serverId;
        this.alertType = alertType;
        this.severity = severity;
        this.message = message;
        this.timestamp = Instant.now();
        this.metadata = new HashMap<>();
        this.isCorrelated = false;
    }
    
    // Getters and setters
    public String getId() { return id; }
    public String getServerId() { return serverId; }
    public String getAlertType() { return alertType; }
    public String getSeverity() { return severity; }
    public String getMessage() { return message; }
    public Instant getTimestamp() { return timestamp; }
    public Map<String, Object> getMetadata() { return metadata; }
    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }
    public boolean isCorrelated() { return isCorrelated; }
    public void setCorrelated(boolean correlated) { isCorrelated = correlated; }
    
    @Override
    public String toString() {
        return String.format("Alert{id='%s', server='%s', type='%s', severity='%s', message='%s'}", 
                           id, serverId, alertType, severity, message);
    }
}

/**
 * Correlation group for related alerts
 */
class CorrelationGroup {
    private final String id;
    private final List<Alert> alerts;
    private final Instant createdAt;
    private String rootCause;
    private String severity;
    
    public CorrelationGroup() {
        this.id = UUID.randomUUID().toString();
        this.alerts = new ArrayList<>();
        this.createdAt = Instant.now();
        this.severity = "low";
    }
    
    public void addAlert(Alert alert) {
        alerts.add(alert);
        alert.setCorrelationId(id);
        alert.setCorrelated(true);
        updateSeverity();
    }
    
    private void updateSeverity() {
        // Determine highest severity in the group
        List<String> severityOrder = Arrays.asList("low", "medium", "high", "critical");
        this.severity = alerts.stream()
                .map(Alert::getSeverity)
                .max(Comparator.comparing(severityOrder::indexOf))
                .orElse("low");
    }
    
    // Getters
    public String getId() { return id; }
    public List<Alert> getAlerts() { return alerts; }
    public Instant getCreatedAt() { return createdAt; }
    public String getRootCause() { return rootCause; }
    public void setRootCause(String rootCause) { this.rootCause = rootCause; }
    public String getSeverity() { return severity; }
    public int getAlertCount() { return alerts.size(); }
}

/**
 * Core correlation engine
 */
@Component
class CorrelationProcessor {
    
    private static final Logger logger = LoggerFactory.getLogger(CorrelationProcessor.class);
    
    private final Map<String, Alert> activeAlerts = new ConcurrentHashMap<>();
    private final Map<String, CorrelationGroup> correlationGroups = new ConcurrentHashMap<>();
    private final AtomicLong totalAlertsProcessed = new AtomicLong(0);
    private final AtomicLong correlatedAlerts = new AtomicLong(0);
    private final AtomicLong duplicateAlerts = new AtomicLong(0);
    
    // Correlation rules configuration
    private final long TIME_WINDOW_MINUTES = 5;
    private final double SIMILARITY_THRESHOLD = 0.7;
    
    @PostConstruct
    public void initialize() {
        logger.info("🔧 Initializing Alert Correlation Engine");
        logger.info("  - Time Window: {} minutes", TIME_WINDOW_MINUTES);
        logger.info("  - Similarity Threshold: {}", SIMILARITY_THRESHOLD);
    }
    
    /**
     * Process incoming alert
     */
    public void processAlert(Alert alert) {
        totalAlertsProcessed.incrementAndGet();
        logger.info("📨 Processing alert: {}", alert);
        
        try {
            // Check for duplicates
            if (isDuplicate(alert)) {
                duplicateAlerts.incrementAndGet();
                logger.info("🔄 Duplicate alert detected and suppressed: {}", alert.getId());
                return;
            }
            
            // Find correlation candidates
            List<Alert> candidates = findCorrelationCandidates(alert);
            
            if (candidates.isEmpty()) {
                // No correlation found, create new alert
                activeAlerts.put(alert.getId(), alert);
                logger.info("✨ New unique alert: {}", alert.getId());
            } else {
                // Correlate with existing alerts
                correlateAlert(alert, candidates);
                correlatedAlerts.incrementAndGet();
                logger.info("🔗 Alert correlated: {} with {} candidates", alert.getId(), candidates.size());
            }
            
        } catch (Exception e) {
            logger.error("❌ Error processing alert {}: {}", alert.getId(), e.getMessage(), e);
        }
    }
    
    /**
     * Check if alert is a duplicate
     */
    private boolean isDuplicate(Alert alert) {
        return activeAlerts.values().stream()
                .anyMatch(existing -> 
                    existing.getServerId().equals(alert.getServerId()) &&
                    existing.getAlertType().equals(alert.getAlertType()) &&
                    ChronoUnit.MINUTES.between(existing.getTimestamp(), alert.getTimestamp()) < 2
                );
    }
    
    /**
     * Find correlation candidates for an alert
     */
    private List<Alert> findCorrelationCandidates(Alert alert) {
        Instant timeThreshold = alert.getTimestamp().minus(TIME_WINDOW_MINUTES, ChronoUnit.MINUTES);
        
        return activeAlerts.values().stream()
                .filter(existing -> existing.getTimestamp().isAfter(timeThreshold))
                .filter(existing -> calculateSimilarity(alert, existing) >= SIMILARITY_THRESHOLD)
                .collect(Collectors.toList());
    }
    
    /**
     * Calculate similarity between two alerts
     */
    private double calculateSimilarity(Alert alert1, Alert alert2) {
        double similarity = 0.0;
        
        // Server-based correlation (same server = higher similarity)
        if (alert1.getServerId().equals(alert2.getServerId())) {
            similarity += 0.4;
        }
        
        // Alert type correlation
        if (alert1.getAlertType().equals(alert2.getAlertType())) {
            similarity += 0.3;
        }
        
        // Severity correlation
        if (alert1.getSeverity().equals(alert2.getSeverity())) {
            similarity += 0.2;
        }
        
        // Time-based correlation (closer in time = higher similarity)
        long minutesDiff = ChronoUnit.MINUTES.between(alert2.getTimestamp(), alert1.getTimestamp());
        if (minutesDiff <= 1) {
            similarity += 0.1;
        }
        
        return similarity;
    }
    
    /**
     * Correlate alert with existing candidates
     */
    private void correlateAlert(Alert alert, List<Alert> candidates) {
        // Find existing correlation group or create new one
        CorrelationGroup group = findOrCreateCorrelationGroup(candidates);
        
        // Add alert to correlation group
        group.addAlert(alert);
        activeAlerts.put(alert.getId(), alert);
        
        // Analyze root cause
        analyzeRootCause(group);
        
        logger.info("🔗 Alert {} added to correlation group {} (total: {} alerts)", 
                   alert.getId(), group.getId(), group.getAlertCount());
    }
    
    /**
     * Find existing correlation group or create new one
     */
    private CorrelationGroup findOrCreateCorrelationGroup(List<Alert> candidates) {
        // Check if any candidate is already in a correlation group
        Optional<String> existingGroupId = candidates.stream()
                .filter(Alert::isCorrelated)
                .map(Alert::getCorrelationId)
                .findFirst();
        
        if (existingGroupId.isPresent()) {
            return correlationGroups.get(existingGroupId.get());
        } else {
            // Create new correlation group
            CorrelationGroup newGroup = new CorrelationGroup();
            correlationGroups.put(newGroup.getId(), newGroup);
            
            // Add all candidates to the new group
            candidates.forEach(newGroup::addAlert);
            
            return newGroup;
        }
    }
    
    /**
     * Analyze root cause for correlation group
     */
    private void analyzeRootCause(CorrelationGroup group) {
        Map<String, Long> alertTypeCounts = group.getAlerts().stream()
                .collect(Collectors.groupingBy(Alert::getAlertType, Collectors.counting()));
        
        Map<String, Long> serverCounts = group.getAlerts().stream()
                .collect(Collectors.groupingBy(Alert::getServerId, Collectors.counting()));
        
        // Determine most common alert type
        String mostCommonType = alertTypeCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("unknown");
        
        // Determine if it's a single server or multi-server issue
        if (serverCounts.size() == 1) {
            String serverId = serverCounts.keySet().iterator().next();
            group.setRootCause(String.format("Server %s experiencing %s issues", serverId, mostCommonType));
        } else {
            group.setRootCause(String.format("Multi-server %s issues affecting %d servers", 
                                           mostCommonType, serverCounts.size()));
        }
        
        logger.info("🧠 Root cause analysis for group {}: {}", group.getId(), group.getRootCause());
    }
    
    /**
     * Clean up old alerts and correlation groups
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    public void cleanupOldAlerts() {
        Instant cutoff = Instant.now().minus(30, ChronoUnit.MINUTES);
        
        // Remove old alerts
        List<String> oldAlertIds = activeAlerts.values().stream()
                .filter(alert -> alert.getTimestamp().isBefore(cutoff))
                .map(Alert::getId)
                .collect(Collectors.toList());
        
        oldAlertIds.forEach(activeAlerts::remove);
        
        // Remove empty correlation groups
        List<String> emptyGroupIds = correlationGroups.values().stream()
                .filter(group -> group.getAlerts().stream()
                        .allMatch(alert -> alert.getTimestamp().isBefore(cutoff)))
                .map(CorrelationGroup::getId)
                .collect(Collectors.toList());
        
        emptyGroupIds.forEach(correlationGroups::remove);
        
        if (!oldAlertIds.isEmpty() || !emptyGroupIds.isEmpty()) {
            logger.info("🧹 Cleanup completed: {} old alerts, {} empty groups removed", 
                       oldAlertIds.size(), emptyGroupIds.size());
        }
    }
    
    /**
     * Get correlation statistics
     */
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAlertsProcessed", totalAlertsProcessed.get());
        stats.put("activeAlerts", activeAlerts.size());
        stats.put("correlatedAlerts", correlatedAlerts.get());
        stats.put("duplicateAlerts", duplicateAlerts.get());
        stats.put("activeCorrelationGroups", correlationGroups.size());
        stats.put("correlationRate", calculateCorrelationRate());
        stats.put("timestamp", Instant.now().toString());
        return stats;
    }
    
    private double calculateCorrelationRate() {
        long total = totalAlertsProcessed.get();
        if (total == 0) return 0.0;
        return (double) correlatedAlerts.get() / total * 100;
    }
    
    /**
     * Get active correlation groups
     */
    public Collection<CorrelationGroup> getActiveCorrelationGroups() {
        return correlationGroups.values();
    }
}

/**
 * Alert simulator for testing
 */
@Component
class AlertSimulator {
    
    private static final Logger logger = LoggerFactory.getLogger(AlertSimulator.class);
    
    private final CorrelationProcessor correlationProcessor;
    private final List<String> serverIds = Arrays.asList("server-1", "server-2", "server-3", "server-4", "server-5");
    private final List<String> alertTypes = Arrays.asList("CPU_HIGH", "MEMORY_LOW", "DISK_FULL", "NETWORK_ERROR", "SERVICE_DOWN");
    private final List<String> severities = Arrays.asList("low", "medium", "high", "critical");
    
    public AlertSimulator(CorrelationProcessor correlationProcessor) {
        this.correlationProcessor = correlationProcessor;
    }
    
    /**
     * Generate random alerts for testing
     */
    @Scheduled(fixedRate = 10000) // 10 seconds
    public void generateRandomAlerts() {
        try {
            // Generate 1-3 random alerts
            int alertCount = ThreadLocalRandom.current().nextInt(1, 4);
            
            for (int i = 0; i < alertCount; i++) {
                Alert alert = generateRandomAlert();
                correlationProcessor.processAlert(alert);
                
                // Sometimes generate correlated alerts (same server, similar time)
                if (ThreadLocalRandom.current().nextDouble() < 0.3) { // 30% chance
                    Alert correlatedAlert = generateCorrelatedAlert(alert);
                    // Delay slightly to simulate real-world timing
                    Thread.sleep(ThreadLocalRandom.current().nextInt(1000, 5000));
                    correlationProcessor.processAlert(correlatedAlert);
                }
            }
            
        } catch (Exception e) {
            logger.error("❌ Error generating alerts: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Generate a random alert
     */
    private Alert generateRandomAlert() {
        String serverId = serverIds.get(ThreadLocalRandom.current().nextInt(serverIds.size()));
        String alertType = alertTypes.get(ThreadLocalRandom.current().nextInt(alertTypes.size()));
        String severity = severities.get(ThreadLocalRandom.current().nextInt(severities.size()));
        String message = String.format("Simulated %s alert on %s", alertType, serverId);
        
        return new Alert(serverId, alertType, severity, message);
    }
    
    /**
     * Generate a correlated alert (same server, related issue)
     */
    private Alert generateCorrelatedAlert(Alert originalAlert) {
        // Use same server but potentially different alert type
        String alertType = ThreadLocalRandom.current().nextBoolean() ? 
                originalAlert.getAlertType() : 
                alertTypes.get(ThreadLocalRandom.current().nextInt(alertTypes.size()));
        
        String message = String.format("Related %s alert on %s", alertType, originalAlert.getServerId());
        
        return new Alert(originalAlert.getServerId(), alertType, originalAlert.getSeverity(), message);
    }
    
    /**
     * Print statistics periodically
     */
    @Scheduled(fixedRate = 60000) // 1 minute
    public void printStatistics() {
        Map<String, Object> stats = correlationProcessor.getStatistics();
        logger.info("📊 Correlation Statistics: {}", stats);
        
        Collection<CorrelationGroup> groups = correlationProcessor.getActiveCorrelationGroups();
        if (!groups.isEmpty()) {
            logger.info("🔗 Active Correlation Groups:");
            groups.forEach(group -> 
                logger.info("  - Group {}: {} alerts, severity: {}, root cause: {}", 
                           group.getId(), group.getAlertCount(), group.getSeverity(), group.getRootCause())
            );
        }
    }
}
