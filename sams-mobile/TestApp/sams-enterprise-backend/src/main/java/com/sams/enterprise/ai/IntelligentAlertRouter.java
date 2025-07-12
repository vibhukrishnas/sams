package com.sams.enterprise.ai;

import com.sams.enterprise.entity.Alert;
import com.sams.enterprise.entity.User;
import com.sams.enterprise.entity.Server;
import com.sams.enterprise.repository.AlertRepository;
import com.sams.enterprise.repository.UserRepository;
import com.sams.enterprise.service.NotificationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 🧠 INTELLIGENT ALERT ROUTING & PATTERN RECOGNITION
 * AI-powered alert routing with machine learning pattern recognition
 */
@Service
public class IntelligentAlertRouter {

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    private final Map<String, AlertPattern> alertPatterns = new HashMap<>();
    private final Map<String, RoutingRule> routingRules = new HashMap<>();
    private final Map<String, Double> userExpertiseScores = new HashMap<>();

    /**
     * Alert Pattern Recognition Model
     */
    public static class AlertPattern {
        private String patternId;
        private List<String> alertTypes;
        private List<String> serverTypes;
        private Map<String, Integer> timePatterns;
        private double frequency;
        private double severity;
        private String recommendedAction;
        private List<String> relatedPatterns;
        private LocalDateTime lastSeen;
        private int occurrences;

        public AlertPattern(String patternId) {
            this.patternId = patternId;
            this.alertTypes = new ArrayList<>();
            this.serverTypes = new ArrayList<>();
            this.timePatterns = new HashMap<>();
            this.relatedPatterns = new ArrayList<>();
            this.lastSeen = LocalDateTime.now();
            this.occurrences = 0;
        }

        public void updatePattern(Alert alert) {
            this.occurrences++;
            this.lastSeen = LocalDateTime.now();
            
            // Update alert types
            if (!alertTypes.contains(alert.getType().toString())) {
                alertTypes.add(alert.getType().toString());
            }
            
            // Update time patterns
            int hour = alert.getCreatedAt().getHour();
            timePatterns.put("hour_" + hour, timePatterns.getOrDefault("hour_" + hour, 0) + 1);
            
            // Update severity
            this.severity = calculateAverageSeverity(alert.getSeverity());
        }

        private double calculateAverageSeverity(Alert.AlertSeverity severity) {
            double severityValue = switch (severity) {
                case CRITICAL -> 4.0;
                case HIGH -> 3.0;
                case MEDIUM -> 2.0;
                case LOW -> 1.0;
                case INFO -> 0.5;
            };
            
            return (this.severity * (occurrences - 1) + severityValue) / occurrences;
        }

        // Getters and setters
        public String getPatternId() { return patternId; }
        public List<String> getAlertTypes() { return alertTypes; }
        public Map<String, Integer> getTimePatterns() { return timePatterns; }
        public double getFrequency() { return frequency; }
        public double getSeverity() { return severity; }
        public String getRecommendedAction() { return recommendedAction; }
        public void setRecommendedAction(String action) { this.recommendedAction = action; }
        public int getOccurrences() { return occurrences; }
        public LocalDateTime getLastSeen() { return lastSeen; }
    }

    /**
     * Intelligent Routing Rule
     */
    public static class RoutingRule {
        private String ruleId;
        private List<String> conditions;
        private List<String> targetUsers;
        private String escalationPath;
        private int priority;
        private boolean isActive;
        private Map<String, String> actions;

        public RoutingRule(String ruleId, int priority) {
            this.ruleId = ruleId;
            this.priority = priority;
            this.conditions = new ArrayList<>();
            this.targetUsers = new ArrayList<>();
            this.actions = new HashMap<>();
            this.isActive = true;
        }

        public boolean matches(Alert alert) {
            // Implement rule matching logic
            for (String condition : conditions) {
                if (!evaluateCondition(condition, alert)) {
                    return false;
                }
            }
            return true;
        }

