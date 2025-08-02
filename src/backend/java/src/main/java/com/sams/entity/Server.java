package com.sams.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Server Entity for database persistence
 */
@Entity
@Table(name = "servers")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Server {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank(message = "Server name is required")
    @Column(nullable = false)
    private String name;
    
    @NotBlank(message = "Host is required")
    @Column(nullable = false)
    private String host;
    
    @NotNull(message = "Port is required")
    @Column(nullable = false)
    private Integer port;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServerStatus status = ServerStatus.UNKNOWN;
    
    private String description;
    private String serverType;
    private String version;
    private String operatingSystem;
    
    @Column(name = "cpu_usage")
    private Double cpuUsage;
    
    @Column(name = "memory_usage")
    private Double memoryUsage;
    
    @Column(name = "disk_usage")
    private Double diskUsage;
    
    private Long uptime;
    
    @Column(name = "last_ping")
    private LocalDateTime lastPing;
    
    @Column(name = "network_in")
    private Long networkIn;
    
    @Column(name = "network_out")
    private Long networkOut;
    
    @Column(name = "last_check")
    private LocalDateTime lastCheck;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Alert> alerts;
    
    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<SystemMetric> metrics;
    
    // Constructors
    public Server() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public Server(String name, String host, Integer port) {
        this();
        this.name = name;
        this.host = host;
        this.port = port;
    }
    
    // PrePersist and PreUpdate
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getHost() { return host; }
    public void setHost(String host) { this.host = host; }
    
    public Integer getPort() { return port; }
    public void setPort(Integer port) { this.port = port; }
    
    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { this.status = status; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public String getServerType() { return serverType; }
    public void setServerType(String serverType) { this.serverType = serverType; }
    
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    
    public String getOperatingSystem() { return operatingSystem; }
    public void setOperatingSystem(String operatingSystem) { this.operatingSystem = operatingSystem; }
    
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
    
    public Long getNetworkIn() { return networkIn; }
    public void setNetworkIn(Long networkIn) { this.networkIn = networkIn; }
    
    public Long getNetworkOut() { return networkOut; }
    public void setNetworkOut(Long networkOut) { this.networkOut = networkOut; }
    
    public LocalDateTime getLastCheck() { return lastCheck; }
    public void setLastCheck(LocalDateTime lastCheck) { this.lastCheck = lastCheck; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public List<Alert> getAlerts() { return alerts; }
    public void setAlerts(List<Alert> alerts) { this.alerts = alerts; }
    
    public List<SystemMetric> getMetrics() { return metrics; }
    public void setMetrics(List<SystemMetric> metrics) { this.metrics = metrics; }
    
    @Override
    public String toString() {
        return "Server{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", host='" + host + '\'' +
                ", port=" + port +
                ", status=" + status +
                '}';
    }

    /**
     * Server status enumeration
     */
    public enum ServerStatus {
        ONLINE, OFFLINE, WARNING, CRITICAL, UNKNOWN
    }
}
