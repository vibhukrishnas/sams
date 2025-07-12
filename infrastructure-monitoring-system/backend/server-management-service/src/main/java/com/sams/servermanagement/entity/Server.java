package com.sams.servermanagement.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Server Entity for SAMS Server Management
 * 
 * Represents a monitored server in the infrastructure with:
 * - Basic server information (name, hostname, IP)
 * - Health monitoring configuration
 * - Grouping and tagging system
 * - Metrics collection settings
 * - Auto-discovery support
 */
@Entity
@Table(name = "servers", indexes = {
    @Index(name = "idx_server_hostname", columnList = "hostname"),
    @Index(name = "idx_server_ip", columnList = "ipAddress"),
    @Index(name = "idx_server_status", columnList = "status"),
    @Index(name = "idx_server_environment", columnList = "environment"),
    @Index(name = "idx_server_group", columnList = "serverGroup")
})
@EntityListeners(AuditingEntityListener.class)
public class Server {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    @NotBlank(message = "Server name is required")
    @Size(min = 2, max = 100, message = "Server name must be between 2 and 100 characters")
    private String name;

    @Column(nullable = false, length = 255)
    @NotBlank(message = "Hostname is required")
    @Size(min = 2, max = 255, message = "Hostname must be between 2 and 255 characters")
    private String hostname;

    @Column(name = "ip_address", nullable = false, length = 45)
    @NotBlank(message = "IP address is required")
    @Pattern(regexp = "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$", 
             message = "Invalid IP address format")
    private String ipAddress;

    @Column(length = 20)
    private String port = "22"; // Default SSH port

    @Column(length = 500)
    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServerStatus status = ServerStatus.UNKNOWN;

    @Column(length = 50)
    @Size(max = 50, message = "Environment cannot exceed 50 characters")
    private String environment = "production";

    @Column(name = "server_group", length = 100)
    @Size(max = 100, message = "Server group cannot exceed 100 characters")
    private String serverGroup;

    @Column(name = "operating_system", length = 100)
    private String operatingSystem;

    @Column(name = "os_version", length = 50)
    private String osVersion;

    @Column(name = "cpu_cores")
    private Integer cpuCores;

    @Column(name = "memory_gb")
    private Integer memoryGb;

    @Column(name = "disk_gb")
    private Integer diskGb;

    @Column(name = "monitoring_enabled")
    private Boolean monitoringEnabled = true;

    @Column(name = "health_check_enabled")
    private Boolean healthCheckEnabled = true;

    @Column(name = "health_check_interval")
    private Integer healthCheckInterval = 60; // seconds

    @Column(name = "health_check_timeout")
    private Integer healthCheckTimeout = 30; // seconds

    @Column(name = "health_check_url", length = 500)
    private String healthCheckUrl;

    @Column(name = "metrics_collection_enabled")
    private Boolean metricsCollectionEnabled = true;

    @Column(name = "metrics_collection_interval")
    private Integer metricsCollectionInterval = 300; // 5 minutes

    @Column(name = "auto_discovered")
    private Boolean autoDiscovered = false;

    @Column(name = "discovery_source", length = 100)
    private String discoverySource;

    @Column(name = "agent_installed")
    private Boolean agentInstalled = false;

    @Column(name = "agent_version", length = 50)
    private String agentVersion;

    @Column(name = "last_seen")
    private LocalDateTime lastSeen;

    @Column(name = "last_health_check")
    private LocalDateTime lastHealthCheck;

    @Column(name = "last_metrics_collection")
    private LocalDateTime lastMetricsCollection;

    @Column(name = "uptime_percentage")
    private Double uptimePercentage = 0.0;

    @Column(name = "response_time_ms")
    private Long responseTimeMs;

    // Store tags as JSON
    @ElementCollection
    @CollectionTable(name = "server_tags", joinColumns = @JoinColumn(name = "server_id"))
    @MapKeyColumn(name = "tag_key")
    @Column(name = "tag_value")
    private Map<String, String> tags = new HashMap<>();

    // Store configuration as JSON
    @ElementCollection
    @CollectionTable(name = "server_configuration", joinColumns = @JoinColumn(name = "server_id"))
    @MapKeyColumn(name = "config_key")
    @Column(name = "config_value", length = 1000)
    private Map<String, String> configuration = new HashMap<>();

    // Relationships
    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private Set<ServerMetric> metrics = new HashSet<>();

    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private Set<ServerAlert> alerts = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;

    // Constructors
    public Server() {}

