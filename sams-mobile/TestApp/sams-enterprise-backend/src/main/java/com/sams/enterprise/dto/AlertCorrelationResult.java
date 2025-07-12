package com.sams.enterprise.dto;

import com.sams.enterprise.entity.Alert;
import java.util.List;

/**
 * Alert Correlation Result DTO
 */
public class AlertCorrelationResult {
    
    private String correlationId;
    private int alertCount;
    private Alert.AlertType type;
    private Alert.AlertSeverity severity;
    private List<Long> alertIds;
    
    // Constructors
    public AlertCorrelationResult() {}
    
    public AlertCorrelationResult(String correlationId, int alertCount, Alert.AlertType type, 
                                Alert.AlertSeverity severity, List<Long> alertIds) {
        this.correlationId = correlationId;
        this.alertCount = alertCount;
        this.type = type;
        this.severity = severity;
        this.alertIds = alertIds;
    }
    
    // Getters and setters
    public String getCorrelationId() { return correlationId; }
    public void setCorrelationId(String correlationId) { this.correlationId = correlationId; }
    
    public int getAlertCount() { return alertCount; }
    public void setAlertCount(int alertCount) { this.alertCount = alertCount; }
    
    public Alert.AlertType getType() { return type; }
    public void setType(Alert.AlertType type) { this.type = type; }
    
    public Alert.AlertSeverity getSeverity() { return severity; }
    public void setSeverity(Alert.AlertSeverity severity) { this.severity = severity; }
    
    public List<Long> getAlertIds() { return alertIds; }
    public void setAlertIds(List<Long> alertIds) { this.alertIds = alertIds; }
}
