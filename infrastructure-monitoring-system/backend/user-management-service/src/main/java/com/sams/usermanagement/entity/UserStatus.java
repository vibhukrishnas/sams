package com.sams.usermanagement.entity;

/**
 * User Status Enumeration
 * 
 * Defines the possible states of a user account in the SAMS system.
 */
public enum UserStatus {
    /**
     * User account is active and can log in
     */
    ACTIVE("Active"),
    
    /**
     * User account is inactive and cannot log in
     */
    INACTIVE("Inactive"),
    
    /**
     * User account is suspended temporarily
     */
    SUSPENDED("Suspended"),
    
    /**
     * User account is locked due to security reasons
     */
    LOCKED("Locked"),
    
    /**
     * User account is pending activation (e.g., email verification)
     */
    PENDING("Pending"),
    
    /**
     * User account has been deleted (soft delete)
     */
    DELETED("Deleted");

    private final String displayName;

    UserStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * Check if the user status allows login
     * @return true if user can log in with this status
     */
    public boolean canLogin() {
        return this == ACTIVE;
    }

    /**
     * Check if the user status is considered active
     * @return true if user is in an active state
     */
    public boolean isActive() {
        return this == ACTIVE || this == PENDING;
    }

    /**
     * Get user status from string value
     * @param value the string value
     * @return UserStatus enum value
     * @throws IllegalArgumentException if value is not valid
     */
    public static UserStatus fromString(String value) {
        if (value == null) {
            return ACTIVE; // Default status
        }
        
        for (UserStatus status : UserStatus.values()) {
            if (status.name().equalsIgnoreCase(value) || 
                status.displayName.equalsIgnoreCase(value)) {
                return status;
            }
        }
        
        throw new IllegalArgumentException("Invalid user status: " + value);
    }
}
