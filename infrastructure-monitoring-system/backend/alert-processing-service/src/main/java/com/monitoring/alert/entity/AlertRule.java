/**
 * 🚨 Alert Rule Entity - Sophisticated Alert Rule Management
 * Comprehensive alert rule engine with conditions, thresholds, and escalation
 */

package com.monitoring.alert.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "alert_rules", indexes = {
    @Index(name = "idx_alert_rule_name", columnList = "name"),
    @Index(name = "idx_alert_rule_enabled", columnList = "is_enabled"),
    @Index(name = "idx_alert_rule_severity", columnList = "severity"),
    @Index(name = "idx_alert_rule_organization", columnList = "organization_id"),
    @Index(name = "idx_alert_rule_category", columnList = "category")
})
@EntityListeners(AuditingEntityListener.class)
public class AlertRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank(message = "Alert rule name is required")
    @Size(min = 1, max = 255, message = "Alert rule name must be between 1 and 255 characters")
    @Column(nullable = false)
    private String name;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotBlank(message = "Category is required")
    @Size(max = 100, message = "Category must not exceed 100 characters")
    private String category;

    @NotNull(message = "Severity is required")
    @Enumerated(EnumType.STRING)
    private AlertSeverity severity = AlertSeverity.MEDIUM;

    @NotNull(message = "Rule type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type")
    private AlertRuleType ruleType = AlertRuleType.THRESHOLD;

    @NotBlank(message = "Query is required")
    @Size(max = 2000, message = "Query must not exceed 2000 characters")
    @Column(nullable = false, length = 2000)
    private String query;

    // JSON column for rule conditions
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> conditions = new HashMap<>();

    // JSON column for rule parameters
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> parameters = new HashMap<>();

    @Column(name = "evaluation_interval")
    private Integer evaluationInterval = 60; // seconds

    @Column(name = "for_duration")
    private Integer forDuration = 300; // seconds (5 minutes)

    @Column(name = "is_enabled")
    private Boolean isEnabled = true;

    @Column(name = "is_system_rule")
    private Boolean isSystemRule = false;

    // JSON column for labels
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> labels = new HashMap<>();

    // JSON column for annotations
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> annotations = new HashMap<>();

    @Column(name = "notification_channels")
    private String notificationChannels; // Comma-separated channel IDs

    @Column(name = "escalation_policy_id")
    private UUID escalationPolicyId;

    @Column(name = "suppression_enabled")
    private Boolean suppressionEnabled = false;

    @Column(name = "suppression_duration")
    private Integer suppressionDuration = 3600; // seconds (1 hour)

    @Column(name = "auto_resolve_enabled")
    private Boolean autoResolveEnabled = true;

    @Column(name = "auto_resolve_duration")
    private Integer autoResolveDuration = 1800; // seconds (30 minutes)

    @Column(name = "correlation_enabled")
    private Boolean correlationEnabled = true;

    @Column(name = "correlation_window")
    private Integer correlationWindow = 300; // seconds (5 minutes)

    @Column(name = "last_evaluation")
    private LocalDateTime lastEvaluation;

    @Column(name = "last_triggered")
    private LocalDateTime lastTriggered;

    @Column(name = "trigger_count")
    private Long triggerCount = 0L;

    @NotNull(message = "Organization is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @JsonIgnore
    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Alert> alerts = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "rule", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<AlertRuleHistory> history = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public AlertRule() {}

    public AlertRule(String name, String query, AlertSeverity severity, Organization organization) {
        this.name = name;
        this.query = query;
        this.severity = severity;
        this.organization = organization;
    }

    // Business methods
    public void updateLastEvaluation() {
        this.lastEvaluation = LocalDateTime.now();
    }

    public void updateLastTriggered() {
        this.lastTriggered = LocalDateTime.now();
        this.triggerCount++;
    }

    public boolean shouldEvaluate() {
        if (!isEnabled) return false;
        if (lastEvaluation == null) return true;
        return lastEvaluation.isBefore(LocalDateTime.now().minusSeconds(evaluationInterval));
    }

    public boolean isInSuppressionWindow() {
        if (!suppressionEnabled || lastTriggered == null) return false;
        return lastTriggered.isAfter(LocalDateTime.now().minusSeconds(suppressionDuration));
    }

    public void addLabel(String key, String value) {
        this.labels.put(key, value);
    }

    public void removeLabel(String key) {
        this.labels.remove(key);
    }

    public String getLabel(String key) {
        return this.labels.get(key);
    }

    public void addAnnotation(String key, String value) {
        this.annotations.put(key, value);
    }

    public void removeAnnotation(String key) {
        this.annotations.remove(key);
    }

    public String getAnnotation(String key) {
        return this.annotations.get(key);
    }

    public void addCondition(String key, Object value) {
        this.conditions.put(key, value);
    }

    public Object getCondition(String key) {
        return this.conditions.get(key);
    }

    public void addParameter(String key, Object value) {
        this.parameters.put(key, value);
    }

    public Object getParameter(String key) {
        return this.parameters.get(key);
    }

    public List<String> getNotificationChannelList() {
        if (notificationChannels == null || notificationChannels.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.asList(notificationChannels.split(","));
    }

    public void setNotificationChannelList(List<String> channels) {
        this.notificationChannels = String.join(",", channels);
    }

    public int getActiveAlertsCount() {
        return (int) alerts.stream()
                .filter(alert -> alert.getStatus() == AlertStatus.FIRING || 
                               alert.getStatus() == AlertStatus.PENDING)
                .count();
    }

    public double getSuccessRate() {
        if (triggerCount == 0) return 100.0;
        long resolvedCount = alerts.stream()
                .mapToLong(alert -> alert.getStatus() == AlertStatus.RESOLVED ? 1 : 0)
                .sum();
        return (double) resolvedCount / triggerCount * 100;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }

    public AlertRuleType getRuleType() { return ruleType; }
    public void setRuleType(AlertRuleType ruleType) { this.ruleType = ruleType; }

    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }

    public Map<String, Object> getConditions() { return conditions; }
    public void setConditions(Map<String, Object> conditions) { this.conditions = conditions; }

    public Map<String, Object> getParameters() { return parameters; }
    public void setParameters(Map<String, Object> parameters) { this.parameters = parameters; }

    public Integer getEvaluationInterval() { return evaluationInterval; }
    public void setEvaluationInterval(Integer evaluationInterval) { this.evaluationInterval = evaluationInterval; }

    public Integer getForDuration() { return forDuration; }
    public void setForDuration(Integer forDuration) { this.forDuration = forDuration; }

    public Boolean getIsEnabled() { return isEnabled; }
    public void setIsEnabled(Boolean isEnabled) { this.isEnabled = isEnabled; }

    public Boolean getIsSystemRule() { return isSystemRule; }
    public void setIsSystemRule(Boolean isSystemRule) { this.isSystemRule = isSystemRule; }

    public Map<String, String> getLabels() { return labels; }
    public void setLabels(Map<String, String> labels) { this.labels = labels; }

    public Map<String, String> getAnnotations() { return annotations; }
    public void setAnnotations(Map<String, String> annotations) { this.annotations = annotations; }

    public String getNotificationChannels() { return notificationChannels; }
    public void setNotificationChannels(String notificationChannels) { this.notificationChannels = notificationChannels; }

    public UUID getEscalationPolicyId() { return escalationPolicyId; }
    public void setEscalationPolicyId(UUID escalationPolicyId) { this.escalationPolicyId = escalationPolicyId; }

    public Boolean getSuppressionEnabled() { return suppressionEnabled; }
    public void setSuppressionEnabled(Boolean suppressionEnabled) { this.suppressionEnabled = suppressionEnabled; }

    public Integer getSuppressionDuration() { return suppressionDuration; }
    public void setSuppressionDuration(Integer suppressionDuration) { this.suppressionDuration = suppressionDuration; }

    public Boolean getAutoResolveEnabled() { return autoResolveEnabled; }
    public void setAutoResolveEnabled(Boolean autoResolveEnabled) { this.autoResolveEnabled = autoResolveEnabled; }

    public Integer getAutoResolveDuration() { return autoResolveDuration; }
    public void setAutoResolveDuration(Integer autoResolveDuration) { this.autoResolveDuration = autoResolveDuration; }

    public Boolean getCorrelationEnabled() { return correlationEnabled; }
    public void setCorrelationEnabled(Boolean correlationEnabled) { this.correlationEnabled = correlationEnabled; }

    public Integer getCorrelationWindow() { return correlationWindow; }
    public void setCorrelationWindow(Integer correlationWindow) { this.correlationWindow = correlationWindow; }

    public LocalDateTime getLastEvaluation() { return lastEvaluation; }
    public void setLastEvaluation(LocalDateTime lastEvaluation) { this.lastEvaluation = lastEvaluation; }

    public LocalDateTime getLastTriggered() { return lastTriggered; }
    public void setLastTriggered(LocalDateTime lastTriggered) { this.lastTriggered = lastTriggered; }

    public Long getTriggerCount() { return triggerCount; }
    public void setTriggerCount(Long triggerCount) { this.triggerCount = triggerCount; }

    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }

    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }

    public User getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(User updatedBy) { this.updatedBy = updatedBy; }

    public Set<Alert> getAlerts() { return alerts; }
    public void setAlerts(Set<Alert> alerts) { this.alerts = alerts; }

    public Set<AlertRuleHistory> getHistory() { return history; }
    public void setHistory(Set<AlertRuleHistory> history) { this.history = history; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AlertRule)) return false;
        AlertRule alertRule = (AlertRule) o;
        return Objects.equals(id, alertRule.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "AlertRule{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", severity=" + severity +
                ", ruleType=" + ruleType +
                ", isEnabled=" + isEnabled +
                ", category='" + category + '\'' +
                '}';
    }
}

/**
 * Alert severity enumeration
 */
enum AlertSeverity {
    LOW("Low", 1),
    MEDIUM("Medium", 2),
    HIGH("High", 3),
    CRITICAL("Critical", 4);

    private final String displayName;
    private final int level;

    AlertSeverity(String displayName, int level) {
        this.displayName = displayName;
        this.level = level;
    }

    public String getDisplayName() { return displayName; }
    public int getLevel() { return level; }
}

/**
 * Alert rule type enumeration
 */
enum AlertRuleType {
    THRESHOLD("Threshold"),
    ANOMALY("Anomaly Detection"),
    PATTERN("Pattern Matching"),
    COMPOSITE("Composite Rule"),
    EXTERNAL("External Source");

    private final String displayName;

    AlertRuleType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() { return displayName; }
}

/**
 * Alert status enumeration
 */
enum AlertStatus {
    PENDING("Pending"),
    FIRING("Firing"),
    ACKNOWLEDGED("Acknowledged"),
    RESOLVED("Resolved"),
    SUPPRESSED("Suppressed"),
    EXPIRED("Expired");

    private final String displayName;

    AlertStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() { return displayName; }
}