        private boolean evaluateCondition(String condition, Alert alert) {
            // Simple condition evaluation
            if (condition.startsWith("severity:")) {
                String requiredSeverity = condition.substring(9);
                return alert.getSeverity().toString().equalsIgnoreCase(requiredSeverity);
            }
            if (condition.startsWith("type:")) {
                String requiredType = condition.substring(5);
                return alert.getType().toString().equalsIgnoreCase(requiredType);
            }
            if (condition.startsWith("source:")) {
                String requiredSource = condition.substring(7);
                return alert.getSource().contains(requiredSource);
            }
            return true;
        }

        // Getters and setters
        public String getRuleId() { return ruleId; }
        public List<String> getTargetUsers() { return targetUsers; }
        public String getEscalationPath() { return escalationPath; }
        public int getPriority() { return priority; }
        public boolean isActive() { return isActive; }
        public Map<String, String> getActions() { return actions; }
        public void addCondition(String condition) { conditions.add(condition); }
        public void addTargetUser(String userId) { targetUsers.add(userId); }
        public void setEscalationPath(String path) { escalationPath = path; }
    }

    /**
     * Initialize intelligent routing with default rules
     */
    public void initializeIntelligentRouting() {
        // Critical alerts routing
        RoutingRule criticalRule = new RoutingRule("critical_alerts", 1);
        criticalRule.addCondition("severity:CRITICAL");
        criticalRule.addTargetUser("admin");
        criticalRule.addTargetUser("ops_manager");
        criticalRule.setEscalationPath("immediate");
        criticalRule.getActions().put("notification", "all_channels");
        criticalRule.getActions().put("escalation_time", "5");
        routingRules.put("critical_alerts", criticalRule);

        // Database alerts routing
        RoutingRule dbRule = new RoutingRule("database_alerts", 2);
        dbRule.addCondition("type:DATABASE");
        dbRule.addTargetUser("dba");
        dbRule.addTargetUser("backend_team");
        dbRule.setEscalationPath("database_team");
        routingRules.put("database_alerts", dbRule);

        // Network alerts routing
        RoutingRule networkRule = new RoutingRule("network_alerts", 3);
        networkRule.addCondition("type:NETWORK");
        networkRule.addTargetUser("network_admin");
        networkRule.addTargetUser("infrastructure_team");
        routingRules.put("network_alerts", networkRule);

        // Security alerts routing
        RoutingRule securityRule = new RoutingRule("security_alerts", 1);
        securityRule.addCondition("type:SECURITY");
        securityRule.addTargetUser("security_team");
        securityRule.addTargetUser("ciso");
        securityRule.setEscalationPath("security_incident");
        routingRules.put("security_alerts", securityRule);
    }

    /**
     * Process alert with intelligent routing
     */
    @Async
    public void processIntelligentRouting(Alert alert) {
        try {
            // 1. Pattern Recognition
            String patternId = recognizeAlertPattern(alert);
            updateAlertPattern(patternId, alert);

            // 2. Intelligent Routing
            List<RoutingRule> matchingRules = findMatchingRules(alert);
            
            // 3. User Expertise Matching
            List<String> expertUsers = findExpertUsers(alert);

            // 4. Execute Routing
            executeIntelligentRouting(alert, matchingRules, expertUsers);

            // 5. Dynamic Threshold Adjustment
            adjustDynamicThresholds(alert, patternId);

        } catch (Exception e) {
            System.err.println("Intelligent routing failed: " + e.getMessage());
        }
    }

    /**
     * Recognize alert pattern using ML
     */
    private String recognizeAlertPattern(Alert alert) {
        // Generate pattern signature
        String signature = generatePatternSignature(alert);
        
        // Find similar patterns
        for (AlertPattern pattern : alertPatterns.values()) {
            if (isPatternMatch(pattern, alert)) {
                return pattern.getPatternId();
            }
        }
        
        // Create new pattern if no match found
        String newPatternId = "pattern_" + System.currentTimeMillis();
        alertPatterns.put(newPatternId, new AlertPattern(newPatternId));
        return newPatternId;
    }

    /**
     * Generate pattern signature for alert
     */
    private String generatePatternSignature(Alert alert) {
        return String.format("%s_%s_%s_%d", 
            alert.getType(),
            alert.getSeverity(),
            alert.getSource(),
            alert.getCreatedAt().getHour()
        );
    }

