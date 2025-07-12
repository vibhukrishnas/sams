package com.sams.enterprise.dto;

import java.util.Map;

/**
 * Server Update Request DTO
 */
public class ServerUpdateRequest {
    
    private String description;
    private String environment;
    private String operatingSystem;
    private String osVersion;
    private Integer cpuCores;
    private Integer memoryGb;
    private Integer diskGb;
    private Boolean monitoringEnabled;
    private Map<String, String> tags;
    private Map<String, String> configuration;
    
    // Constructors
    public ServerUpdateRequest() {}
    
    // Getters and setters
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }
    
    public String getOperatingSystem() { return operatingSystem; }
    public void setOperatingSystem(String operatingSystem) { this.operatingSystem = operatingSystem; }
    
    public String getOsVersion() { return osVersion; }
    public void setOsVersion(String osVersion) { this.osVersion = osVersion; }
    
    public Integer getCpuCores() { return cpuCores; }
    public void setCpuCores(Integer cpuCores) { this.cpuCores = cpuCores; }
    
    public Integer getMemoryGb() { return memoryGb; }
    public void setMemoryGb(Integer memoryGb) { this.memoryGb = memoryGb; }
    
    public Integer getDiskGb() { return diskGb; }
    public void setDiskGb(Integer diskGb) { this.diskGb = diskGb; }
    
    public Boolean getMonitoringEnabled() { return monitoringEnabled; }
    public void setMonitoringEnabled(Boolean monitoringEnabled) { this.monitoringEnabled = monitoringEnabled; }
    
    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }
    
    public Map<String, String> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, String> configuration) { this.configuration = configuration; }
}
