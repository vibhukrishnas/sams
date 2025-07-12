package com.sams.enterprise.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Enterprise Alert Entity with Correlation and Lifecycle Management
 */
@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alert_severity", columnList = "severity"),
    @Index(name = "idx_alert_status", columnList = "status"),
    @Index(name = "idx_alert_server", columnList = "server_id"),
    @Index(name = "idx_alert_created", columnList = "created_at"),
    @Index(name = "idx_alert_correlation", columnList = "correlation_id")
})
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 255)
    @Column(nullable = false)
    private String title;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertStatus status = AlertStatus.OPEN;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertType type;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "server_id")
    private Server server;

    @Column(name = "correlation_id")
    private String correlationId;

    @Column(name = "parent_alert_id")
    private Long parentAlertId;

    @Column(name = "rule_id")
    private String ruleId;

    @Column(name = "fingerprint")
    private String fingerprint;

    @ElementCollection
    @CollectionTable(name = "alert_tags", joinColumns = @JoinColumn(name = "alert_id"))
    @MapKeyColumn(name = "tag_key")
    @Column(name = "tag_value")
    private Map<String, String> tags = new HashMap<>();

    @ElementCollection
    @CollectionTable(name = "alert_metadata", joinColumns = @JoinColumn(name = "alert_id"))
    @MapKeyColumn(name = "meta_key")
    @Column(name = "meta_value", columnDefinition = "TEXT")
    private Map<String, String> metadata = new HashMap<>();

    @Column(name = "metric_value")
    private Double metricValue;

    @Column(name = "threshold_value")
    private Double thresholdValue;

    @Column(name = "count")
    private Integer count = 1;

    @Column(name = "first_occurrence", nullable = false)
    private LocalDateTime firstOccurrence;

    @Column(name = "last_occurrence", nullable = false)
    private LocalDateTime lastOccurrence;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acknowledged_by")
    private User acknowledgedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "escalation_level")
    private Integer escalationLevel = 0;

    @Column(name = "next_escalation_at")
    private LocalDateTime nextEscalationAt;

    @Column(name = "notification_sent")
    private Boolean notificationSent = false;

    @Column(name = "auto_resolved")
    private Boolean autoResolved = false;

    // Constructors
    public Alert() {}

    public Alert(String title, String description, AlertSeverity severity, AlertType type, 
                String source, Server server) {
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.type = type;
        this.source = source;
        this.server = server;
        this.firstOccurrence = LocalDateTime.now();
        this.lastOccurrence = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Business Methods
    public void acknowledge(User user, String notes) {
        this.status = AlertStatus.ACKNOWLEDGED;
        this.acknowledgedAt = LocalDateTime.now();
        this.acknowledgedBy = user;
        this.updatedAt = LocalDateTime.now();
        if (notes != null) {
            this.metadata.put("acknowledgment_notes", notes);
        }
    }

    public void resolve(User user, String resolutionNotes) {
        this.status = AlertStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
        this.resolvedBy = user;
        this.resolutionNotes = resolutionNotes;
        this.updatedAt = LocalDateTime.now();
    }

    public void escalate() {
        this.escalationLevel++;
        this.nextEscalationAt = calculateNextEscalation();
        this.updatedAt = LocalDateTime.now();
    }

    public void incrementCount() {
        this.count++;
        this.lastOccurrence = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isOpen() {
        return status == AlertStatus.OPEN;
    }

    public boolean isAcknowledged() {
        return status == AlertStatus.ACKNOWLEDGED;
    }

    public boolean isResolved() {
        return status == AlertStatus.RESOLVED;
    }

    public boolean isCritical() {
        return severity == AlertSeverity.CRITICAL;
    }

    public boolean needsEscalation() {
        return nextEscalationAt != null && LocalDateTime.now().isAfter(nextEscalationAt);
    }

    private LocalDateTime calculateNextEscalation() {
        // Escalation intervals: 15min, 30min, 1hr, 2hr, 4hr
        int[] intervals = {15, 30, 60, 120, 240};
        int index = Math.min(escalationLevel - 1, intervals.length - 1);
        return LocalDateTime.now().plusMinutes(intervals[index]);
    }

    // Lifecycle Callbacks
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (firstOccurrence == null) {
            firstOccurrence = LocalDateTime.now();
        }
        if (lastOccurrence == null) {
            lastOccurrence = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }

    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }

    public AlertType getType() { return type; }
    public void setType(AlertType type) { this.type = type; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Server getServer() { return server; }
    public void setServer(Server server) { this.server = server; }

    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }

    public Long getParentAlertId() { return parentAlertId; }
    public void setParentAlertId(Long parentAlertId) { this.parentAlertId = parentAlertId; }

    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }

    public String getFingerprint() { return fingerprint; }
    public void setFingerprint(String fingerprint) { this.fingerprint = fingerprint; }

    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }

    public Map<String, String> getMetadata() { return metadata; }
    public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }

    public Double getMetricValue() { return metricValue; }
    public void setMetricValue(Double metricValue) { this.metricValue = metricValue; }

    public Double getThresholdValue() { return thresholdValue; }
    public void setThresholdValue(Double thresholdValue) { this.thresholdValue = thresholdValue; }

    public Integer getCount() { return count; }
    public void setCount(Integer count) { this.count = count; }

    public LocalDateTime getFirstOccurrence() { return firstOccurrence; }
    public void setFirstOccurrence(LocalDateTime firstOccurrence) { this.firstOccurrence = firstOccurrence; }

    public LocalDateTime getLastOccurrence() { return lastOccurrence; }
    public void setLastOccurrence(LocalDateTime lastOccurrence) { this.lastOccurrence = lastOccurrence; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }

    public User getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(User acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public User getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(User resolvedBy) { this.resolvedBy = resolvedBy; }

    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }

    public Integer getEscalationLevel() { return escalationLevel; }
    public void setEscalationLevel(Integer escalationLevel) { this.escalationLevel = escalationLevel; }

    public LocalDateTime getNextEscalationAt() { return nextEscalationAt; }
    public void setNextEscalationAt(LocalDateTime nextEscalationAt) { this.nextEscalationAt = nextEscalationAt; }

    public Boolean getNotificationSent() { return notificationSent; }
    public void setNotificationSent(Boolean notificationSent) { this.notificationSent = notificationSent; }

    public Boolean getAutoResolved() { return autoResolved; }
    public void setAutoResolved(Boolean autoResolved) { this.autoResolved = autoResolved; }

    // Enums
    public enum AlertSeverity {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum AlertStatus {
        OPEN, ACKNOWLEDGED, RESOLVED, SUPPRESSED, EXPIRED
    }

    public enum AlertType {
        SYSTEM, APPLICATION, NETWORK, SECURITY, PERFORMANCE, AVAILABILITY, CUSTOM
    }
}
