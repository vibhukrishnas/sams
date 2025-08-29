package com.sams.model;

/**
 * Server Status Enumeration
 * Represents the current operational status of a server
 */
public enum ServerStatus {
    ONLINE,     // Server is operational and responding
    OFFLINE,    // Server is not responding to requests
    MAINTENANCE,// Server is in maintenance mode
    WARNING,    // Server has warning conditions but is still operational
    ERROR,      // Server has errors but may still be partially functional
    CRITICAL,   // Server is in critical state requiring immediate attention
    UNKNOWN     // Server status cannot be determined
}
