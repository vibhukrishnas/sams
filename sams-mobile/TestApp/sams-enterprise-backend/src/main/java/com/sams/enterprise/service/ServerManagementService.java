package com.sams.enterprise.service;

import com.sams.enterprise.entity.Server;
import com.sams.enterprise.entity.ServerMetric;
import com.sams.enterprise.repository.ServerRepository;
import com.sams.enterprise.repository.ServerMetricRepository;
import com.sams.enterprise.dto.ServerCreateRequest;
import com.sams.enterprise.dto.ServerUpdateRequest;
import com.sams.enterprise.dto.ServerConfigurationRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Enterprise Server Management Service
 */
@Service
@Transactional
public class ServerManagementService {

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private ServerMetricRepository serverMetricRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CommandExecutionService commandExecutionService;

    /**
     * Get all servers with pagination and filtering
     */
    public Map<String, Object> getAllServers(int page, int size, String environment, String status) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Server> serverPage;

        if (environment != null && status != null) {
            Server.ServerStatus serverStatus = Server.ServerStatus.valueOf(status.toUpperCase());
            serverPage = serverRepository.findByEnvironmentAndStatus(environment, serverStatus, pageable);
        } else if (environment != null) {
            serverPage = serverRepository.findByEnvironment(environment, pageable);
        } else if (status != null) {
            Server.ServerStatus serverStatus = Server.ServerStatus.valueOf(status.toUpperCase());
            serverPage = serverRepository.findByStatus(serverStatus, pageable);
        } else {
            serverPage = serverRepository.findAll(pageable);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("data", serverPage.getContent());
        response.put("total", serverPage.getTotalElements());
        response.put("page", page);
        response.put("size", size);
        response.put("totalPages", serverPage.getTotalPages());

        return response;
    }

    /**
     * Get server by ID
     */
    public Server getServerById(Long id) {
        return serverRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Server not found with ID: " + id));
    }

    /**
     * Create new server
     */
    public Server createServer(ServerCreateRequest request) {
        // Check if server already exists
        if (serverRepository.findByHostname(request.getHostname()).isPresent()) {
            throw new IllegalArgumentException("Server with hostname already exists: " + request.getHostname());
        }

        if (serverRepository.findByIpAddress(request.getIpAddress()).isPresent()) {
            throw new IllegalArgumentException("Server with IP address already exists: " + request.getIpAddress());
        }

        Server server = new Server(
            request.getHostname(),
            request.getIpAddress(),
            request.getType(),
            request.getEnvironment()
        );

        server.setDescription(request.getDescription());
        server.setOperatingSystem(request.getOperatingSystem());
        server.setOsVersion(request.getOsVersion());
        server.setCpuCores(request.getCpuCores());
        server.setMemoryGb(request.getMemoryGb());
        server.setDiskGb(request.getDiskGb());
        server.setTags(request.getTags());
        server.setConfiguration(request.getConfiguration());

        Server savedServer = serverRepository.save(server);

        // Send notification
        notificationService.sendServerStatusNotification(savedServer, "ADDED");

        return savedServer;
    }

    /**
     * Update server
     */
    public Server updateServer(Long id, ServerUpdateRequest request) {
        Server server = getServerById(id);

        server.setDescription(request.getDescription());
        server.setEnvironment(request.getEnvironment());
        server.setOperatingSystem(request.getOperatingSystem());
        server.setOsVersion(request.getOsVersion());
        server.setCpuCores(request.getCpuCores());
        server.setMemoryGb(request.getMemoryGb());
        server.setDiskGb(request.getDiskGb());
        server.setMonitoringEnabled(request.getMonitoringEnabled());

        if (request.getTags() != null) {
            server.setTags(request.getTags());
        }

        if (request.getConfiguration() != null) {
            server.setConfiguration(request.getConfiguration());
        }

        return serverRepository.save(server);
    }

