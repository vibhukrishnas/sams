/**
 * 🖥️ Server Entity - Comprehensive Server Management
 * Complete server entity with health monitoring, grouping, and metrics collection
 */

package com.monitoring.server.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.*;

@Entity
@Table(name = "servers", indexes = {
    @Index(name = "idx_server_hostname", columnList = "hostname"),
    @Index(name = "idx_server_ip", columnList = "ip_address"),
    @Index(name = "idx_server_status", columnList = "status"),
    @Index(name = "idx_server_organization", columnList = "organization_id"),
    @Index(name = "idx_server_environment", columnList = "environment"),
    @Index(name = "idx_server_last_seen", columnList = "last_seen_at")
})
@EntityListeners(AuditingEntityListener.class)
public class Server {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank(message = "Server name is required")
    @Size(min = 1, max = 255, message = "Server name must be between 1 and 255 characters")
    @Column(nullable = false)
    private String name;

    @Size(max = 255, message = "Hostname must not exceed 255 characters")
    private String hostname;

    @Size(max = 45, message = "IP address must not exceed 45 characters")
    @Column(name = "ip_address")
    private String ipAddress;

    @Size(max = 100, message = "Operating system must not exceed 100 characters")
    @Column(name = "operating_system")
    private String operatingSystem;

    @Size(max = 50, message = "Architecture must not exceed 50 characters")
    private String architecture;

    @Size(max = 50, message = "Environment must not exceed 50 characters")
    private String environment = "production";

