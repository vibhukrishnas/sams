package com.sams.alertprocessing.entity;

/**
 * Alert Severity Enumeration
 * 
 * Defines the severity levels for alerts in the SAMS system.
 * Severity determines priority, escalation rules, and notification urgency.
 */
public enum AlertSeverity {
    /**
     * Informational alerts - no action required
     */
    INFO("Info", 1, "info"),
    
    /**
     * Low severity - minor issues that should be monitored
     */
    LOW("Low", 2, "success"),
    
    /**
     * Warning - issues that may require attention
     */
    WARNING("Warning", 3, "warning"),
    
    /**
     * High severity - significant issues requiring prompt attention
     */
    HIGH("High", 4, "danger"),
    
    /**
     * Critical - severe issues requiring immediate attention
     */
    CRITICAL("Critical", 5, "danger"),
    
    /**
     * Emergency - system-wide failures requiring immediate response
     */
    EMERGENCY("Emergency", 6, "danger");

    private final String displayName;
    private final int priority;
    private final String cssClass;

    AlertSeverity(String displayName, int priority, String cssClass) {
        this.displayName = displayName;
        this.priority = priority;
        this.cssClass = cssClass;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getPriority() {
        return priority;
    }

    public String getCssClass() {
        return cssClass;
    }

    /**
     * Check if this severity requires immediate attention
     * @return true if severity is critical or emergency
     */
    public boolean requiresImmediateAttention() {
        return this == CRITICAL || this == EMERGENCY;
    }

    /**
     * Check if this severity requires escalation
     * @return true if severity is high, critical, or emergency
     */
    public boolean requiresEscalation() {
        return this.priority >= HIGH.priority;
    }

    /**
     * Check if this severity should trigger notifications
     * @return true if severity is warning or higher
     */
    public boolean shouldNotify() {
        return this.priority >= WARNING.priority;
    }

    /**
     * Check if this severity can be auto-resolved
     * @return true if severity is info, low, or warning
     */
    public boolean canAutoResolve() {
        return this.priority <= WARNING.priority;
    }

    /**
     * Get escalation timeout in minutes based on severity
     * @return timeout in minutes
     */
    public int getEscalationTimeoutMinutes() {
        return switch (this) {
            case EMERGENCY -> 5;    // 5 minutes
            case CRITICAL -> 15;    // 15 minutes
            case HIGH -> 30;        // 30 minutes
            case WARNING -> 60;     // 1 hour
            case LOW -> 240;        // 4 hours
            case INFO -> 1440;      // 24 hours
        };
    }

    /**
     * Get notification interval in minutes based on severity
     * @return interval in minutes
     */
    public int getNotificationIntervalMinutes() {
        return switch (this) {
            case EMERGENCY -> 5;    // Every 5 minutes
            case CRITICAL -> 15;    // Every 15 minutes
            case HIGH -> 30;        // Every 30 minutes
            case WARNING -> 60;     // Every hour
            case LOW -> 240;        // Every 4 hours
            case INFO -> 1440;      // Once per day
        };
    }

    /**
     * Get alert severity from string value
     * @param value the string value
     * @return AlertSeverity enum value
     * @throws IllegalArgumentException if value is not valid
     */
    public static AlertSeverity fromString(String value) {
        if (value == null) {
            return INFO; // Default severity
        }
        
        for (AlertSeverity severity : AlertSeverity.values()) {
            if (severity.name().equalsIgnoreCase(value) || 
                severity.displayName.equalsIgnoreCase(value)) {
                return severity;
            }
        }
        
        throw new IllegalArgumentException("Invalid alert severity: " + value);
    }

    /**
     * Get next higher severity level
     * @return next higher severity, or current if already at maximum
     */
    public AlertSeverity escalate() {
        return switch (this) {
            case INFO -> LOW;
            case LOW -> WARNING;
            case WARNING -> HIGH;
            case HIGH -> CRITICAL;
            case CRITICAL -> EMERGENCY;
            case EMERGENCY -> EMERGENCY; // Cannot escalate further
        };
    }

    /**
     * Get next lower severity level
     * @return next lower severity, or current if already at minimum
     */
    public AlertSeverity deescalate() {
        return switch (this) {
            case EMERGENCY -> CRITICAL;
            case CRITICAL -> HIGH;
            case HIGH -> WARNING;
            case WARNING -> LOW;
            case LOW -> INFO;
            case INFO -> INFO; // Cannot deescalate further
        };
    }

    /**
     * Compare severity levels
     * @param other the other severity to compare with
     * @return true if this severity is higher than the other
     */
    public boolean isHigherThan(AlertSeverity other) {
        return this.priority > other.priority;
    }

    /**
     * Compare severity levels
     * @param other the other severity to compare with
     * @return true if this severity is lower than the other
     */
    public boolean isLowerThan(AlertSeverity other) {
        return this.priority < other.priority;
    }
}