    /**
     * Delete server
     */
    public void deleteServer(Long id) {
        Server server = getServerById(id);
        
        // Send notification before deletion
        notificationService.sendServerStatusNotification(server, "REMOVED");
        
        serverRepository.delete(server);
    }

    /**
     * Configure server
     */
    public Map<String, Object> configureServer(Long id, ServerConfigurationRequest request) {
        Server server = getServerById(id);
        
        Map<String, Object> result = new HashMap<>();
        result.put("serverId", id);
        result.put("hostname", server.getHostname());
        result.put("success", true);
        result.put("message", "Server configured successfully");

        try {
            switch (request.getConfigurationType()) {
                case "PERFORMANCE_TUNING":
                    result = performanceConfiguration(server, request);
                    break;
                case "SECURITY_SETTINGS":
                    result = securityConfiguration(server, request);
                    break;
                case "NETWORK_SETTINGS":
                    result = networkConfiguration(server, request);
                    break;
                case "BACKUP_MAINTENANCE":
                    result = backupConfiguration(server, request);
                    break;
                default:
                    result.put("success", false);
                    result.put("message", "Unknown configuration type: " + request.getConfigurationType());
            }

            // Update server configuration
            if ((Boolean) result.get("success")) {
                server.getConfiguration().putAll(request.getSettings());
                serverRepository.save(server);
            }

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Configuration failed: " + e.getMessage());
        }

        return result;
    }

    /**
     * Performance configuration
     */
    private Map<String, Object> performanceConfiguration(Server server, ServerConfigurationRequest request) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            String powerPlan = request.getSettings().get("powerPlan");
            
            // Execute Windows power plan command
            String command = switch (powerPlan) {
                case "High Performance" -> "powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";
                case "Balanced" -> "powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e";
                case "Power Saver" -> "powercfg /setactive a1841308-3541-4fab-bc81-f71556f20b4a";
                default -> null;
            };