    public Server(String name, String hostname, String ipAddress) {
        this.name = name;
        this.hostname = hostname;
        this.ipAddress = ipAddress;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getPort() { return port; }
    public void setPort(String port) { this.port = port; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { this.status = status; }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }

    public String getServerGroup() { return serverGroup; }
    public void setServerGroup(String serverGroup) { this.serverGroup = serverGroup; }

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

    public Boolean getHealthCheckEnabled() { return healthCheckEnabled; }
    public void setHealthCheckEnabled(Boolean healthCheckEnabled) { this.healthCheckEnabled = healthCheckEnabled; }

    public Integer getHealthCheckInterval() { return healthCheckInterval; }
    public void setHealthCheckInterval(Integer healthCheckInterval) { this.healthCheckInterval = healthCheckInterval; }

    public Integer getHealthCheckTimeout() { return healthCheckTimeout; }
    public void setHealthCheckTimeout(Integer healthCheckTimeout) { this.healthCheckTimeout = healthCheckTimeout; }

    public String getHealthCheckUrl() { return healthCheckUrl; }
    public void setHealthCheckUrl(String healthCheckUrl) { this.healthCheckUrl = healthCheckUrl; }

    public Boolean getMetricsCollectionEnabled() { return metricsCollectionEnabled; }
    public void setMetricsCollectionEnabled(Boolean metricsCollectionEnabled) { this.metricsCollectionEnabled = metricsCollectionEnabled; }

    public Integer getMetricsCollectionInterval() { return metricsCollectionInterval; }
    public void setMetricsCollectionInterval(Integer metricsCollectionInterval) { this.metricsCollectionInterval = metricsCollectionInterval; }

    public Boolean getAutoDiscovered() { return autoDiscovered; }
    public void setAutoDiscovered(Boolean autoDiscovered) { this.autoDiscovered = autoDiscovered; }

    public String getDiscoverySource() { return discoverySource; }
    public void setDiscoverySource(String discoverySource) { this.discoverySource = discoverySource; }

    public Boolean getAgentInstalled() { return agentInstalled; }
    public void setAgentInstalled(Boolean agentInstalled) { this.agentInstalled = agentInstalled; }

    public String getAgentVersion() { return agentVersion; }
    public void setAgentVersion(String agentVersion) { this.agentVersion = agentVersion; }

    public LocalDateTime getLastSeen() { return lastSeen; }
    public void setLastSeen(LocalDateTime lastSeen) { this.lastSeen = lastSeen; }

    public LocalDateTime getLastHealthCheck() { return lastHealthCheck; }
    public void setLastHealthCheck(LocalDateTime lastHealthCheck) { this.lastHealthCheck = lastHealthCheck; }

    public LocalDateTime getLastMetricsCollection() { return lastMetricsCollection; }
    public void setLastMetricsCollection(LocalDateTime lastMetricsCollection) { this.lastMetricsCollection = lastMetricsCollection; }

    public Double getUptimePercentage() { return uptimePercentage; }
    public void setUptimePercentage(Double uptimePercentage) { this.uptimePercentage = uptimePercentage; }

    public Long getResponseTimeMs() { return responseTimeMs; }
    public void setResponseTimeMs(Long responseTimeMs) { this.responseTimeMs = responseTimeMs; }

    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }

    public Map<String, String> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, String> configuration) { this.configuration = configuration; }

    public Set<ServerMetric> getMetrics() { return metrics; }
    public void setMetrics(Set<ServerMetric> metrics) { this.metrics = metrics; }

    public Set<ServerAlert> getAlerts() { return alerts; }
    public void setAlerts(Set<ServerAlert> alerts) { this.alerts = alerts; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(String updatedBy) { this.updatedBy = updatedBy; }

    // Utility methods
    public void addTag(String key, String value) {
        this.tags.put(key, value);
    }

    public void removeTag(String key) {
        this.tags.remove(key);
    }

    public String getTag(String key) {
        return this.tags.get(key);
    }

    public void addConfiguration(String key, String value) {
        this.configuration.put(key, value);
    }

    public void removeConfiguration(String key) {
        this.configuration.remove(key);
    }

    public String getConfiguration(String key) {
        return this.configuration.get(key);
    }

    public boolean isOnline() {
        return status == ServerStatus.ONLINE;
    }

    public boolean isHealthy() {
        return status == ServerStatus.ONLINE || status == ServerStatus.WARNING;
    }

    public boolean isStale() {
        if (lastSeen == null) return true;
        return lastSeen.isBefore(LocalDateTime.now().minusMinutes(10));
    }

    public void updateLastSeen() {
        this.lastSeen = LocalDateTime.now();
    }

    public void updateHealthCheck(ServerStatus newStatus, Long responseTime) {
        this.status = newStatus;
        this.lastHealthCheck = LocalDateTime.now();
        this.responseTimeMs = responseTime;
    }

    public void updateMetricsCollection() {
        this.lastMetricsCollection = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "Server{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", hostname='" + hostname + '\'' +
                ", ipAddress='" + ipAddress + '\'' +
                ", status=" + status +
                ", environment='" + environment + '\'' +
                '}';
    }
}
