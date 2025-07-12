package com.sams.servermanagement.service;

import com.sams.servermanagement.dto.*;
import com.sams.servermanagement.entity.Server;
import com.sams.servermanagement.entity.ServerStatus;
import com.sams.servermanagement.exception.ServerAlreadyExistsException;
import com.sams.servermanagement.exception.ServerNotFoundException;
import com.sams.servermanagement.repository.ServerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Server Service for SAMS Server Management
 * 
 * Provides comprehensive server management functionality including:
 * - Server CRUD operations
 * - Health check management
 * - Metrics collection configuration
 * - Server grouping and tagging
 * - Auto-discovery support
 * - Server monitoring configuration
 */
@Service
@Transactional
public class ServerService {

    private static final Logger logger = LoggerFactory.getLogger(ServerService.class);

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private HealthCheckService healthCheckService;

    @Autowired
    private MetricsCollectionService metricsCollectionService;

    @Autowired
    private ServerDiscoveryService serverDiscoveryService;

    @Autowired
    private AuditService auditService;

    /**
     * Register a new server
     */
    public ServerResponse registerServer(ServerCreateRequest request, String createdBy) {
        logger.info("Registering new server: {} ({})", request.getName(), request.getIpAddress());

        // Validate server doesn't exist
        if (serverRepository.existsByHostnameIgnoreCase(request.getHostname())) {
            throw new ServerAlreadyExistsException("Server with hostname already exists: " + request.getHostname());
        }

        if (serverRepository.existsByIpAddress(request.getIpAddress())) {
            throw new ServerAlreadyExistsException("Server with IP address already exists: " + request.getIpAddress());
        }

        // Create server entity
        Server server = new Server();
        server.setName(request.getName());
        server.setHostname(request.getHostname());
        server.setIpAddress(request.getIpAddress());
        server.setPort(request.getPort() != null ? request.getPort() : "22");
        server.setDescription(request.getDescription());
        server.setEnvironment(request.getEnvironment() != null ? request.getEnvironment() : "production");
        server.setServerGroup(request.getServerGroup());
        server.setOperatingSystem(request.getOperatingSystem());
        server.setOsVersion(request.getOsVersion());
        server.setCpuCores(request.getCpuCores());
        server.setMemoryGb(request.getMemoryGb());
        server.setDiskGb(request.getDiskGb());
        server.setStatus(ServerStatus.UNKNOWN);
        server.setCreatedBy(createdBy);

        // Set monitoring configuration
        if (request.getMonitoringConfig() != null) {
            ServerMonitoringConfig config = request.getMonitoringConfig();
            server.setMonitoringEnabled(config.getMonitoringEnabled());
            server.setHealthCheckEnabled(config.getHealthCheckEnabled());
            server.setHealthCheckInterval(config.getHealthCheckInterval());
            server.setHealthCheckTimeout(config.getHealthCheckTimeout());
            server.setHealthCheckUrl(config.getHealthCheckUrl());
            server.setMetricsCollectionEnabled(config.getMetricsCollectionEnabled());
            server.setMetricsCollectionInterval(config.getMetricsCollectionInterval());
        }

        // Add tags
        if (request.getTags() != null) {
            server.setTags(request.getTags());
        }

        // Add configuration
        if (request.getConfiguration() != null) {
            server.setConfiguration(request.getConfiguration());
        }

        // Save server
        server = serverRepository.save(server);

        // Perform initial health check
        if (server.getHealthCheckEnabled()) {
            healthCheckService.performHealthCheck(server.getId());
        }

        // Start metrics collection if enabled
        if (server.getMetricsCollectionEnabled()) {
            metricsCollectionService.startCollection(server.getId());
        }

        // Audit log
        auditService.logServerRegistered(server.getId(), createdBy);

        logger.info("Server registered successfully: {} (ID: {})", server.getName(), server.getId());
        return convertToServerResponse(server);
    }

    /**
     * Update existing server
     */
    public ServerResponse updateServer(Long serverId, ServerUpdateRequest request, String updatedBy) {
        logger.info("Updating server: {}", serverId);

        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException("Server not found: " + serverId));

        // Check for hostname conflicts (if changing)
        if (request.getHostname() != null && !request.getHostname().equals(server.getHostname())) {
            if (serverRepository.existsByHostnameIgnoreCase(request.getHostname())) {
                throw new ServerAlreadyExistsException("Server with hostname already exists: " + request.getHostname());
            }
            server.setHostname(request.getHostname());
        }