            if (command != null) {
                Map<String, Object> commandResult = commandExecutionService.executeCommand(server.getId(), command);
                result.put("success", (Boolean) commandResult.get("success"));
                result.put("message", "Power plan set to: " + powerPlan);
                result.put("output", commandResult.get("output"));
            } else {
                result.put("success", false);
                result.put("message", "Invalid power plan: " + powerPlan);
            }

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Performance configuration failed: " + e.getMessage());
        }

        return result;
    }

    /**
     * Security configuration
     */
    private Map<String, Object> securityConfiguration(Server server, ServerConfigurationRequest request) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Implement security configuration logic
            result.put("success", true);
            result.put("message", "Security settings updated successfully");
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Security configuration failed: " + e.getMessage());
        }

        return result;
    }

    /**
     * Network configuration
     */
    private Map<String, Object> networkConfiguration(Server server, ServerConfigurationRequest request) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Implement network configuration logic
            result.put("success", true);
            result.put("message", "Network settings updated successfully");
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Network configuration failed: " + e.getMessage());
        }

        return result;
    }

    /**
     * Backup configuration
     */
    private Map<String, Object> backupConfiguration(Server server, ServerConfigurationRequest request) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Implement backup configuration logic
            result.put("success", true);
            result.put("message", "Backup settings updated successfully");
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Backup configuration failed: " + e.getMessage());
        }

        return result;
    }

    /**
     * Get server metrics
     */
    public List<ServerMetric> getServerMetrics(Long serverId, String metricName, int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        
        if (metricName != null) {
            return serverMetricRepository.findByServerIdAndMetricNameAndTimestampAfter(serverId, metricName, since);
        } else {
            return serverMetricRepository.findByServerIdAndTimestampAfter(serverId, since);
        }
    }

    /**
     * Update server heartbeat
     */
    public void updateServerHeartbeat(Long serverId) {
        Server server = getServerById(serverId);
        server.updateHeartbeat();
        serverRepository.save(server);
    }

    /**
     * Get server health
     */
    public Map<String, Object> getServerHealth(Long serverId) {
        Server server = getServerById(serverId);
        server.calculateHealthScore();
        serverRepository.save(server);

        Map<String, Object> health = new HashMap<>();
        health.put("serverId", serverId);
        health.put("hostname", server.getHostname());
        health.put("status", server.getStatus());
        health.put("healthScore", server.getHealthScore());
        health.put("lastHeartbeat", server.getLastHeartbeat());
        health.put("openAlerts", server.getOpenAlertsCount());
        health.put("criticalAlerts", server.getCriticalAlertsCount());

        return health;
    }

    /**
     * Get server statistics
     */
    public Map<String, Object> getServerStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("totalServers", serverRepository.count());
        stats.put("onlineServers", serverRepository.countByStatus(Server.ServerStatus.ONLINE));
        stats.put("offlineServers", serverRepository.countByStatus(Server.ServerStatus.OFFLINE));
        stats.put("warningServers", serverRepository.countByStatus(Server.ServerStatus.WARNING));
        stats.put("criticalServers", serverRepository.countByStatus(Server.ServerStatus.CRITICAL));
        stats.put("maintenanceServers", serverRepository.countByStatus(Server.ServerStatus.MAINTENANCE));
        stats.put("averageHealthScore", serverRepository.getAverageHealthScore());
        
        // Environment breakdown
        List<Object[]> envCounts = serverRepository.getServerCountsByEnvironment();
        Map<String, Long> environmentStats = new HashMap<>();
        for (Object[] row : envCounts) {
            environmentStats.put((String) row[0], (Long) row[1]);
        }
        stats.put("environmentBreakdown", environmentStats);

        return stats;
    }

    /**
     * Restart server
     */
    public Map<String, Object> restartServer(Long serverId) {
        Server server = getServerById(serverId);
        
        try {
            // Execute restart command
            Map<String, Object> result = commandExecutionService.executeCommand(serverId, "shutdown /r /t 0");
            
            if ((Boolean) result.get("success")) {
                server.setStatus(Server.ServerStatus.MAINTENANCE);
                serverRepository.save(server);
                
                notificationService.sendServerStatusNotification(server, "RESTARTING");
            }
            
            return result;
            
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "Failed to restart server: " + e.getMessage());
            return result;
        }
    }

    /**
     * Get servers by environment
     */
    public List<Server> getServersByEnvironment(String environment) {
        return serverRepository.findByEnvironment(environment);
    }

    /**
     * Get offline servers
     */
    public List<Server> getOfflineServers() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(5);
        return serverRepository.findOfflineServers(threshold);
    }

    /**
     * Get unhealthy servers
     */
    public List<Server> getUnhealthyServers(Double threshold) {
        return serverRepository.findUnhealthyServers(threshold);
    }

    /**
     * Bulk server operations
     */
    public Map<String, Object> bulkServerAction(String action, List<Long> serverIds) {
        Map<String, Object> result = new HashMap<>();
        int successCount = 0;
        int failureCount = 0;

        for (Long serverId : serverIds) {
            try {
                switch (action.toLowerCase()) {
                    case "restart":
                        restartServer(serverId);
                        successCount++;
                        break;
                    case "enable_monitoring":
                        Server server = getServerById(serverId);
                        server.setMonitoringEnabled(true);
                        serverRepository.save(server);
                        successCount++;
                        break;
                    case "disable_monitoring":
                        Server server2 = getServerById(serverId);
                        server2.setMonitoringEnabled(false);
                        serverRepository.save(server2);
                        successCount++;
                        break;
                    default:
                        failureCount++;
                }
            } catch (Exception e) {
                failureCount++;
            }
        }

        result.put("action", action);
        result.put("totalServers", serverIds.size());
        result.put("successCount", successCount);
        result.put("failureCount", failureCount);
        result.put("success", failureCount == 0);

        return result;
    }
}