    /**
     * Check if alert matches existing pattern
     */
    private boolean isPatternMatch(AlertPattern pattern, Alert alert) {
        // Check alert type similarity
        boolean typeMatch = pattern.getAlertTypes().contains(alert.getType().toString());
        
        // Check time pattern similarity
        int hour = alert.getCreatedAt().getHour();
        boolean timeMatch = pattern.getTimePatterns().containsKey("hour_" + hour);
        
        // Check severity similarity
        double alertSeverityValue = getSeverityValue(alert.getSeverity());
        boolean severityMatch = Math.abs(pattern.getSeverity() - alertSeverityValue) <= 1.0;
        
        return typeMatch || (timeMatch && severityMatch);
    }

    /**
     * Update alert pattern with new data
     */
    private void updateAlertPattern(String patternId, Alert alert) {
        AlertPattern pattern = alertPatterns.get(patternId);
        if (pattern != null) {
            pattern.updatePattern(alert);
            
            // Update recommended actions based on historical data
            updateRecommendedActions(pattern, alert);
        }
    }

    /**
     * Update recommended actions for pattern
     */
    private void updateRecommendedActions(AlertPattern pattern, Alert alert) {
        // Analyze historical resolutions for this pattern
        List<Alert> historicalAlerts = alertRepository.findByCorrelationId(pattern.getPatternId());
        
        Map<String, Integer> actionCounts = new HashMap<>();
        for (Alert historicalAlert : historicalAlerts) {
            if (historicalAlert.getResolutionNotes() != null) {
                String action = extractActionFromResolution(historicalAlert.getResolutionNotes());
                actionCounts.put(action, actionCounts.getOrDefault(action, 0) + 1);
            }
        }
        
        // Set most common action as recommended
        String recommendedAction = actionCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("investigate");
        
        pattern.setRecommendedAction(recommendedAction);
    }

    /**
     * Extract action from resolution notes
     */
    private String extractActionFromResolution(String resolutionNotes) {
        String notes = resolutionNotes.toLowerCase();
        if (notes.contains("restart")) return "restart_service";
        if (notes.contains("scale")) return "scale_resources";
        if (notes.contains("config")) return "update_configuration";
        if (notes.contains("patch")) return "apply_patch";
        return "investigate";
    }

    /**
     * Find matching routing rules
     */
    private List<RoutingRule> findMatchingRules(Alert alert) {
        return routingRules.values().stream()
            .filter(rule -> rule.isActive() && rule.matches(alert))
            .sorted(Comparator.comparingInt(RoutingRule::getPriority))
            .collect(Collectors.toList());
    }