        // Check for IP conflicts (if changing)
        if (request.getIpAddress() != null && !request.getIpAddress().equals(server.getIpAddress())) {
            if (serverRepository.existsByIpAddress(request.getIpAddress())) {
                throw new ServerAlreadyExistsException("Server with IP address already exists: " + request.getIpAddress());
            }
            server.setIpAddress(request.getIpAddress());
        }

        // Update other fields
        if (request.getName() != null) server.setName(request.getName());
        if (request.getPort() != null) server.setPort(request.getPort());
        if (request.getDescription() != null) server.setDescription(request.getDescription());
        if (request.getEnvironment() != null) server.setEnvironment(request.getEnvironment());
        if (request.getServerGroup() != null) server.setServerGroup(request.getServerGroup());
        if (request.getOperatingSystem() != null) server.setOperatingSystem(request.getOperatingSystem());
        if (request.getOsVersion() != null) server.setOsVersion(request.getOsVersion());
        if (request.getCpuCores() != null) server.setCpuCores(request.getCpuCores());
        if (request.getMemoryGb() != null) server.setMemoryGb(request.getMemoryGb());
        if (request.getDiskGb() != null) server.setDiskGb(request.getDiskGb());

        server.setUpdatedBy(updatedBy);

        // Update monitoring configuration
        if (request.getMonitoringConfig() != null) {
            ServerMonitoringConfig config = request.getMonitoringConfig();
            
            boolean wasMonitoringEnabled = server.getMonitoringEnabled();
            boolean wasMetricsEnabled = server.getMetricsCollectionEnabled();
            
            if (config.getMonitoringEnabled() != null) server.setMonitoringEnabled(config.getMonitoringEnabled());
            if (config.getHealthCheckEnabled() != null) server.setHealthCheckEnabled(config.getHealthCheckEnabled());
            if (config.getHealthCheckInterval() != null) server.setHealthCheckInterval(config.getHealthCheckInterval());
            if (config.getHealthCheckTimeout() != null) server.setHealthCheckTimeout(config.getHealthCheckTimeout());
            if (config.getHealthCheckUrl() != null) server.setHealthCheckUrl(config.getHealthCheckUrl());
            if (config.getMetricsCollectionEnabled() != null) server.setMetricsCollectionEnabled(config.getMetricsCollectionEnabled());
            if (config.getMetricsCollectionInterval() != null) server.setMetricsCollectionInterval(config.getMetricsCollectionInterval());
            
            // Handle monitoring state changes
            if (!wasMonitoringEnabled && server.getMonitoringEnabled()) {
                healthCheckService.startMonitoring(server.getId());
            } else if (wasMonitoringEnabled && !server.getMonitoringEnabled()) {
                healthCheckService.stopMonitoring(server.getId());
            }
            
            if (!wasMetricsEnabled && server.getMetricsCollectionEnabled()) {
                metricsCollectionService.startCollection(server.getId());
            } else if (wasMetricsEnabled && !server.getMetricsCollectionEnabled()) {
                metricsCollectionService.stopCollection(server.getId());
            }
        }

        // Update tags
        if (request.getTags() != null) {
            server.getTags().clear();
            server.getTags().putAll(request.getTags());
        }

        // Update configuration
        if (request.getConfiguration() != null) {
            server.getConfiguration().clear();
            server.getConfiguration().putAll(request.getConfiguration());
        }

        server = serverRepository.save(server);

        // Audit log
        auditService.logServerUpdated(server.getId(), updatedBy);

