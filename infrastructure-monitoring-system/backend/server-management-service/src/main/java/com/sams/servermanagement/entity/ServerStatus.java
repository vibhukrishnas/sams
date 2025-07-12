package com.sams.servermanagement.entity;

/**
 * Server Status Enumeration
 * 
 * Defines the possible states of a server in the SAMS monitoring system.
 */
public enum ServerStatus {
    /**
     * Server is online and responding normally
     */
    ONLINE("Online", "success"),
    
    /**
     * Server is online but has warnings or performance issues
     */
    WARNING("Warning", "warning"),
    
    /**
     * Server is offline or not responding
     */
    OFFLINE("Offline", "danger"),
    
    /**
     * Server status is unknown (initial state or connection issues)
     */
    UNKNOWN("Unknown", "secondary"),
    
    /**
     * Server is in maintenance mode
     */
    MAINTENANCE("Maintenance", "info"),
    
    /**
     * Server has critical issues
     */
    CRITICAL("Critical", "danger"),
    
    /**
     * Server is being provisioned or set up
     */
    PROVISIONING("Provisioning", "info"),
    
    /**
     * Server is being decommissioned
     */
    DECOMMISSIONING("Decommissioning", "secondary");

    private final String displayName;
    private final String severity;

    ServerStatus(String displayName, String severity) {
        this.displayName = displayName;
        this.severity = severity;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getSeverity() {
        return severity;
    }

    /**
     * Check if the server status indicates the server is available for monitoring
     * @return true if server can be monitored
     */
    public boolean isMonitorable() {
        return this == ONLINE || this == WARNING || this == CRITICAL;
    }

    /**
     * Check if the server status indicates a healthy state
     * @return true if server is in a healthy state
     */
    public boolean isHealthy() {
        return this == ONLINE;
    }

    /**
     * Check if the server status indicates an unhealthy state
     * @return true if server is in an unhealthy state
     */
    public boolean isUnhealthy() {
        return this == OFFLINE || this == CRITICAL;
    }

    /**
     * Check if the server status requires attention
     * @return true if server status requires attention
     */
    public boolean requiresAttention() {
        return this == WARNING || this == CRITICAL || this == OFFLINE || this == UNKNOWN;
    }

    /**
     * Get server status from string value
     * @param value the string value
     * @return ServerStatus enum value
     * @throws IllegalArgumentException if value is not valid
     */
    public static ServerStatus fromString(String value) {
        if (value == null) {
            return UNKNOWN; // Default status
        }
        
        for (ServerStatus status : ServerStatus.values()) {
            if (status.name().equalsIgnoreCase(value) || 
                status.displayName.equalsIgnoreCase(value)) {
                return status;
            }
        }
        
        throw new IllegalArgumentException("Invalid server status: " + value);
    }

    /**
     * Get priority for sorting (lower number = higher priority)
     * @return priority value
     */
    public int getPriority() {
        return switch (this) {
            case CRITICAL -> 1;
            case OFFLINE -> 2;
            case WARNING -> 3;
            case UNKNOWN -> 4;
            case MAINTENANCE -> 5;
            case PROVISIONING -> 6;
            case DECOMMISSIONING -> 7;
            case ONLINE -> 8;
        };
    }
}
