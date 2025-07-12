package com.sams.enterprise.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Alert Acknowledge Request DTO
 */
public class AlertAcknowledgeRequest {
    
    @NotNull(message = "User ID is required")
    private Long userId;
    
    private String notes;
    
    // Constructors
    public AlertAcknowledgeRequest() {}
    
    public AlertAcknowledgeRequest(Long userId, String notes) {
        this.userId = userId;
        this.notes = notes;
    }
    
    // Getters and setters
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
