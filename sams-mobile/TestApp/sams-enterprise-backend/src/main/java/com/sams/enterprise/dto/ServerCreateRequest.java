package com.sams.enterprise.dto;

import com.sams.enterprise.entity.Server;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.HashMap;
import java.util.Map;

/**
 * Server Create Request DTO
 */
public class ServerCreateRequest {
    
    @NotBlank(message = "Hostname is required")
    private String hostname;
    
    @NotBlank(message = "IP address is required")
    private String ipAddress;
    
    private String description;
    
    @NotNull(message = "Server type is required")
    private Server.ServerType type;
    
    @NotBlank(message = "Environment is required")
    private String environment;
    
    private String operatingSystem;
    private String osVersion;
    private Integer cpuCores;
    private Integer memoryGb;
    private Integer diskGb;
    private Map<String, String> tags = new HashMap<>();
    private Map<String, String> configuration = new HashMap<>();
    
    // Constructors
    public ServerCreateRequest() {}
    
    public ServerCreateRequest(String hostname, String ipAddress, Server.ServerType type, String environment) {
        this.hostname = hostname;
        this.ipAddress = ipAddress;
        this.type = type;
        this.environment = environment;
    }
    
    // Getters and setters
    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public Server.ServerType getType() { return type; }
    public void setType(Server.ServerType type) { this.type = type; }
    
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
    
    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }
    
    public Map<String, String> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, String> configuration) { this.configuration = configuration; }
}