    /**
     * Find expert users for alert type
     */
    private List<String> findExpertUsers(Alert alert) {
        String alertType = alert.getType().toString();
        
        return userExpertiseScores.entrySet().stream()
            .filter(entry -> entry.getKey().contains(alertType.toLowerCase()))
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(3)
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    /**
     * Execute intelligent routing
     */
    private void executeIntelligentRouting(Alert alert, List<RoutingRule> rules, List<String> experts) {
        Set<String> notifiedUsers = new HashSet<>();
        
        // Route based on rules
        for (RoutingRule rule : rules) {
            for (String userId : rule.getTargetUsers()) {
                if (!notifiedUsers.contains(userId)) {
                    sendIntelligentNotification(alert, userId, rule);
                    notifiedUsers.add(userId);
                }
            }
        }
        
        // Route to expert users
        for (String expertUserId : experts) {
            if (!notifiedUsers.contains(expertUserId)) {
                sendExpertNotification(alert, expertUserId);
                notifiedUsers.add(expertUserId);
            }
        }
    }

    /**
     * Send intelligent notification
     */
    private void sendIntelligentNotification(Alert alert, String userId, RoutingRule rule) {
        try {
            User user = userRepository.findById(Long.parseLong(userId)).orElse(null);
            if (user != null) {
                String message = String.format(
                    "🧠 Intelligent Alert Routing\n" +
                    "Alert: %s\n" +
                    "Routed via rule: %s\n" +
                    "Recommended action: %s\n" +
                    "Priority: %d",
                    alert.getTitle(),
                    rule.getRuleId(),
                    rule.getActions().getOrDefault("recommended_action", "investigate"),
                    rule.getPriority()
                );
                
                notificationService.sendEmailNotification(user.getEmail(), 
                    "🧠 Intelligent Alert: " + alert.getTitle(), message);
            }
        } catch (Exception e) {
            System.err.println("Failed to send intelligent notification: " + e.getMessage());
        }
    }

    /**
     * Send expert notification
     */
    private void sendExpertNotification(Alert alert, String expertUserId) {
        try {
            User expert = userRepository.findById(Long.parseLong(expertUserId)).orElse(null);
            if (expert != null) {
                String message = String.format(
                    "🎯 Expert Alert Assignment\n" +
                    "You've been identified as an expert for this alert type.\n" +
                    "Alert: %s\n" +
                    "Type: %s\n" +
                    "Your expertise score: %.2f",
                    alert.getTitle(),
                    alert.getType(),
                    userExpertiseScores.getOrDefault(expertUserId + "_" + alert.getType().toString().toLowerCase(), 0.0)
                );
                
                notificationService.sendEmailNotification(expert.getEmail(), 
                    "🎯 Expert Alert Assignment: " + alert.getTitle(), message);
            }
        } catch (Exception e) {
            System.err.println("Failed to send expert notification: " + e.getMessage());
        }
    }

    /**
     * Adjust dynamic thresholds based on patterns
     */
    private void adjustDynamicThresholds(Alert alert, String patternId) {
        AlertPattern pattern = alertPatterns.get(patternId);
        if (pattern != null && pattern.getOccurrences() > 10) {
            // Implement dynamic threshold adjustment logic
            double adjustmentFactor = calculateThresholdAdjustment(pattern);
            
            // Update alert metadata with adjusted thresholds
            Map<String, String> metadata = alert.getMetadata();
            if (metadata == null) metadata = new HashMap<>();
            
            metadata.put("dynamicThresholdAdjustment", String.valueOf(adjustmentFactor));
            metadata.put("patternBasedThreshold", "true");
            metadata.put("patternOccurrences", String.valueOf(pattern.getOccurrences()));
            
            alert.setMetadata(metadata);
        }
    }

    /**
     * Calculate threshold adjustment factor
     */
    private double calculateThresholdAdjustment(AlertPattern pattern) {
        // Simple adjustment based on pattern frequency
        double baseAdjustment = 1.0;
        
        if (pattern.getOccurrences() > 50) {
            baseAdjustment = 0.8; // Reduce sensitivity for frequent patterns
        } else if (pattern.getOccurrences() < 5) {
            baseAdjustment = 1.2; // Increase sensitivity for rare patterns
        }
        
        return baseAdjustment;
    }

    /**
     * Get severity numeric value
     */
    private double getSeverityValue(Alert.AlertSeverity severity) {
        return switch (severity) {
            case CRITICAL -> 4.0;
            case HIGH -> 3.0;
            case MEDIUM -> 2.0;
            case LOW -> 1.0;
            case INFO -> 0.5;
        };
    }

    /**
     * Update user expertise scores
     */
    public void updateUserExpertise(String userId, String alertType, boolean successful) {
        String key = userId + "_" + alertType.toLowerCase();
        double currentScore = userExpertiseScores.getOrDefault(key, 0.0);
        
        if (successful) {
            userExpertiseScores.put(key, Math.min(10.0, currentScore + 0.1));
        } else {
            userExpertiseScores.put(key, Math.max(0.0, currentScore - 0.05));
        }
    }

    /**
     * Get routing statistics
     */
    public Map<String, Object> getRoutingStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPatterns", alertPatterns.size());
        stats.put("totalRules", routingRules.size());
        stats.put("expertUsers", userExpertiseScores.size());
        
        // Pattern statistics
        Map<String, Object> patternStats = new HashMap<>();
        for (AlertPattern pattern : alertPatterns.values()) {
            patternStats.put(pattern.getPatternId(), Map.of(
                "occurrences", pattern.getOccurrences(),
                "severity", pattern.getSeverity(),
                "lastSeen", pattern.getLastSeen(),
                "recommendedAction", pattern.getRecommendedAction()
            ));
        }
        stats.put("patterns", patternStats);
        
        return stats;
    }
}
