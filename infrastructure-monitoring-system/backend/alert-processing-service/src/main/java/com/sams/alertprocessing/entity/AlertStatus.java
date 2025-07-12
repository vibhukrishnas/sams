package com.sams.alertprocessing.entity;

/**
 * Alert Status Enumeration
 * 
 * Defines the lifecycle states of alerts in the SAMS system.
 * Status determines workflow, permissions, and processing rules.
 */
public enum AlertStatus {
    /**
     * Alert is newly created and requires attention
     */
    OPEN("Open", "danger", true),
    
    /**
     * Alert has been acknowledged by an operator
     */
    ACKNOWLEDGED("Acknowledged", "warning", true),
    
    /**
     * Alert has been resolved (issue fixed)
     */
    RESOLVED("Resolved", "success", false),
    
    /**
     * Alert has been closed (no longer relevant)
     */
    CLOSED("Closed", "secondary", false),
    
    /**
     * Alert is suppressed (temporarily ignored)
     */
    SUPPRESSED("Suppressed", "info", false),
    
    /**
     * Alert has been escalated to higher level
     */
    ESCALATED("Escalated", "danger", true),
    
    /**
     * Alert is in maintenance mode
     */
    MAINTENANCE("Maintenance", "info", false);

    private final String displayName;
    private final String cssClass;
    private final boolean active;

    AlertStatus(String displayName, String cssClass, boolean active) {
        this.displayName = displayName;
        this.cssClass = cssClass;
        this.active = active;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getCssClass() {
        return cssClass;
    }

    public boolean isActive() {
        return active;
    }

    /**
     * Check if alert status allows acknowledgment
     * @return true if alert can be acknowledged
     */
    public boolean canAcknowledge() {
        return this == OPEN || this == ESCALATED;
    }

    /**
     * Check if alert status allows resolution
     * @return true if alert can be resolved
     */
    public boolean canResolve() {
        return this == OPEN || this == ACKNOWLEDGED || this == ESCALATED;
    }

    /**
     * Check if alert status allows closing
     * @return true if alert can be closed
     */
    public boolean canClose() {
        return this == RESOLVED || this == SUPPRESSED;
    }

    /**
     * Check if alert status allows escalation
     * @return true if alert can be escalated
     */
    public boolean canEscalate() {
        return this == OPEN || this == ACKNOWLEDGED;
    }

    /**
     * Check if alert status allows suppression
     * @return true if alert can be suppressed
     */
    public boolean canSuppress() {
        return this == OPEN || this == ACKNOWLEDGED;
    }

    /**
     * Check if alert status allows reopening
     * @return true if alert can be reopened
     */
    public boolean canReopen() {
        return this == RESOLVED || this == CLOSED || this == SUPPRESSED;
    }

    /**
     * Check if alert requires attention
     * @return true if alert requires attention
     */
    public boolean requiresAttention() {
        return this == OPEN || this == ESCALATED;
    }

    /**
     * Check if alert is in a final state
     * @return true if alert is in a final state
     */
    public boolean isFinal() {
        return this == RESOLVED || this == CLOSED;
    }

    /**
     * Check if alert should trigger notifications
     * @return true if alert should trigger notifications
     */
    public boolean shouldNotify() {
        return this == OPEN || this == ESCALATED;
    }

    /**
     * Get alert status from string value
     * @param value the string value
     * @return AlertStatus enum value
     * @throws IllegalArgumentException if value is not valid
     */
    public static AlertStatus fromString(String value) {
        if (value == null) {
            return OPEN; // Default status
        }
        
        for (AlertStatus status : AlertStatus.values()) {
            if (status.name().equalsIgnoreCase(value) || 
                status.displayName.equalsIgnoreCase(value)) {
                return status;
            }
        }
        
        throw new IllegalArgumentException("Invalid alert status: " + value);
    }

    /**
     * Get valid next states for this status
     * @return array of valid next states
     */
    public AlertStatus[] getValidNextStates() {
        return switch (this) {
            case OPEN -> new AlertStatus[]{ACKNOWLEDGED, RESOLVED, CLOSED, ESCALATED, SUPPRESSED};
            case ACKNOWLEDGED -> new AlertStatus[]{RESOLVED, CLOSED, ESCALATED, SUPPRESSED};
            case RESOLVED -> new AlertStatus[]{CLOSED, OPEN}; // Can reopen if issue recurs
            case CLOSED -> new AlertStatus[]{OPEN}; // Can reopen if needed
            case SUPPRESSED -> new AlertStatus[]{OPEN, ACKNOWLEDGED, RESOLVED, CLOSED};
            case ESCALATED -> new AlertStatus[]{ACKNOWLEDGED, RESOLVED, CLOSED, SUPPRESSED};
            case MAINTENANCE -> new AlertStatus[]{OPEN, SUPPRESSED};
        };
    }

    /**
     * Check if transition to another status is valid
     * @param newStatus the target status
     * @return true if transition is valid
     */
    public boolean canTransitionTo(AlertStatus newStatus) {
        if (this == newStatus) {
            return false; // No transition needed
        }
        
        AlertStatus[] validStates = getValidNextStates();
        for (AlertStatus validState : validStates) {
            if (validState == newStatus) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get priority for sorting (lower number = higher priority)
     * @return priority value
     */
    public int getPriority() {
        return switch (this) {
            case ESCALATED -> 1;
            case OPEN -> 2;
            case ACKNOWLEDGED -> 3;
            case SUPPRESSED -> 4;
            case MAINTENANCE -> 5;
            case RESOLVED -> 6;
            case CLOSED -> 7;
        };
    }
}