    @Size(max = 100, message = "Location must not exceed 100 characters")
    private String location;

    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotNull(message = "Status is required")
    @Enumerated(EnumType.STRING)
    private ServerStatus status = ServerStatus.UNKNOWN;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "is_monitored")
    private Boolean isMonitored = true;

    @Column(name = "agent_version")
    private String agentVersion;

    @Column(name = "agent_last_heartbeat")
    private LocalDateTime agentLastHeartbeat;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "health_check_url")
    private String healthCheckUrl;

    @Column(name = "health_check_interval")
    private Integer healthCheckInterval = 60; // seconds

    @Column(name = "health_check_timeout")
    private Integer healthCheckTimeout = 30; // seconds

    @Column(name = "health_check_enabled")
    private Boolean healthCheckEnabled = true;

    @Column(name = "last_health_check")
    private LocalDateTime lastHealthCheck;

    @Column(name = "health_check_failures")
    private Integer healthCheckFailures = 0;

    @Column(name = "max_health_check_failures")
    private Integer maxHealthCheckFailures = 3;

    // JSON column for flexible metadata storage
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata = new HashMap<>();

    // JSON column for tags
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, String> tags = new HashMap<>();

    // JSON column for configuration
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> configuration = new HashMap<>();

    @NotNull(message = "Organization is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "server_groups",
        joinColumns = @JoinColumn(name = "server_id"),
        inverseJoinColumns = @JoinColumn(name = "group_id")
    )
    private Set<ServerGroup> groups = new HashSet<>();

    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ServerService> services = new HashSet<>();

    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ServerMetric> metrics = new HashSet<>();

    @OneToMany(mappedBy = "server", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ServerAlert> alerts = new HashSet<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public Server() {}

    public Server(String name, String hostname, String ipAddress, Organization organization) {
        this.name = name;
        this.hostname = hostname;
        this.ipAddress = ipAddress;
        this.organization = organization;
    }

    // Business methods
    public void updateLastSeen() {
        this.lastSeenAt = LocalDateTime.now();
        this.agentLastHeartbeat = LocalDateTime.now();
        resetHealthCheckFailures();
    }

    public void updateHealthCheck(boolean success) {
        this.lastHealthCheck = LocalDateTime.now();
        if (success) {
            resetHealthCheckFailures();
            if (this.status == ServerStatus.UNHEALTHY) {
                this.status = ServerStatus.HEALTHY;
            }
        } else {
            incrementHealthCheckFailures();
        }
    }

    public void incrementHealthCheckFailures() {
        this.healthCheckFailures++;
        if (this.healthCheckFailures >= this.maxHealthCheckFailures) {
            this.status = ServerStatus.UNHEALTHY;
        }
    }

    public void resetHealthCheckFailures() {
        this.healthCheckFailures = 0;
    }

    public boolean isHealthy() {
        return this.status == ServerStatus.HEALTHY || this.status == ServerStatus.ONLINE;
    }

    public boolean isOnline() {
        if (lastSeenAt == null) return false;
        return lastSeenAt.isAfter(LocalDateTime.now().minusMinutes(5));
    }

    public void addTag(String key, String value) {
        this.tags.put(key, value);
    }

    public void removeTag(String key) {
        this.tags.remove(key);
    }

    public String getTag(String key) {
        return this.tags.get(key);
    }

    public void addMetadata(String key, Object value) {
        this.metadata.put(key, value);
    }

    public void removeMetadata(String key) {
        this.metadata.remove(key);
    }

    public Object getMetadata(String key) {
        return this.metadata.get(key);
    }

    public void addConfiguration(String key, Object value) {
        this.configuration.put(key, value);
    }

    public Object getConfiguration(String key) {
        return this.configuration.get(key);
    }

    public void addToGroup(ServerGroup group) {
        this.groups.add(group);
        group.getServers().add(this);
    }

    public void removeFromGroup(ServerGroup group) {
        this.groups.remove(group);
        group.getServers().remove(this);
    }

    public int getActiveServicesCount() {
        return (int) services.stream().filter(service -> service.getIsActive()).count();
    }

    public int getActiveAlertsCount() {
        return (int) alerts.stream().filter(alert -> alert.getStatus() == AlertStatus.ACTIVE).count();
    }

    public String getDisplayName() {
        return name != null && !name.trim().isEmpty() ? name : 
               (hostname != null && !hostname.trim().isEmpty() ? hostname : ipAddress);
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getHostname() { return hostname; }
    public void setHostname(String hostname) { this.hostname = hostname; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getOperatingSystem() { return operatingSystem; }
    public void setOperatingSystem(String operatingSystem) { this.operatingSystem = operatingSystem; }

    public String getArchitecture() { return architecture; }
    public void setArchitecture(String architecture) { this.architecture = architecture; }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public ServerStatus getStatus() { return status; }
    public void setStatus(ServerStatus status) { this.status = status; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Boolean getIsMonitored() { return isMonitored; }
    public void setIsMonitored(Boolean isMonitored) { this.isMonitored = isMonitored; }

    public String getAgentVersion() { return agentVersion; }
    public void setAgentVersion(String agentVersion) { this.agentVersion = agentVersion; }

    public LocalDateTime getAgentLastHeartbeat() { return agentLastHeartbeat; }
    public void setAgentLastHeartbeat(LocalDateTime agentLastHeartbeat) { this.agentLastHeartbeat = agentLastHeartbeat; }

    public LocalDateTime getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(LocalDateTime lastSeenAt) { this.lastSeenAt = lastSeenAt; }

    public String getHealthCheckUrl() { return healthCheckUrl; }
    public void setHealthCheckUrl(String healthCheckUrl) { this.healthCheckUrl = healthCheckUrl; }

    public Integer getHealthCheckInterval() { return healthCheckInterval; }
    public void setHealthCheckInterval(Integer healthCheckInterval) { this.healthCheckInterval = healthCheckInterval; }

    public Integer getHealthCheckTimeout() { return healthCheckTimeout; }
    public void setHealthCheckTimeout(Integer healthCheckTimeout) { this.healthCheckTimeout = healthCheckTimeout; }

    public Boolean getHealthCheckEnabled() { return healthCheckEnabled; }
    public void setHealthCheckEnabled(Boolean healthCheckEnabled) { this.healthCheckEnabled = healthCheckEnabled; }

    public LocalDateTime getLastHealthCheck() { return lastHealthCheck; }
    public void setLastHealthCheck(LocalDateTime lastHealthCheck) { this.lastHealthCheck = lastHealthCheck; }

    public Integer getHealthCheckFailures() { return healthCheckFailures; }
    public void setHealthCheckFailures(Integer healthCheckFailures) { this.healthCheckFailures = healthCheckFailures; }

    public Integer getMaxHealthCheckFailures() { return maxHealthCheckFailures; }
    public void setMaxHealthCheckFailures(Integer maxHealthCheckFailures) { this.maxHealthCheckFailures = maxHealthCheckFailures; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public Map<String, String> getTags() { return tags; }
    public void setTags(Map<String, String> tags) { this.tags = tags; }

    public Map<String, Object> getConfiguration() { return configuration; }
    public void setConfiguration(Map<String, Object> configuration) { this.configuration = configuration; }

    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }

    public Set<ServerGroup> getGroups() { return groups; }
    public void setGroups(Set<ServerGroup> groups) { this.groups = groups; }

    public Set<ServerService> getServices() { return services; }
    public void setServices(Set<ServerService> services) { this.services = services; }

    public Set<ServerMetric> getMetrics() { return metrics; }
    public void setMetrics(Set<ServerMetric> metrics) { this.metrics = metrics; }

    public Set<ServerAlert> getAlerts() { return alerts; }
    public void setAlerts(Set<ServerAlert> alerts) { this.alerts = alerts; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Server)) return false;
        Server server = (Server) o;
        return Objects.equals(id, server.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
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
                ", isActive=" + isActive +
                '}';
    }
}

/**
 * Server status enumeration
 */
enum ServerStatus {
    UNKNOWN("Unknown"),
    ONLINE("Online"),
    OFFLINE("Offline"),
    HEALTHY("Healthy"),
    UNHEALTHY("Unhealthy"),
    WARNING("Warning"),
    CRITICAL("Critical"),
    MAINTENANCE("Maintenance");

    private final String displayName;

    ServerStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

/**
 * Alert status enumeration
 */
enum AlertStatus {
    ACTIVE("Active"),
    ACKNOWLEDGED("Acknowledged"),
    RESOLVED("Resolved"),
    SUPPRESSED("Suppressed");

    private final String displayName;

    AlertStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
