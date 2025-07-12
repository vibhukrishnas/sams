package com.sams.enterprise.dto;

import com.sams.enterprise.entity.Alert;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.HashMap;
import java.util.Map;

/**
 * Alert Create Request DTO
 */
public class AlertCreateRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    @NotBlank(message = "Description is required")
    private String description;
    
    @NotNull(message = "Severity is required")
    private Alert.AlertSeverity severity;
    
    @NotNull(message = "Type is required")
    private Alert.AlertType type;
    
    @NotBlank(message = "Source is required")
    private String source;
    
    private Long serverId;
    private String serverHostname;
    private String ruleId;
    private Double metricValue;
    private Double thresholdValue;
    private Map<String, String> tags = new HashMap<>();
    private Map<String, String> metadata = new HashMap<>();
    
    // Constructors
    public AlertCreateRequest() {}
    
    public AlertCreateRequest(String title, String description, Alert.AlertSeverity severity, 
                            Alert.AlertType type, String source) {
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.type = type;
        this.source = source;
    }
    
    // Getters and setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public Alert.AlertSeverity getSeverity() { return severity; }
    public void setSeverity(Alert.AlertSeverity severity) { this.severity = severity; }
    
    public Alert.AlertType getType() { return type; }
    public void setType(Alert.AlertType type) { this.type = type; }
    
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    
    public Long getServerId() { return serverId; }
    public void setServerId(Long serverId) { this.serverId = serverId; }
    
    public String getServerHostname() { return serverHostname; }
    public void setServerHostname(String serverHostname) { this.serverHostname = serverHostname; }
    
    public String getRuleId() { return ruleId; }
    public void setRuleId(String ruleId) { this.ruleId = ruleId; }
    
    public Double getMetricValue() { return metricValue; }
    public void setMetricValue(Double metricValue) { this.metricValue = metricValue; }
    
    public Double getThresholdValue() { return thresholdValue; }
    public void setThresholdValue(Double thresholdValue) { this.thresholdValue = thresholdValue; }
    
    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }
    
    public Map<String, String> getMetadata() { return metadata; }
    public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }
}
