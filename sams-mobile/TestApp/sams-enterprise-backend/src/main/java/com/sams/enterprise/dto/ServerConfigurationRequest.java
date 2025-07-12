package com.sams.enterprise.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.HashMap;
import java.util.Map;

/**
 * Server Configuration Request DTO
 */
public class ServerConfigurationRequest {
    
    @NotBlank(message = "Configuration type is required")
    private String configurationType;
    
    private Map<String, String> settings = new HashMap<>();
    
    // Constructors
    public ServerConfigurationRequest() {}
    
    public ServerConfigurationRequest(String configurationType, Map<String, String> settings) {
        this.configurationType = configurationType;
        this.settings = settings;
    }
    
    // Getters and setters
    public String getConfigurationType() { return configurationType; }
    public void setConfigurationType(String configurationType) { this.configurationType = configurationType; }
    
    public Map<String, String> getSettings() { return settings; }
    public void setSettings(Map<String, String> settings) { this.settings = settings; }
}
