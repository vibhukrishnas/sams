package com.sams.enterprise.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Alert Resolve Request DTO
 */
public class AlertResolveRequest {
    
    @NotNull(message = "User ID is required")
    private Long userId;
    
    private String resolutionNotes;
    
    // Constructors
    public AlertResolveRequest() {}
    
    public AlertResolveRequest(Long userId, String resolutionNotes) {
        this.userId = userId;
        this.resolutionNotes = resolutionNotes;
    }
    
    // Getters and setters
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }
}
