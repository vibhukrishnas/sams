package com.sams.model;

/**
 * Alert Status
 */
public enum AlertStatus {
    ACTIVE,       // Alert is active and needs attention
    ACKNOWLEDGED, // Alert has been acknowledged but not resolved
    RESOLVED,     // Alert has been resolved
    SUPPRESSED,   // Alert is temporarily suppressed
    EXPIRED       // Alert has expired without resolution
}
