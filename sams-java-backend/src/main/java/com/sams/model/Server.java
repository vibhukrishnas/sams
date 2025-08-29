package com.sams.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * 🖥️ Server Entity
 * 
 * Represents a monitored server in the SAMS system
 * Compatible with mobile app and web dashboard requirements
 */
@Entity
@Table(name = "servers", indexes = {
    @Index(name = "idx_server_ip", columnList = "ipAddress"),
    @Index(name = "idx_server_status", columnList = "status"),
    @Index(name = "idx_server_environment", columnList = "environment")
})
public class Server {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @NotBlank(message = "Server name is required")
    @Column(nullable = false, length = 100)
    private String name;
    
    @NotBlank(message = "Hostname is required")
    @Column(nullable = false, length = 255)
    private String hostname;
    
    @NotBlank(message = "IP address is required")
    @Column(name = "ip_address", nullable = false, length = 45)
    private String ipAddress;
    
    @Column(length = 20)
    private String type = "linux"; // windows, linux, docker, kubernetes
    
    @Column(length = 50)
    private String os;
    
    @Column(length = 500)
    private String description;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ServerStatus status = ServerStatus.UNKNOWN;
    
    @Column(length = 50)
    private String environment = "production"; // development, staging, production
    
    @Column(name = "port_number")
    private Integer port = 22;
    
    @Column(name = "last_check_time")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastCheckTime;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    // Current system metrics (stored as JSON)
    @ElementCollection
    @CollectionTable(name = "server_metrics", 
                    joinColumns = @JoinColumn(name = "server_id"))
    @MapKeyColumn(name = "metric_name")
    @Column(name = "metric_value")
    private Map<String, String> currentMetrics;
    
    // Health check configuration
    @Column(name = "health_check_enabled")
    private Boolean healthCheckEnabled = true;
    
    @Column(name = "health_check_interval")
    private Integer healthCheckInterval = 60; // seconds
    
    @Column(name = "alert_threshold_cpu")
    private Double alertThresholdCpu = 80.0;
    
    @Column(name = "alert_threshold_memory")
    private Double alertThresholdMemory = 85.0;
    
    @Column(name = "alert_threshold_disk")
    private Double alertThresholdDisk = 90.0;
    
    // Constructors
    public Server() {}
    
    public Server(String name, String hostname, String ipAddress) {
        this.name = name;
        this.hostname = hostname;
        this.ipAddress = ipAddress;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { 
        this.name = name;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { 
        this.hostname = hostname;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { 
        this.ipAddress = ipAddress;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getType() { return type; }
    public void setType(String type) { 
        this.type = type;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getOs() { return os; }
    public void setOs(String os) { 
        this.os = os;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { 
        this.description = description;
        this.updatedAt = LocalDateTime.now();
    }
    
    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { 
        this.status = status;
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { 
        this.environment = environment;
        this.updatedAt = LocalDateTime.now();
    }
    
    public Integer getPort() { return port; }
    public void setPort(Integer port) { 
        this.port = port;
        this.updatedAt = LocalDateTime.now();
    }
    
    public LocalDateTime getLastCheckTime() { return lastCheckTime; }
    public void setLastCheckTime(LocalDateTime lastCheckTime) { 
        this.lastCheckTime = lastCheckTime;
        this.updatedAt = LocalDateTime.now();
    }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public Map<String, String> getCurrentMetrics() { return currentMetrics; }
    public void setCurrentMetrics(Map<String, String> currentMetrics) { 
        this.currentMetrics = currentMetrics;
        this.updatedAt = LocalDateTime.now();
    }
    
    public Boolean getHealthCheckEnabled() { return healthCheckEnabled; }
    public void setHealthCheckEnabled(Boolean healthCheckEnabled) { 
        this.healthCheckEnabled = healthCheckEnabled;
        this.updatedAt = LocalDateTime.now();
    }
    
    public Integer getHealthCheckInterval() { return healthCheckInterval; }
    public void setHealthCheckInterval(Integer healthCheckInterval) { 
        this.healthCheckInterval = healthCheckInterval;
        this.updatedAt = LocalDateTime.now();
    }
    
    public Double getAlertThresholdCpu() { return alertThresholdCpu; }
    public void setAlertThresholdCpu(Double alertThresholdCpu) { 
        this.alertThresholdCpu = alertThresholdCpu;
        this.updatedAt = LocalDateTime.now();
    }
    
    public Double getAlertThresholdMemory() { return alertThresholdMemory; }
    public void setAlertThresholdMemory(Double alertThresholdMemory) { 
        this.alertThresholdMemory = alertThresholdMemory;
        this.updatedAt = LocalDateTime.now();
    }
    
    public Double getAlertThresholdDisk() { return alertThresholdDisk; }
    public void setAlertThresholdDisk(Double alertThresholdDisk) { 
        this.alertThresholdDisk = alertThresholdDisk;
        this.updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // Business methods
    public boolean isOnline() {
        return this.status == ServerStatus.ONLINE;
    }
    
    public boolean isHealthy() {
        return this.status == ServerStatus.ONLINE || this.status == ServerStatus.WARNING;
    }
    
    public boolean needsAttention() {
        return this.status == ServerStatus.CRITICAL || this.status == ServerStatus.OFFLINE;
    }
    
    @Override
    public String toString() {
        return String.format("Server{id='%s', name='%s', ip='%s', status=%s}", 
                           id, name, ipAddress, status);
    }
}