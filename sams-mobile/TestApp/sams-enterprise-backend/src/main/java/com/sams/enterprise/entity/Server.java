package com.sams.enterprise.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Enterprise Server Entity for Server Management
 */
@Entity
@Table(name = "servers", indexes = {
    @Index(name = "idx_server_hostname", columnList = "hostname"),
    @Index(name = "idx_server_ip", columnList = "ip_address"),
    @Index(name = "idx_server_status", columnList = "status"),
    @Index(name = "idx_server_environment", columnList = "environment")
})
public class Server {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 255)
    @Column(unique = true, nullable = false)
    private String hostname;

    @NotBlank
    @Size(max = 45)
    @Column(name = "ip_address", nullable = false)
    private String ipAddress;

    @Size(max = 255)
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServerStatus status = ServerStatus.UNKNOWN;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServerType type;

    @NotBlank
    @Size(max = 50)
    @Column(nullable = false)
    private String environment;

    @Size(max = 100)
    @Column(name = "operating_system")
    private String operatingSystem;

    @Size(max = 50)
    @Column(name = "os_version")
    private String osVersion;

    @Column(name = "cpu_cores")
    private Integer cpuCores;

    @Column(name = "memory_gb")
    private Integer memoryGb;

    @Column(name = "disk_gb")
    private Integer diskGb;

    @ElementCollection
    @CollectionTable(name = "server_tags", joinColumns = @JoinColumn(name = "server_id"))
    @MapKeyColumn(name = "tag_key")
    @Column(name = "tag_value")
    private Map<String, String> tags = new HashMap<>();

    @ElementCollection
    @CollectionTable(name = "server_config", joinColumns = @JoinColumn(name = "server_id"))
    @MapKeyColumn(name = "config_key")
    @Column(name = "config_value", columnDefinition = "TEXT")
    private Map<String, String> configuration = new HashMap<>();

    @Column(name = "monitoring_enabled")
    private Boolean monitoringEnabled = true;

    @Column(name = "agent_version")
    private String agentVersion;

    @Column(name = "last_heartbeat")
    private LocalDateTime lastHeartbeat;

    @Column(name = "last_metrics_update")
    private LocalDateTime lastMetricsUpdate;

    @Column(name = "health_score")
    private Double healthScore;

    @Column(name = "uptime_percentage")
    private Double uptimePercentage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Alert> alerts = new HashSet<>();

    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<ServerMetric> metrics = new HashSet<>();

    // Constructors
    public Server() {}

    public Server(String hostname, String ipAddress, ServerType type, String environment) {
        this.hostname = hostname;
        this.ipAddress = ipAddress;
        this.type = type;
        this.environment = environment;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Business Methods
    public void updateHeartbeat() {
        this.lastHeartbeat = LocalDateTime.now();
        this.lastSeen = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        // Update status based on heartbeat
        if (this.status == ServerStatus.UNKNOWN || this.status == ServerStatus.OFFLINE) {
            this.status = ServerStatus.ONLINE;
        }
    }

    public void updateMetrics() {
        this.lastMetricsUpdate = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isOnline() {
        return status == ServerStatus.ONLINE;
    }

    public boolean isOffline() {
        return status == ServerStatus.OFFLINE;
    }

    public boolean hasRecentHeartbeat(int minutes) {
        if (lastHeartbeat == null) return false;
        return lastHeartbeat.isAfter(LocalDateTime.now().minusMinutes(minutes));
    }

    public void markOffline() {
        this.status = ServerStatus.OFFLINE;
        this.updatedAt = LocalDateTime.now();
    }

    public void markMaintenance() {
        this.status = ServerStatus.MAINTENANCE;
        this.updatedAt = LocalDateTime.now();
    }

    public void calculateHealthScore() {
        // Simple health score calculation based on various factors
        double score = 100.0;
        
        // Deduct points for being offline
        if (status == ServerStatus.OFFLINE) {
            score -= 50;
        } else if (status == ServerStatus.WARNING) {
            score -= 20;
        }
        
        // Deduct points for old heartbeat
        if (lastHeartbeat != null) {
            long minutesSinceHeartbeat = java.time.Duration.between(lastHeartbeat, LocalDateTime.now()).toMinutes();
            if (minutesSinceHeartbeat > 5) {
                score -= Math.min(30, minutesSinceHeartbeat * 2);
            }
        }
        
        // Deduct points for critical alerts
        long criticalAlerts = alerts.stream()
            .filter(alert -> alert.getSeverity() == Alert.AlertSeverity.CRITICAL && alert.isOpen())
            .count();
        score -= criticalAlerts * 10;
        
        this.healthScore = Math.max(0, score);
    }

    public int getOpenAlertsCount() {
        return (int) alerts.stream().filter(Alert::isOpen).count();
    }

    public int getCriticalAlertsCount() {
        return (int) alerts.stream()
            .filter(alert -> alert.getSeverity() == Alert.AlertSeverity.CRITICAL && alert.isOpen())
            .count();
    }

    // Lifecycle Callbacks
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { this.status = status; }

    public ServerType getType() { return type; }
    public void setType(ServerType type) { this.type = type; }

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

    public Boolean getMonitoringEnabled() { return monitoringEnabled; }
    public void setMonitoringEnabled(Boolean monitoringEnabled) { this.monitoringEnabled = monitoringEnabled; }

    public String getAgentVersion() { return agentVersion; }
    public void setAgentVersion(String agentVersion) { this.agentVersion = agentVersion; }

    public LocalDateTime getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(LocalDateTime lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }

    public LocalDateTime getLastMetricsUpdate() { return lastMetricsUpdate; }
    public void setLastMetricsUpdate(LocalDateTime lastMetricsUpdate) { this.lastMetricsUpdate = lastMetricsUpdate; }

    public Double getHealthScore() { return healthScore; }
    public void setHealthScore(Double healthScore) { this.healthScore = healthScore; }

    public Double getUptimePercentage() { return uptimePercentage; }
    public void setUptimePercentage(Double uptimePercentage) { this.uptimePercentage = uptimePercentage; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }

    public Set<Alert> getAlerts() { return alerts; }
    public void setAlerts(Set<Alert> alerts) { this.alerts = alerts; }

    public Set<ServerMetric> getMetrics() { return metrics; }
    public void setMetrics(Set<ServerMetric> metrics) { this.metrics = metrics; }

    // Enums
    public enum ServerStatus {
        ONLINE, OFFLINE, WARNING, CRITICAL, MAINTENANCE, UNKNOWN
    }

    public enum ServerType {
        PHYSICAL, VIRTUAL, CONTAINER, CLOUD, DATABASE, WEB, APPLICATION, LOAD_BALANCER, FIREWALL
    }
}
