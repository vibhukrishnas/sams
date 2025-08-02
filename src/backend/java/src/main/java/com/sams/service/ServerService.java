package com.sams.service;

import com.sams.entity.Server;
import com.sams.entity.Alert;
import com.sams.entity.SystemMetric;
import com.sams.repository.ServerRepository;
import com.sams.repository.AlertRepository;
import com.sams.repository.SystemMetricRepository;
import com.sams.dto.ServerCreateRequest;
import com.sams.dto.ServerResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.net.Socket;
import java.io.IOException;

/**
 * Service layer for Server management and monitoring
 */
@Service
@Transactional
public class ServerService {
    
    private static final Logger logger = LoggerFactory.getLogger(ServerService.class);
    
    @Autowired
    private ServerRepository serverRepository;
    
    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private SystemMetricRepository systemMetricRepository;
    
    /**
     * Create a new server
     */
    public ServerResponse createServer(ServerCreateRequest request) {
        logger.info("Creating new server: {}", request.getName());
        
        Server server = new Server();
        server.setName(request.getName());
        server.setHost(request.getHost());
        server.setPort(request.getPort());
        server.setDescription(request.getDescription());
        server.setServerType(request.getServerType());
        server.setVersion(request.getVersion());
        server.setOperatingSystem(request.getOperatingSystem());
        server.setStatus(Server.ServerStatus.UNKNOWN);
        
        Server savedServer = serverRepository.save(server);
        
        // Perform initial health check
        performHealthCheck(savedServer);
        
        return convertToResponse(savedServer);
    }
    
    /**
     * Get all servers with pagination
     */
    @Transactional(readOnly = true)
    public Page<ServerResponse> getAllServers(Pageable pageable) {
        return serverRepository.findAll(pageable)
                .map(this::convertToResponse);
    }
    
    /**
     * Get all servers without pagination
     */
    @Transactional(readOnly = true)
    public List<Server> getAllServers() {
        return serverRepository.findAll();
    }
    
    /**
     * Get server by ID
     */
    @Transactional(readOnly = true)
    public Optional<ServerResponse> getServerById(Long id) {
        return serverRepository.findById(id)
                .map(this::convertToResponse);
    }
    
    /**
     * Update server information
     */
    public Optional<ServerResponse> updateServer(Long id, ServerCreateRequest request) {
        logger.info("Updating server with ID: {}", id);
        
        return serverRepository.findById(id)
                .map(server -> {
                    server.setName(request.getName());
                    server.setHost(request.getHost());
                    server.setPort(request.getPort());
                    server.setDescription(request.getDescription());
                    server.setServerType(request.getServerType());
                    server.setVersion(request.getVersion());
                    server.setOperatingSystem(request.getOperatingSystem());
                    
                    Server updatedServer = serverRepository.save(server);
                    return convertToResponse(updatedServer);
                });
    }
    
