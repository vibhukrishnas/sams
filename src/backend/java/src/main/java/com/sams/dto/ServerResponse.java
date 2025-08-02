package com.sams.dto;

import com.sams.entity.Server.ServerStatus;
import java.time.LocalDateTime;

/**
 * Data Transfer Object for Server Response
 */
public class ServerResponse {
    
    private Long id;
    private String name;
    private String host;
    private Integer port;
    private String description;
    private String serverType;
    private String version;
    private String operatingSystem;
    private ServerStatus status;
    private Double cpuUsage;
    private Double memoryUsage;
    private Double diskUsage;
    private Long uptime;
    private LocalDateTime lastPing;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer activeAlertCount;
    
    // Constructors
    public ServerResponse() {}
    
    // Builder pattern for easier construction
    public static class Builder {
        private ServerResponse response = new ServerResponse();
        
        public Builder id(Long id) { response.id = id; return this; }
        public Builder name(String name) { response.name = name; return this; }
        public Builder host(String host) { response.host = host; return this; }
        public Builder port(Integer port) { response.port = port; return this; }
        public Builder description(String description) { response.description = description; return this; }
        public Builder serverType(String serverType) { response.serverType = serverType; return this; }
        public Builder version(String version) { response.version = version; return this; }
        public Builder operatingSystem(String operatingSystem) { response.operatingSystem = operatingSystem; return this; }
        public Builder status(ServerStatus status) { response.status = status; return this; }
        public Builder cpuUsage(Double cpuUsage) { response.cpuUsage = cpuUsage; return this; }
        public Builder memoryUsage(Double memoryUsage) { response.memoryUsage = memoryUsage; return this; }
        public Builder diskUsage(Double diskUsage) { response.diskUsage = diskUsage; return this; }
        public Builder uptime(Long uptime) { response.uptime = uptime; return this; }
        public Builder lastPing(LocalDateTime lastPing) { response.lastPing = lastPing; return this; }
        public Builder createdAt(LocalDateTime createdAt) { response.createdAt = createdAt; return this; }
        public Builder updatedAt(LocalDateTime updatedAt) { response.updatedAt = updatedAt; return this; }
        public Builder activeAlertCount(Integer activeAlertCount) { response.activeAlertCount = activeAlertCount; return this; }
        
        public ServerResponse build() { return response; }
    }
    
    public static Builder builder() { return new Builder(); }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    
    public Integer getPort() { return port; }
    public void setPort(Integer port) { this.port = port; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getServerType() { return serverType; }
    public void setServerType(String serverType) { this.serverType = serverType; }
    
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    
    public String getOperatingSystem() { return operatingSystem; }
    public void setOperatingSystem(String operatingSystem) { this.operatingSystem = operatingSystem; }
    
    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { this.status = status; }
    
    public Double getCpuUsage() { return cpuUsage; }
    public void setCpuUsage(Double cpuUsage) { this.cpuUsage = cpuUsage; }
    
    public Double getMemoryUsage() { return memoryUsage; }
    public void setMemoryUsage(Double memoryUsage) { this.memoryUsage = memoryUsage; }
    
    public Double getDiskUsage() { return diskUsage; }
    public void setDiskUsage(Double diskUsage) { this.diskUsage = diskUsage; }
    
    public Long getUptime() { return uptime; }
    public void setUptime(Long uptime) { this.uptime = uptime; }
    
    public LocalDateTime getLastPing() { return lastPing; }
    public void setLastPing(LocalDateTime lastPing) { this.lastPing = lastPing; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public Integer getActiveAlertCount() { return activeAlertCount; }
    public void setActiveAlertCount(Integer activeAlertCount) { this.activeAlertCount = activeAlertCount; }
}