        logger.info("Server updated successfully: {} (ID: {})", server.getName(), server.getId());
        return convertToServerResponse(server);
    }

    /**
     * Get server by ID
     */
    @Transactional(readOnly = true)
    public ServerResponse getServerById(Long serverId) {
        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException("Server not found: " + serverId));
        return convertToServerResponse(server);
    }

    /**
     * Get server by hostname
     */
    @Transactional(readOnly = true)
    public ServerResponse getServerByHostname(String hostname) {
        Server server = serverRepository.findByHostnameIgnoreCase(hostname)
                .orElseThrow(() -> new ServerNotFoundException("Server not found: " + hostname));
        return convertToServerResponse(server);
    }

    /**
     * Search servers with pagination
     */
    @Transactional(readOnly = true)
    public Page<ServerResponse> searchServers(ServerSearchRequest request, Pageable pageable) {
        Page<Server> servers = serverRepository.searchServers(
                request.getName(),
                request.getHostname(),
                request.getIpAddress(),
                request.getEnvironment(),
                request.getServerGroup(),
                request.getStatus(),
                request.getOperatingSystem(),
                pageable
        );

        return servers.map(this::convertToServerResponse);
    }

    /**
     * Get all servers with pagination
     */
    @Transactional(readOnly = true)
    public Page<ServerResponse> getAllServers(Pageable pageable) {
        Page<Server> servers = serverRepository.findAll(pageable);
        return servers.map(this::convertToServerResponse);
    }

    /**
     * Delete server
     */
    public void deleteServer(Long serverId, String deletedBy) {
        logger.info("Deleting server: {}", serverId);

        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException("Server not found: " + serverId));

        // Stop monitoring and metrics collection
        if (server.getMonitoringEnabled()) {
            healthCheckService.stopMonitoring(serverId);
        }
        if (server.getMetricsCollectionEnabled()) {
            metricsCollectionService.stopCollection(serverId);
        }

        // Delete server
        serverRepository.delete(server);

        // Audit log
        auditService.logServerDeleted(serverId, deletedBy);

        logger.info("Server deleted successfully: {} (ID: {})", server.getName(), server.getId());
    }

    /**
     * Perform health check on server
     */
    public HealthCheckResult performHealthCheck(Long serverId) {
        logger.debug("Performing health check for server: {}", serverId);

        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException("Server not found: " + serverId));

        HealthCheckResult result = healthCheckService.performHealthCheck(serverId);

        // Update server status based on health check result
        server.updateHealthCheck(result.getStatus(), result.getResponseTimeMs());
        serverRepository.save(server);

        return result;
    }

    /**
     * Get servers by status
     */
    @Transactional(readOnly = true)
    public List<ServerResponse> getServersByStatus(ServerStatus status) {
        List<Server> servers = serverRepository.findByStatus(status);
        return servers.stream()
                .map(this::convertToServerResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get servers by environment
     */
    @Transactional(readOnly = true)
    public List<ServerResponse> getServersByEnvironment(String environment) {
        List<Server> servers = serverRepository.findByEnvironmentIgnoreCase(environment);
        return servers.stream()
                .map(this::convertToServerResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get servers by group
     */
    @Transactional(readOnly = true)
    public List<ServerResponse> getServersByGroup(String group) {
        List<Server> servers = serverRepository.findByServerGroupIgnoreCase(group);
        return servers.stream()
                .map(this::convertToServerResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get servers by tag
     */
    @Transactional(readOnly = true)
    public List<ServerResponse> getServersByTag(String tagKey, String tagValue) {
        List<Server> servers = serverRepository.findByTag(tagKey, tagValue);
        return servers.stream()
                .map(this::convertToServerResponse)
                .collect(Collectors.toList());
    }

    /**
     * Update server tags
     */
    public void updateServerTags(Long serverId, Map<String, String> tags, String updatedBy) {
        logger.info("Updating tags for server: {}", serverId);

        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException("Server not found: " + serverId));

        server.getTags().clear();
        server.getTags().putAll(tags);
        server.setUpdatedBy(updatedBy);

        serverRepository.save(server);

        // Audit log
        auditService.logServerTagsUpdated(serverId, updatedBy);

        logger.info("Server tags updated successfully: {}", serverId);
    }

    /**
     * Update server configuration
     */
    public void updateServerConfiguration(Long serverId, Map<String, String> configuration, String updatedBy) {
        logger.info("Updating configuration for server: {}", serverId);

        Server server = serverRepository.findById(serverId)
                .orElseThrow(() -> new ServerNotFoundException("Server not found: " + serverId));

        server.getConfiguration().clear();
        server.getConfiguration().putAll(configuration);
        server.setUpdatedBy(updatedBy);

        serverRepository.save(server);

        // Audit log
        auditService.logServerConfigurationUpdated(serverId, updatedBy);

        logger.info("Server configuration updated successfully: {}", serverId);
    }

    /**
     * Auto-discover servers
     */
    public List<ServerResponse> discoverServers(ServerDiscoveryRequest request, String discoveredBy) {
        logger.info("Starting server discovery: {}", request);

        List<Server> discoveredServers = serverDiscoveryService.discoverServers(request);

        // Save discovered servers
        for (Server server : discoveredServers) {
            server.setAutoDiscovered(true);
            server.setDiscoverySource(request.getDiscoveryMethod());
            server.setCreatedBy(discoveredBy);
        }

        List<Server> savedServers = serverRepository.saveAll(discoveredServers);

        // Start monitoring for discovered servers
        for (Server server : savedServers) {
            if (server.getMonitoringEnabled()) {
                healthCheckService.startMonitoring(server.getId());
            }
            if (server.getMetricsCollectionEnabled()) {
                metricsCollectionService.startCollection(server.getId());
            }
        }

        // Audit log
        auditService.logServersDiscovered(savedServers.size(), discoveredBy);

        logger.info("Server discovery completed: {} servers discovered", savedServers.size());

        return savedServers.stream()
                .map(this::convertToServerResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get server statistics
     */
    @Transactional(readOnly = true)
    public ServerStatistics getServerStatistics() {
        Object[] stats = serverRepository.getServerStatistics();
        
        return ServerStatistics.builder()
                .totalServers(((Number) stats[0]).longValue())
                .onlineServers(((Number) stats[1]).longValue())
                .offlineServers(((Number) stats[2]).longValue())
                .warningServers(((Number) stats[3]).longValue())
                .criticalServers(((Number) stats[4]).longValue())
                .monitoredServers(((Number) stats[5]).longValue())
                .autoDiscoveredServers(((Number) stats[6]).longValue())
                .build();
    }

    /**
     * Convert Server entity to ServerResponse DTO
     */
    private ServerResponse convertToServerResponse(Server server) {
        ServerResponse response = new ServerResponse();
        response.setId(server.getId());
        response.setName(server.getName());
        response.setHostname(server.getHostname());
        response.setIpAddress(server.getIpAddress());
        response.setPort(server.getPort());
        response.setDescription(server.getDescription());
        response.setStatus(server.getStatus());
        response.setEnvironment(server.getEnvironment());
        response.setServerGroup(server.getServerGroup());
        response.setOperatingSystem(server.getOperatingSystem());
        response.setOsVersion(server.getOsVersion());
        response.setCpuCores(server.getCpuCores());
        response.setMemoryGb(server.getMemoryGb());
        response.setDiskGb(server.getDiskGb());
        response.setMonitoringEnabled(server.getMonitoringEnabled());
        response.setHealthCheckEnabled(server.getHealthCheckEnabled());
        response.setHealthCheckInterval(server.getHealthCheckInterval());
        response.setHealthCheckTimeout(server.getHealthCheckTimeout());
        response.setHealthCheckUrl(server.getHealthCheckUrl());
        response.setMetricsCollectionEnabled(server.getMetricsCollectionEnabled());
        response.setMetricsCollectionInterval(server.getMetricsCollectionInterval());
        response.setAutoDiscovered(server.getAutoDiscovered());
        response.setDiscoverySource(server.getDiscoverySource());
        response.setAgentInstalled(server.getAgentInstalled());
        response.setAgentVersion(server.getAgentVersion());
        response.setLastSeen(server.getLastSeen());
        response.setLastHealthCheck(server.getLastHealthCheck());
        response.setLastMetricsCollection(server.getLastMetricsCollection());
        response.setUptimePercentage(server.getUptimePercentage());
        response.setResponseTimeMs(server.getResponseTimeMs());
        response.setTags(server.getTags());
        response.setConfiguration(server.getConfiguration());
        response.setCreatedAt(server.getCreatedAt());
        response.setUpdatedAt(server.getUpdatedAt());
        response.setCreatedBy(server.getCreatedBy());
        response.setUpdatedBy(server.getUpdatedBy());

        return response;
    }

    /**
     * Server Statistics DTO
     */
    public static class ServerStatistics {
        private Long totalServers;
        private Long onlineServers;
        private Long offlineServers;
        private Long warningServers;
        private Long criticalServers;
        private Long monitoredServers;
        private Long autoDiscoveredServers;

        public static Builder builder() { return new Builder(); }

        public static class Builder {
            private ServerStatistics stats = new ServerStatistics();
            public Builder totalServers(Long totalServers) { stats.totalServers = totalServers; return this; }
            public Builder onlineServers(Long onlineServers) { stats.onlineServers = onlineServers; return this; }
            public Builder offlineServers(Long offlineServers) { stats.offlineServers = offlineServers; return this; }
            public Builder warningServers(Long warningServers) { stats.warningServers = warningServers; return this; }
            public Builder criticalServers(Long criticalServers) { stats.criticalServers = criticalServers; return this; }
            public Builder monitoredServers(Long monitoredServers) { stats.monitoredServers = monitoredServers; return this; }
            public Builder autoDiscoveredServers(Long autoDiscoveredServers) { stats.autoDiscoveredServers = autoDiscoveredServers; return this; }
            public ServerStatistics build() { return stats; }
        }

        // Getters
        public Long getTotalServers() { return totalServers; }
        public Long getOnlineServers() { return onlineServers; }
        public Long getOfflineServers() { return offlineServers; }
        public Long getWarningServers() { return warningServers; }
        public Long getCriticalServers() { return criticalServers; }
        public Long getMonitoredServers() { return monitoredServers; }
        public Long getAutoDiscoveredServers() { return autoDiscoveredServers; }
    }
}
