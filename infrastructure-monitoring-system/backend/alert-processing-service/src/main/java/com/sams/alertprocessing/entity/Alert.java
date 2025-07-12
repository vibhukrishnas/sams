package com.sams.alertprocessing.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Alert Entity for SAMS Alert Processing
 * 
 * Represents an alert in the system with:
 * - Alert lifecycle management (open, acknowledged, resolved)
 * - Severity classification and escalation
 * - Correlation and deduplication support
 * - Rule-based processing
 * - Suppression and maintenance windows
 */
@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alert_source", columnList = "source"),
    @Index(name = "idx_alert_severity", columnList = "severity"),
    @Index(name = "idx_alert_status", columnList = "status"),
    @Index(name = "idx_alert_server_id", columnList = "serverId"),
    @Index(name = "idx_alert_correlation_id", columnList = "correlationId"),
    @Index(name = "idx_alert_created_at", columnList = "createdAt"),
    @Index(name = "idx_alert_resolved_at", columnList = "resolvedAt")
})
@EntityListeners(AuditingEntityListener.class)
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    @NotBlank(message = "Alert source is required")
    @Size(min = 2, max = 100, message = "Source must be between 2 and 100 characters")
    private String source;

    @Column(name = "server_id")
    private Long serverId;

    @Column(name = "server_name", length = 255)
    private String serverName;

    @Column(name = "alert_type", nullable = false, length = 100)
    @NotBlank(message = "Alert type is required")
    @Size(min = 2, max = 100, message = "Alert type must be between 2 and 100 characters")
    private String alertType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity = AlertSeverity.INFO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertStatus status = AlertStatus.OPEN;

    @Column(nullable = false, length = 1000)
    @NotBlank(message = "Alert message is required")
    @Size(min = 1, max = 1000, message = "Message must be between 1 and 1000 characters")
    private String message;

    @Column(length = 2000)
    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "correlation_key", length = 255)
    private String correlationKey;

    @Column(name = "rule_id")
    private Long ruleId;

    @Column(name = "rule_name", length = 255)
    private String ruleName;

    @Column(name = "escalation_level")
    private Integer escalationLevel = 0;

    @Column(name = "escalation_count")
    private Integer escalationCount = 0;

    @Column(name = "suppressed")
    private Boolean suppressed = false;

    @Column(name = "suppression_reason", length = 500)
    private String suppressionReason;

    @Column(name = "suppressed_until")
    private LocalDateTime suppressedUntil;

    @Column(name = "acknowledged_by", length = 100)
    private String acknowledgedBy;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "acknowledgment_note", length = 1000)
    private String acknowledgmentNote;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_note", length = 1000)
    private String resolutionNote;

    @Column(name = "auto_resolved")
    private Boolean autoResolved = false;

    @Column(name = "notification_sent")
    private Boolean notificationSent = false;

    @Column(name = "notification_count")
    private Integer notificationCount = 0;

    @Column(name = "last_notification_at")
    private LocalDateTime lastNotificationAt;

    @Column(name = "duplicate_count")
    private Integer duplicateCount = 0;

    @Column(name = "last_occurrence")
    private LocalDateTime lastOccurrence;

    @Column(name = "first_occurrence")
    private LocalDateTime firstOccurrence;

    // Store alert data as JSON
    @ElementCollection
    @CollectionTable(name = "alert_data", joinColumns = @JoinColumn(name = "alert_id"))
    @MapKeyColumn(name = "data_key")
    @Column(name = "data_value", length = 1000)
    private Map<String, String> alertData = new HashMap<>();

    // Store tags as JSON
    @ElementCollection
    @CollectionTable(name = "alert_tags", joinColumns = @JoinColumn(name = "alert_id"))
    @MapKeyColumn(name = "tag_key")
    @Column(name = "tag_value")
    private Map<String, String> tags = new HashMap<>();

    // Relationships
    @OneToMany(mappedBy = "alert", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private Set<AlertHistory> history = new HashSet<>();

    @OneToMany(mappedBy = "alert", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private Set<AlertNotification> notifications = new HashSet<>();

    @ManyToMany(mappedBy = "alerts")
    @JsonIgnore
    private Set<AlertRule> rules = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    // Constructors
    public Alert() {
        this.firstOccurrence = LocalDateTime.now();
        this.lastOccurrence = LocalDateTime.now();
    }

    public Alert(String source, String alertType, AlertSeverity severity, String message) {
        this();
        this.source = source;
        this.alertType = alertType;
        this.severity = severity;
        this.message = message;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Long getServerId() { return serverId; }
    public void setServerId(Long serverId) { this.serverId = serverId; }

    public String getServerName() { return serverName; }
    public void setServerName(String serverName) { this.serverName = serverName; }

    public String getAlertType() { return alertType; }
    public void setAlertType(String alertType) { this.alertType = alertType; }

    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }

    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }

    public String getCorrelationKey() { return correlationKey; }
    public void setCorrelationKey(String correlationKey) { this.correlationKey = correlationKey; }

    public Long getRuleId() { return ruleId; }
    public void setRuleId(Long ruleId) { this.ruleId = ruleId; }

    public String getRuleName() { return ruleName; }
    public void setRuleName(String ruleName) { this.ruleName = ruleName; }

    public Integer getEscalationLevel() { return escalationLevel; }
    public void setEscalationLevel(Integer escalationLevel) { this.escalationLevel = escalationLevel; }

    public Integer getEscalationCount() { return escalationCount; }
    public void setEscalationCount(Integer escalationCount) { this.escalationCount = escalationCount; }

    public Boolean getSuppressed() { return suppressed; }
    public void setSuppressed(Boolean suppressed) { this.suppressed = suppressed; }

    public String getSuppressionReason() { return suppressionReason; }
    public void setSuppressionReason(String suppressionReason) { this.suppressionReason = suppressionReason; }

    public LocalDateTime getSuppressedUntil() { return suppressedUntil; }
    public void setSuppressedUntil(LocalDateTime suppressedUntil) { this.suppressedUntil = suppressedUntil; }

    public String getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(String acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; }

    public LocalDateTime getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(LocalDateTime acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }

    public String getAcknowledgmentNote() { return acknowledgmentNote; }
    public void setAcknowledgmentNote(String acknowledgmentNote) { this.acknowledgmentNote = acknowledgmentNote; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(LocalDateTime resolvedAt) { this.resolvedAt = resolvedAt; }

    public String getResolutionNote() { return resolutionNote; }
    public void setResolutionNote(String resolutionNote) { this.resolutionNote = resolutionNote; }

    public Boolean getAutoResolved() { return autoResolved; }
    public void setAutoResolved(Boolean autoResolved) { this.autoResolved = autoResolved; }

    public Boolean getNotificationSent() { return notificationSent; }
    public void setNotificationSent(Boolean notificationSent) { this.notificationSent = notificationSent; }

    public Integer getNotificationCount() { return notificationCount; }
    public void setNotificationCount(Integer notificationCount) { this.notificationCount = notificationCount; }

    public LocalDateTime getLastNotificationAt() { return lastNotificationAt; }
    public void setLastNotificationAt(LocalDateTime lastNotificationAt) { this.lastNotificationAt = lastNotificationAt; }

    public Integer getDuplicateCount() { return duplicateCount; }
    public void setDuplicateCount(Integer duplicateCount) { this.duplicateCount = duplicateCount; }

    public LocalDateTime getLastOccurrence() { return lastOccurrence; }
    public void setLastOccurrence(LocalDateTime lastOccurrence) { this.lastOccurrence = lastOccurrence; }

    public LocalDateTime getFirstOccurrence() { return firstOccurrence; }
    public void setFirstOccurrence(LocalDateTime firstOccurrence) { this.firstOccurrence = firstOccurrence; }

    public Map<String, String> getAlertData() { return alertData; }
    public void setAlertData(Map<String, String> alertData) { this.alertData = alertData; }

    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }

    public Set<AlertHistory> getHistory() { return history; }
    public void setHistory(Set<AlertHistory> history) { this.history = history; }

    public Set<AlertNotification> getNotifications() { return notifications; }
    public void setNotifications(Set<AlertNotification> notifications) { this.notifications = notifications; }

    public Set<AlertRule> getRules() { return rules; }
    public void setRules(Set<AlertRule> rules) { this.rules = rules; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    // Utility methods
    public void addAlertData(String key, String value) {
        this.alertData.put(key, value);
    }

    public void removeAlertData(String key) {
        this.alertData.remove(key);
    }

    public String getAlertData(String key) {
        return this.alertData.get(key);
    }

    public void addTag(String key, String value) {
        this.tags.put(key, value);
    }

    public void removeTag(String key) {
        this.tags.remove(key);
    }

    public String getTag(String key) {
        return this.tags.get(key);
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

    public boolean isClosed() {
        return status == AlertStatus.CLOSED;
    }

    public boolean isSuppressed() {
        return suppressed != null && suppressed && 
               (suppressedUntil == null || suppressedUntil.isAfter(LocalDateTime.now()));
    }

    public boolean requiresEscalation() {
        return isOpen() && !isSuppressed() && 
               (escalationLevel == null || escalationLevel == 0);
    }

    public void acknowledge(String acknowledgedBy, String note) {
        this.status = AlertStatus.ACKNOWLEDGED;
        this.acknowledgedBy = acknowledgedBy;
        this.acknowledgedAt = LocalDateTime.now();
        this.acknowledgmentNote = note;
        this.updatedBy = acknowledgedBy;
    }

    public void resolve(String resolvedBy, String note, boolean autoResolved) {
        this.status = AlertStatus.RESOLVED;
        this.resolvedBy = resolvedBy;
        this.resolvedAt = LocalDateTime.now();
        this.resolutionNote = note;
        this.autoResolved = autoResolved;
        this.updatedBy = resolvedBy;
    }

    public void close(String closedBy) {
        this.status = AlertStatus.CLOSED;
        this.updatedBy = closedBy;
    }

    public void suppress(String reason, LocalDateTime until) {
        this.suppressed = true;
        this.suppressionReason = reason;
        this.suppressedUntil = until;
    }

    public void unsuppress() {
        this.suppressed = false;
        this.suppressionReason = null;
        this.suppressedUntil = null;
    }

    public void escalate() {
        this.escalationLevel = (this.escalationLevel == null) ? 1 : this.escalationLevel + 1;
        this.escalationCount = (this.escalationCount == null) ? 1 : this.escalationCount + 1;
    }

    public void incrementDuplicateCount() {
        this.duplicateCount = (this.duplicateCount == null) ? 1 : this.duplicateCount + 1;
        this.lastOccurrence = LocalDateTime.now();
    }

    public void recordNotification() {
        this.notificationSent = true;
        this.notificationCount = (this.notificationCount == null) ? 1 : this.notificationCount + 1;
        this.lastNotificationAt = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "Alert{" +
                "id=" + id +
                ", source='" + source + '\'' +
                ", alertType='" + alertType + '\'' +
                ", severity=" + severity +
                ", status=" + status +
                ", serverId=" + serverId +
                ", correlationId='" + correlationId + '\'' +
                '}';
    }
}