    /**
     * Delete server
     */
    public boolean deleteServer(Long id) {
        logger.info("Deleting server with ID: {}", id);
        
        if (serverRepository.existsById(id)) {
            serverRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    /**
     * Get servers by status
     */
    @Transactional(readOnly = true)
    public List<ServerResponse> getServersByStatus(Server.ServerStatus status) {
        return serverRepository.findByStatus(status).stream()
                .map(this::convertToResponse)
                .toList();
    }
    
    /**
     * Perform health check on all servers
     */
    public void performHealthCheckAll() {
        logger.info("Performing health check on all servers");
        
        List<Server> servers = serverRepository.findAll();
        for (Server server : servers) {
            performHealthCheck(server);
        }
    }
    
    /**
     * Perform health check on specific server
     */
    public void performHealthCheck(Server server) {
        logger.debug("Performing health check on server: {}", server.getName());
        
        try {
            // Simple socket connection test
            try (Socket socket = new Socket()) {
                socket.connect(new java.net.InetSocketAddress(server.getHost(), server.getPort()), 5000);
                server.setStatus(Server.ServerStatus.ONLINE);
                server.setLastPing(LocalDateTime.now());
                logger.debug("Server {} is online", server.getName());
            }
        } catch (IOException e) {
            server.setStatus(Server.ServerStatus.OFFLINE);
            logger.warn("Server {} is offline: {}", server.getName(), e.getMessage());
            
            // Create alert for offline server
            createOfflineAlert(server);
        }
        
        serverRepository.save(server);
    }
    
    /**
     * Get dashboard statistics
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long totalServers = serverRepository.count();
        long onlineServers = serverRepository.countByStatus(Server.ServerStatus.ONLINE);
        long offlineServers = serverRepository.countByStatus(Server.ServerStatus.OFFLINE);
        long criticalAlerts = alertRepository.countBySeverityAndStatus(
                Alert.AlertSeverity.CRITICAL, Alert.AlertStatus.ACTIVE);
        
        stats.put("totalServers", totalServers);
        stats.put("onlineServers", onlineServers);
        stats.put("offlineServers", offlineServers);
        stats.put("uptimePercentage", totalServers > 0 ? (double) onlineServers / totalServers * 100 : 0);
        stats.put("criticalAlerts", criticalAlerts);
        
        return stats;
    }
    
    /**
     * Get server status
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getServerStatus(Long id) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Server not found"));
        
        Map<String, Object> status = new HashMap<>();
        status.put("id", server.getId());
        status.put("name", server.getName());
        status.put("status", server.getStatus());
        status.put("lastPing", server.getLastPing());
        status.put("uptime", server.getUptime());
        
        return status;
    }
    
    /**
     * Get server metrics
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getServerMetrics(Long id) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Server not found"));
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("cpuUsage", server.getCpuUsage());
        metrics.put("memoryUsage", server.getMemoryUsage());
        metrics.put("diskUsage", server.getDiskUsage());
        metrics.put("networkIn", server.getNetworkIn());
        metrics.put("networkOut", server.getNetworkOut());
        
        return metrics;
    }
    
    /**
     * Perform health check by ID
     */
    public Map<String, Object> performHealthCheck(Long id) {
        Server server = serverRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Server not found"));
        
        performHealthCheck(server);
        
        Map<String, Object> result = new HashMap<>();
        result.put("serverId", id);
        result.put("status", server.getStatus());
        result.put("lastCheck", LocalDateTime.now());
        
        return result;
    }
    
    /**
     * Get servers by status (string)
     */
    @Transactional(readOnly = true)
    public List<ServerResponse> getServersByStatus(String status) {
        Server.ServerStatus serverStatus = Server.ServerStatus.valueOf(status.toUpperCase());
        return getServersByStatus(serverStatus);
    }
    
    /**
     * Get dashboard statistics
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboardStatistics() {
        return getDashboardStats();
    }
    
    /**
     * Create offline alert for server
     */
    private void createOfflineAlert(Server server) {
        // Check if there's already an active offline alert for this server
        boolean hasActiveOfflineAlert = alertRepository.existsByServerAndMessageContainingAndStatus(
                server, "offline", Alert.AlertStatus.ACTIVE);
        
        if (!hasActiveOfflineAlert) {
            Alert alert = new Alert();
            alert.setServer(server);
            alert.setTitle("Server Offline");
            alert.setMessage(String.format("Server %s (%s:%d) is offline", 
                    server.getName(), server.getHost(), server.getPort()));
            alert.setSeverity(Alert.AlertSeverity.CRITICAL);
            alert.setStatus(Alert.AlertStatus.ACTIVE);
            alert.setTriggeredAt(LocalDateTime.now());
            
            alertRepository.save(alert);
            logger.info("Created offline alert for server: {}", server.getName());
        }
    }
    
    /**
     * Convert Server entity to ServerResponse DTO
     */
    private ServerResponse convertToResponse(Server server) {
        Integer activeAlertCount = alertRepository.countByServerAndStatus(server, Alert.AlertStatus.ACTIVE);
        
        return ServerResponse.builder()
                .id(server.getId())
                .name(server.getName())
                .host(server.getHost())
                .port(server.getPort())
                .description(server.getDescription())
                .serverType(server.getServerType())
                .version(server.getVersion())
                .operatingSystem(server.getOperatingSystem())
                .status(server.getStatus())
                .cpuUsage(server.getCpuUsage())
                .memoryUsage(server.getMemoryUsage())
                .diskUsage(server.getDiskUsage())
                .uptime(server.getUptime())
                .lastPing(server.getLastPing())
                .createdAt(server.getCreatedAt())
                .updatedAt(server.getUpdatedAt())
                .activeAlertCount(activeAlertCount)
                .build();
    }
}
